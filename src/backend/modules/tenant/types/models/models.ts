/** Row do tenants retornada pelo Drizzle */
export type TenantRow = {
  id: string;
  userId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Row do tenants com JOIN em users */
export type TenantWithUserRow = TenantRow & {
  userName: string;
  userPhone: string;
};
