import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import app, { mountRoutes } from './app';
import { seedDatabase } from './config/seeder';
import toolsRouter from './api/tools';
import categoriesRouter from './api/categories';
import scrapeRouter from './api/scrape';
import { startScheduler } from './scheduler';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('[db] Connected to SQLite database');

  await seedDatabase(prisma);

  mountRoutes(toolsRouter(prisma), categoriesRouter(prisma), scrapeRouter(prisma));
  startScheduler(prisma);

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
