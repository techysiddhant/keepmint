CREATE TYPE "public"."ai_call_kind" AS ENUM('sort', 'collection_only', 'fill_collection', 'import_batch');--> statement-breakpoint
CREATE TYPE "public"."ai_call_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."ai_skip_reason" AS ENUM('daily_limit', 'ai_disabled', 'kill_switch', 'spend_ceiling', 'import_over_allowance');--> statement-breakpoint
CREATE TYPE "public"."import_access" AS ENUM('none', 'requested', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('uploaded', 'parsing', 'ready', 'saving', 'sorting', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."link_source" AS ENUM('app', 'import', 'extension');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('queued', 'processing', 'done', 'needs_review', 'no_ai', 'failed');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('article', 'video', 'repo', 'thread', 'recipe', 'product', 'podcast', 'pdf', 'job', 'other');--> statement-breakpoint
CREATE TYPE "public"."read_state" AS ENUM('unread', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('open', 'accepted', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'owner');--> statement-breakpoint
CREATE SEQUENCE "public"."sync_version_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_calls_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"link_id" uuid,
	"kind" "ai_call_kind" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"status" "ai_call_status" NOT NULL,
	"error_code" text,
	"latency_ms" integer,
	"batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_corrections" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_corrections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"link_id" uuid,
	"title" text NOT NULL,
	"suggested" text,
	"chosen_collection_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_spend_daily" (
	"day" date NOT NULL,
	"kind" "ai_call_kind" NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	CONSTRAINT "ai_spend_daily_day_kind_pk" PRIMARY KEY("day","kind")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_daily" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_daily_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" text,
	"actor_email" text NOT NULL,
	"target_user_id" text,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"reason" text,
	"link_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"status" "suggestion_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'violet' NOT NULL,
	"description" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"ai_created" boolean DEFAULT false NOT NULL,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "collections_user_id_key" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "import_job_status" DEFAULT 'uploaded' NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"browser" text,
	"folders" jsonb,
	"folders_to_collections" boolean DEFAULT true NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"skipped_duplicates" integer DEFAULT 0 NOT NULL,
	"saved" integer DEFAULT 0 NOT NULL,
	"ai_queued" integer DEFAULT 0 NOT NULL,
	"ai_sorted" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"batch_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"ai_allowance" integer,
	"admin_note" text
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"url_hash" text NOT NULL,
	"site" text,
	"title" text,
	"description" text,
	"image_url" text,
	"type" "link_type" DEFAULT 'article' NOT NULL,
	"summary" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"collection_id" uuid,
	"note" text,
	"status" "link_status" DEFAULT 'queued' NOT NULL,
	"ai_skip_reason" "ai_skip_reason",
	"ai_suggested_collection" text,
	"ai_confidence" real,
	"reviewed_at" timestamp with time zone,
	"read_later" boolean DEFAULT false NOT NULL,
	"read_later_rank" double precision,
	"read_state" "read_state" DEFAULT 'unread' NOT NULL,
	"read_progress" smallint DEFAULT 0 NOT NULL,
	"read_minutes" smallint,
	"finished_at" timestamp with time zone,
	"content_key" text,
	"content_bytes" integer,
	"fail_reason" text,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"source" "link_source" DEFAULT 'app' NOT NULL,
	"import_job_id" uuid,
	"search" "tsvector",
	"saved_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "url_summary_cache" (
	"url_hash" text PRIMARY KEY NOT NULL,
	"normalized_url" text NOT NULL,
	"type" "link_type" NOT NULL,
	"site" text,
	"title" text,
	"description" text,
	"image_url" text,
	"summary" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"read_minutes" smallint,
	"content_key" text,
	"content_bytes" integer,
	"model" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"daily_ai_limit" integer,
	"daily_ai_limit_until" timestamp with time zone,
	"import_access" "import_access" DEFAULT 'none' NOT NULL,
	"import_ai_allowance" integer DEFAULT 0 NOT NULL,
	"import_ai_used" integer DEFAULT 0 NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_active_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_collection_fk" FOREIGN KEY ("user_id","chosen_collection_id") REFERENCES "public"."collections"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_suggestions" ADD CONSTRAINT "collection_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_requests" ADD CONSTRAINT "import_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_requests" ADD CONSTRAINT "import_requests_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_created_idx" ON "ai_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_calls_user_created_idx" ON "ai_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_corrections_user_created_idx" ON "ai_corrections" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "collection_suggestions_open_idx" ON "collection_suggestions" USING btree ("user_id",lower("name")) WHERE "collection_suggestions"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_name_live_idx" ON "collections" USING btree ("user_id",lower("name")) WHERE "collections"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "collections_user_version_idx" ON "collections" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE INDEX "import_jobs_user_created_idx" ON "import_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "import_requests_one_pending_idx" ON "import_requests" USING btree ("user_id") WHERE "import_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "import_requests_status_idx" ON "import_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "links_user_url_live_idx" ON "links" USING btree ("user_id","url_hash") WHERE "links"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "links_user_version_idx" ON "links" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE INDEX "links_user_collection_idx" ON "links" USING btree ("user_id","collection_id") WHERE "links"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "links_read_later_idx" ON "links" USING btree ("user_id","read_later_rank") WHERE "links"."read_later" and "links"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "links_user_status_idx" ON "links" USING btree ("user_id","status") WHERE "links"."status" in ('queued', 'processing', 'failed', 'needs_review');--> statement-breakpoint
CREATE INDEX "links_search_idx" ON "links" USING gin ("search");--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");