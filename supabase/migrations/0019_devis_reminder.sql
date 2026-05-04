-- jp-montreuil — herinneringsmail dag voor devis vervalt
-- Eén timestamp per commission om dubbele reminders te vermijden.

set search_path = public;

alter table public.commission_requests
  add column if not exists devis_reminder_sent_at timestamptz;
