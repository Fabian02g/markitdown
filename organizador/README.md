# Mi Panel · organización personal y profesional

App web (PWA) para organizar trabajo fijo, clientes freelance, vida personal, calendario editorial y recordatorios reales.

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Auth, Postgres, Realtime, Storage, Edge Functions, pg_cron) · Web Push.

## Qué incluye
- **Mi panel**: saludo, frase editable, resumen del día, 3 prioridades, agenda de hoy, próximos vencimientos, tarjetas por espacio, objetivo semanal, mini calendario.
- **Tareas**: lista agrupada por fecha, columnas (Kanban con arrastrar), calendario mes/semana/día, filtros (espacio, cliente, estado, prioridad, categoría, fecha) y búsqueda. Subtareas, notas, etiquetas, adjuntos, tiempo estimado, recordatorios por tarea.
- **Calendario editorial** separado de las tareas: piezas por cliente (post, carrusel, historia, reel, video), estados de producción, aprobación y publicación, copy, imágenes, link de diseño, video de Drive, registro de "publicado manualmente".
- **Plan por cliente (PDP)**: calendario/lista/grilla estilo Instagram, etapa del plan, brief del mes, acuerdos (cuotas de videos y posts), ideas sin fecha.
- **Link para el cliente** (`/c/<token>`): grilla del mes; el cliente aprueba, pide cambios o comenta sin crear cuenta. Te llega una notificación.
- **Hoy sale**, **Mi agenda**, **Mi semana** (detecta sobrecarga, mover tareas de día arrastrando), **Notas e ideas** (convertir en tarea o pieza), **Proyectos**, **Configuración** (espacios, colores, categorías, avisos, exportar JSON/CSV, importar el panel anterior).
- **Recordatorios reales**: se calculan en la base al guardar y los envía una Edge Function cada minuto (pg_cron), aunque la app esté cerrada. Resumen diario configurable.
- PWA instalable, responsive, modo oscuro/claro, sincronización en vivo entre dispositivos.

## Puesta en marcha (una sola vez)

### 1. Supabase
1. Crear un proyecto en https://supabase.com (plan gratis).
2. **SQL Editor** → pegar y ejecutar `supabase/migrations/0001_init.sql`.
3. **Authentication → Providers → Email**: dejar habilitado. Opcional: desactivar "Confirm email" para entrar sin confirmar correo.
4. **Authentication → URL Configuration**: Site URL = la URL donde se publique la app.

### 2. Notificaciones push
```bash
npx web-push generate-vapid-keys        # guarda publicKey y privateKey
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@correo.com CRON_SECRET=<texto-largo-al-azar>
npx supabase functions deploy send-reminders --no-verify-jwt
```
Después, en el SQL Editor, ejecutar `supabase/cron.sql` reemplazando `<PROJECT_REF>` y `<CRON_SECRET>`.

### 3. Publicar la app (Cloudflare Pages o Netlify, gratis)
- Build: `npm run build` · carpeta de salida: `dist`
- Variables de entorno:
  - `VITE_SUPABASE_URL` = `https://<PROJECT_REF>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = anon key (Project Settings → API)
  - `VITE_VAPID_PUBLIC_KEY` = la clave pública VAPID
- `public/_redirects` ya hace que las rutas funcionen.

### 4. En el celular
- **Android (Chrome)**: abrir la URL → menú → "Instalar app". Configuración → Activar notificaciones.
- **iPhone (iOS 16.4+)**: abrir en Safari → Compartir → "Agregar a inicio" → abrir desde el ícono → Configuración → Activar notificaciones.

## Desarrollo local
```bash
npm install
cp .env.example .env.local   # completar
npm run dev
```
`dev/` tiene un entorno Supabase local con Docker (gateway, pruebas de humo, E2E con Playwright, prueba de push).
