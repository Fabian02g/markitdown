-- Programa el envío de recordatorios cada minuto.
-- Reemplazá <PROJECT_REF> y <CRON_SECRET> y ejecutalo una vez en el SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');

select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
