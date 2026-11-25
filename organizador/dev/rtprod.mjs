import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('/home/user/markitdown/organizador/.env.production','utf8').split('\n').filter(l=>l.startsWith('VITE_')).map(l=>l.split(/=(.*)/s).slice(0,2)))
const URL_=env.VITE_SUPABASE_URL, KEY=env.VITE_SUPABASE_ANON_KEY
const a = createClient(URL_, KEY, { auth: { persistSession: false } }), b = createClient(URL_, KEY, { auth: { persistSession: false } })
const em = `rt${Date.now()}@test.dev`
console.log('signup', (await a.auth.signUp({ email: em, password: 'secreto123' })).error?.message ?? 'ok'); console.log('login', (await b.auth.signInWithPassword({ email: em, password: 'secreto123' })).error?.message ?? 'ok')
const uid = (await b.auth.getUser()).data.user.id
const t0 = Date.now()
const got = new Promise((res) => b.channel('t').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `user_id=eq.${uid}` }, (p) => res(p.new.title + ' en ' + (Date.now()-t1) + ' ms'))
  .subscribe((s, err) => { console.log('estado canal:', s, err?.message ?? '', Date.now()-t0, 'ms'); if (s === 'SUBSCRIBED') setTimeout(() => { t1 = Date.now(); a.from('tasks').insert({ title: 'Desde el celular' }).then(r => r.error && console.log(r.error)) }, 1500) }))
let t1 = 0
console.log('B recibió:', await Promise.race([got, new Promise((r) => setTimeout(() => r('TIMEOUT'), 20000))]))
process.exit(0)
