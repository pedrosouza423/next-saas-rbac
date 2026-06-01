import fp from 'fastify-plugin'

import { createProjectRoute } from './create-project.js'
import { deleteProjectRoute } from './delete-project.js'
import { getProjectRoute } from './get-project.js'
import { getProjectsRoute } from './get-projects.js'
import { updateProjectRoute } from './update-project.js'

export const projectRoutes = fp(async (app) => {
  app.register(createProjectRoute)
  app.register(getProjectsRoute)
  app.register(getProjectRoute)
  app.register(updateProjectRoute)
  app.register(deleteProjectRoute)
})
