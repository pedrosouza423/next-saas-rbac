import { AbilityBuilder } from '@casl/ability'

import { createAppAbility } from './ability.js'
import { permissions } from './permissions.js'
import { User } from './roles.js'

export * from './ability.js'
export * from './roles.js'

export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  permissions[user.role](user, builder)

  return builder.build()
}
