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
