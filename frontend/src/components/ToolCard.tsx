import { Link } from 'react-router-dom';
import type { ToolSummary } from '../services/api';
import PriceBadge from './PriceBadge';

interface ToolCardProps {
  tool: ToolSummary;
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      to={`/tools/${tool.model_number}`}
      className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-makita-teal transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="bg-gray-50 h-48 flex items-center justify-center overflow-hidden p-4">
        {tool.image_url ? (
          <img
            src={tool.image_url}
            alt={tool.name}
            className="h-full object-contain group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="text-gray-300 text-6xl">🔧</div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Category chip */}
        <span className="text-xs font-medium text-makita-blue bg-blue-50 px-2 py-0.5 rounded-full w-fit">
          {tool.category}
        </span>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
          {tool.name}
        </h3>

        {/* Model number */}
        <p className="text-xs text-gray-500 font-mono">{tool.model_number}</p>

        {/* Price */}
        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            {tool.lowest_price != null ? (
              <>
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <PriceBadge price={tool.lowest_price} currency={tool.currency} size="lg" />
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">No prices yet</span>
            )}
          </div>
          {tool.listing_count > 1 && (
            <span className="text-xs text-gray-400">{tool.listing_count} stores</span>
          )}
        </div>
      </div>
    </Link>
  );
}
