// Toques táctiles reales (CDP) con temblor del dedo: menú, cerrar, ventanas y gestos.
const { chromium, devices } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5173'
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++ }
;(async () => {
  const b = await chromium.launch(BASE.startsWith('https') && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); const cdp = await c.newCDPSession(p); global.__p = p
  const tap = async (loc) => { const bx = await loc.boundingBox(); const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 2, y: y + 4 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  const swipe = async (x1, y1, x2, y2) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] })
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 10, y: y1 + (y2 - y1) * i / 10 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  await p.goto(BASE + '/login'); await p.getByText('Crear cuenta').last().click()
  await p.getByPlaceholder('Tu nombre').fill('T'); await p.getByPlaceholder('Correo').fill('touch' + Date.now() + '@test.dev'); await p.getByPlaceholder('Contraseña').fill('secreto123')
  await p.getByRole('button', { name: 'Crear cuenta' }).click(); await p.getByText(/, T/).waitFor()
  const menuOpen = () => p.getByRole('button', { name: 'Cerrar menú' }).waitFor({ state: 'hidden', timeout: 1500 }).then(() => false, () => true)
  for (const path of ['/', '/semana', '/tareas', '/editorial']) {
    await p.goto(BASE + path); await p.waitForTimeout(600)
    await tap(p.getByRole('button', { name: 'Abrir menú' })); await p.waitForTimeout(450)
    ok(await p.getByRole('button', { name: 'Cerrar menú' }).isVisible(), `${path}: ☰ abre el menú`)
    await tap(p.getByRole('button', { name: 'Cerrar menú' })); await p.waitForTimeout(450)
    ok(!(await menuOpen()), `${path}: ✕ cierra el menú`)
  }
  await swipe(4, 420, 220, 425); await p.waitForTimeout(450)
  ok(await p.getByRole('button', { name: 'Cerrar menú' }).isVisible(), 'deslizar desde el borde izquierdo abre el menú')
  await swipe(250, 400, 60, 405); await p.waitForTimeout(450)
  ok(!(await menuOpen()), 'deslizar a la izquierda cierra el menú')
  await tap(p.getByRole('button', { name: 'Abrir menú' })); await p.waitForTimeout(450)
  await tap(p.locator('aside').getByText('Mi agenda').last()); await p.waitForTimeout(600)
  ok(p.url().endsWith('/agenda') && !(await menuOpen()), 'tocar una opción del menú navega y lo cierra')
  // volver atrás (gesto de Safari): la pantalla aparece al instante, sin quedar en blanco
  await p.goBack(); await p.waitForTimeout(60)
  ok(await p.evaluate(() => Number(getComputedStyle(document.querySelector('main')).opacity)) > 0.95, 'volver atrás muestra la pantalla al instante')
  ok(!(await menuOpen()), 'volver atrás no muestra el menú abierto')
  await p.goForward(); await p.waitForTimeout(400)
  await tap(p.getByRole('button', { name: 'Captura rápida' }).first()); await p.waitForTimeout(450)
  ok(await p.getByRole('dialog').isVisible(), '+ abre la captura rápida')
  await tap(p.getByRole('dialog').getByRole('button', { name: 'Cerrar' })); await p.waitForTimeout(450)
  ok(await p.getByRole('dialog').count() === 0, '✕ cierra la ventana')
  await tap(p.getByRole('button', { name: 'Captura rápida' }).first()); await p.waitForTimeout(450)
  const hb = await p.getByRole('dialog').getByText('Captura rápida').boundingBox()
  await swipe(hb.x + 40, hb.y + 5, hb.x + 40, hb.y + 260); await p.waitForTimeout(500)
  ok(await p.getByRole('dialog').count() === 0, 'deslizar la ventana hacia abajo la cierra')
  // tarea: tocar abre, deslizar completa
  await tap(p.getByRole('button', { name: 'Captura rápida' }).first()); await p.waitForTimeout(400)
  ok(await p.getByRole('dialog').count() === 1, 'el primer toque después de deslizar funciona')
  await p.getByPlaceholder('Ej.: Editar reel de la odontóloga').fill('Tarea táctil'); await p.getByPlaceholder('Ej.: Editar reel de la odontóloga').press('Enter')
  await p.goto(BASE + '/tareas'); await p.waitForTimeout(700)
  const row = p.locator('div[role=button]:has-text("Tarea táctil")').first()
  await tap(row); await p.waitForTimeout(500)
  ok(await p.getByRole('dialog').getByText('Editar tarea').isVisible(), 'tocar una tarea la abre')
  await tap(p.getByRole('dialog').getByRole('button', { name: 'Cerrar' })); await p.waitForTimeout(450)
  const rb = await row.boundingBox()
  await swipe(rb.x + 30, rb.y + rb.height / 2, rb.x + 260, rb.y + rb.height / 2 + 3); await p.waitForTimeout(1200)
  ok(await p.getByRole('dialog').count() === 0 && !(await p.getByText('Tarea táctil').isVisible()), 'deslizar → completa la tarea sin abrirla')
  await b.close(); console.log(fails ? `${fails} fallas` : 'TODO OK'); process.exit(fails ? 1 : 0)
})().catch(async (e) => { console.error(e.message.split('\n')[0]); try { await global.__p.screenshot({ path: '/tmp/claude-0/touchfail.png' }) } catch {} process.exit(1) })
