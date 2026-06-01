import { defineAbilityFor, userSchema } from '@saas/auth'

interface Membership {
  userId: string
  role: 'ADMIN' | 'MEMBER' | 'BILLING'
}

export function buildUserAbility(membership: Membership) {
  return defineAbilityFor(
    userSchema.parse({ id: membership.userId, role: membership.role }),
  )
}
