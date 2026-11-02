-- Audit entries are kept indefinitely: nothing deletes data without the owner's approval.
-- Replaces the guard from 0001 without its 12-month retention exception. The only change
-- still allowed is nulling actor_id / target_user_id if a user row is ever purged.
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
  RAISE EXCEPTION 'audit_log is insert-only';
END
$$;
