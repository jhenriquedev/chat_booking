/** Row do businesses retornada pelo Drizzle */
export type BusinessRow = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  businessHours: unknown;
  socialLinks: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
