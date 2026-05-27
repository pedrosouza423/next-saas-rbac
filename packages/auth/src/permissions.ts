import { AbilityBuilder } from '@casl/ability'

import { AppAbility } from './ability.js'
import { Role, User } from './roles.js'

type PermissionsByRole = (
  user: User,
  builder: AbilityBuilder<AppAbility>
) => void

export const permissions: Record<Role, PermissionsByRole> = {
  ADMIN(_user, { can }) {
    can('manage', 'all')
  },
  MEMBER(user, { can, cannot }) {
    can('invite', 'User')
    cannot('delete', 'User')
    can('update', 'User', { id: user.id })
  },
}
