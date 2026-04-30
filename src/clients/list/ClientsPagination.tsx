import Icon from '@/components/ui/icon';

interface Props {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  loading: boolean;
  onPage: (p: number) => void;
}

export default function ClientsPagination({ page, pages, total, perPage, loading, onPage }: Props) {
  if (pages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const getPageNumbers = () => {
    const nums: (number | '...')[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) nums.push(i);
    } else {
      nums.push(1);
      if (page > 3) nums.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i);
      if (page < pages - 2) nums.push('...');
      nums.push(pages);
    }
    return nums;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-[hsl(220,14%,10%)]">
      <span className="text-xs text-[hsl(var(--text-muted))]">
        {from}–{to} из {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1 || loading}
          className="p-1.5 rounded text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,16%)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="ChevronLeft" size={14} />
        </button>

        {getPageNumbers().map((n, i) =>
          n === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-xs text-[hsl(var(--text-muted))]">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n as number)}
              disabled={loading}
              className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                n === page
                  ? 'bg-gold text-[hsl(220,16%,8%)]'
                  : 'text-[hsl(var(--text-dim))] hover:text-foreground hover:bg-[hsl(220,12%,16%)]'
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages || loading}
          className="p-1.5 rounded text-[hsl(var(--text-muted))] hover:text-foreground hover:bg-[hsl(220,12%,16%)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
