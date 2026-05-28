import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { db } from '@/lib/db'
import { profiles, userRoles, type AppRole } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)

        if (!parsed.success) {
          return null
        }

        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, parsed.data.email))
          .limit(1)

        if (!profile?.passwordHash || profile.status === 'suspended') {
          return null
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, profile.passwordHash)

        if (!passwordMatches) {
          return null
        }

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
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
        token.role = user.role
      }

      return token
    },
    session({ session, token }) {
      session.user.id = token.id ?? token.sub ?? ''
      session.user.role = token.role ?? 'creator'

      return session
    },
  },
})
