import { defineAbilityFor } from '@saas/auth'

const ability = defineAbilityFor({ id: 'user-1', role: 'MEMBER' })

console.log('MEMBER pode convidar (invite User)?', ability.can('invite', 'User'))
console.log('MEMBER pode deletar (delete User)?', ability.can('delete', 'User'))
