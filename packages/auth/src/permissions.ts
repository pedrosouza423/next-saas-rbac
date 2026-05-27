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
  MEMBER(_user, { can }) {
    can('invite', 'User')
    can('create', 'Project')
    can('delete', 'Project')
    can('configure', 'Project')
  },
}
