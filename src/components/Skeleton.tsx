export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[hsl(220,12%,16%)] rounded ${className}`} />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

// Skeleton для строки в списке клиентов
export function ClientRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="hidden sm:flex items-center gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
      <Skeleton className="w-4 h-4 rounded shrink-0" />
    </div>
  );
}

// Skeleton для карточки статистики
export function StatCardSkeleton() {
  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  );
}

// Skeleton для страницы загрузки
export function AppLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-[hsl(220,16%,7%)] overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="w-56 shrink-0 border-r border-border bg-[hsl(220,16%,6%)] flex flex-col">
        <div className="px-5 py-5 border-b border-border space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <div className="mx-3 mt-3 mb-1">
          <Skeleton className="h-8 rounded-lg" />
        </div>
        <nav className="flex-1 py-2 px-3 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded" />
          ))}
        </nav>
      </div>
      {/* Main skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-40" />
          </div>
          <Skeleton className="h-8 w-28 rounded" />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton для списка клиентов
export function ClientsListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-8 w-32 rounded" />
      </div>
      <div className="border-b border-border px-6 py-3 flex gap-3">
        <Skeleton className="h-8 w-56 rounded" />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded" />
          ))}
        </div>
      </div>
      <div>
        {Array.from({ length: 8 }).map((_, i) => (
          <ClientRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
