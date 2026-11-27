-- =====================================================================
--  Acuerdos por mes y extras para cobrar (pedido de Aracely)
-- =====================================================================

-- Acuerdo especial de un mes (si está vacío, rige el acuerdo general del cliente)
alter table public.plans add column if not exists quota_videos int check (quota_videos >= 0);
alter table public.plans add column if not exists quota_static int check (quota_static >= 0);
alter table public.plans add column if not exists agreement_notes text;

-- Extras: si ya se cobró y cuánto
alter table public.pieces add column if not exists extra_billed boolean not null default false;
alter table public.pieces add column if not exists extra_amount numeric(14,2) check (extra_amount >= 0);

-- Espacios iniciales con sus clientes reales y acuerdos
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1));
begin
  insert into profiles(id, display_name) values (new.id, nm) on conflict do nothing;
  insert into spaces(user_id, name, kind, color, sort, quota_videos, quota_static, agreement_notes) values
    (new.id, 'Garabato',        'fijo',     '#8b5cf6', 0, 0, 0, ''),
    (new.id, 'Maga Odonto',     'cliente',  '#fb923c', 1, 3, 3, 'Community management a partir de enero.'),
    (new.id, 'Psico Marti',     'cliente',  '#34d399', 2, 1, 5, 'No se hace community management.'),
    (new.id, 'One Box Courier', 'cliente',  '#2dd4bf', 3, 4, 4, 'Solo publicación: no responde mensajes ni comentarios.'),
    (new.id, 'Personal',        'personal', '#f472b6', 4, 0, 0, '');
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
