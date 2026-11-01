-- A link may only be filed in a collection of the same user. Deleting the collection
-- clears only collection_id (→ Unsorted); user_id stays. Needs Postgres 15+.
ALTER TABLE "links" ADD CONSTRAINT "links_collection_fk"
  FOREIGN KEY ("user_id", "collection_id") REFERENCES "collections" ("user_id", "id")
  ON DELETE SET NULL ("collection_id");
--> statement-breakpoint

-- Sync cursor: every update of a synced row gets a new server_version (inserts use the column default).
CREATE OR REPLACE FUNCTION keepmint_touch_sync_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.server_version := nextval('sync_version_seq');
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER links_touch BEFORE UPDATE ON "links"
  FOR EACH ROW EXECUTE FUNCTION keepmint_touch_sync_row();
--> statement-breakpoint
CREATE TRIGGER collections_touch BEFORE UPDATE ON "collections"
  FOR EACH ROW EXECUTE FUNCTION keepmint_touch_sync_row();
--> statement-breakpoint

-- Full-text search vector for links.
CREATE OR REPLACE FUNCTION keepmint_links_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '') || ' ' || array_to_string(NEW.tags, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.note, '') || ' ' || coalesce(NEW.site, '')), 'C');
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER links_search BEFORE INSERT OR UPDATE OF title, summary, tags, note, site ON "links"
  FOR EACH ROW EXECUTE FUNCTION keepmint_links_search();
--> statement-breakpoint

-- audit_log is insert-only. Two exceptions:
--  * deleting a user nulls actor_id / target_user_id (ON DELETE SET NULL) — nothing else may change;
--  * the retention job may delete rows older than 12 months after `SET LOCAL keepmint.audit_retention = 'on'`.
CREATE OR REPLACE FUNCTION keepmint_audit_log_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.actor_id IS NULL OR NEW.actor_id IS NOT DISTINCT FROM OLD.actor_id)
     AND (NEW.target_user_id IS NULL OR NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id)
     AND (NEW.id, NEW.actor_email, NEW.action, NEW.before, NEW.after, NEW.reason, NEW.created_at)
         IS NOT DISTINCT FROM
         (OLD.id, OLD.actor_email, OLD.action, OLD.before, OLD.after, OLD.reason, OLD.created_at) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE'
     AND current_setting('keepmint.audit_retention', true) = 'on'
     AND OLD.created_at < now() - interval '12 months' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is insert-only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_guard BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION keepmint_audit_log_guard();
--> statement-breakpoint

-- Global defaults (editable from the admin later). Code fallbacks: DEFAULTS in @keepmint/core.
INSERT INTO "app_settings" ("key", "value") VALUES
  ('default_daily_ai_limit', '50'::jsonb),
  ('default_import_allowance', '300'::jsonb),
  ('ai_kill_switch', 'false'::jsonb),
  ('daily_spend_ceiling_usd', '3'::jsonb),
  ('review_confidence_threshold', '0.6'::jsonb)
ON CONFLICT ("key") DO NOTHING;
