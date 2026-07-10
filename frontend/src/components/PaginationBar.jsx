import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationBar({ pagination, page, onPageChange, loading, label = 'items' }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { total, totalPages, hasPrev, hasNext, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-4">
      <p className="text-sm text-gray-500">
        Showing {from}–{to} of {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!hasPrev || loading}
          onClick={() => onPageChange(page - 1)}
          className="btn-secondary p-2 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => onPageChange(p)}
            className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold transition-colors ${
              p === page
                ? 'bg-solar-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={!hasNext || loading}
          onClick={() => onPageChange(page + 1)}
          className="btn-secondary p-2 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
