import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { runScrape } from '../services/prices';

export function startScheduler(prisma: PrismaClient): void {
  // Nightly at 02:00
  cron.schedule('0 2 * * *', () => {
    console.log('[scheduler] Starting nightly price scrape...');
    void runScrape(prisma).catch((err: unknown) => {
      console.error('[scheduler] Nightly scrape failed:', err);
    });
  });
  console.log('[scheduler] Nightly price scrape scheduled at 02:00');
}
