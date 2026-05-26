# AGENTS.md — TribeSync

## Project
Agentic influencer deal platform for Indian MSMEs and creators.
Stack: Next.js 14 App Router, TypeScript strict, PostgreSQL,
Drizzle ORM, NextAuth v5, Anthropic Claude API, Razorpay,
Pusher, Cloudflare R2, Resend. Deploy on Railway.

## Non-Negotiable Rules
- TypeScript strict. Zero any types.
- Every API route checks session before touching DB.
- Never write to profiles.bio — use enriched_summary only.
- DB triggers enforce deal state machine. Never bypass.
- Money always displayed with toLocaleString en-IN.
- Ranking: avg_views x 0.40 + view_ratio x 0.25 + deal_completion x 0.20 + recency x 0.15

## API Route Pattern
const session = await auth()
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

## Model Selection
gpt-5.5 suggest = schema, triggers, DealOriginationAgent, AgentActivityFeed
codex-mini-latest auto-edit = all pages, components, routes
codex-mini-latest suggest = Razorpay and NextAuth only
gpt-4.1 auto-edit = all three dashboards

## Colours
tribe-primary #EF5B5B | background #0D0F14
Classes: glass-card btn-primary btn-ghost metric-card
badge-active badge-pending badge-disputed badge-paid badge-draft
