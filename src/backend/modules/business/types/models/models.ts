import type { z } from "zod";
import type { businessHoursSchema, socialLinksSchema } from "../entities/entities.js";

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
  businessHours: z.infer<typeof businessHoursSchema>;
  socialLinks: z.infer<typeof socialLinksSchema>;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
