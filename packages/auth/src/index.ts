import { AbilityBuilder } from '@casl/ability'

import { createAppAbility } from './ability.js'
import type { User } from './models/user.js'
import { permissions } from './permissions.js'

export * from './ability.js'
export * from './assert-can.js'
export * from './models/organization.js'
export * from './models/project.js'
export * from './models/user.js'
export * from './roles.js'
export * from './subjects/billing.js'
export * from './subjects/invite.js'
export * from './subjects/organization.js'
export * from './subjects/project.js'
export * from './subjects/user.js'

export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  if (typeof permissions[user.role] === 'function') {
    permissions[user.role](user, builder)
  } else {
    throw new Error(`${user.role} not found`)
  }

  return builder.build({
    detectSubjectType(subject) {
      return subject.__typename
    },
  })
}
