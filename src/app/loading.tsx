export default function Loading() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-elevated" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-xl bg-surface" />
          <div className="h-32 animate-pulse rounded-xl bg-surface" />
          <div className="h-32 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    </main>
  )
}
