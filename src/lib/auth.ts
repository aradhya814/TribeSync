import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { z } from 'zod'

import { db } from '@/lib/db'
import { notificationPrefs, profiles, userRoles, type AppRole } from '@/lib/db/schema'

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, parsed.data.email))
          .limit(1)

        if (!profile?.passwordHash || profile.status === 'suspended') return null

        const passwordMatches = await bcrypt.compare(parsed.data.password, profile.passwordHash)
        if (!passwordMatches) return null

        const [roleRow] = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, profile.id))
          .limit(1)

        return {
          id: profile.id,
          email: profile.email,
          name: profile.fullName ?? profile.email,
          role: roleRow?.role ?? ('creator' satisfies AppRole),
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      // Auto-create profile on first Google sign-in
      if (account?.provider === 'google' && user.email) {
        const email = user.email.toLowerCase()
        const [existing] = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.email, email))
          .limit(1)

        if (!existing) {
          const [created] = await db
            .insert(profiles)
            .values({
              email,
              fullName: user.name ?? email,
              avatarUrl: user.image ?? null,
              status: 'active',
            })
            .returning({ id: profiles.id })

          await db.insert(userRoles).values({ userId: created.id, role: 'creator' })
          await db.insert(notificationPrefs).values({ userId: created.id })
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      // Credentials login — role already set by authorize()
      if (user?.id) {
        token.id = user.id
        token.role = (user as { role?: AppRole }).role ?? 'creator'
        return token
      }

      // Google login — fetch profile from DB (only fires on initial sign-in)
      if (account?.provider === 'google' && token.email) {
        const email = token.email.toLowerCase()
        const [profile] = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.email, email))
          .limit(1)

        if (profile) {
          const [roleRow] = await db
            .select({ role: userRoles.role })
            .from(userRoles)
            .where(eq(userRoles.userId, profile.id))
            .limit(1)

          token.id = profile.id
          token.role = roleRow?.role ?? 'creator'
        }
      }

      return token
    },

    session({ session, token }) {
      session.user.id = token.id ?? token.sub ?? ''
      session.user.role = (token.role as AppRole) ?? 'creator'
      return session
    },
  },
})
