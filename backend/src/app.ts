import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes (mounted after setup)
export function mountRoutes(
  toolsRouter: express.Router,
  categoriesRouter: express.Router,
  scrapeRouter: express.Router,
): void {
  app.use('/api/tools', toolsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/scrape', scrapeRouter);
}

// Centralised error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
