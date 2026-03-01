import { chromium, type Page } from 'playwright';
import type { StoreConfig } from '../config/loader';

export interface ScrapeResult {
  isAvailable: boolean;
  price: number | null;
  productUrl: string | null;
}

const MAX_RETRIES = 2;

// Matches Makita-style model numbers: 2-4 uppercase letters + 2-4 digits + 0-3 uppercase letters
// Examples: DGA452Z, DTD157Z, DC18RC, DTM52Z
const MODEL_NUMBER_RE = /\b[A-Z]{2,4}\d{2,4}[A-Z]{0,3}\b/g;

/**
 * Validates that the first matching product link on a search results page refers to the
 * specific model being searched for (not an unrelated item or a bundle kit).
 *
 * Rules:
 *  1. The product text must contain the searched model number.
 *  2. The product text must not contain any *other* Makita-style model numbers (bundle guard).
 *
 * If the link has no readable text (e.g. image-only link), validation is skipped (returns true).
 */
async function isCorrectProduct(
  page: Page,
  linkSelector: string,
  modelNumber: string,
  storeName: string,
): Promise<boolean> {
  const firstLink = page.locator(linkSelector).first();

  // Try the link's own text first; fall back to its parent container for image links
  let productText = (await firstLink.textContent().catch(() => null))?.trim() ?? null;
  if (!productText) {
    productText = (await firstLink.locator('..').textContent().catch(() => null))?.trim() ?? null;
  }

  console.log(`[scraper] ${storeName}/${modelNumber} — product text for validation:`, JSON.stringify(productText));

  if (!productText) {
    // No readable text — cannot validate, allow through
    return true;
  }

  // Rule 1: model number must appear in the product text
  if (!productText.toLowerCase().includes(modelNumber.toLowerCase())) {
    console.log(`[scraper] ${storeName}/${modelNumber} — model number absent from product text, not available`);
    return false;
  }

  // Rule 2: no other model numbers alongside it (bundle detection)
  const allModels = productText.match(MODEL_NUMBER_RE) ?? [];
  const otherModels = allModels.filter((m) => m.toLowerCase() !== modelNumber.toLowerCase());
  if (otherModels.length > 0) {
    console.log(
      `[scraper] ${storeName}/${modelNumber} — bundle detected (other models: ${otherModels.join(', ')}), not available`,
    );
    return false;
  }

  return true;
}

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

      if (!(await isCorrectProduct(page, linkSelector, modelNumber, store.name))) {
        return { isAvailable: false, price: null, productUrl: null };
      }

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
    } else if (store.selectors?.searchFormPageUrl && store.selectors?.searchInputSelector) {
      // POST form-based search (e.g. ASP stores where search submits a form)
      await page.goto(store.selectors.searchFormPageUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.fill(store.selectors.searchInputSelector, modelNumber);
      await page.locator(store.selectors.searchInputSelector).press('Enter');

      const linkSelector = store.selectors.productLinkSelector ?? 'a';
      const linkFound = await page.waitForSelector(linkSelector, { timeout: 30_000 }).catch(() => null);
      console.log(`[scraper] ${store.name}/${modelNumber} — page URL after search:`, page.url());
      console.log(`[scraper] ${store.name}/${modelNumber} — link selector "${linkSelector}" found:`, !!linkFound);
      const href = await page.locator(linkSelector).first().getAttribute('href').catch(() => null);
      const trimmedHref = href?.trim() ?? null;
      console.log(`[scraper] ${store.name}/${modelNumber} — href:`, trimmedHref);
      if (!trimmedHref) return { isAvailable: false, price: null, productUrl: null };

      if (!(await isCorrectProduct(page, linkSelector, modelNumber, store.name))) {
        return { isAvailable: false, price: null, productUrl: null };
      }

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
