import type { CreateAbility, ForcedSubject, MongoAbility } from '@casl/ability'
import { createMongoAbility } from '@casl/ability'

import type { Project } from './project.js'
import type { User } from './roles.js'

type UserSubject = 'User' | (User & ForcedSubject<'User'>)
type ProjectSubject = 'Project' | (Project & ForcedSubject<'Project'>)

// invite is restricted to User only — Project has no invite concept
type AppAbilities =
  | ['manage', UserSubject | ProjectSubject | 'all']
  | ['invite', UserSubject]
  | ['create' | 'delete' | 'configure', ProjectSubject]

export type AppAbility = MongoAbility<AppAbilities>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>
