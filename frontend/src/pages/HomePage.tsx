import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTools, fetchCategories, triggerScrape, fetchScrapeStatus } from '../services/api';
import ToolCard from '../components/ToolCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scrape panel state
  const [showScrapePanel, setShowScrapePanel] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [activeSecret, setActiveSecret] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: scrapeStatus } = useQuery({
    queryKey: ['scrapeStatus'],
    queryFn: () => fetchScrapeStatus(activeSecret!),
    enabled: activeSecret !== null,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'running' || s === 'idle' ? 2000 : false;
    },
  });

  useEffect(() => {
    if (scrapeStatus?.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: ['tools'] });
    }
  }, [scrapeStatus?.status, queryClient]);

  async function handleScrapeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScrapeError(null);
    setIsTriggering(true);
    try {
      await triggerScrape(secretInput);
      setActiveSecret(secretInput);
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Failed to start scrape');
    } finally {
      setIsTriggering(false);
    }
  }

  function handleScrapeClose() {
    setShowScrapePanel(false);
    setSecretInput('');
    setActiveSecret(null);
    setScrapeError(null);
  }

  useEffect(() => {
    document.title = 'Makita Price Comparison — Browse Tools';
  }, []);

  const {
    data: categories = [],
    isError: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const {
    data: tools = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['tools', selectedCategory, searchQuery],
    queryFn: () =>
      fetchTools({
        category: selectedCategory || undefined,
        q: searchQuery || undefined,
      }),
  });

  const isRunning = scrapeStatus?.status === 'running';
  const isDone = scrapeStatus?.status === 'completed' || scrapeStatus?.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Makita Tools</h1>
          <p className="text-gray-500 mt-1">
            Compare prices across authorized retailers in Israel
          </p>
        </div>
        <button
          onClick={() => setShowScrapePanel((v) => !v)}
          className="shrink-0 mt-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-makita-teal hover:text-makita-teal transition-colors"
        >
          Refresh prices
        </button>
      </div>

      {/* Scrape panel */}
      {showScrapePanel && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          {!activeSecret ? (
            <form onSubmit={(e) => void handleScrapeSubmit(e)} className="flex gap-2 items-center">
              <input
                type="password"
                placeholder="Operator secret…"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-makita-teal focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isTriggering || !secretInput}
                className="px-4 py-1.5 rounded-lg bg-makita-blue text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isTriggering ? 'Starting…' : 'Scrape all'}
              </button>
              <button type="button" onClick={handleScrapeClose} className="text-gray-400 hover:text-gray-600 text-sm">
                Cancel
              </button>
              {scrapeError && <p className="text-red-500 text-sm">{scrapeError}</p>}
            </form>
          ) : isRunning ? (
            <p className="text-sm text-gray-600">
              Running… {scrapeStatus.stores_scraped} listing{scrapeStatus.stores_scraped !== 1 ? 's' : ''} updated so far.
            </p>
          ) : isDone ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-700">
                {scrapeStatus.status === 'completed'
                  ? `Done — ${scrapeStatus.stores_scraped} listings updated${scrapeStatus.errors > 0 ? `, ${scrapeStatus.errors} errors` : ''}.`
                  : `Scrape failed (${scrapeStatus.errors} error${scrapeStatus.errors !== 1 ? 's' : ''}).`}
              </p>
              <button onClick={handleScrapeClose} className="text-sm text-makita-teal hover:underline">
                Close
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Waiting for scrape to start…</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or model…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-makita-teal focus:border-transparent"
        />
        {!categoriesError && categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-makita-teal focus:border-transparent"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState count={8} />
      ) : isError ? (
        <ErrorState
          message="Could not load tools. Is the backend running?"
          onRetry={() => void refetch()}
        />
      ) : tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="text-5xl">🔍</div>
          <p className="text-gray-500 text-lg">No tools found.</p>
          {(selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSearchQuery('');
              }}
              className="text-makita-teal hover:underline text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            {tools.length} tool{tools.length !== 1 ? 's' : ''}
            {selectedCategory ? ` in ${selectedCategory}` : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
