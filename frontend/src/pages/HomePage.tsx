import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTools, fetchCategories } from '../services/api';
import ToolCard from '../components/ToolCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Makita Tools</h1>
        <p className="text-gray-500 mt-1">
          Compare prices across authorized retailers in Israel
        </p>
      </div>

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
