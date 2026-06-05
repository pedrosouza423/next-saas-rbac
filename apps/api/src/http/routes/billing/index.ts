import fp from 'fastify-plugin'

import { getOrganizationBillingRoute } from './get-organization-billing.js'

export const billingRoutes = fp(async (app) => {
  app.register(getOrganizationBillingRoute)
})
