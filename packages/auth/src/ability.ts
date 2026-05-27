import type { CreateAbility, ForcedSubject, MongoAbility } from '@casl/ability'
import { createMongoAbility } from '@casl/ability'

import type { User } from './roles.js'

type AppSubjects = 'User' | (User & ForcedSubject<'User'>) | 'all'

type AppAbilities = [
  'manage' | 'invite' | 'delete' | 'update',
  AppSubjects,
]

export type AppAbility = MongoAbility<AppAbilities>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>
