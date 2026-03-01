import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export default function categoriesRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/categories
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const rows = await prisma.tool.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      const data = rows.map((r) => r.category);
      res.json({ data });
    } catch (err) {
      console.error('[GET /api/categories]', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  return router;
}
