// Prueba de humo contra el stack local: auth, RLS, recordatorios y portal.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(new URL('./.env.local-stack', import.meta.url), 'utf8').trim().split('\n').map(l => l.split(/=(.*)/s).slice(0, 2)));
const URL_ = 'http://localhost:54321';
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };

const mk = () => createClient(URL_, env.ANON_KEY, { auth: { persistSession: false } });
const a = mk(), b = mk(), anon = mk();
const svc = createClient(URL_, env.SERVICE_KEY, { auth: { persistSession: false } });
const r = Math.random().toString(36).slice(2, 7);

const sa = await a.auth.signUp({ email: `a${r}@test.dev`, password: 'secreto123', options: { data: { display_name: 'Aracely' } } });
ok(!sa.error && sa.data.session, 'registro usuaria A ' + (sa.error?.message ?? ''));
const sb = await b.auth.signUp({ email: `b${r}@test.dev`, password: 'secreto123' });
ok(!sb.error, 'registro usuaria B');

const { data: prof } = await a.from('profiles').select('*').single();
ok(prof?.display_name === 'Aracely', 'perfil creado con nombre');
const { data: spaces } = await a.from('spaces').select('*').order('sort');
ok(spaces?.length === 5, 'espacios iniciales: ' + spaces?.map(s => s.name).join(', '));
const psico = spaces.find(s => s.name === 'Psicóloga');

// RLS: B no ve espacios de A
const { data: bsp } = await b.from('spaces').select('id').eq('id', psico.id);
ok(bsp?.length === 0, 'RLS: B no ve espacios de A');
const { error: berr } = await b.from('tasks').insert({ title: 'hack', space_id: psico.id });
ok(!!berr, 'B no puede crear tarea en espacio de A');

// Tarea con vencimiento en 3 días a las 19:00
const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const { data: t, error: te } = await a.from('tasks').insert({ title: 'Entregar flyer', space_id: psico.id, due_date: d, due_time: '19:00' }).select().single();
ok(!te, 'crear tarea ' + (te?.message ?? ''));
let { data: rem } = await a.from('reminders').select('*').eq('ref_id', t.id).order('fire_at');
ok(rem?.length === 2, 'recordatorios de tarea generados: ' + rem?.map(x => x.rule + '→' + x.fire_at).join(' | '));

// Pieza viernes 19:00 → 3 recordatorios (día antes 18:00, mismo día 09:00, 30 min antes)
const { data: pc } = await a.from('pieces').insert({ title: 'Carrusel ansiedad', type: 'carrusel', space_id: psico.id, publish_date: d, publish_time: '19:00' }).select().single();
({ data: rem } = await a.from('reminders').select('*').eq('ref_id', pc.id).order('fire_at'));
ok(rem?.length === 3, 'recordatorios de pieza: ' + rem?.map(x => x.rule + ' ' + new Date(x.fire_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })).join(' | '));

// Marcar publicada → borra pendientes
await a.from('pieces').update({ status: 'publicado' }).eq('id', pc.id);
({ data: rem } = await a.from('reminders').select('*').eq('ref_id', pc.id));
ok(rem?.length === 0, 'al publicar se cancelan los recordatorios');
await a.from('pieces').update({ status: 'esperando' }).eq('id', pc.id);

// Portal del cliente
const month = d.slice(0, 7);
const bad = await anon.rpc('portal_get', { p_token: 'x'.repeat(36), p_month: month });
ok(bad.data === null, 'portal con token inválido no devuelve nada');
const pg = await anon.rpc('portal_get', { p_token: psico.portal_token, p_month: month });
ok(pg.data?.pieces?.length === 1 && pg.data.client.name === 'Psicóloga', 'portal devuelve piezas del mes');
const fb = await anon.rpc('portal_feedback', { p_token: psico.portal_token, p_piece: pc.id, p_kind: 'cambios', p_body: 'Cambiar la palabra ansiedad', p_name: 'Dra. X' });
ok(!fb.error, 'cliente pide cambios ' + (fb.error?.message ?? ''));
const { data: pc2 } = await a.from('pieces').select('status,approval').eq('id', pc.id).single();
ok(pc2.status === 'ajustes' && pc2.approval === 'cambios', 'pieza pasa a "con ajustes"');
const ap = await anon.rpc('portal_feedback', { p_token: psico.portal_token, p_piece: pc.id, p_kind: 'aprobado', p_body: '', p_name: 'Dra. X' });
const { data: pc3 } = await a.from('pieces').select('status,approval').eq('id', pc.id).single();
ok(!ap.error && pc3.approval === 'aprobado', 'cliente aprueba');
const { data: cm } = await a.from('piece_comments').select('*').eq('piece_id', pc.id);
ok(cm?.length === 2, 'comentarios visibles para la dueña');
const direct = await anon.from('pieces').select('*');
ok((direct.data ?? []).length === 0, 'anónimo no lee tablas directamente');

// Envío: notificaciones del portal salen ya
await a.from('push_subscriptions').insert({ endpoint: 'https://example.invalid/' + r, p256dh: 'x', auth: 'y' });
const due = await svc.rpc('take_due_notifications');
const mine = (due.data ?? []).filter(n => n.subs.some(s => s.endpoint.endsWith(r)));
ok(mine.length >= 2, 'take_due_notifications entrega avisos del portal: ' + mine.map(n => n.title).join(' | '));
const again = await svc.rpc('take_due_notifications');
ok(!(again.data ?? []).some(n => n.subs.some(s => s.endpoint.endsWith(r)) && n.kind === 'portal'), 'no se reenvían');
const forbidden = await a.rpc('take_due_notifications');
ok(!!forbidden.error, 'usuaria no puede invocar el envío');

// ---- Seguridad (auditoría QA) ----
const inj = await anon.rpc('schedule_item_reminders', { p_kind: 'test', p_ref: pc.id, p_user: sa.data.user.id, p_date: '2030-01-01', p_time: '10:00', p_rules: ['m:30'], p_active: true, p_title: 'x', p_body: 'x', p_url: '/' })
ok(!!inj.error, 'anónimo NO puede programar avisos a otra usuaria')
const inj2 = await b.rpc('schedule_item_reminders', { p_kind: 'test', p_ref: pc.id, p_user: sa.data.user.id, p_date: '2030-01-01', p_time: '10:00', p_rules: ['m:30'], p_active: true, p_title: 'x', p_body: 'x', p_url: '/' })
ok(!!inj2.error, 'otra usuaria NO puede programar avisos ajenos')
const js = await a.from('pieces').update({ design_url: 'javascript:alert(1)' }).eq('id', pc.id)
ok(!!js.error, 'la base rechaza links javascript: en el diseño')
const anonTest = await anon.rpc('send_test_push')
ok(!!anonTest.error, 'anónimo no puede pedir notificación de prueba')
// el mismo celular pasa de una cuenta a otra
const ep = 'https://web.push.apple.com/test-' + r
await a.rpc('register_push', { p_endpoint: ep, p_p256dh: 'k', p_auth: 'a', p_device: 'iPhone' })
const rb = await b.rpc('register_push', { p_endpoint: ep, p_p256dh: 'k', p_auth: 'a', p_device: 'iPhone' })
const { data: subsA } = await a.from('push_subscriptions').select('id').eq('endpoint', ep)
const { data: subsB } = await b.from('push_subscriptions').select('id').eq('endpoint', ep)
ok(!rb.error && subsA.length === 0 && subsB.length === 1, 'el celular queda asociado a la cuenta con sesión abierta')
const badEp = await a.rpc('register_push', { p_endpoint: 'http://evil', p_p256dh: 'k', p_auth: 'a', p_device: 'x' })
ok(!!badEp.error, 'rechaza endpoints de push inválidos')
// límite de envíos del portal
let limited = false
for (let i = 0; i < 32; i++) {
  const res = await anon.rpc('portal_feedback', { p_token: psico.portal_token, p_piece: pc.id, p_kind: 'comentario', p_body: 'spam ' + i, p_name: 'x' })
  if (res.error) { limited = /Demasiados/.test(res.error.message); break }
}
ok(limited, 'el portal limita envíos masivos')
