ALTER TABLE "chatbooking"."appointments" ADD COLUMN "slot_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbooking"."appointments" ADD CONSTRAINT "appointments_slot_id_schedule_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "chatbooking"."schedule_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_user_id" ON "chatbooking"."appointments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_operator_id" ON "chatbooking"."appointments" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_business_id" ON "chatbooking"."appointments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_availability_rules_operator_id" ON "chatbooking"."availability_rules" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_schedule_slots_operator_date" ON "chatbooking"."schedule_slots" USING btree ("operator_id","date");--> statement-breakpoint
CREATE INDEX "idx_businesses_tenant_id" ON "chatbooking"."businesses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "chatbooking"."notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_appointment_id" ON "chatbooking"."notifications" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_operator_services_operator_id" ON "chatbooking"."operator_services" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_operator_services_service_id" ON "chatbooking"."operator_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_operators_user_id" ON "chatbooking"."operators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_operators_business_id" ON "chatbooking"."operators" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_services_business_id" ON "chatbooking"."services" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "chatbooking"."schedule_slots" ADD CONSTRAINT "uq_schedule_slots_operator_date_time" UNIQUE("operator_id","date","start_time");