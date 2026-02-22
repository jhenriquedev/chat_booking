/** Tipos de notificação */
export const notificationTypes = [
  "CONFIRMATION",
  "REMINDER",
  "CANCELLATION",
  "RESCHEDULE",
] as const;

/** Canais de envio */
export const notificationChannels = ["WHATSAPP", "SMS", "EMAIL"] as const;

/** Status de envio */
export const notificationStatuses = ["PENDING", "SENT", "FAILED"] as const;
