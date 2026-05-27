'use client'

import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass-card max-w-md p-6 text-center">
        <p className="caption text-tribe-primary">Error</p>
        <h1 className="heading-1 mt-3">Something broke</h1>
        <p className="body-text mt-3">Retry the request. If it keeps failing, check the API keys and database connection.</p>
        <Button className="mt-6 bg-tribe-primary hover:bg-tribe-primary-hover" onClick={reset}>
          Retry
        </Button>
      </div>
    </main>
  )
}
