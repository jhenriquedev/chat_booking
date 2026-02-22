/** Row do refresh_tokens retornada pelo Drizzle */
export type RefreshTokenRow = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

/** Row do users (subset necessário para auth) */
export type UserRow = {
  id: string;
  name: string;
  phone: string;
  phoneHash: string;
  email: string | null;
  role: "USER" | "OPERATOR" | "TENANT" | "OWNER";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
