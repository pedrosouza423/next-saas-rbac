import { env } from '../../env.js'
import { BadRequestError } from '../errors/bad-request-error.js'

interface GithubTokenResponse {
  access_token?: string
  error?: string
}

interface GithubUser {
  id: number
  name: string | null
  avatar_url: string
}

interface GithubEmail {
  email: string
  primary: boolean
  verified: boolean
}

export interface GithubUserData {
  githubId: string
  name: string | null
  email: string
  avatarUrl: string
}

export async function getGithubUserData(code: string): Promise<GithubUserData> {
  if (
    !env.GITHUB_OAUTH_CLIENT_ID ||
    !env.GITHUB_OAUTH_CLIENT_SECRET ||
    !env.GITHUB_OAUTH_CLIENT_REDIRECT_URI
  ) {
    throw new BadRequestError('GitHub OAuth is not configured.')
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GITHUB_OAUTH_CLIENT_REDIRECT_URI,
      code,
    }),
  })

  const tokenData = (await tokenRes.json()) as GithubTokenResponse

  if (!tokenData.access_token) {
    throw new BadRequestError('Invalid GitHub OAuth code.')
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/json',
  }

  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers }),
    fetch('https://api.github.com/user/emails', { headers }),
  ])

  const githubUser = (await userRes.json()) as GithubUser
  const emails = (await emailsRes.json()) as GithubEmail[]

  const primary = emails.find((e) => e.primary && e.verified)

  if (!primary) {
    throw new BadRequestError(
      'Your GitHub account has no verified primary email.',
    )
  }

  return {
    githubId: String(githubUser.id),
    name: githubUser.name,
    email: primary.email,
    avatarUrl: githubUser.avatar_url,
  }
}
