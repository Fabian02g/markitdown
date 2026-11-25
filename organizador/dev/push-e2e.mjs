// E2E de push: suscripción real (claves ECDH), recordatorio, Edge Function, recepción y descifrado.
import https from 'node:https'; import crypto from 'node:crypto'; import fs from 'node:fs'
import ece from 'http_ece'; import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync(new URL('./.env.local-stack', import.meta.url), 'utf8').trim().split('\n').map(l => l.split(/=(.*)/s).slice(0, 2)))
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys()
const authSecret = crypto.randomBytes(16)
const got = new Promise((res) => {
  https.createServer({ key: fs.readFileSync(new URL('./sink.key', import.meta.url)), cert: fs.readFileSync(new URL('./sink.crt', import.meta.url)) }, (req, r) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => { r.writeHead(201); r.end(); res({ headers: req.headers, body: Buffer.concat(ch) }) }) }).listen(7777)
})
const a = createClient('http://localhost:54321', env.ANON_KEY, { auth: { persistSession: false } })
const r = Math.random().toString(36).slice(2, 7)
await a.auth.signUp({ email: `push${r}@test.dev`, password: 'secreto123' })
const { error: se } = await a.from('push_subscriptions').insert({ endpoint: `https://localhost:7777/push/${r}`, p256dh: ecdh.getPublicKey('base64url'), auth: authSecret.toString('base64url'), device: 'test' })
if (se) throw se
await a.rpc('send_test_push')
const resp = await fetch('http://localhost:9000/', { method: 'POST', headers: { 'x-cron-secret': 'localsecret' } }).then(x => x.json())
console.log('function:', resp)
const msg = await Promise.race([got, new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 8000))])
console.log('auth header VAPID:', String(msg.headers.authorization).slice(0, 12), '| encoding:', msg.headers['content-encoding'], '| ttl:', msg.headers.ttl)
const plain = ece.decrypt(msg.body, { version: 'aes128gcm', privateKey: ecdh, authSecret: authSecret.toString('base64url') })
console.log('descifrado:', plain.toString())
process.exit(0)
