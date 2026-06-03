import { prisma } from '../../lib/prisma.js'
import { ForbiddenError } from '../errors/forbidden-error.js'

export async function getInviteRecipient(
  userId: string,
): Promise<{ email: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) {
    throw new ForbiddenError('User not found.')
  }
  return user
}
