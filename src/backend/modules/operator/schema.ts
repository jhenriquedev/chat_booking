import { boolean, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { chatBookingSchema } from "../../shared/schema.js";
import { businesses } from "../business/schema.js";
import { services } from "../services/schema.js";
import { tenants } from "../tenant/schema.js";
import { users } from "../user/schema.js";

/** Operador — profissional vinculado a uma business (barbeiro, esteticista, etc.) */
export const operators = chatBookingSchema.table("operators", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Usuário vinculado — um user com role OPERATOR */
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  /** Business onde este operador trabalha */
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  /** Tenant proprietário — desnormalizado para facilitar queries multi-tenant */
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  /** Nome de exibição na agenda — pode diferir do nome em users */
  displayName: varchar("display_name", { length: 255 }).notNull(),
  /** Permite ao operador editar preço e duração em operator_services. Quando false, apenas o tenant pode alterar */
  canEditService: boolean("can_edit_service").notNull().default(false),
  /** Soft delete — false remove o operador da agenda sem excluir histórico */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Vínculo operador ↔ serviço com possibilidade de override de preço e duração */
export const operatorServices = chatBookingSchema.table("operator_services", {
  /** Identificador único (UUID v4) */
  id: uuid("id").primaryKey().defaultRandom(),
  /** Operador vinculado */
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id),
  /** Serviço vinculado */
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  /** Override de preço em centavos — null usa o padrão de services.priceCents */
  priceCents: integer("price_cents"),
  /** Override de duração em minutos — null usa o padrão de services.durationMinutes */
  durationMinutes: integer("duration_minutes"),
  /** Soft delete — false desvincula o serviço do operador */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
