import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WorkWithMeForm } from '@/components/shared/WorkWithMeForm'
import { db } from '@/lib/db'
import { collabDeals, profiles, rankings } from '@/lib/db/schema'
import { and, count, eq, inArray } from 'drizzle-orm'

type PageProps = {
  params: {
    slug: string
  }
}

async function getProfile(slug: string) {
  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      niche: profiles.niche,
      location: profiles.location,
      enrichedSummary: profiles.enrichedSummary,
      enrichedTags: profiles.enrichedTags,
      platforms: profiles.platforms,
      bio: profiles.bio,
      avgViews: profiles.avgViews,
      subscribers: profiles.subscribers,
      viewSubscriberRatio: profiles.viewSubscriberRatio,
      deliveryReliabilityScore: profiles.deliveryReliabilityScore,
      isVerified: profiles.isVerified,
      rankPosition: rankings.rankPosition,
    })
    .from(profiles)
    .leftJoin(rankings, and(eq(rankings.userId, profiles.id), eq(rankings.period, 'weekly')))
    .where(eq(profiles.publicSlug, slug))
    .limit(1)

  if (!profile) return null

  const [dealStats] = await db
    .select({ dealsClosed: count() })
    .from(collabDeals)
    .where(and(eq(collabDeals.creatorId, profile.id), inArray(collabDeals.status, ['completed', 'invoiced', 'paid'])))

  return {
    ...profile,
    dealsClosed: dealStats?.dealsClosed ?? 0,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getProfile(params.slug)

  if (!profile) {
    return { title: 'Creator not found | TribeSync' }
  }

  return {
    title: `${profile.fullName ?? 'Creator'} | TribeSync`,
    description: profile.enrichedSummary ?? profile.bio ?? 'Creator profile on TribeSync',
  }
}

function stat(label: string, value: string | number | null) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <p className="caption">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value ?? '-'}</p>
    </div>
  )
}

export default async function PublicCreatorPage({ params }: PageProps) {
  const profile = await getProfile(params.slug)

  if (!profile) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="glass-card-elevated p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-surface text-2xl font-bold text-white">
                {(profile.fullName ?? 'TS').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.niche ? <span className="badge-active">{profile.niche}</span> : null}
                  {profile.isVerified ? <span className="badge-paid">Verified</span> : null}
                  {profile.location ? <span className="badge-draft">{profile.location}</span> : null}
                </div>
                <h1 className="heading-1">{profile.fullName ?? 'Creator'}</h1>
                <p className="body-text mt-2">{profile.enrichedSummary ?? 'Profile enrichment pending.'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stat('Avg views', (profile.avgViews ?? 0).toLocaleString('en-IN'))}
            {stat('Subscribers', (profile.subscribers ?? 0).toLocaleString('en-IN'))}
            {stat('View ratio', profile.viewSubscriberRatio)}
            {stat('Rank', profile.rankPosition ? `#${profile.rankPosition}` : '-')}
            {stat('Deals closed', profile.dealsClosed)}
            {stat('Delivery score', profile.deliveryReliabilityScore)}
          </div>

          <div className="glass-card p-5">
            <h2 className="heading-2">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.enrichedTags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-mid">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="glass-card p-5">
              <h2 className="heading-2">Platforms</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {(profile.platforms ?? []).map((platform) => (
                  <span key={platform} className="badge-draft capitalize">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h2 className="heading-2">Bio</h2>
              <p className="body-text mt-3">{profile.bio ?? 'No bio added yet.'}</p>
            </div>
          </div>
        </section>

        <aside className="glass-card-elevated h-fit p-5">
          <h2 className="heading-2">Work with me</h2>
          <p className="body-text mt-2">Send a collaboration brief directly to this creator.</p>
          <div className="mt-5">
            <WorkWithMeForm creatorId={profile.id} />
          </div>
        </aside>
      </div>
    </main>
  )
}
