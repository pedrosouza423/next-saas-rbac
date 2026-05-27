import type { CreateAbility, MongoAbility } from '@casl/ability'
import { createMongoAbility } from '@casl/ability'

import type { BillingSubject } from './subjects/billing.js'
import type { InviteSubject } from './subjects/invite.js'
import type { OrganizationSubject } from './subjects/organization.js'
import type { ProjectSubject } from './subjects/project.js'
import type { UserSubject } from './subjects/user.js'

type AppAbilities =
  | UserSubject
  | ProjectSubject
  | OrganizationSubject
  | InviteSubject
  | BillingSubject
  | ['manage', 'all']

export type AppAbility = MongoAbility<AppAbilities>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>
