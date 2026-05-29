import { hash } from 'bcryptjs'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client/index.js'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await hash('123456', 6)

  const user = await prisma.user.upsert({
    where: { email: 'john@acme.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@acme.com',
      passwordHash,
      avatarUrl: 'https://github.com/diego3g.png',
    },
  })

  const acme = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      domain: 'acme.com',
      shouldAttachUsersByDomain: true,
      ownerId: user.id,
    },
  })

  const acme2 = await prisma.organization.upsert({
    where: { slug: 'acme-corp-2' },
    update: {},
    create: {
      name: 'Acme Corp 2',
      slug: 'acme-corp-2',
      ownerId: user.id,
    },
  })

  await prisma.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: acme.id,
      userId: user.id,
      role: 'ADMIN',
    },
  })

  await prisma.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: acme2.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: acme2.id,
      userId: user.id,
      role: 'ADMIN',
    },
  })

  await prisma.project.upsert({
    where: { slug: 'project-1' },
    update: {},
    create: {
      name: 'Project 1',
      description: 'Project 1 description',
      slug: 'project-1',
      organizationId: acme.id,
      ownerId: user.id,
    },
  })

  await prisma.invite.upsert({
    where: {
      email_organizationId: {
        email: 'janedoe@example.com',
        organizationId: acme.id,
      },
    },
    update: {},
    create: {
      email: 'janedoe@example.com',
      role: 'MEMBER',
      organizationId: acme.id,
      authorId: user.id,
    },
  })

  console.log('Database seeded successfully!')
  console.log(`User: ${user.email} / Password: 123456`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
