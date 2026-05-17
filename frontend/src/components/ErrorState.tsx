interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-gray-600 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-makita-blue text-white rounded-lg hover:bg-blue-900 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
