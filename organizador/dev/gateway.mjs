// Mini gateway local que imita las rutas de Supabase (solo para desarrollo).
import http from 'node:http';

const routes = [
  ['/auth/v1', 'http://localhost:9999'],
  ['/rest/v1', 'http://localhost:3000'],
  ['/storage/v1', 'http://localhost:5000'],
  ['/functions/v1', 'http://localhost:9000'],
];
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-upsert, x-cron-secret, cache-control, x-supabase-api-version',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
  'access-control-expose-headers': 'content-range, x-total-count',
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const r = routes.find(([p]) => req.url.startsWith(p));
  if (!r) { res.writeHead(404, cors); return res.end('not found'); }
  const target = new URL(r[1]);
  let path = req.url.slice(r[0].length) || '/';
  if (r[0] === '/functions/v1') path = path; // edge-runtime enruta por nombre
  const headers = { ...req.headers, host: target.host };
  // PostgREST/Storage necesitan el JWT: si solo viene apikey, usarla como Authorization
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const p = http.request({ hostname: target.hostname, port: target.port, path, method: req.method, headers }, (pr) => {
    const h = { ...pr.headers, ...cors };
    res.writeHead(pr.statusCode, h);
    pr.pipe(res);
  });
  p.on('error', (e) => { res.writeHead(502, cors); res.end(String(e)); });
  req.pipe(p);
})
// WebSocket de Realtime: /realtime/v1/websocket → :4000/socket/websocket (tenant realtime-dev)
import net from 'node:net'
server.on('upgrade', (req, sock, head) => {
  if (!req.url.startsWith('/realtime/v1')) return sock.destroy()
  const path = req.url.replace('/realtime/v1', '/socket')
  const up = net.connect(4000, 'localhost', () => {
    const lines = [`${req.method} ${path} HTTP/1.1`]
    for (const [k, v] of Object.entries(req.headers)) lines.push(`${k}: ${k === 'host' ? 'realtime-dev.localhost' : v}`)
    up.write(lines.join('\r\n') + '\r\n\r\n'); up.write(head)
    sock.pipe(up).pipe(sock)
  })
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy())
})
server.listen(54321, () => console.log('gateway on :54321'));
