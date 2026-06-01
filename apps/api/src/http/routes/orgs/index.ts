import fp from 'fastify-plugin'

import { createOrgRoute } from './create-org.js'
import { deleteOrgRoute } from './delete-org.js'
import { getOrgRoute } from './get-org.js'
import { getOrgMembershipRoute } from './get-org-membership.js'
import { getOrgsRoute } from './get-orgs.js'
import { transferOrgOwnershipRoute } from './transfer-org-ownership.js'
import { updateOrgRoute } from './update-org.js'

export const orgRoutes = fp(async (app) => {
  app.register(createOrgRoute)
  app.register(getOrgsRoute)
  app.register(getOrgRoute)
  app.register(getOrgMembershipRoute)
  app.register(updateOrgRoute)
  app.register(deleteOrgRoute)
  app.register(transferOrgOwnershipRoute)
})
