/** Row do services retornada pelo Drizzle */
export type ServiceRow = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
