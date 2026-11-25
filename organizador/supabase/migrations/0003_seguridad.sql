-- =====================================================================
--  Auditoría QA · endurecimiento de seguridad
-- =====================================================================

-- 1) Funciones internas: nadie de afuera puede ejecutarlas directamente.
--    (Los triggers siguen funcionando: corren como dueño de la función.)
do $$ declare f text; begin
  foreach f in array array[
    'schedule_item_reminders(text,uuid,uuid,date,time,text[],boolean,text,text,text)',
    'rule_fire_at(text,timestamp,text)', 'rule_label(text)',
    'check_space_owner()', 'handle_new_user()', 'touch_updated_at()',
    'tasks_reminders_trg()', 'pieces_reminders_trg()', 'profile_rules_trg()',
    'take_due_notifications()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Funciones de la usuaria: solo con sesión iniciada
revoke all on function public.send_test_push() from public, anon;
revoke all on function public.rotate_portal_token(uuid) from public, anon;
grant execute on function public.send_test_push() to authenticated;
grant execute on function public.rotate_portal_token(uuid) to authenticated;

-- 2) Los avisos solo pueden abrir pantallas de la propia app (nunca links externos)
alter table public.reminders drop constraint if exists reminders_url_local;
alter table public.reminders add constraint reminders_url_local check (url like '/%' and url not like '//%');

-- 3) Links de diseño/video: solo http(s)
alter table public.pieces drop constraint if exists pieces_links_http;
alter table public.pieces add constraint pieces_links_http check (
  (design_url = '' or design_url ~* '^https?://') and (video_url = '' or video_url ~* '^https?://'));

-- 4) Portal del cliente: límite de envíos para evitar abuso (30 cada 10 minutos por cliente)
create or replace function public.portal_feedback(p_token text, p_piece uuid, p_kind text, p_body text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s spaces; pc pieces; nm text := left(coalesce(nullif(trim(p_name),''), 'Cliente'), 60); recent int;
begin
  if p_kind not in ('comentario','aprobado','cambios') then raise exception 'Acción inválida'; end if;
  select * into s from spaces where portal_token = p_token and not archived and kind = 'cliente';
  if not found or length(p_token) < 20 then raise exception 'Enlace inválido'; end if;
  select count(*) into recent from piece_comments c join pieces x on x.id = c.piece_id
    where x.space_id = s.id and c.author = 'cliente' and c.created_at > now() - interval '10 minutes';
  if recent >= 30 then raise exception 'Demasiados envíos seguidos. Probá de nuevo en unos minutos.'; end if;
  select * into pc from pieces where id = p_piece and space_id = s.id and share_with_client;
  if not found then raise exception 'Pieza no encontrada'; end if;
  if p_kind in ('comentario','cambios') and coalesce(trim(p_body),'') = '' then raise exception 'Escribí un comentario'; end if;

  insert into piece_comments(piece_id, user_id, author, author_name, kind, body)
  values (pc.id, s.user_id, 'cliente', nm, p_kind, left(coalesce(p_body,''), 4000));

  if p_kind = 'aprobado' then
    update pieces set approval = 'aprobado',
      status = case when status in ('programado','publicado') then status else 'aprobado' end where id = pc.id;
  elsif p_kind = 'cambios' then
    update pieces set approval = 'cambios',
      status = case when status in ('programado','publicado') then status else 'ajustes' end where id = pc.id;
  end if;

  insert into reminders(user_id, kind, fire_at, title, body, url) values (
    s.user_id, 'portal', now(),
    case p_kind when 'aprobado' then '✅ ' || s.name || ' aprobó: ' || pc.title
                when 'cambios' then '✏️ ' || s.name || ' pidió cambios: ' || pc.title
                else '💬 ' || s.name || ' comentó: ' || pc.title end,
    left(coalesce(nullif(p_body,''), nm), 180), '/editorial?p=' || pc.id);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.portal_feedback(text, uuid, text, text, text) from public;
grant execute on function public.portal_feedback(text, uuid, text, text, text) to anon, authenticated;
revoke all on function public.portal_get(text, text) from public;
grant execute on function public.portal_get(text, text) to anon, authenticated;

-- 5) Registro de dispositivo para notificaciones: el celular queda asociado a la cuenta
--    que tiene la sesión abierta (si antes era de otra cuenta, se le reasigna).
create or replace function public.register_push(p_endpoint text, p_p256dh text, p_auth text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then raise exception 'Dispositivo inválido'; end if;
  delete from push_subscriptions where endpoint = p_endpoint and user_id <> auth.uid();
  insert into push_subscriptions(user_id, endpoint, p256dh, auth, device)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(coalesce(p_device,''), 80))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, device = excluded.device;
end $$;
revoke all on function public.register_push(text, text, text, text) from public, anon;
grant execute on function public.register_push(text, text, text, text) to authenticated;
