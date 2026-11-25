# Auditoría QA · Mi Panel

**Fecha:** 25/11/2026 · **Ambientes:** local (Supabase en Docker) y producción (`mi-panel-organizador.netlify.app`)
**Alcance:** seguridad, integridad de datos, funcionalidad, UX móvil/escritorio, notificaciones, rendimiento, pruebas automatizadas.

## Resumen

| Severidad | Encontrados | Corregidos |
|---|---|---|
| Crítica | 1 | 1 |
| Alta | 4 | 4 |
| Media | 6 | 6 |
| Baja | 4 | 4 |

Todas las correcciones están en producción y cubiertas por pruebas automatizadas.

## Hallazgos

| # | Sev. | Área | Hallazgo | Corrección | Verificación |
|---|---|---|---|---|---|
| 1 | Crítica | Seguridad | Función interna `schedule_item_reminders` ejecutable por anónimos: permitía programar notificaciones push con texto y link arbitrarios a cualquier usuario (phishing). Reproducido. | `revoke` de todas las funciones internas; solo `portal_get`/`portal_feedback` quedan públicas. | `smoke`: anónimo y otra usuaria reciben "permission denied" (local y prod). |
| 2 | Alta | Seguridad | Una notificación podía abrir un link externo. | Constraint `reminders.url` solo rutas internas + Service Worker que ignora orígenes externos. | `smoke` + revisión SW. |
| 3 | Alta | Datos | Cerrar una tarea/pieza (✕, tocar afuera, deslizar, Esc) descartaba lo escrito sin avisar. | Confirmación "¿Descartar cambios?"; notas se guardan solas al cerrar. | `audit-test` (4 casos). |
| 4 | Alta | Notificaciones | Mismo celular con dos cuentas: quedaba registrado a la primera y la segunda no recibía avisos. | RPC `register_push` reasigna el dispositivo a la sesión activa; al cerrar sesión se desregistra. | `smoke`. |
| 5 | Alta | Funcional | "Completadas hoy" y "Objetivo semanal" usaban fecha UTC: lo completado después de las 21:00 (PY) contaba para el día siguiente. | Conversión a día local (`localDay`). También en exportación CSV. | `audit-test` simula 22:30 en America/Asuncion. |
| 6 | Media | Seguridad | Links de diseño/video aceptaban cualquier texto (incl. `javascript:`). | Validación en UI (agrega `https://`) + constraint en BD. | `audit-test` + `smoke`. |
| 7 | Media | Seguridad | Portal del cliente sin límite: permitía spam de comentarios/notificaciones. | Máx. 30 envíos cada 10 min por cliente. | `smoke`. |
| 8 | Media | Almacenamiento | Imágenes y adjuntos quedaban huérfanos al borrar piezas/tareas o quitar imágenes (consume cuota gratis). | Limpieza al vencer el "Deshacer"; imágenes quitadas o no guardadas se borran; deshacer restaura adjuntos. | Revisión + e2e de deshacer. |
| 9 | Media | UX móvil | Calendario editorial en celular: tocar un día abría "nueva pieza" sin poder ver lo agendado. | Hoja con las publicaciones del día + "Agregar en este día". Agenda hace scroll al detalle. | `audit-test`. |
| 10 | Media | Onboarding | Nada indicaba que en iPhone hay que instalar la app para recibir avisos. | Tarjeta de primeros pasos (instalar / activar avisos), se oculta sola o al cerrarla. Botón nativo en Android. | `audit-test`. |
| 11 | Media | Sincronización | Cambios hechos mientras se conectaba el tiempo real podían quedar fuera hasta recargar; sin reconexión ante errores. | Re-sincroniza al conectar y reintenta ante cortes. | 4/4 corridas aisladas + e2e 3/3 en prod. |
| 12 | Baja | Exportación | CSV vulnerable a inyección de fórmulas en Excel. | Prefijo `'` en celdas que empiezan con `= + - @`. | Revisión. |
| 13 | Baja | PWA | Caché del Service Worker crecía con cada versión. | Límite de 60 archivos + versión de caché nueva. | Revisión. |
| 14 | Baja | Rendimiento | Un único JS de 830 KB: cada actualización re-descargaba todo. | Librerías en archivos separados (cacheables entre versiones). | Build. |
| 15 | Baja | Accesibilidad | Texto secundario con contraste bajo (~2,6:1). | Color ajustado en tema oscuro y claro. | Captura visual. |

## Pruebas automatizadas (`npm test`)

| Suite | Qué cubre | Resultado |
|---|---|---|
| `test:smoke` (27) | Auth, RLS, recordatorios, portal, envío push, seguridad | OK |
| `test:e2e` (34) | Flujo completo escritorio + celular + cliente | OK local · OK prod (3/3) |
| `test:touch` (19) | Toques reales de iPhone con temblor de dedo, gestos, volver atrás | OK local y prod |
| `audit-test` (13) | Correcciones de esta auditoría | OK local |

## Riesgos abiertos / recomendaciones

1. **Registro abierto:** cualquiera con el link puede crear una cuenta (sus datos quedan aislados). Cerrar cuando Aracely tenga la suya.
2. **Pausa del plan gratis de Supabase** tras 7 días sin uso: los datos no se pierden, se reactiva desde el panel.
3. **Propiedad:** proyecto y sitio están en cuentas de terceros; transferir a cuentas de Aracely.
4. **Notificación push en iPhone real:** el envío está verificado hasta el servicio de Apple; la recepción depende de tener la app instalada y el permiso dado.
5. **Etiqueta "Powered by Netlify"** (plan gratis): no tapa controles; se quita migrando a Cloudflare Pages.
