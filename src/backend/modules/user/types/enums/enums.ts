export const UserRoles = {
  USER: "USER",
  OPERATOR: "OPERATOR",
  TENANT: "TENANT",
  OWNER: "OWNER",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
