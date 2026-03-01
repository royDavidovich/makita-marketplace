const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// --- Types ---

export interface ToolSummary {
  id: number;
  model_number: string;
  name: string;
  category: string;
  image_url: string | null;
  lowest_price: number | null;
  lowest_price_store: string | null;
  currency: string;
  listing_count: number;
}

export interface StoreListing {
  store_id: number;
  store_name: string;
  price: number | null;
  currency: string;
  product_url: string | null;
  is_available: boolean;
  last_scraped_at: string | null;
}

export interface ToolDetail {
  id: number;
  model_number: string;
  name: string;
  category: string;
  image_url: string | null;
  description: string | null;
  listings: StoreListing[];
}

// --- API calls ---

export function fetchTools(params?: { category?: string; q?: string }): Promise<ToolSummary[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ToolSummary[]>(`/api/tools${query}`);
}

export function fetchTool(modelNumber: string): Promise<ToolDetail> {
  return apiFetch<ToolDetail>(`/api/tools/${encodeURIComponent(modelNumber)}`);
}

export function fetchCategories(): Promise<string[]> {
  return apiFetch<string[]>('/api/categories');
}

export interface StoreInfo {
  name: string;
}

export function fetchStores(): Promise<StoreInfo[]> {
  return apiFetch<StoreInfo[]>('/api/stores');
}

// --- Scrape API (operator only) ---

export interface ScrapeStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  tools_scraped: number;
  stores_scraped: number;
  errors: number;
}

export interface ScrapeFilter {
  modelNumbers?: string[];
  storeNames?: string[];
}

export async function triggerScrape(secret: string, filter?: ScrapeFilter): Promise<void> {
  const qs = new URLSearchParams();
  if (filter?.modelNumbers?.length) qs.set('modelNumbers', filter.modelNumbers.join(','));
  if (filter?.storeNames?.length) qs.set('storeNames', filter.storeNames.join(','));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${BASE_URL}/api/scrape/run${query}`, {
    method: 'POST',
    headers: { 'X-Scrape-Secret': secret },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
}

export async function fetchScrapeStatus(secret: string): Promise<ScrapeStatus> {
  const res = await fetch(`${BASE_URL}/api/scrape/status`, {
    headers: { 'X-Scrape-Secret': secret },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const json = await res.json() as { data: ScrapeStatus };
  return json.data;
}
