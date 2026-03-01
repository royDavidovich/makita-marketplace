import fs from 'fs';
import path from 'path';

export interface StoreConfig {
  name: string;
  base_url: string;
  is_active: boolean;
  selectors?: {
    priceSelector?: string;
    searchPagePriceSelector?: string;
    productUrlPattern?: string;
    searchUrlPattern?: string;
    searchFormPageUrl?: string;
    searchInputSelector?: string;
    productLinkSelector?: string;
    /** If set, the first product link's text must contain this string (supports {model_number} placeholder).
     *  Use when the store's search returns unrelated results for missing items. */
    productLinkTextFilter?: string;
  };
}

export interface ToolConfig {
  model_number: string;
  name: string;
  category: string;
  image_url?: string;
  description?: string;
}

const CONFIG_DIR = path.resolve(__dirname, '../../../config');

function loadJson<T>(filename: string): T[] {
  const filePath = path.join(CONFIG_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[config] ${filename} not found at ${filePath}, returning empty array`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T[];
}

export function loadStores(): StoreConfig[] {
  const stores = loadJson<StoreConfig>('stores.json');
  const active = stores.filter((s) => s.is_active);
  if (active.length === 0) {
    console.warn('[config] No active stores found in config/stores.json');
  }
  return stores;
}

export function loadTools(): ToolConfig[] {
  const tools = loadJson<ToolConfig>('tools.json');
  if (tools.length === 0) {
    console.warn('[config] No tools found in config/tools.json');
  }
  return tools;
}
