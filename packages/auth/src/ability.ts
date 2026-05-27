import type { CreateAbility, ForcedSubject, MongoAbility } from '@casl/ability'
import { createMongoAbility } from '@casl/ability'

import type { Project } from './project.js'
import type { User } from './roles.js'

type AppSubjects =
  | 'all'
  | 'User'
  | (User & ForcedSubject<'User'>)
  | 'Project'
  | (Project & ForcedSubject<'Project'>)

type AppAbilities = [
  'manage' | 'invite' | 'create' | 'delete' | 'configure',
  AppSubjects,
]

export type AppAbility = MongoAbility<AppAbilities>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>
