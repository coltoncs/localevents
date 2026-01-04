export type UserRole = 'admin' | 'author' | 'user'

export const USER_ROLES = {
  ADMIN: 'admin',
  AUTHOR: 'author',
  USER: 'user'
} as const

export interface RoleMetadata {
  role: UserRole
}
