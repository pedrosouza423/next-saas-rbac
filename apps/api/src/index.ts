import { defineAbilityFor, organizationSchema, projectSchema, userSchema } from '@saas/auth'

const memberUser = userSchema.parse({ id: 'user-1', role: 'MEMBER' })
const memberAbility = defineAbilityFor(memberUser)

console.log('--- MEMBER ---')
console.log('get User?              ', memberAbility.can('get', 'User'))
console.log('invite User?           ', memberAbility.can('invite', 'User'))
console.log('create Project?        ', memberAbility.can('create', 'Project'))

const ownProject = projectSchema.parse({ id: 'proj-1', ownerId: 'user-1' })
const otherProject = projectSchema.parse({ id: 'proj-2', ownerId: 'user-99' })
console.log('delete own Project?    ', memberAbility.can('delete', ownProject))
console.log('delete other Project?  ', memberAbility.can('delete', otherProject))

const adminUser = userSchema.parse({ id: 'user-2', role: 'ADMIN' })
const adminAbility = defineAbilityFor(adminUser)

console.log('\n--- ADMIN ---')
console.log('delete Project?        ', adminAbility.can('delete', 'Project'))

const ownOrg = organizationSchema.parse({ id: 'org-1', ownerId: 'user-2' })
const otherOrg = organizationSchema.parse({ id: 'org-2', ownerId: 'user-99' })
console.log('transfer own Org?      ', adminAbility.can('transfer_ownership', ownOrg))
console.log('transfer other Org?    ', adminAbility.can('transfer_ownership', otherOrg))

const billingUser = userSchema.parse({ id: 'user-3', role: 'BILLING' })
const billingAbility = defineAbilityFor(billingUser)

console.log('\n--- BILLING ---')
console.log('manage Billing?        ', billingAbility.can('manage', 'Billing'))
console.log('export Billing?        ', billingAbility.can('export', 'Billing'))
