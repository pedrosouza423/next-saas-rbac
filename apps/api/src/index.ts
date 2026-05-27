import { defineAbilityFor } from '@saas/auth'

const memberAbility = defineAbilityFor({ id: 'user-1', role: 'MEMBER' })

console.log('--- MEMBER ---')
console.log('invite User?      ', memberAbility.can('invite', 'User'))      // true
console.log('invite Project?   ', memberAbility.can('invite', 'Project'))   // false
console.log('create Project?   ', memberAbility.can('create', 'Project'))   // false
console.log('delete Project?   ', memberAbility.can('delete', 'Project'))   // false
console.log('configure Project?', memberAbility.can('configure', 'Project')) // false

const adminAbility = defineAbilityFor({ id: 'user-2', role: 'ADMIN' })

console.log('\n--- ADMIN ---')
console.log('manage all?       ', adminAbility.can('manage', 'User'))      // true
console.log('create Project?   ', adminAbility.can('create', 'Project'))   // true
console.log('delete Project?   ', adminAbility.can('delete', 'Project'))   // true
console.log('configure Project?', adminAbility.can('configure', 'Project')) // true
console.log('invite User?      ', adminAbility.can('invite', 'User'))      // true
console.log('invite Project?   ', adminAbility.can('invite', 'Project'))   // false
