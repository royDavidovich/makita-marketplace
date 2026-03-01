interface PriceBadgeProps {
  price: number | null | undefined;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LOCALE_MAP: Record<string, string> = {
  ILS: 'he-IL',
};

export default function PriceBadge({ price, currency = 'ILS', size = 'md' }: PriceBadgeProps) {
  if (price == null) {
    return <span className="text-gray-400 font-medium">–</span>;
  }

  const locale = LOCALE_MAP[currency] ?? 'he-IL';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className={`font-bold text-makita-teal ${sizeClass}`}>
      {formatted}
    </span>
  );
}
