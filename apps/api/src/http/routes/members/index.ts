import fp from 'fastify-plugin'

import { deleteMemberRoute } from './delete-member.js'
import { getMembersRoute } from './get-members.js'
import { updateMemberRoleRoute } from './update-member-role.js'

export const memberRoutes = fp(async (app) => {
  app.register(getMembersRoute)
  app.register(updateMemberRoleRoute)
  app.register(deleteMemberRoute)
})
