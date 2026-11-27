// Prueba: espacios con los clientes reales, acuerdo por mes, piezas del mes, exceso y extras por cobrar.
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:5173'
let fails = 0; const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++ }
const pad = (n) => String(n).padStart(2, '0'); const d0 = new Date(); const ym = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}`
const dayOf = (n) => `${ym}-${pad(n)}`
;(async () => {
  const proxy = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}
  const b = await chromium.launch(proxy)
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 }, timezoneId: 'America/Asuncion' })).newPage()
  const errors = []; p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(BASE + '/login'); await p.getByText('Crear cuenta').last().click()
  await p.getByPlaceholder('Tu nombre').fill('Aracely'); await p.getByPlaceholder('Correo').fill(`acuerdos${Date.now()}@test.dev`); await p.getByPlaceholder('Contraseña').fill('secreto123')
  await p.getByRole('button', { name: 'Crear cuenta' }).click(); await p.getByText(/, Aracely/).waitFor()
  for (const n of ['Garabato', 'Maga Odonto', 'Psico Marti', 'One Box Courier', 'Personal']) ok(await p.locator('aside').getByText(n, { exact: true }).first().isVisible(), `espacio inicial: ${n}`)

  // crear piezas de One Box: 5 reels (acuerdo 4) + 1 post
  const created = await p.evaluate(async ({ days }) => {
    const s = await import('/src/lib/store.ts'); const st = s.useStore.getState()
    const c = st.spaces.find((x) => x.name === 'One Box Courier')
    for (let i = 0; i < 5; i++) await s.savePiece({ title: 'Reel ' + (i + 1), space_id: c.id, type: 'reel', publish_date: days[i] })
    await s.savePiece({ title: 'Post promo', space_id: c.id, type: 'post', publish_date: days[5] })
    return c.id
  }, { days: [2, 4, 6, 8, 10, 12].map(dayOf) })
  await p.goto(BASE + '/espacio/' + created); await p.getByText('Lo que acordamos').waitFor()
  const agreement = p.locator('section:has(h2:text("Lo que acordamos"))')
  ok((await agreement.innerText()).includes('5 / 4'), 'cuenta videos contra el acuerdo (5 / 4)')
  ok(await agreement.getByText('Te pasaste del acuerdo: +1 video').isVisible(), 'avisa que se pasó del acuerdo')
  ok((await agreement.innerText()).includes('Solo publicación'), 'muestra las condiciones del cliente')
  const piezas = p.locator('section:has(h2:text("Piezas del mes"))')
  ok(/Reel\s*5/.test(await piezas.innerText()) && /Post\s*1/.test(await piezas.innerText()), 'Piezas del mes: Reel 5 · Post 1')

  // acuerdo especial solo para este mes
  await agreement.getByRole('button', { name: 'Editar' }).click()
  await agreement.locator('input[type=number]').first().fill('6')
  await agreement.getByRole('button', { name: /^Solo / }).click()
  await agreement.getByRole('button', { name: 'Guardar acuerdo' }).click()
  await agreement.getByText(/Acuerdo especial de/).waitFor({ timeout: 8000 }).catch(() => {})
  ok((await agreement.innerText()).includes('5 / 6') && await agreement.getByText(/Acuerdo especial de/).isVisible(), 'acuerdo especial del mes: 5 / 6')
  await p.getByRole('button', { name: 'Mes siguiente' }).first().click(); await p.waitForTimeout(500)
  ok(!(await agreement.getByText(/Acuerdo especial de/).isVisible()) && (await agreement.innerText()).includes('Videos y reels'), 'el mes siguiente vuelve al acuerdo general')
  await p.getByRole('button', { name: 'Mes anterior' }).first().click(); await p.waitForTimeout(400)

  // extra para cobrar
  const extras = p.locator('section:has(h2:text("Extras"))')
  await extras.getByRole('button', { name: 'Extra' }).click()
  const dlg = p.getByRole('dialog')
  await dlg.getByPlaceholder('Título o tema').fill('Flyer Black Friday urgente')
  ok(await dlg.getByText('Ya lo cobré').isVisible(), 'el extra muestra "Ya lo cobré" y monto')
  await dlg.getByPlaceholder('Monto a cobrar (opcional)').fill('150000')
  await dlg.getByRole('button', { name: 'Guardar' }).click(); await p.getByText('Pieza creada').last().waitFor(); await p.waitForTimeout(400)
  ok(/Por cobrar: 1 · 150\.000/.test(await extras.innerText()), 'Extras: "Por cobrar: 1 · 150.000"')
  await extras.getByRole('checkbox', { name: 'Cobrado' }).check(); await p.waitForTimeout(700)
  ok(!(await extras.getByText(/Por cobrar/).isVisible()), 'al tildar "cobrado" deja de estar por cobrar')
  await p.reload(); await p.getByText('Lo que acordamos').waitFor(); await p.waitForTimeout(500)
  ok(await extras.getByRole('checkbox', { name: 'Cobrado' }).isChecked() && (await agreement.innerText()).includes('5 / 6'), 'todo persiste al recargar')
  ok(!(await p.locator('section:has(h2:text("Piezas sin día"))').getByText('Flyer Black Friday').isVisible()), 'el extra no aparece en "Piezas sin día"')
  await p.screenshot({ path: process.env.SHOT || '/tmp/acuerdos.png', fullPage: true })
  ok(errors.length === 0, 'sin errores de página ' + errors.slice(0, 2).join(' | '))
  await b.close(); console.log(fails ? `${fails} fallas` : 'TODO OK'); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1) })
