import { defineAbilityFor } from '@saas/auth'

const memberAbility = defineAbilityFor({ id: 'user-1', role: 'MEMBER' })

console.log('--- MEMBER ---')
console.log('invite User?   ', memberAbility.can('invite', 'User'))    // true
console.log('create Project?', memberAbility.can('create', 'Project'))  // true
console.log('delete Project?', memberAbility.can('delete', 'Project'))  // true
console.log('configure Project?', memberAbility.can('configure', 'Project')) // true
console.log('manage all?    ', memberAbility.can('manage', 'User'))    // false

const adminAbility = defineAbilityFor({ id: 'user-2', role: 'ADMIN' })

console.log('\n--- ADMIN ---')
console.log('manage all?    ', adminAbility.can('manage', 'User'))     // true
console.log('invite User?   ', adminAbility.can('invite', 'User'))     // true (manage = all)
