ALTER TABLE "chatbooking"."businesses" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "cnpj" varchar(18);--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "business_hours" jsonb;--> statement-breakpoint
ALTER TABLE "chatbooking"."businesses" ADD COLUMN "social_links" jsonb;