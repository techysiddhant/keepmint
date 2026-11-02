-- Users are soft-deleted (user.deleted_at), never removed. This blocks DELETE on "user"
-- so nothing (an admin plugin call, a stray query) can wipe an account and cascade its data.
-- The only way through is a deliberate purge: `SET LOCAL keepmint.allow_purge = 'on'`
-- inside a transaction (used by the local seed script, and by any future legal erasure job).
CREATE OR REPLACE FUNCTION keepmint_block_user_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('keepmint.allow_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'users are soft-deleted: set user.deleted_at instead of deleting the row';
END
$$;
--> statement-breakpoint
CREATE TRIGGER user_no_hard_delete BEFORE DELETE ON "user"
  FOR EACH ROW EXECUTE FUNCTION keepmint_block_user_delete();
--> statement-breakpoint

-- Consent records are proof of consent (DPDP Act): never changed, never deleted.
CREATE OR REPLACE FUNCTION keepmint_consent_insert_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'consent_events is insert-only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER consent_events_insert_only BEFORE UPDATE OR DELETE ON "consent_events"
  FOR EACH ROW EXECUTE FUNCTION keepmint_consent_insert_only();
