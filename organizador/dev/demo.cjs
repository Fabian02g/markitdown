// Graba videos de demostración (local). Uso: node dev/demo.cjs <carpeta_salida>
const { chromium, devices } = require('playwright')
const fs = require('fs'), path = require('path')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5173'
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '.env.local-stack'), 'utf8').trim().split('\n').map(l => l.split(/=(.*)/s).slice(0, 2)))
const pad = (n) => String(n).padStart(2, '0'); const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient('http://localhost:54321', env.ANON_KEY, { auth: { persistSession: false } })
  const email = `demo${Date.now()}@test.dev`
  await sb.auth.signUp({ email, password: 'secreto123', options: { data: { display_name: 'Aracely' } } })
  const { data: sp } = await sb.from('spaces').select('*').order('sort')
  const S = Object.fromEntries(sp.map((s) => [s.name, s.id]))
  await sb.from('tasks').insert([
    { title: 'Editar reel limpieza dental', space_id: S['Maga Odonto'], due_date: day(0), due_time: '11:00', priority: 'high', is_top: true, estimate_min: 90, category: 'Edición de video' },
    { title: 'Enviar PDP de diciembre', space_id: S['Psico Marti'], due_date: day(0), due_time: '16:00', priority: 'urgent', is_top: true, estimate_min: 60 },
    { title: 'Reunión de equipo', space_id: S['Garabato'], due_date: day(0), due_time: '09:30', is_meeting: true, estimate_min: 45 },
    { title: 'Flyer promo envíos gratis', space_id: S['One Box Courier'], due_date: day(1), priority: 'medium', estimate_min: 120 },
    { title: 'Turno dentista', space_id: S['Personal'], due_date: day(2), due_time: '18:00' },
    { title: 'Cumple de Romi 🎂', space_id: S['Personal'], due_date: day(4) },
    { title: 'Informe mensual de redes', space_id: S['Garabato'], due_date: day(-1), priority: 'high', estimate_min: 120 },
  ], { defaultToNull: false })
  const img = fs.readFileSync(path.join(__dirname, '..', 'public', 'icon-512.png'))
  const uid = (await sb.auth.getUser()).data.user.id
  const up = async () => { const p = `${uid}/${Math.random().toString(36).slice(2)}.png`; await sb.storage.from('covers').upload(p, img, { contentType: 'image/png' }); return p }
  await sb.from('pieces').insert([
    { title: 'Mitos de la ansiedad', type: 'carrusel', space_id: S['Psico Marti'], publish_date: day(0), publish_time: '19:00', status: 'aprobado', approval: 'aprobado', images: [await up(), await up()], concept: '5 mitos comunes y qué dice la evidencia.' },
    { title: 'Reel respiración 4-7-8', type: 'reel', space_id: S['Psico Marti'], publish_date: day(2), status: 'esperando', approval: 'pendiente' },
    { title: 'Tips de cepillado', type: 'post', space_id: S['Maga Odonto'], publish_date: day(1), publish_time: '12:00', status: 'diseno' },
    { title: 'Historia: horarios de atención', type: 'historia', space_id: S['One Box Courier'], publish_date: day(3), status: 'idea' },
  ], { defaultToNull: false })
  const browser = await chromium.launch()

  // ---- Computadora ----
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT, size: { width: 1280, height: 800 } } })
  const p = await ctx.newPage()
  await p.goto(BASE + '/login')
  await p.getByPlaceholder('Correo').fill(email); await p.getByPlaceholder('Contraseña').fill('secreto123')
  await p.getByRole('button', { name: 'Ingresar' }).click()
  await p.getByText(/, Aracely/).waitFor(); await wait(1800)
  await p.locator('button[aria-label="Marcar como hecha"]').first().click(); await wait(900)
  await p.locator('button[aria-label="Marcar como hecha"]').first().click(); await wait(1800)
  await p.locator('aside').getByText('Mi semana').click(); await wait(1500)
  await p.locator('aside').getByText('Tabla de tareas').click(); await wait(1000)
  await p.getByRole('button', { name: 'Columnas' }).click(); await wait(800)
  const c = p.locator('text=Flyer promo envíos gratis').first(); const t = p.locator('text=Soltá tareas acá').first()
  const cb = await c.boundingBox(), tb = await t.boundingBox()
  await p.mouse.move(cb.x + 30, cb.y + 8); await p.mouse.down(); await p.mouse.move(cb.x + 50, cb.y + 20, { steps: 6 })
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 30 }); await wait(300); await p.mouse.up(); await wait(1000)
  await p.locator('aside').getByText('Calendario editorial').click(); await wait(1200)
  await p.getByRole('button', { name: 'Mes siguiente' }).click(); await wait(700)
  await p.getByRole('button', { name: 'Mes anterior' }).click(); await wait(900)
  await p.locator('aside').getByText('Psico Marti', { exact: true }).click(); await wait(900)
  await p.getByRole('button', { name: 'Grilla' }).click(); await wait(1500)
  await p.keyboard.press('c'); await wait(900); await p.keyboard.press('Escape'); await wait(800)
  await ctx.close()

  // ---- Celular ----
  const mctx = await browser.newContext({ ...devices['iPhone 13'], recordVideo: { dir: OUT, size: { width: 390, height: 664 } } })
  const m = await mctx.newPage()
  await m.goto(BASE + '/login')
  await m.getByPlaceholder('Correo').fill(email); await m.getByPlaceholder('Contraseña').fill('secreto123')
  await m.getByRole('button', { name: 'Ingresar' }).click()
  await m.getByText(/, Aracely/).waitFor(); await wait(1500)
  await m.mouse.wheel(0, 600); await wait(900); await m.mouse.wheel(0, -600); await wait(600)
  await m.getByRole('button', { name: 'Abrir menú' }).click(); await wait(900)
  await m.locator('aside').getByText('Tabla de tareas').last().click(); await wait(1100)
  const row = m.locator('div[role=button]:has-text("Flyer promo")').first(); const rb = await row.boundingBox()
  await m.mouse.move(rb.x + rb.width - 30, rb.y + rb.height / 2); await m.mouse.down()
  await m.mouse.move(rb.x + rb.width - 220, rb.y + rb.height / 2, { steps: 25 }); await m.mouse.up(); await wait(1300)
  const row2 = m.locator('div[role=button]:has-text("Turno dentista")').first(); const r2 = await row2.boundingBox()
  await m.mouse.move(r2.x + 30, r2.y + r2.height / 2); await m.mouse.down()
  await m.mouse.move(r2.x + 230, r2.y + r2.height / 2, { steps: 25 }); await m.mouse.up(); await wait(1400)
  await m.getByRole('button', { name: 'Captura rápida' }).first().click(); await wait(800)
  await m.getByPlaceholder('Ej.: Editar reel de la odontóloga').fill('Grabar historias del consultorio'); await wait(500)
  await m.getByRole('dialog').getByRole('button', { name: 'Crear' }).click(); await wait(1400)
  // link del cliente
  const tok = (await sb.from('spaces').select('portal_token').eq('id', S['Psico Marti']).single()).data.portal_token
  await m.goto(BASE + '/c/' + tok); await wait(1500)
  await m.locator('button[title="Mitos de la ansiedad"]').click(); await wait(1300)
  await m.getByRole('button', { name: 'Cerrar' }).click(); await wait(900)
  await mctx.close()
  await browser.close()
  console.log('ok', email)
})().catch((e) => { console.error(e); process.exit(1) })
