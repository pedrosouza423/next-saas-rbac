import { AbilityBuilder } from '@casl/ability'

import type { AppAbility } from './ability.js'
import type { User } from './models/user.js'
import type { Role } from './roles.js'

type PermissionsByRole = (user: User, builder: AbilityBuilder<AppAbility>) => void

export const permissions: Record<Role, PermissionsByRole> = {
  ADMIN(user, { can, cannot }) {
    can('manage', 'all')

    cannot(['transfer_ownership', 'update'], 'Organization')
    can(['transfer_ownership', 'update'], 'Organization', {
      ownerId: { $eq: user.id },
    })
  },

  MEMBER(user, { can }) {
    can('get', 'User')
    can('invite', 'User')
    can(['create', 'get'], 'Project')
    can(['update', 'delete'], 'Project', { ownerId: { $eq: user.id } })
  },

  BILLING(_, { can }) {
    can('manage', 'Billing')
  },
}
