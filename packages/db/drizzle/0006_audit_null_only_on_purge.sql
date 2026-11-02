-- Audit entries can't be edited. The one exception — nulling actor_id / target_user_id —
-- now only applies during a deliberate user purge (`SET LOCAL keepmint.allow_purge = 'on'`),
-- which is the only time ON DELETE SET NULL can fire. Any other update is refused.
CREATE OR REPLACE FUNCTION keepmint_audit_log_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.actor_id IS NOT DISTINCT FROM OLD.actor_id
          OR (NEW.actor_id IS NULL AND current_setting('keepmint.allow_purge', true) = 'on'))
     AND (NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id
          OR (NEW.target_user_id IS NULL AND current_setting('keepmint.allow_purge', true) = 'on'))
     AND (NEW.id, NEW.actor_email, NEW.action, NEW.before, NEW.after, NEW.reason, NEW.created_at)
         IS NOT DISTINCT FROM
         (OLD.id, OLD.actor_email, OLD.action, OLD.before, OLD.after, OLD.reason, OLD.created_at) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_log is insert-only';
END
$$;
