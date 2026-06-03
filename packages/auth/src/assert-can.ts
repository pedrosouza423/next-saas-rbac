import type { AppAbility } from './ability.js'
import type { Organization } from './models/organization.js'
import type { Project } from './models/project.js'
import type { User } from './models/user.js'

// CASL skips condition evaluation when ability.can() receives a string subject.
// Rules like `can('delete', 'Project', { ownerId })` always return true for
// ability.can('delete', 'Project') — the condition is only checked against instances.
//
// This wrapper enforces that callers must pass an object for actions that have
// ownership conditions, making the bypass a compile-time error instead of a
// silent runtime bug.

export function projectCan(
  ability: AppAbility,
  action: 'update' | 'delete',
  subject: Project,
): boolean {
  return ability.can(action, subject)
}

export function organizationCan(
  ability: AppAbility,
  action: 'update' | 'delete' | 'transfer_ownership',
  subject: Organization,
): boolean {
  return ability.can(action, subject)
}

export function userCan(
  ability: AppAbility,
  action: 'delete' | 'update',
  subject: User,
): boolean {
  return ability.can(action, subject)
}
