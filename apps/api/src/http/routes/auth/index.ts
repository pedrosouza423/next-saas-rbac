import fp from 'fastify-plugin'

import { authenticateWithPasswordRoute } from './authenticate-with-password.js'
import { createAccountRoute } from './create-account.js'
import { getProfileRoute } from './get-profile.js'
import { requestPasswordRecoverRoute } from './request-password-recover.js'
import { resetPasswordRoute } from './reset-password.js'

export const authRoutes = fp(async (app) => {
  app.register(createAccountRoute)
  app.register(authenticateWithPasswordRoute)
  app.register(getProfileRoute)
  app.register(requestPasswordRecoverRoute)
  app.register(resetPasswordRoute)
})
