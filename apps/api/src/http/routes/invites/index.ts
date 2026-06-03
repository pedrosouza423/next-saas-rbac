import fp from 'fastify-plugin'

import { acceptInviteRoute } from './accept-invite.js'
import { createInviteRoute } from './create-invite.js'
import { getInviteRoute } from './get-invite.js'
import { getInvitesRoute } from './get-invites.js'
import { getPendingInvitesRoute } from './get-pending-invites.js'
import { rejectInviteRoute } from './reject-invite.js'
import { revokeInviteRoute } from './revoke-invite.js'

export const inviteRoutes = fp(async (app) => {
  app.register(createInviteRoute)
  app.register(getInvitesRoute)
  app.register(getInviteRoute)
  app.register(acceptInviteRoute)
  app.register(rejectInviteRoute)
  app.register(revokeInviteRoute)
  app.register(getPendingInvitesRoute)
})
