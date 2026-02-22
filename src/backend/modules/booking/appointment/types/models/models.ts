/** Row do appointments retornada pelo Drizzle */
export type AppointmentRow = {
  id: string;
  userId: string;
  operatorId: string;
  businessId: string;
  serviceId: string;
  slotId: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  priceCents: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes: string | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
