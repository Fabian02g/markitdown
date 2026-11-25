-- =====================================================================
--  Organizador personal · esquema inicial
--  Ejecutar completo en el SQL Editor de Supabase (o con `supabase db push`).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Perfil (1 fila por usuario)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default '',
  phrase          text not null default 'Pequeños avances todos los días construyen grandes resultados.',
  accent          text not null default '#8b5cf6',
  timezone        text not null default 'America/Asuncion',
  categories      text[] not null default array['Contenido','Diseño','Edición de video','Flyer','Copy','Reunión','Entrega','Administrativo','Trámite','Compra','Turno','Cumpleaños','Otro'],
  weekly_goal_text text not null default '',
  weekly_goal_target int not null default 10,
  task_rules      text[] not null default array['d:1@18:00','m:60'],
  piece_rules     text[] not null default array['d:1@18:00','d:0@09:00','m:30'],
  digest_enabled  boolean not null default true,
  digest_time     time not null default '08:00',
  last_digest_on  date,
  work_hours_per_day numeric not null default 8,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Espacios: trabajo fijo, clientes, personal, proyectos
-- ---------------------------------------------------------------------
create table if not exists public.spaces (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('fijo','cliente','personal','proyecto')),
  color         text not null default '#8b5cf6',
  categories    text[] not null default '{}',
  sort          int not null default 0,
  archived      boolean not null default false,
  portal_token  text unique default encode(extensions.gen_random_bytes(18), 'hex'),
  quota_videos  int not null default 0,
  quota_static  int not null default 0,
  agreement_extra text not null default '',
  agreement_notes text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists spaces_user_idx on public.spaces(user_id);

-- ---------------------------------------------------------------------
-- Tareas
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid references public.spaces(id) on delete set null,
  title         text not null,
  description   text not null default '',
  category      text not null default '',
  tags          text[] not null default '{}',
  priority      text not null default 'medium' check (priority in ('urgent','high','medium','low')),
  status        text not null default 'todo' check (status in ('todo','doing','waiting','done')),
  is_meeting    boolean not null default false,
  due_date      date,
  due_time      time,
  estimate_min  int not null default 0,
  subtasks      jsonb not null default '[]'::jsonb,
  notes         text not null default '',
  reminder_rules text[],            -- null = usar los del perfil
  is_top        boolean not null default false,  -- "Mis prioridades"
  sort          double precision not null default 0,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks(user_id);
create index if not exists tasks_due_idx on public.tasks(user_id, due_date);

-- ---------------------------------------------------------------------
-- Piezas de contenido (calendario editorial)
-- ---------------------------------------------------------------------
create table if not exists public.pieces (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id        uuid not null references public.spaces(id) on delete cascade,
  title           text not null,
  type            text not null default 'post' check (type in ('post','carrusel','historia','reel','video','texto','otro')),
  status          text not null default 'idea' check (status in ('idea','pendiente','redaccion','diseno','edicion','revision','esperando','ajustes','aprobado','programado','publicado')),
  approval        text not null default 'sin_enviar' check (approval in ('sin_enviar','pendiente','aprobado','cambios')),
  concept         text not null default '',
  copy            text not null default '',
  pillar          text not null default '',
  channels        text[] not null default array['Instagram'],
  production_date date,
  delivery_date   date,
  publish_date    date,
  publish_time    time,
  design_url      text not null default '',
  video_url       text not null default '',
  images          text[] not null default '{}',   -- rutas en el bucket "covers"
  notes           text not null default '',
  is_extra        boolean not null default false,
  is_paid         boolean not null default false,
  share_with_client boolean not null default true,
  published_at    timestamptz,
  published_where text not null default '',
  reminder_rules  text[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pieces_user_idx on public.pieces(user_id);
create index if not exists pieces_pub_idx on public.pieces(user_id, publish_date);
create index if not exists pieces_space_idx on public.pieces(space_id, publish_date);

create table if not exists public.piece_comments (
  id          uuid primary key default gen_random_uuid(),
  piece_id    uuid not null references public.pieces(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- dueña de la pieza
  author      text not null check (author in ('cliente','yo')),
  author_name text not null default '',
  kind        text not null default 'comentario' check (kind in ('comentario','aprobado','cambios')),
  body        text not null default '',
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists piece_comments_piece_idx on public.piece_comments(piece_id);

-- Plan mensual por cliente (etapa + brief)
create table if not exists public.plans (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id  uuid not null references public.spaces(id) on delete cascade,
  month     text not null check (month ~ '^\d{4}-\d{2}$'),
  stage     int not null default 0,
  brief     text not null default '',
  updated_at timestamptz not null default now(),
  primary key (space_id, month)
);

-- ---------------------------------------------------------------------
-- Notas e ideas
-- ---------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id    uuid references public.spaces(id) on delete set null,
  title       text not null default '',
  body        text not null default '',
  category    text not null default 'Idea',
  checklist   jsonb not null default '[]'::jsonb,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes(user_id);

-- Archivos adjuntos (bucket privado "files")
create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id    uuid references public.tasks(id) on delete cascade,
  piece_id   uuid references public.pieces(id) on delete cascade,
  note_id    uuid references public.notes(id) on delete cascade,
  path       text not null,
  name       text not null,
  size       bigint not null default 0,
  mime       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists attachments_user_idx on public.attachments(user_id);

-- ---------------------------------------------------------------------
-- Notificaciones push
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  device     text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null check (kind in ('task','piece','digest','portal','test')),
  ref_id    uuid,
  rule      text not null default '',
  fire_at   timestamptz not null,
  title     text not null,
  body      text not null default '',
  url       text not null default '/',
  sent_at   timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists reminders_unique on public.reminders(kind, ref_id, fire_at) where ref_id is not null;
create index if not exists reminders_due_idx on public.reminders(fire_at) where sent_at is null;
create index if not exists reminders_user_idx on public.reminders(user_id, fire_at);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','spaces','tasks','pieces','notes','plans'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Seguridad: cada usuario ve solo lo suyo
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.tasks enable row level security;
alter table public.pieces enable row level security;
alter table public.piece_comments enable row level security;
alter table public.plans enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;

drop policy if exists own on public.profiles;
create policy own on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['spaces','tasks','pieces','piece_comments','plans','notes','attachments','push_subscriptions'] loop
    execute format('drop policy if exists own on public.%I', t);
    execute format('create policy own on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
-- Recordatorios: solo lectura para la usuaria (los escribe la base)
drop policy if exists own_read on public.reminders;
create policy own_read on public.reminders for select to authenticated using (user_id = auth.uid());

-- Las piezas y tareas tienen que apuntar a espacios propios
create or replace function public.check_space_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.space_id is not null and not exists (select 1 from spaces where id = new.space_id and user_id = new.user_id) then
    raise exception 'Espacio inválido';
  end if;
  return new;
end $$;
drop trigger if exists tasks_space_owner on public.tasks;
create trigger tasks_space_owner before insert or update of space_id on public.tasks for each row execute function public.check_space_owner();
drop trigger if exists pieces_space_owner on public.pieces;
create trigger pieces_space_owner before insert or update of space_id on public.pieces for each row execute function public.check_space_owner();
drop trigger if exists notes_space_owner on public.notes;
create trigger notes_space_owner before insert or update of space_id on public.notes for each row execute function public.check_space_owner();

-- ---------------------------------------------------------------------
-- Alta de usuaria: perfil + espacios iniciales
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1));
begin
  insert into profiles(id, display_name) values (new.id, nm) on conflict do nothing;
  insert into spaces(user_id, name, kind, color, sort, quota_videos, quota_static, agreement_notes) values
    (new.id, 'Trabajo fijo', 'fijo',     '#8b5cf6', 0, 0, 0, ''),
    (new.id, 'Odontóloga',   'cliente',  '#38bdf8', 1, 3, 3, ''),
    (new.id, 'Psicóloga',    'cliente',  '#34d399', 2, 1, 5, 'No se hace community management.'),
    (new.id, 'Courier',      'cliente',  '#fb923c', 3, 4, 4, 'Solo publicación: no responde mensajes ni comentarios.'),
    (new.id, 'Personal',     'personal', '#f472b6', 4, 0, 0, '');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Recordatorios: se calculan en la base al guardar tareas y piezas
--   Reglas:  m:30        -> 30 minutos antes
--            h:2         -> 2 horas antes
--            d:1@18:00   -> 1 día antes a las 18:00
--            d:0@09:00   -> el mismo día a las 09:00
-- ---------------------------------------------------------------------
create or replace function public.rule_fire_at(p_rule text, p_due timestamp, p_tz text) returns timestamptz
language plpgsql stable as $$
declare n int; t time; m text[];
begin
  if p_rule ~ '^m:\d+$' then
    return (p_due - make_interval(mins => split_part(p_rule,':',2)::int)) at time zone p_tz;
  elsif p_rule ~ '^h:\d+$' then
    return (p_due - make_interval(hours => split_part(p_rule,':',2)::int)) at time zone p_tz;
  elsif p_rule ~ '^d:\d+@\d{1,2}:\d{2}$' then
    m := regexp_match(p_rule, '^d:(\d+)@(\d{1,2}:\d{2})$');
    n := m[1]::int; t := m[2]::time;
    return ((p_due::date - n) + t) at time zone p_tz;
  end if;
  return null;
end $$;

create or replace function public.rule_label(p_rule text) returns text language sql immutable as $$
  select case
    when p_rule ~ '^m:\d+$' then 'en ' || split_part(p_rule,':',2) || ' min'
    when p_rule ~ '^h:\d+$' then 'en ' || split_part(p_rule,':',2) || ' h'
    when p_rule ~ '^d:0@' then 'hoy'
    when p_rule ~ '^d:1@' then 'mañana'
    when p_rule ~ '^d:\d+@' then 'en ' || (regexp_match(p_rule,'^d:(\d+)@'))[1] || ' días'
    else '' end
$$;

create or replace function public.schedule_item_reminders(
  p_kind text, p_ref uuid, p_user uuid, p_date date, p_time time, p_rules text[],
  p_active boolean, p_title text, p_body text, p_url text
) returns void language plpgsql security definer set search_path = public as $$
declare tz text; due timestamp; r text; fa timestamptz; defaults text[];
begin
  delete from reminders where kind = p_kind and ref_id = p_ref and sent_at is null;
  if not p_active or p_date is null then return; end if;
  select timezone, case when p_kind = 'task' then task_rules else piece_rules end into tz, defaults from profiles where id = p_user;
  tz := coalesce(tz, 'America/Asuncion');
  due := p_date + coalesce(p_time, time '09:00');
  foreach r in array coalesce(p_rules, defaults, '{}') loop
    fa := rule_fire_at(r, due, tz);
    if fa is not null and fa > now() and fa <= (due at time zone tz) then
      insert into reminders(user_id, kind, ref_id, rule, fire_at, title, body, url)
      values (p_user, p_kind, p_ref, r, fa,
              p_title,
              p_body || case when rule_label(r) <> '' then ' · ' || rule_label(r) else '' end || ' (' || to_char(due, 'DD/MM HH24:MI') || ')',
              p_url)
      on conflict do nothing;
    end if;
  end loop;
end $$;

create or replace function public.tasks_reminders_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare sp text;
begin
  if tg_op = 'DELETE' then delete from reminders where kind='task' and ref_id = old.id and sent_at is null; return old; end if;
  select name into sp from spaces where id = new.space_id;
  perform schedule_item_reminders('task', new.id, new.user_id, new.due_date, new.due_time, new.reminder_rules,
    new.status <> 'done',
    case when new.is_meeting then '📅 Reunión: ' else '⏰ Vence: ' end || new.title,
    coalesce(sp, 'Sin espacio'), '/tareas?t=' || new.id);
  return new;
end $$;
drop trigger if exists tasks_reminders on public.tasks;
create trigger tasks_reminders after insert or update of due_date, due_time, reminder_rules, status, title, space_id, is_meeting or delete
  on public.tasks for each row execute function public.tasks_reminders_trg();

create or replace function public.pieces_reminders_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare sp text; tl text;
begin
  if tg_op = 'DELETE' then delete from reminders where kind='piece' and ref_id = old.id and sent_at is null; return old; end if;
  select name into sp from spaces where id = new.space_id;
  tl := case new.type when 'post' then 'post' when 'carrusel' then 'carrusel' when 'historia' then 'historia'
                      when 'reel' then 'reel' when 'video' then 'video' else 'pieza' end;
  perform schedule_item_reminders('piece', new.id, new.user_id, new.publish_date, new.publish_time, new.reminder_rules,
    new.status <> 'publicado',
    '📣 Publicar ' || tl || ': ' || new.title, coalesce(sp, ''), '/editorial?p=' || new.id);
  return new;
end $$;
drop trigger if exists pieces_reminders on public.pieces;
create trigger pieces_reminders after insert or update of publish_date, publish_time, reminder_rules, status, title, type, space_id or delete
  on public.pieces for each row execute function public.pieces_reminders_trg();

-- Si cambian las reglas por defecto o la zona horaria, recalcular todo lo pendiente
create or replace function public.profile_rules_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.task_rules is distinct from old.task_rules or new.timezone is distinct from old.timezone then
    update tasks set due_date = due_date where user_id = new.id and status <> 'done' and due_date >= current_date - 1;
  end if;
  if new.piece_rules is distinct from old.piece_rules or new.timezone is distinct from old.timezone then
    update pieces set publish_date = publish_date where user_id = new.id and status <> 'publicado' and publish_date >= current_date - 1;
  end if;
  return new;
end $$;
drop trigger if exists profile_rules on public.profiles;
create trigger profile_rules after update of task_rules, piece_rules, timezone on public.profiles
  for each row execute function public.profile_rules_trg();

-- Notificación de prueba (desde Configuración)
create or replace function public.send_test_push() returns void language sql security definer set search_path = public as $$
  insert into reminders(user_id, kind, fire_at, title, body, url)
  values (auth.uid(), 'test', now(), '✅ Notificaciones activas', 'Así te van a llegar los recordatorios.', '/config');
$$;

-- ---------------------------------------------------------------------
-- Envío: lo llama la Edge Function "send-reminders" cada minuto
--   1) genera el resumen diario de cada usuaria a su hora
--   2) devuelve (y marca como enviados) los avisos vencidos
-- ---------------------------------------------------------------------
create or replace function public.take_due_notifications() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p record; loc timestamp; d date; npub int; ntask int; nover int; body text; result jsonb;
begin
  for p in select * from profiles where digest_enabled loop
    loc := now() at time zone p.timezone; d := loc::date;
    if loc::time >= p.digest_time and (p.last_digest_on is null or p.last_digest_on < d) then
      update profiles set last_digest_on = d where id = p.id;
      select count(*) into npub from pieces where user_id = p.id and publish_date = d and status <> 'publicado';
      select count(*) into ntask from tasks where user_id = p.id and due_date = d and status <> 'done';
      select count(*) into nover from tasks where user_id = p.id and due_date < d and status <> 'done';
      if npub + ntask + nover > 0 then
        select coalesce(string_agg(x, ' · '), '') into body from (
          select '📣 ' || coalesce(to_char(pc.publish_time,'HH24:MI') || ' ', '') ||
                 case pc.type when 'post' then 'Post' when 'carrusel' then 'Carrusel' when 'historia' then 'Historia'
                              when 'reel' then 'Reel' when 'video' then 'Video' else 'Pieza' end
                 || ' ' || s.name || ': ' || pc.title as x
          from pieces pc join spaces s on s.id = pc.space_id
          where pc.user_id = p.id and pc.publish_date = d and pc.status <> 'publicado'
          order by pc.publish_time nulls last limit 4) q;
        insert into reminders(user_id, kind, fire_at, title, body, url) values (
          p.id, 'digest', now(),
          'Hoy: ' || npub || case when npub = 1 then ' publicación' else ' publicaciones' end
                 || ' y ' || ntask || case when ntask = 1 then ' tarea' else ' tareas' end
                 || case when nover > 0 then ' · ' || nover || ' vencida' || case when nover = 1 then '' else 's' end else '' end,
          coalesce(nullif(body,''), 'Abrí tu panel para ver el día.'), '/');
      end if;
    end if;
  end loop;

  with due as (
    update reminders set sent_at = now()
    where id in (select id from reminders where sent_at is null and fire_at <= now() and fire_at > now() - interval '12 hours'
                 order by fire_at for update skip locked limit 500)
    returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', due.id, 'title', due.title, 'body', due.body, 'url', due.url, 'kind', due.kind,
      'subs', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
               from push_subscriptions s where s.user_id = due.user_id))), '[]'::jsonb)
  into result from due;
  -- limpiar avisos viejos
  delete from reminders where sent_at < now() - interval '30 days';
  return result;
end $$;
revoke all on function public.take_due_notifications() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Portal del cliente (acceso por link secreto, sin cuenta)
-- ---------------------------------------------------------------------
create or replace function public.portal_get(p_token text, p_month text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s spaces; r jsonb;
begin
  select * into s from spaces where portal_token = p_token and not archived and kind = 'cliente';
  if not found or p_token is null or length(p_token) < 20 then return null; end if;
  select jsonb_build_object(
    'client', jsonb_build_object('name', s.name, 'color', s.color),
    'owner', (select display_name from profiles where id = s.user_id),
    'month', p_month,
    'brief', (select brief from plans where space_id = s.id and month = p_month),
    'months', (select coalesce(jsonb_agg(distinct to_char(publish_date,'YYYY-MM')), '[]'::jsonb) from pieces where space_id = s.id and share_with_client and publish_date is not null),
    'pieces', coalesce((select jsonb_agg(jsonb_build_object(
        'id', pc.id, 'title', pc.title, 'type', pc.type, 'status', pc.status, 'approval', pc.approval,
        'concept', pc.concept, 'copy', pc.copy, 'channels', pc.channels,
        'publish_date', pc.publish_date, 'publish_time', to_char(pc.publish_time,'HH24:MI'),
        'design_url', pc.design_url, 'video_url', pc.video_url, 'images', pc.images,
        'comments', coalesce((select jsonb_agg(jsonb_build_object('author', c.author, 'author_name', c.author_name, 'kind', c.kind, 'body', c.body, 'created_at', c.created_at) order by c.created_at)
                              from piece_comments c where c.piece_id = pc.id), '[]'::jsonb)
      ) order by pc.publish_date, pc.publish_time nulls last)
      from pieces pc where pc.space_id = s.id and pc.share_with_client
        and pc.publish_date >= to_date(p_month || '-01','YYYY-MM-DD')
        and pc.publish_date < to_date(p_month || '-01','YYYY-MM-DD') + interval '1 month'), '[]'::jsonb)
  ) into r;
  return r;
end $$;

create or replace function public.portal_feedback(p_token text, p_piece uuid, p_kind text, p_body text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s spaces; pc pieces; nm text := left(coalesce(nullif(trim(p_name),''), 'Cliente'), 60);
begin
  if p_kind not in ('comentario','aprobado','cambios') then raise exception 'Acción inválida'; end if;
  select * into s from spaces where portal_token = p_token and not archived and kind = 'cliente';
  if not found or length(p_token) < 20 then raise exception 'Enlace inválido'; end if;
  select * into pc from pieces where id = p_piece and space_id = s.id and share_with_client;
  if not found then raise exception 'Pieza no encontrada'; end if;
  if p_kind = 'comentario' and coalesce(trim(p_body),'') = '' then raise exception 'Escribí un comentario'; end if;

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

grant execute on function public.portal_get(text, text) to anon, authenticated;
grant execute on function public.portal_feedback(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.send_test_push() to authenticated;

-- Regenerar link de cliente (invalida el anterior)
create or replace function public.rotate_portal_token(p_space uuid) returns text language sql security definer set search_path = public as $$
  update spaces set portal_token = encode(extensions.gen_random_bytes(18),'hex') where id = p_space and user_id = auth.uid() returning portal_token;
$$;
grant execute on function public.rotate_portal_token(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: "covers" (público, imágenes de piezas) y "files" (privado)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('covers','covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('files','files', false) on conflict (id) do nothing;

drop policy if exists "own files rw" on storage.objects;
create policy "own files rw" on storage.objects for all to authenticated
  using (bucket_id in ('covers','files') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('covers','files') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Realtime (sincronización entre dispositivos)
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['spaces','tasks','pieces','piece_comments','plans','notes','profiles','attachments'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
