import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { runScrape, getScrapeStatus } from '../services/prices';

function requireScrapeSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret || req.headers['x-scrape-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export default function scrapeRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use(requireScrapeSecret);

  // POST /api/scrape/run
  router.post('/run', (req: Request, res: Response) => {
    const currentStatus = getScrapeStatus();
    if (currentStatus.status === 'running') {
      res.status(409).json({
        error: 'A scrape is already running',
        started_at: currentStatus.startedAt?.toISOString() ?? null,
      });
      return;
    }

    const modelNumber =
      typeof req.query.modelNumber === 'string' ? req.query.modelNumber : undefined;
    const startedAt = new Date();

    void runScrape(prisma, modelNumber).catch((err: unknown) => {
      console.error('[scrape] Unhandled error in run:', err);
    });

    res.status(202).json({
      data: {
        status: 'started',
        scope: modelNumber ?? 'full',
        started_at: startedAt.toISOString(),
      },
    });
  });

  // GET /api/scrape/status
  router.get('/status', (_req: Request, res: Response) => {
    const s = getScrapeStatus();
    res.json({
      data: {
        status: s.status,
        started_at: s.startedAt?.toISOString() ?? null,
        completed_at: s.completedAt?.toISOString() ?? null,
        tools_scraped: s.toolsScraped,
        stores_scraped: s.storesScraped,
        errors: s.errors,
      },
    });
  });

  return router;
}
