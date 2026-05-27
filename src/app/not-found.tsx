import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-white">
      <div className="glass-card max-w-md p-6 text-center">
        <p className="caption text-tribe-primary">404</p>
        <h1 className="heading-1 mt-3">Page not found</h1>
        <p className="body-text mt-3">The TribeSync page you opened does not exist or is no longer available.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex rounded-lg px-5 py-3 text-sm font-semibold">
          Go home
        </Link>
      </div>
    </main>
  )
}
