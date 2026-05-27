import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="caption text-tribe-primary">About</p>
          <h1 className="heading-1 mt-3">Built for accountable creator commerce</h1>
        </div>
        <div className="glass-card p-6">
          <p className="body-text text-base leading-7">
            TribeSync turns influencer collaborations into a structured workflow for Indian MSMEs and creators:
            campaign parsing, creator ranking, outreach, escrow, milestone proof, invoices, and payout operations.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass-card p-5">
            <h2 className="heading-2">Mission</h2>
            <p className="body-text mt-3">Remove operational friction from small brand creator deals without hiding automation from users.</p>
          </div>
          <div className="glass-card p-5">
            <h2 className="heading-2">Hackathon build</h2>
            <p className="body-text mt-3">Built as an OpenAI x Outskill AI Builders Hackathon project with Codex session evidence.</p>
          </div>
        </div>
        <Link href="/" className="btn-ghost inline-flex rounded-lg px-5 py-3 text-sm font-semibold">
          Back home
        </Link>
      </div>
    </main>
  )
}
