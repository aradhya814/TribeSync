'use client'

import { Building2, Loader2, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type RegisterRole = 'msme' | 'creator'

type RegisterResponse = {
  success?: boolean
  userId?: string
  error?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<RegisterRole>('msme')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [creatorCreated, setCreatorCreated] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: String(formData.get('fullName') ?? ''),
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        role,
      }),
    })

    const result = (await response.json()) as RegisterResponse
    setIsSubmitting(false)

    if (!response.ok || !result.success) {
      toast.error(result.error ?? 'Could not create account')
      return
    }

    toast.success('Account created')
    if (role === 'creator') {
      setCreatorCreated(true)
      return
    }

    router.push('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl border-hairline bg-surface">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-lg bg-tribe-primary text-sm font-bold text-white">
            TS
          </div>
          <CardTitle className="heading-2">Create your TribeSync account</CardTitle>
        </CardHeader>
        <CardContent>
          {creatorCreated ? (
            <div className="space-y-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div>
                <p className="text-lg font-semibold text-white">Creator account created</p>
                <p className="body-text mt-1">
                  Sign in and connect YouTube or Instagram in one OAuth flow to unlock verified average views and the higher Phyllo trust multiplier.
                </p>
              </div>
              <Button asChild className="bg-tribe-primary hover:bg-tribe-primary-hover">
                <Link href="/login">Sign in to connect</Link>
              </Button>
            </div>
          ) : (
            <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-xl border border-hairline bg-surface-elevated p-4 text-left transition',
                role === 'msme' && 'border-tribe-primary bg-tribe-primary/10',
              )}
              onClick={() => setRole('msme')}
            >
              <Building2 className="mb-4 size-6 text-tribe-primary" />
              <div className="font-semibold text-white">I am a Brand</div>
              <p className="mt-1 text-sm text-text-mid">Find creators and run accountable campaigns.</p>
            </button>

            <button
              type="button"
              className={cn(
                'rounded-xl border border-hairline bg-surface-elevated p-4 text-left transition',
                role === 'creator' && 'border-tribe-primary bg-tribe-primary/10',
              )}
              onClick={() => setRole('creator')}
            >
              <UserRound className="mb-4 size-6 text-tribe-primary" />
              <div className="font-semibold text-white">I am a Creator</div>
              <p className="mt-1 text-sm text-text-mid">Show performance and close verified deals.</p>
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full bg-tribe-primary hover:bg-tribe-primary-hover" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-text-mid">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-tribe-primary hover:text-tribe-primary-hover">
              Sign in
            </Link>
          </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
