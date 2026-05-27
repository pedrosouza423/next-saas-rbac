import { strictEqual } from 'node:assert'

import {
  defineAbilityFor,
  organizationCan,
  organizationSchema,
  projectCan,
  projectSchema,
  userSchema,
} from '@saas/auth'

// --- MEMBER ---
const memberUser = userSchema.parse({ id: 'user-1', role: 'MEMBER' })
const memberAbility = defineAbilityFor(memberUser)

strictEqual(memberAbility.can('get', 'User'), true, 'MEMBER can get User')
strictEqual(memberAbility.can('invite', 'User'), true, 'MEMBER can invite User')
strictEqual(memberAbility.can('create', 'Project'), true, 'MEMBER can create Project')

const ownProject = projectSchema.parse({ id: 'proj-1', ownerId: 'user-1' })
const otherProject = projectSchema.parse({ id: 'proj-2', ownerId: 'user-99' })
// projectCan enforces object subject for ABAC-conditioned actions
strictEqual(projectCan(memberAbility, 'delete', ownProject), true, 'MEMBER can delete own Project')
strictEqual(projectCan(memberAbility, 'delete', otherProject), false, 'MEMBER cannot delete other Project')

// --- ADMIN ---
const adminUser = userSchema.parse({ id: 'user-2', role: 'ADMIN' })
const adminAbility = defineAbilityFor(adminUser)

strictEqual(adminAbility.can('delete', 'Project'), true, 'ADMIN can delete any Project by type')

const ownOrg = organizationSchema.parse({ id: 'org-1', ownerId: 'user-2' })
const otherOrg = organizationSchema.parse({ id: 'org-2', ownerId: 'user-99' })
strictEqual(organizationCan(adminAbility, 'transfer_ownership', ownOrg), true, 'ADMIN can transfer own Org')
strictEqual(organizationCan(adminAbility, 'transfer_ownership', otherOrg), false, 'ADMIN cannot transfer other Org')

// --- BILLING ---
const billingUser = userSchema.parse({ id: 'user-3', role: 'BILLING' })
const billingAbility = defineAbilityFor(billingUser)

strictEqual(billingAbility.can('manage', 'Billing'), true, 'BILLING can manage Billing')
strictEqual(billingAbility.can('export', 'Billing'), true, 'BILLING can export Billing')

console.log('All assertions passed.')
