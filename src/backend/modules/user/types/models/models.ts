/** Row do users retornada pelo Drizzle */
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
