import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTool } from '../services/api';
import StoreRow from '../components/StoreRow';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import PriceBadge from '../components/PriceBadge';

export default function ComparisonPage() {
  const { modelNumber } = useParams<{ modelNumber: string }>();

  const {
    data: tool,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tool', modelNumber],
    queryFn: () => fetchTool(modelNumber!),
    enabled: !!modelNumber,
  });

  useEffect(() => {
    if (tool) {
      document.title = `${tool.name} (${tool.model_number}) — Makita Price Comparison`;
    } else {
      document.title = 'Makita Price Comparison';
    }
    return () => {
      document.title = 'Makita Price Comparison';
    };
  }, [tool]);

  if (isLoading) return <LoadingState count={4} />;

  if (isError) {
    const msg = (error as Error).message ?? '';
    const is404 = msg.includes('not found') || msg.includes('404');
    if (is404) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="text-5xl">🔍</div>
          <p className="text-gray-600 text-lg">
            Tool <span className="font-mono font-bold">{modelNumber}</span> not found.
          </p>
          <Link to="/" className="text-makita-teal hover:underline text-sm">
            Back to all tools
          </Link>
        </div>
      );
    }
    return (
      <ErrorState
        message="Could not load tool details. Is the backend running?"
        onRetry={() => void refetch()}
      />
    );
  }

  if (!tool) return null;

  const availableListings = tool.listings.filter((l) => l.is_available);
  const lowestListing = availableListings[0] ?? null;

  const latestScrape =
    tool.listings
      .map((l) => l.last_scraped_at)
      .filter((d): d is string => !!d)
      .sort()
      .slice(-1)[0] ?? null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/"
        className="text-sm text-makita-teal hover:underline inline-flex items-center gap-1"
      >
        All tools
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row gap-6">
        {tool.image_url && (
          <div className="flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-lg w-full sm:w-40 h-40 p-3">
            <img
              src={tool.image_url}
              alt={tool.name}
              className="h-full object-contain"
            />
          </div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <span className="text-xs font-medium text-makita-blue bg-blue-50 px-2 py-0.5 rounded-full w-fit">
            {tool.category}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{tool.name}</h1>
          <p className="text-xl text-gray-700 font-mono font-semibold">{tool.model_number}</p>
          {tool.description && (
            <p className="text-sm text-gray-600">{tool.description}</p>
          )}
          {lowestListing && (
            <div className="mt-auto pt-2">
              <p className="text-xs text-gray-400 mb-0.5">Best price</p>
              <PriceBadge
                price={lowestListing.price}
                currency={lowestListing.currency}
                size="lg"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-800">
            {tool.listings.length} store{tool.listings.length !== 1 ? 's' : ''}
          </h2>
          {latestScrape && (
            <p className="text-xs text-gray-400">
              Last updated: {new Date(latestScrape).toLocaleString('he-IL')}
            </p>
          )}
        </div>

        {tool.listings.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            No store listings yet. Check back after the next price scrape.
          </div>
        ) : (
          <>
            {tool.listings.length === 1 && (
              <p className="text-sm text-gray-500 italic">
                Only one store currently carries this tool.
              </p>
            )}
            <div className="space-y-2">
              {tool.listings.map((listing, i) => (
                <StoreRow key={listing.store_id} listing={listing} rank={i + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
