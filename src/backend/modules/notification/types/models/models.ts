export type NotificationRow = {
  id: string;
  userId: string;
  appointmentId: string;
  type: "CONFIRMATION" | "REMINDER" | "CANCELLATION" | "RESCHEDULE";
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  status: "PENDING" | "SENT" | "FAILED";
  content: string;
  sentAt: Date | null;
  createdAt: Date;
};
