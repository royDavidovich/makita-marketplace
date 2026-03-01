import { chromium, type Page, type Locator } from 'playwright';
import type { StoreConfig } from '../config/loader';

export interface ScrapeResult {
  isAvailable: boolean;
  price: number | null;
  productUrl: string | null;
}

const MAX_RETRIES = 2;
const MAX_SEARCH_RESULTS = 20;

// Matches Makita-style model numbers: 2-4 uppercase letters + 2-4 digits + 0-3 uppercase letters
// Examples: DGA452Z, DTD157Z, DC18RC, DTM52Z
const MODEL_NUMBER_RE = /\b[A-Z]{2,4}\d{2,4}[A-Z]{0,3}\b/g;

/**
 * Returns the first non-trivial text found on or above a link element, climbing up to
 * 4 ancestor levels. Handles image-only links where the product title is in a sibling
 * cell of the same table row (common in classic ASP stores).
 */
async function getProductText(linkLocator: Locator): Promise<string | null> {
  const direct = (await linkLocator.textContent().catch(() => null))?.trim() ?? null;
  if (direct && direct.length > 3) return direct;

  let ancestor = linkLocator;
  for (let depth = 1; depth <= 4; depth++) {
    ancestor = ancestor.locator('..');
    const text = (await ancestor.textContent().catch(() => null))?.trim() ?? null;
    if (text && text.length > 3) return text;
  }
  return null;
}

/**
 * Validates that a product link on a search results page refers to the specific model being
 * searched for (not an unrelated item, rental listing, or bundle kit).
 *
 * Rules:
 *  1.  The product text must contain the searched model number — exact match OR the Z-less
 *      variant ("DGA452") paired with the Hebrew word "גוף" (body-only label).
 *  1b. Rental listings ("להשכרה" / "השכרה") are rejected.
 *  2a. A "+" sign indicates a bundle and is rejected.
 *  2.  No other Makita-style model numbers may appear (bundle guard).
 *
 * If no readable text can be found up to 4 ancestor levels, validation is skipped (returns true).
 */
async function isCorrectProduct(
  linkLocator: Locator,
  href: string,
  modelNumber: string,
  storeName: string,
): Promise<boolean> {
  const productText = await getProductText(linkLocator);

  console.log(`[scraper] ${storeName}/${modelNumber} — product text for validation:`, JSON.stringify(productText));

  if (!productText) {
    // Fallback: validate using the URL slug when no product text is accessible.
    // Stores like Atlas Tools encode the model number in the URL path.
    const decodedHref = decodeURIComponent(href).toLowerCase();
    const modelLower = modelNumber.toLowerCase();
    const modelWithoutZLower = modelLower.endsWith('z') ? modelLower.slice(0, -1) : null;

    // Accept if the URL slug contains the searched model (or its Z-less variant)
    if (decodedHref.includes(modelLower) || (modelWithoutZLower && decodedHref.includes(modelWithoutZLower))) {
      console.log(`[scraper] ${storeName}/${modelNumber} — no text, model found in URL slug, accepting`);
      return true;
    }
    // Reject if the URL slug contains a different Makita model number
    const urlModels = decodeURIComponent(href).match(MODEL_NUMBER_RE) ?? [];
    if (urlModels.length > 0) {
      console.log(`[scraper] ${storeName}/${modelNumber} — no text, URL has other model(s) [${urlModels.join(', ')}], rejecting`);
      return false;
    }
    // No model info in URL either — conservative reject (avoids matching nav/catalog links)
    console.log(`[scraper] ${storeName}/${modelNumber} — no text and no model in URL, rejecting`);
    return false;
  }

  const text = productText.toLowerCase();
  const model = modelNumber.toLowerCase();
  // Z-less base: "dga452z" → "dga452"; null if model doesn't end in z
  const modelWithoutZ = model.endsWith('z') ? model.slice(0, -1) : null;

  // Rule 1: model number must appear — exact match OR Z-less + Hebrew "גוף" (body-only label)
  const exactMatch = text.includes(model);
  const bodyOnlyVariantMatch =
    modelWithoutZ !== null && text.includes(modelWithoutZ) && text.includes('גוף');

  if (!exactMatch && !bodyOnlyVariantMatch) {
    console.log(`[scraper] ${storeName}/${modelNumber} — model number absent from product text, not available`);
    return false;
  }

  // Rule 1b: rental listing detection (Hebrew: "for rent", "rental")
  if (text.includes('להשכרה') || text.includes('השכרה')) {
    console.log(`[scraper] ${storeName}/${modelNumber} — rental listing detected, not available`);
    return false;
  }

  // Rule 2a: "+" sign indicates a bundle (tool + battery, tool + charger, etc.)
  if (productText.includes('+')) {
    console.log(`[scraper] ${storeName}/${modelNumber} — "+" sign detected, likely a bundle, not available`);
    return false;
  }

  // Rule 2: no other model numbers alongside it (bundle detection)
  // The Z-less variant of the searched model is not counted as a foreign model
  const allModels = productText.match(MODEL_NUMBER_RE) ?? [];
  const otherModels = allModels.filter((m) => {
    const lower = m.toLowerCase();
    return lower !== model && lower !== (modelWithoutZ ?? model);
  });
  if (otherModels.length > 0) {
    console.log(
      `[scraper] ${storeName}/${modelNumber} — bundle detected (other models: ${otherModels.join(', ')}), not available`,
    );
    return false;
  }

  return true;
}

/**
 * Scans up to MAX_SEARCH_RESULTS product links and returns the href and DOM index of the
 * first one that passes isCorrectProduct validation. Returns null if no match is found.
 */
async function findMatchingLink(
  page: Page,
  linkSelector: string,
  modelNumber: string,
  storeName: string,
): Promise<{ href: string; index: number } | null> {
  const allLinks = page.locator(linkSelector);
  const count = await allLinks.count().catch(() => 0);
  const limit = Math.min(count, MAX_SEARCH_RESULTS);

  console.log(`[scraper] ${storeName}/${modelNumber} — found ${count} link(s), checking up to ${limit}`);

  for (let i = 0; i < limit; i++) {
    const locator = allLinks.nth(i);
    const href = (await locator.getAttribute('href').catch(() => null))?.trim() ?? null;
    if (!href) continue;

    if (await isCorrectProduct(locator, href, modelNumber, storeName)) {
      console.log(`[scraper] ${storeName}/${modelNumber} — matched result at index ${i}: ${href}`);
      return { href, index: i };
    }
  }

  console.log(`[scraper] ${storeName}/${modelNumber} — no matching result in first ${limit} link(s)`);
  return null;
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

      const match = await findMatchingLink(page, linkSelector, modelNumber, store.name);
      if (!match) return { isAvailable: false, price: null, productUrl: null };

      const { href: trimmedHref, index: matchIndex } = match;

      // If store provides a search-page price selector, read price here before navigating away
      if (store.selectors?.searchPagePriceSelector) {
        const searchPriceText = await page
          .locator(store.selectors.searchPagePriceSelector)
          .nth(matchIndex)
          .textContent({ timeout: 5_000 })
          .catch(() => null);
        console.log(`[scraper] ${store.name}/${modelNumber} — searchPagePriceText:`, JSON.stringify(searchPriceText));
        const searchPriceNum = parseFloat((searchPriceText ?? '').replace(/[^\d.]/g, ''));
        const isRentalPrice = /ליום|לשעה|\/יום/.test(searchPriceText ?? '');
        if (isRentalPrice) {
          console.log(`[scraper] ${store.name}/${modelNumber} — rental price indicator in price text, skipping search-page price`);
        } else if (!isNaN(searchPriceNum) && searchPriceNum > 0) {
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

      const match = await findMatchingLink(page, linkSelector, modelNumber, store.name);
      if (!match) return { isAvailable: false, price: null, productUrl: null };

      const { href: trimmedHref, index: matchIndex } = match;

      if (store.selectors?.searchPagePriceSelector) {
        const searchPriceText = await page
          .locator(store.selectors.searchPagePriceSelector)
          .nth(matchIndex)
          .textContent({ timeout: 5_000 })
          .catch(() => null);
        console.log(`[scraper] ${store.name}/${modelNumber} — searchPagePriceText:`, JSON.stringify(searchPriceText));
        const searchPriceNum = parseFloat((searchPriceText ?? '').replace(/[^\d.]/g, ''));
        const isRentalPrice = /ליום|לשעה|\/יום/.test(searchPriceText ?? '');
        if (isRentalPrice) {
          console.log(`[scraper] ${store.name}/${modelNumber} — rental price indicator in price text, skipping search-page price`);
        } else if (!isNaN(searchPriceNum) && searchPriceNum > 0) {
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
