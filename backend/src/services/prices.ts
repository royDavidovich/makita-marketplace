import { PrismaClient } from '@prisma/client';
import { loadStores, loadTools } from '../config/loader';
import { scrapeProductPrice } from './scraper';

export type ScrapeStatus = 'idle' | 'running' | 'completed' | 'failed';

interface ScrapeState {
  status: ScrapeStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  toolsScraped: number;
  storesScraped: number;
  errors: number;
}

const state: ScrapeState = {
  status: 'idle',
  startedAt: null,
  completedAt: null,
  toolsScraped: 0,
  storesScraped: 0,
  errors: 0,
};

export function getScrapeStatus(): ScrapeState {
  return { ...state };
}

export async function runScrape(
  prisma: PrismaClient,
  modelNumber?: string,
): Promise<void> {
  if (state.status === 'running') {
    throw new Error('A scrape is already running');
  }

  const activeStores = loadStores().filter((s) => s.is_active);
  const allTools = loadTools();
  const toolsToScrape = modelNumber
    ? allTools.filter((t) => t.model_number === modelNumber)
    : allTools;

  state.status = 'running';
  state.startedAt = new Date();
  state.completedAt = null;
  state.toolsScraped = 0;
  state.storesScraped = 0;
  state.errors = 0;

  console.log(
    `[prices] Starting scrape: ${toolsToScrape.length} tools × ${activeStores.length} stores`,
  );

  try {
    for (const toolConfig of toolsToScrape) {
      const dbTool = await prisma.tool.findUnique({
        where: { modelNumber: toolConfig.model_number },
      });
      if (!dbTool || !dbTool.isActive) continue;

      for (const storeConfig of activeStores) {
        const dbStore = await prisma.store.findUnique({
          where: { baseUrl: storeConfig.base_url },
        });
        if (!dbStore) continue;

        try {
          const result = await scrapeProductPrice(storeConfig, toolConfig.model_number);
          await prisma.priceListing.upsert({
            where: {
              toolId_storeId: { toolId: dbTool.id, storeId: dbStore.id },
            },
            create: {
              toolId: dbTool.id,
              storeId: dbStore.id,
              price: result.price,
              currency: 'ILS',
              productUrl: result.productUrl,
              isAvailable: result.isAvailable,
              lastScrapedAt: new Date(),
            },
            update: {
              price: result.price,
              productUrl: result.productUrl,
              isAvailable: result.isAvailable,
              lastScrapedAt: new Date(),
            },
          });
          state.storesScraped++;
        } catch (err) {
          state.errors++;
          console.error(
            `[prices] Error upserting result for ${storeConfig.name} / ${toolConfig.model_number}:`,
            err,
          );
        }
      }
      state.toolsScraped++;
    }

    state.status = 'completed';
    state.completedAt = new Date();
    console.log(
      `[prices] Scrape completed: ${state.toolsScraped} tools, ` +
        `${state.storesScraped} listings updated, ${state.errors} errors`,
    );
  } catch (err) {
    state.status = 'failed';
    state.completedAt = new Date();
    console.error('[prices] Scrape run failed:', err);
    throw err;
  }
}
