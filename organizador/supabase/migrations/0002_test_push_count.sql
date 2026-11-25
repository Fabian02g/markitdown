-- La notificación de prueba informa a cuántos dispositivos se va a enviar
drop function if exists public.send_test_push();
create function public.send_test_push() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from push_subscriptions where user_id = auth.uid();
  if n > 0 then
    insert into reminders(user_id, kind, fire_at, title, body, url)
    values (auth.uid(), 'test', now(), '✅ Notificaciones activas', 'Así te van a llegar los recordatorios.', '/config');
  end if;
  return n;
end $$;
grant execute on function public.send_test_push() to authenticated;
