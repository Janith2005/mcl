export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'var(--ip-border)', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--ip-card-glass-bg)', border: '1px solid var(--ip-border-subtle)' }}>
      <Skeleton className="h-4 w-20 mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <Skeleton className="h-2 w-full mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? '40%' : undefined }} />
      ))}
    </div>
  )
}
