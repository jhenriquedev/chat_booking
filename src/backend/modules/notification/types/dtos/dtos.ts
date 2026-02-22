import { z } from "zod";

export { errorResponseSchema } from "../../../../shared/dtos.js";

const notificationTypes = ["CONFIRMATION", "REMINDER", "CANCELLATION", "RESCHEDULE"] as const;
const notificationChannels = ["WHATSAPP", "SMS", "EMAIL"] as const;
const notificationStatuses = ["PENDING", "SENT", "FAILED"] as const;

// ========== NOTIFICATION PROFILE (response) ==========

export const notificationProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  type: z.enum(notificationTypes),
  channel: z.enum(notificationChannels),
  status: z.enum(notificationStatuses),
  content: z.string(),
  sentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationProfile = z.infer<typeof notificationProfileSchema>;

// ========== SEND NOTIFICATION ==========

export const sendNotificationRequestSchema = z.object({
  appointmentId: z.string().uuid("appointmentId deve ser um UUID válido"),
  type: z.enum(notificationTypes),
  channel: z.enum(notificationChannels),
  content: z.string().min(1, "Conteúdo é obrigatório").max(2000),
});
export type SendNotificationRequest = z.infer<typeof sendNotificationRequestSchema>;

// ========== LIST NOTIFICATIONS ==========

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(notificationTypes).optional(),
  channel: z.enum(notificationChannels).optional(),
  status: z.enum(notificationStatuses).optional(),
  appointmentId: z.string().uuid().optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

// ========== PAGINATION ==========

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const paginatedNotificationsResponseSchema = z.object({
  data: z.array(notificationProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedNotificationsResponse = z.infer<typeof paginatedNotificationsResponseSchema>;
