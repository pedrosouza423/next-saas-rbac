import { defineAbilityFor } from '@saas/auth'

const memberAbility = defineAbilityFor({ id: 'user-1', role: 'MEMBER' })

console.log('--- MEMBER ---')
console.log('invite User?      ', memberAbility.can('invite', 'User'))

const adminAbility = defineAbilityFor({ id: 'user-2', role: 'ADMIN' })

console.log('\n--- ADMIN ---')
console.log('invite User?      ', adminAbility.can('invite', 'User'))
console.log('create Project?   ', adminAbility.can('create', 'Project'))
console.log('delete Project?   ', adminAbility.can('delete', 'Project'))
console.log('configure Project?', adminAbility.can('configure', 'Project'))
