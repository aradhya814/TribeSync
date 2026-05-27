import Link from 'next/link'

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-background text-white">
      <section className="relative min-h-[92vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-background/65" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-6 py-20">
          <p className="caption text-tribe-primary">Agentic influencer deal infrastructure</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">TribeSync</h1>
          <p className="mt-5 max-w-2xl text-lg text-text-mid">
            AI agents move Indian MSME influencer deals from campaign brief to escrow, proof verification, invoice, and payout.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary rounded-lg px-5 py-3 text-sm font-semibold">
              Start deal flow
            </Link>
            <Link href="/login" className="btn-ghost rounded-lg px-5 py-3 text-sm font-semibold">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-14 md:grid-cols-3">
        {[
          ['WhatsApp chaos', 'Briefs, negotiation, proof, and payout tracking disappear across chats.'],
          ['Escrow by default', 'Brands fund once. Creators see accountability before work begins.'],
          ['Agent feed', 'Every autonomous step is visible, auditable, and paused at human decisions.'],
        ].map(([title, body]) => (
          <div key={title} className="glass-card p-5">
            <h2 className="heading-2">{title}</h2>
            <p className="body-text mt-3">{body}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
