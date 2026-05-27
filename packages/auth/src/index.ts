import { AbilityBuilder } from '@casl/ability'

import { createAppAbility } from './ability.js'
import { permissions } from './permissions.js'
import { User } from './roles.js'

export * from './ability.js'
export * from './project.js'
export * from './roles.js'

export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  if (typeof permissions[user.role] === 'function') {
    permissions[user.role](user, builder)
  } else {
    throw new Error(`${user.role} not found`)
  }

  return builder.build()
}
