// Diagnóstico de sincronización en vivo entre dos navegadores contra BASE
const { chromium, devices } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const b = await chromium.launch(BASE.startsWith('https') && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  const email = `rtdbg${Date.now()}@test.dev`
  const d = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  const t0 = Date.now(); const log = (...a) => console.log(String(Date.now() - t0).padStart(6), ...a)
  d.on('websocket', (ws) => { log('ws abierto'); ws.on('framereceived', (f) => { const s = String(f.payload); if (/postgres_changes|phx_reply|system/.test(s)) log('<-', s.slice(0, 150)) }); ws.on('close', () => log('ws cerrado')) })
  await d.goto(BASE + '/login'); await d.getByText('Crear cuenta').last().click()
  await d.getByPlaceholder('Tu nombre').fill('A'); await d.getByPlaceholder('Correo').fill(email); await d.getByPlaceholder('Contraseña').fill('secreto123')
  await d.getByRole('button', { name: 'Crear cuenta' }).click(); await d.getByText(/, A/).waitFor(); log('desktop logueado')
  await d.goto(BASE + '/tareas'); log('desktop en /tareas'); await d.waitForTimeout(2500)
  const m = await (await b.newContext({ ...devices['Pixel 7'] })).newPage()
  await m.goto(BASE + '/login'); await m.getByPlaceholder('Correo').fill(email); await m.getByPlaceholder('Contraseña').fill('secreto123')
  await m.getByRole('button', { name: 'Ingresar' }).click(); await m.getByText(/, A/).waitFor(); log('móvil logueado')
  await m.getByRole('button', { name: 'Captura rápida' }).first().click()
  await m.getByPlaceholder('Ej.: Editar reel de la odontóloga').fill('Sync test'); await m.getByRole('dialog').getByRole('button', { name: 'Crear' }).click()
  await m.getByText('Tarea creada').last().waitFor(); log('móvil creó la tarea')
  const ok = await d.getByText('Sync test').waitFor({ timeout: 12000 }).then(() => true, () => false)
  log('desktop la muestra:', ok)
  await b.close()
})()
