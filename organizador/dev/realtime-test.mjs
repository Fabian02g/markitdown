import { createClient } from '@supabase/supabase-js'; import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync(new URL('./.env.local-stack', import.meta.url), 'utf8').trim().split('\n').map(l => l.split(/=(.*)/s).slice(0, 2)))
const a = createClient('http://localhost:54321', env.ANON_KEY, { auth: { persistSession: false } })
const b = createClient('http://localhost:54321', env.ANON_KEY, { auth: { persistSession: false } })
const em = `rt${Date.now()}@t.dev`
await a.auth.signUp({ email: em, password: 'secreto123' }); await b.auth.signInWithPassword({ email: em, password: 'secreto123' })
const uid = (await b.auth.getUser()).data.user.id
b.realtime.setAuth((await b.auth.getSession()).data.session.access_token)
const got = new Promise((res) => b.channel('t').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: `user_id=eq.${uid}` }, (p) => res(p.new.title)).subscribe((s) => s === 'SUBSCRIBED' && setTimeout(() => a.from('tasks').insert({ title: 'Desde el celular' }).then(() => {}), 4000)))
console.log('dispositivo B recibió en vivo:', await Promise.race([got, new Promise((r) => setTimeout(() => r('TIMEOUT'), 15000))]))
process.exit(0)
