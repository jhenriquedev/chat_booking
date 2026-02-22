import { pgSchema } from "drizzle-orm/pg-core";

/** Schema principal do sistema — todas as tabelas ficam dentro de "chatbooking" */
export const chatBookingSchema = pgSchema("chatbooking");

/** Papel do usuário no sistema */
export const userRoleEnum = chatBookingSchema.enum("user_role", [
  "USER", // Cliente final que agenda via chatbot
  "OPERATOR", // Profissional (barbeiro, esteticista, etc.)
  "TENANT", // Dono do negócio que gerencia operadores e business
  "OWNER", // Administrador do sistema
]);

/** Status do ciclo de vida de um agendamento */
export const appointmentStatusEnum = chatBookingSchema.enum("appointment_status", [
  "PENDING", // Aguardando confirmação do operador/tenant
  "CONFIRMED", // Confirmado por ambas as partes
  "CANCELLED", // Cancelado pelo usuário, operador ou tenant
  "COMPLETED", // Atendimento realizado
  "NO_SHOW", // Cliente não compareceu
]);

/** Status de um slot na agenda do operador */
export const slotStatusEnum = chatBookingSchema.enum("slot_status", [
  "AVAILABLE", // Livre para agendamento
  "BOOKED", // Ocupado por um agendamento
  "BLOCKED", // Bloqueado manualmente (folga, pausa, etc.)
]);

/** Tipo de notificação enviada ao usuário */
export const notificationTypeEnum = chatBookingSchema.enum("notification_type", [
  "CONFIRMATION", // Confirmação de agendamento
  "REMINDER", // Lembrete antes do horário
  "CANCELLATION", // Aviso de cancelamento
  "RESCHEDULE", // Aviso de reagendamento
]);

/** Canal de envio da notificação */
export const notificationChannelEnum = chatBookingSchema.enum("notification_channel", [
  "WHATSAPP", // Via Evolution API
  "SMS", // Via provedor SMS
  "EMAIL", // Via provedor de e-mail
]);

/** Status de envio da notificação */
export const notificationStatusEnum = chatBookingSchema.enum("notification_status", [
  "PENDING", // Aguardando envio
  "SENT", // Enviada com sucesso
  "FAILED", // Falha no envio
]);
