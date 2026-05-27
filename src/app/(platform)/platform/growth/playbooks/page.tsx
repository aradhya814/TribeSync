'use client'

import { useEffect, useState } from 'react'

type Tactic = {
  title?: string
  description?: string
  difficulty?: string
  expectedImpact?: string
  timeEstimate?: string
  emoji?: string
  proTips?: string[]
}

type Playbook = {
  id: string
  niche: string
  weekOf: string
  tactics: Tactic[]
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])

  useEffect(() => {
    void fetch('/api/growth/playbooks')
      .then((response) => response.json() as Promise<{ playbooks: Playbook[] }>)
      .then((data) => setPlaybooks(data.playbooks))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Growth</p>
        <h1 className="heading-1">Playbooks</h1>
      </div>
      {playbooks.map((playbook) => (
        <section key={playbook.id} className="space-y-4">
          <div>
            <h2 className="heading-2">{playbook.niche}</h2>
            <p className="caption">Week of {playbook.weekOf}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {playbook.tactics.map((tactic, index) => (
              <div key={`${playbook.id}-${index}`} className="glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{tactic.title ?? 'Tactic'}</h3>
                  <span className="badge-pending">{tactic.difficulty ?? 'medium'}</span>
                </div>
                <p className="body-text mt-3">{tactic.description}</p>
                <p className="caption mt-4">{tactic.expectedImpact ?? 'Expected impact'} · {tactic.timeEstimate ?? 'time varies'}</p>
                {tactic.proTips?.length ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-tribe-primary">Pro tips</summary>
                    <ul className="mt-2 space-y-1 text-sm text-text-mid">
                      {tactic.proTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
      {playbooks.length === 0 ? <div className="glass-card p-5"><p className="body-text">No playbooks generated yet.</p></div> : null}
    </div>
  )
}
