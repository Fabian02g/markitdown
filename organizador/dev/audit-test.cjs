// Pruebas de las correcciones de la auditoría QA (navegador real).
const { chromium, devices } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5173'
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++ }
const pad = (n) => String(n).padStart(2, '0'); const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
;(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
  // Hora de Paraguay (UTC-3), 22:30: completar a esa hora tiene que contar para "hoy"
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, timezoneId: 'America/Asuncion' })
  const p = await ctx.newPage(); const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  const email = `audit${Date.now()}@test.dev`
  await p.goto(BASE + '/login'); await p.getByText('Crear cuenta').last().click()
  await p.getByPlaceholder('Tu nombre').fill('Aracely'); await p.getByPlaceholder('Correo').fill(email); await p.getByPlaceholder('Contraseña').fill('secreto123')
  await p.getByRole('button', { name: 'Crear cuenta' }).click(); await p.getByText(/, Aracely/).waitFor()
  const dlg = p.getByRole('dialog')

  // 1) cambios sin guardar → pregunta antes de descartar
  await p.getByRole('button', { name: 'Nueva tarea' }).first().click()
  await dlg.getByPlaceholder('¿Qué tenés que hacer?').fill('Tarea a medio escribir')
  let asked = ''
  p.once('dialog', (d) => { asked = d.message(); d.dismiss() })
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok(asked.includes('cambios sin guardar') && await dlg.isVisible(), 'cerrar con cambios pregunta y, si cancelo, no pierdo lo escrito')
  ok(await dlg.getByPlaceholder('¿Qué tenés que hacer?').inputValue() === 'Tarea a medio escribir', 'el texto sigue ahí')
  p.once('dialog', (d) => d.accept())
  await dlg.getByRole('button', { name: 'Cerrar' }).click(); await p.waitForTimeout(400)
  ok(await dlg.count() === 0, 'si confirmo, se descarta')
  await p.getByRole('button', { name: 'Nueva tarea' }).first().click(); await p.waitForTimeout(200)
  let askedEmpty = false; p.once('dialog', (d) => { askedEmpty = true; d.dismiss() })
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok(!askedEmpty && await dlg.count() === 0, 'sin cambios cierra directo, sin preguntar')

  // 2) notas: se guardan solas al cerrar
  await p.goto(BASE + '/notas'); await p.getByRole('button', { name: 'Nota' }).first().click()
  await dlg.getByPlaceholder('Título').fill('Idea guardada sola')
  await p.keyboard.press('Escape'); await p.waitForTimeout(800)
  ok(await p.getByText('Idea guardada sola').isVisible(), 'la nota se guarda sola al cerrar')

  // 3) links: agrega https:// y rechaza basura
  await p.goto(BASE + '/editorial'); await p.getByRole('button', { name: 'Nueva pieza' }).click()
  await dlg.getByPlaceholder('Título o tema').fill('Pieza con link')
  await dlg.getByPlaceholder('https://').fill('javascript:alert(1)')
  await dlg.getByRole('button', { name: 'Guardar' }).click(); await p.waitForTimeout(300)
  ok(await p.getByText('El link al diseño no es válido').isVisible(), 'rechaza links peligrosos con un mensaje claro')
  await dlg.getByPlaceholder('https://').fill('canva.com/design/abc')
  await dlg.getByRole('button', { name: 'Guardar' }).click(); await p.getByText('Pieza creada').last().waitFor()
  await p.getByRole('button', { name: 'Lista' }).click()
  await p.getByText('Pieza con link').click()
  ok(await dlg.getByPlaceholder('https://').inputValue() === 'https://canva.com/design/abc', 'completa https:// automáticamente')
  await dlg.getByRole('button', { name: 'Cerrar' }).click(); await p.waitForTimeout(300)

  // 4) "Completadas hoy" con hora local: completada a las 22:30 de Paraguay (= 01:30 UTC del día siguiente)
  await p.getByRole('button', { name: 'Nueva tarea' }).first().click()
  await dlg.getByPlaceholder('¿Qué tenés que hacer?').fill('Completada de noche'); await dlg.getByRole('button', { name: 'Guardar' }).click()
  await p.getByText('Tarea creada').last().waitFor()
  const iso = await p.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase.ts')
    const local = new Date(); local.setHours(22, 30, 0, 0)
    await supabase.from('tasks').update({ status: 'done', completed_at: local.toISOString() }).eq('title', 'Completada de noche')
    return local.toISOString()
  })
  await p.goto(BASE + '/'); await p.getByText(/, Aracely/).waitFor(); await p.waitForTimeout(1500)
  const txt = await p.locator('button:has-text("Completadas hoy")').innerText()
  const n = Number((txt.match(/(\d+)\s*Completadas hoy/) || [])[1])
  ok(n === 1, `completada 22:30 local (${iso.slice(0, 16)}Z en UTC) cuenta en "Completadas hoy" (muestra ${n})`)

  // 5) celular: tocar un día del calendario editorial muestra sus publicaciones
  const m = await (await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Asuncion' })).newPage()
  await m.goto(BASE + '/login'); await m.getByPlaceholder('Correo').fill(email); await m.getByPlaceholder('Contraseña').fill('secreto123')
  await m.getByRole('button', { name: 'Ingresar' }).click(); await m.getByText(/, Aracely/).waitFor()
  await m.evaluate(async (d) => { const s = await import('/src/lib/store.ts'); const st = s.useStore.getState(); const c = st.spaces.find((x) => x.kind === 'cliente'); await s.savePiece({ title: 'Reel del día', space_id: c.id, type: 'reel', publish_date: d }) }, day(1))
  await m.goto(BASE + '/editorial'); await m.waitForTimeout(500)
  await m.getByRole('button', { name: 'Calendario' }).click(); await m.waitForTimeout(400)
  // .last(): el mismo número puede aparecer antes en los días del mes anterior
  await m.locator('span.grid', { hasText: new RegExp(`^${Number(day(1).slice(8))}$`) }).last().click(); await m.waitForTimeout(500)
  ok(await m.getByRole('dialog').getByText('Reel del día').isVisible(), 'celular: tocar un día muestra sus publicaciones')
  ok(await m.getByRole('dialog').getByText('Agregar en este día').isVisible(), 'y ofrece agregar en ese día')
  await m.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  // 6) tarjeta de primeros pasos en el celular
  await m.goto(BASE + '/')
  ok(await m.getByText('Instalá Mi Panel en tu celular').waitFor({ timeout: 8000 }).then(() => true, () => false), 'celular sin instalar: muestra cómo instalar la app')
  await m.getByRole('button', { name: 'Ocultar' }).click(); await m.reload(); await m.getByText(/, Aracely/).waitFor()
  ok(!(await m.getByText('Instalá Mi Panel en tu celular').isVisible()), 'se puede ocultar y no vuelve a aparecer')

  ok(errors.length === 0, 'sin errores de página ' + errors.slice(0, 2).join(' | '))
  await b.close(); console.log(fails ? `${fails} fallas` : 'TODO OK'); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1) })
