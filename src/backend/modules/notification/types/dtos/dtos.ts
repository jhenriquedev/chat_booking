import { z } from "zod";
import { paginationSchema } from "../../../../shared/dtos.js";
import { notificationChannels, notificationStatuses, notificationTypes } from "../enums/enums.js";

export { errorResponseSchema, messageResponseSchema } from "../../../../shared/dtos.js";
export { paginationSchema };

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

export const paginatedNotificationsResponseSchema = z.object({
  data: z.array(notificationProfileSchema),
  pagination: paginationSchema,
});
export type PaginatedNotificationsResponse = z.infer<typeof paginatedNotificationsResponseSchema>;
