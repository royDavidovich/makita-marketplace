import type { StoreListing } from '../services/api';
import PriceBadge from './PriceBadge';

interface StoreRowProps {
  listing: StoreListing;
  rank: number;
}

export default function StoreRow({ listing, rank }: StoreRowProps) {
  const hasLink =
    typeof listing.product_url === 'string' && listing.product_url.length > 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-makita-teal transition-colors gap-4">
      {/* Rank + store info */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-bold text-gray-300 w-5 shrink-0 text-right">
          {listing.is_available ? rank : '—'}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {listing.store_name}
          </p>
          {listing.last_scraped_at && (
            <p className="text-xs text-gray-400">
              Updated{' '}
              {new Date(listing.last_scraped_at).toLocaleDateString('he-IL')}
            </p>
          )}
        </div>
      </div>

      {/* Price + CTA */}
      <div className="flex items-center gap-3 shrink-0">
        {listing.is_available ? (
          <PriceBadge price={listing.price} currency={listing.currency} size="lg" />
        ) : (
          <span className="text-sm text-gray-400 italic">Price unavailable</span>
        )}

        {hasLink && listing.is_available ? (
          <a
            href={listing.product_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium bg-makita-teal text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            View at Store
          </a>
        ) : (
          <span className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-100 rounded-lg cursor-not-allowed whitespace-nowrap">
            Unavailable
          </span>
        )}
      </div>
    </div>
  );
}
