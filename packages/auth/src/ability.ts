import type { CreateAbility, ForcedSubject, MongoAbility } from '@casl/ability'
import { createMongoAbility } from '@casl/ability'

import type { Project } from './project.js'
import type { User } from './roles.js'

type UserSubject = 'User' | (User & ForcedSubject<'User'>)
type ProjectSubject = 'Project' | (Project & ForcedSubject<'Project'>)

// invite appears on both subjects so ADMIN can use cannot('invite', 'Project')
// to override manage-all at runtime. The restriction is enforced by permissions,
// not by narrowing this type.
type AppAbilities =
  | ['manage', UserSubject | ProjectSubject | 'all']
  | ['invite', UserSubject | ProjectSubject]
  | ['create' | 'delete' | 'configure', ProjectSubject]

export type AppAbility = MongoAbility<AppAbilities>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>
