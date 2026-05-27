export type Role = 'ADMIN' | 'MEMBER'

export interface User {
  id: string
  role: Role
}
