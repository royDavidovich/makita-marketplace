import { chromium } from 'playwright';
import type { StoreConfig } from '../config/loader';

export interface ScrapeResult {
  isAvailable: boolean;
  price: number | null;
  productUrl: string | null;
}

const MAX_RETRIES = 2;

function buildUrl(pattern: string, baseUrl: string, modelNumber: string): string {
  const resolved = pattern.replace(/\{model(?:_number|Number)?\}/gi, modelNumber);
  if (resolved.startsWith('http')) return resolved;
  return `${baseUrl.replace(/\/$/, '')}${resolved}`;
}

async function attemptScrape(
  store: StoreConfig,
  modelNumber: string,
): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'he-IL',
      extraHTTPHeaders: { 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' },
    });
    const page = await context.newPage();

    let productUrl: string | null = null;

    if (store.selectors?.productUrlPattern) {
      // Direct navigation via URL pattern
      const url = buildUrl(store.selectors.productUrlPattern, store.base_url, modelNumber);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      productUrl = page.url();
    } else if (store.selectors?.searchUrlPattern) {
      // Search-based navigation
      const searchUrl = buildUrl(store.selectors.searchUrlPattern, store.base_url, modelNumber);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      const linkSelector = store.selectors.productLinkSelector ?? 'a';
      // Wait for search results to render (JS SPAs like KSP fetch results asynchronously)
      const linkFound = await page.waitForSelector(linkSelector, { timeout: 30_000 }).catch(() => null);
      console.log(`[scraper] ${store.name}/${modelNumber} — page URL after search:`, page.url());
      console.log(`[scraper] ${store.name}/${modelNumber} — link selector "${linkSelector}" found:`, !!linkFound);
      const href = await page.locator(linkSelector).first().getAttribute('href').catch(() => null);
      const trimmedHref = href?.trim() ?? null;
      console.log(`[scraper] ${store.name}/${modelNumber} — href:`, trimmedHref);
      if (!trimmedHref) return { isAvailable: false, price: null, productUrl: null };

      // If store provides a search-page price selector, read price here before navigating away
      if (store.selectors?.searchPagePriceSelector) {
        const searchPriceText = await page
          .locator(store.selectors.searchPagePriceSelector)
          .first()
          .textContent({ timeout: 5_000 })
          .catch(() => null);
        console.log(`[scraper] ${store.name}/${modelNumber} — searchPagePriceText:`, JSON.stringify(searchPriceText));
        const searchPriceNum = parseFloat((searchPriceText ?? '').replace(/[^\d.]/g, ''));
        if (!isNaN(searchPriceNum) && searchPriceNum > 0) {
          const fullUrl = trimmedHref.startsWith('http')
            ? trimmedHref
            : `${store.base_url.replace(/\/$/, '')}${trimmedHref}`;
          return { isAvailable: true, price: searchPriceNum, productUrl: fullUrl };
        }
      }

      const fullUrl = trimmedHref.startsWith('http')
        ? trimmedHref
        : `${store.base_url.replace(/\/$/, '')}${trimmedHref}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      productUrl = page.url();
    } else {
      // No selector config — cannot scrape this store
      console.warn(`[scraper] No selectors configured for store: ${store.name}`);
      return { isAvailable: false, price: null, productUrl: null };
    }

    // Extract price from product page
    const priceSelector = store.selectors?.priceSelector ?? '[class*="price"]';
    await page.waitForSelector(priceSelector, { timeout: 30_000 }).catch(() => null);
    const priceText = await page
      .locator(priceSelector)
      .first()
      .textContent({ timeout: 10_000 })
      .catch(() => null);
    console.log(`[scraper] ${store.name}/${modelNumber} — priceText:`, JSON.stringify(priceText));

    if (!priceText) return { isAvailable: false, price: null, productUrl };

    const priceNum = parseFloat(priceText.replace(/[^\d.]/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) {
      return { isAvailable: false, price: null, productUrl };
    }

    return { isAvailable: true, price: priceNum, productUrl };
  } finally {
    await browser.close();
  }
}

export async function scrapeProductPrice(
  store: StoreConfig,
  modelNumber: string,
): Promise<ScrapeResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await attemptScrape(store, modelNumber);
    } catch (err) {
      lastError = err;
      console.warn(
        `[scraper] Attempt ${attempt}/${MAX_RETRIES} failed for ${store.name} / ${modelNumber}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  console.error(
    `[scraper] All ${MAX_RETRIES} attempts failed for ${store.name} / ${modelNumber}`,
    lastError,
  );
  return { isAvailable: false, price: null, productUrl: null };
}
