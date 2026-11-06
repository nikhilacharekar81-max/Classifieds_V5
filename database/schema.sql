CREATE TABLE "abuse_reports" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"type" varchar(32) NOT NULL,
	"target_id" varchar(64) NOT NULL,
	"target_title" varchar(255) NOT NULL,
	"reported_by" varchar(64) NOT NULL,
	"reason" varchar(64) NOT NULL,
	"notes" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"action_taken" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertising_campaigns" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"advertiser_name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" varchar(64) NOT NULL,
	"target_city" varchar(128),
	"target_category" varchar(128),
	"banner_url" text NOT NULL,
	"target_url" text NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_id" varchar(64) NOT NULL,
	"admin_name" varchar(255) NOT NULL,
	"action" varchar(128) NOT NULL,
	"module" varchar(64) NOT NULL,
	"target_id" varchar(64) NOT NULL,
	"target_summary" varchar(255) NOT NULL,
	"details" text NOT NULL,
	"ip_address" varchar(64) DEFAULT 'unknown' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boost_orders" (
	"order_id" varchar(64) PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"package_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"duration_hours" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boost_packages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"badge" varchar(64) NOT NULL,
	"type" varchar(32) DEFAULT 'boost' NOT NULL,
	"duration_days" integer DEFAULT 1 NOT NULL,
	"duration_hours" integer DEFAULT 24 NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"discount_price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"features" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boost_transactions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"order_id" varchar(64) NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"package_id" varchar(64) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_gateway" varchar(64) NOT NULL,
	"payment_id" varchar(128) NOT NULL,
	"invoice_number" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boost_transactions_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"icon" varchar(64) DEFAULT 'Package' NOT NULL,
	"parent_id" varchar(64),
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"is_paid" boolean DEFAULT false NOT NULL,
	"posting_fee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"free_listings_quota" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_custom_fields" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"category_id" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"label" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"options" jsonb,
	"unit" varchar(32),
	"required" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"sender_id" varchar(64) NOT NULL,
	"receiver_id" varchar(64) NOT NULL,
	"message_text" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"to_email" varchar(255) NOT NULL,
	"to_name" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"status" varchar(32) DEFAULT 'delivered' NOT NULL,
	"type" varchar(64) NOT NULL,
	"listing_id" varchar(64),
	"related_user_id" varchar(64),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"action_label" varchar(128),
	"action_url" text,
	"variables" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"document_type" varchar(32) NOT NULL,
	"document_number" varchar(128) NOT NULL,
	"file_url" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" varchar(64),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"seller_id" varchar(64) NOT NULL,
	"seller_name" varchar(255) DEFAULT 'Seller' NOT NULL,
	"seller_phone" varchar(32) DEFAULT '' NOT NULL,
	"category_id" varchar(64) NOT NULL,
	"subcategory_id" varchar(64),
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"price" numeric(12, 2),
	"state" varchar(128) NOT NULL,
	"city" varchar(128) NOT NULL,
	"locality" varchar(128) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"images" jsonb DEFAULT '[]' NOT NULL,
	"custom_attributes" jsonb DEFAULT '{}' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_until" timestamp with time zone,
	"is_boosted" boolean DEFAULT false NOT NULL,
	"boost_status" varchar(32) DEFAULT 'inactive' NOT NULL,
	"boost_started_at" timestamp with time zone,
	"boost_expires_at" timestamp with time zone,
	"boost_package_id" varchar(64),
	"boost_package_name" varchar(255),
	"boost_payment_id" varchar(128),
	"boost_price" numeric(10, 2) DEFAULT '0.00',
	"boost_duration_hours" integer DEFAULT 0,
	"boost_views" integer DEFAULT 0 NOT NULL,
	"boost_impressions" integer DEFAULT 0 NOT NULL,
	"boost_clicks" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"chats_count" integer DEFAULT 0 NOT NULL,
	"spam_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"type" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"code" varchar(32),
	"geo_id" varchar(32) NOT NULL,
	"parent_id" varchar(64),
	"latitude" double precision,
	"longitude" double precision,
	"popular" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_rules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"keywords" jsonb DEFAULT '[]',
	"threshold" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"preview_text" text,
	"content_html" text NOT NULL,
	"target_audience" varchar(64) NOT NULL,
	"target_city" varchar(128),
	"target_state" varchar(128),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"target_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"opened_count" integer DEFAULT 0 NOT NULL,
	"clicked_count" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"order_id" varchar(64) NOT NULL,
	"gateway" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_payments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_gateway" varchar(64) NOT NULL,
	"payment_id" varchar(128) NOT NULL,
	"status" varchar(32) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar(32) PRIMARY KEY DEFAULT 'primary' NOT NULL,
	"site_name" varchar(255) DEFAULT 'Chillyads' NOT NULL,
	"default_currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"currency_symbol" varchar(10) DEFAULT '₹' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"date_format" varchar(32) DEFAULT 'DD/MM/YYYY' NOT NULL,
	"listing_duration_days" integer DEFAULT 30 NOT NULL,
	"free_listings_limit" integer DEFAULT 3 NOT NULL,
	"extra_listing_fee" numeric(10, 2) DEFAULT '99.00' NOT NULL,
	"max_photos_per_listing" integer DEFAULT 5 NOT NULL,
	"auto_approve_verified_users" boolean DEFAULT false NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"watermark_images" boolean DEFAULT false NOT NULL,
	"ai_spam_filter_enabled" boolean DEFAULT true NOT NULL,
	"otp_login_enabled" boolean DEFAULT true NOT NULL,
	"paid_features_config" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"user_id" varchar(64) NOT NULL,
	"listing_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"ip_address" varchar(64) DEFAULT 'unknown' NOT NULL,
	"user_agent" text,
	"impersonated_by" varchar(64),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"uid" varchar(128),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32) DEFAULT '' NOT NULL,
	"password_hash" varchar(255),
	"avatar_url" text,
	"type" varchar(32) DEFAULT 'user' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"ban_reason" text,
	"kyc_status" varchar(32) DEFAULT 'unsubmitted' NOT NULL,
	"email_subscribed" boolean DEFAULT true NOT NULL,
	"email_unsubscribed_at" timestamp with time zone,
	"city" varchar(128) DEFAULT 'Mumbai' NOT NULL,
	"state" varchar(128) DEFAULT 'Maharashtra' NOT NULL,
	"rating" numeric(3, 2) DEFAULT '5.00' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"business_name" varchar(255),
	"gst_number" varchar(32),
	"verified_business" boolean DEFAULT false NOT NULL,
	"admin_role" varchar(64),
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_rate_limits" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cache_invalidation_outbox" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"tag" varchar(128) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "cache_invalidation_outbox_tag_unique" UNIQUE("tag")
);
--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_orders" ADD CONSTRAINT "boost_orders_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_orders" ADD CONSTRAINT "boost_orders_package_id_boost_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."boost_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_orders" ADD CONSTRAINT "boost_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_transactions" ADD CONSTRAINT "boost_transactions_order_id_boost_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."boost_orders"("order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_transactions" ADD CONSTRAINT "boost_transactions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_transactions" ADD CONSTRAINT "boost_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_transactions" ADD CONSTRAINT "boost_transactions_package_id_boost_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."boost_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_custom_fields" ADD CONSTRAINT "category_custom_fields_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_active_ad_title_per_seller" ON "listings" USING btree ("seller_id",LOWER(REGEXP_REPLACE(TRIM("title"), '\s+', ' ', 'g'))) WHERE "listings"."status" IN ('approved', 'pending');--> statement-breakpoint
CREATE INDEX "idx_listings_boost_ranking" ON "listings" USING btree ("boost_status","boost_expires_at","is_featured","created_at");--> statement-breakpoint
CREATE INDEX "idx_listings_location_cat" ON "listings" USING btree ("city","category_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_gateway_event_unique" ON "payment_webhook_events" USING btree ("gateway","id");--> statement-breakpoint
CREATE INDEX "idx_cache_invalidation_outbox_status_retry" ON "cache_invalidation_outbox" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ban_appeals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"appeal_reason" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar(64),
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "ban_appeals" ADD CONSTRAINT "ban_appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;