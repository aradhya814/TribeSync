import Link from 'next/link'

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="caption text-tribe-primary">Pricing</p>
          <h1 className="heading-1 mt-3">10% only when a deal closes</h1>
          <p className="body-text mt-4 max-w-2xl">No retainers. No seat fees during validation. TribeSync earns when escrow-backed work completes.</p>
        </div>
        <div className="glass-card-elevated p-6">
          <p className="metric-label">Platform fee</p>
          <p className="mt-2 text-5xl font-bold text-white">10%</p>
          <p className="body-text mt-3">Automatically calculated from the agreed deal amount.</p>
        </div>
        <div className="grid gap-4">
          {[
            ['When is the fee charged?', 'When the deal is completed, invoiced, and paid.'],
            ['Who pays?', 'The platform fee is part of the deal economics shown before escrow funding.'],
            ['Can disputes pause payout?', 'Yes. Disputes freeze escrow until an admin resolution.'],
          ].map(([question, answer]) => (
            <div key={question} className="glass-card p-5">
              <h2 className="text-base font-semibold text-white">{question}</h2>
              <p className="body-text mt-2">{answer}</p>
            </div>
          ))}
        </div>
        <Link href="/register" className="btn-primary inline-flex rounded-lg px-5 py-3 text-sm font-semibold">
          Start
        </Link>
      </div>
    </main>
  )
}
