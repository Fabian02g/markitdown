// Verifica que el payload que arma la función (web-push, VAPID, aes128gcm) llega y se descifra igual que en el navegador.
import https from 'node:https'; import crypto from 'node:crypto'; import fs from 'node:fs'
import ece from 'http_ece'; import webpush from 'web-push'
const v = JSON.parse(fs.readFileSync(new URL('./vapid.json', import.meta.url)))
webpush.setVapidDetails('mailto:test@example.com', v.publicKey, v.privateKey)
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = crypto.randomBytes(16)
const got = new Promise((res) => https.createServer({ key: fs.readFileSync(new URL('./sink.key', import.meta.url)), cert: fs.readFileSync(new URL('./sink.crt', import.meta.url)) },
  (req, r) => { const ch = []; req.on('data', c => ch.push(c)); req.on('end', () => { r.writeHead(201); r.end(); res({ h: req.headers, b: Buffer.concat(ch) }) }) }).listen(7778))
const payload = { title: '📣 Publicar carrusel: Mitos de la ansiedad', body: 'Psicóloga · en 30 min (28/11 19:00)', url: '/editorial?p=x', tag: 'piece-1' }
const res = await webpush.sendNotification({ endpoint: 'https://localhost:7778/push/1', keys: { p256dh: ecdh.getPublicKey('base64url'), auth: auth.toString('base64url') } }, JSON.stringify(payload), { TTL: 21600, urgency: 'high' })
const m = await got
console.log('status', res.statusCode, '| VAPID', m.h.authorization.startsWith('vapid t=') ? 'ok' : m.h.authorization.slice(0, 10), '| enc', m.h['content-encoding'], '| urgency', m.h.urgency)
console.log('descifrado →', ece.decrypt(m.b, { version: 'aes128gcm', privateKey: ecdh, authSecret: auth.toString('base64url') }).toString())
process.exit(0)
