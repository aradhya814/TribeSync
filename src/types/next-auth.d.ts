import type { DefaultSession } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'

import type { AppRole } from '@/lib/db/schema'

declare module 'next-auth' {
  interface User {
    role: AppRole
  }

  interface Session {
    user: {
      id: string
      role: AppRole
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    role?: AppRole
  }
}
