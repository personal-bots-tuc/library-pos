---
type: Traps
version: daee6d3
validated: 2026-10-08
update_when: when new non-obvious behavior is confirmed
---

# Traps - Library System POS

## Runtime Config (CRÍTICO)
**Problema**: `VITE_*` variables se inyectan en build-time por Vite, pero Railway inyecta variables en runtime.
**Solución**: Usamos `config.template.js` + `entrypoint.sh` + `envsubst` para generar `config.js` en runtime.
**Evidencia**: `index.html` carga `<script src="/config.js">` ANTES de `<script type="module" src="/src/main.tsx">`.
**App accede**: `window.__ENV__.VITE_API_BASE_URL` (NO `import.meta.env.VITE_API_BASE_URL` en producción).
**Regresión 2026-10-08 (fix [POS-104])**: `src/api/client.ts` usaba `import.meta.env.VITE_API_BASE_URL` directo → bundle sin URL del API → axios pegaba same-origin `/api/*` → nginx respondía 405 → login PIN fallaba en silencio (sin red ni error útil). Se portó `src/lib/runtime-config.ts` (mismo patrón que admin). Regla: NUNCA leer `import.meta.env.VITE_*` fuera de `src/lib/runtime-config.ts`.

## Docker Multi-stage
**Problema**: `npm ci` en builder instala devDependencies, pero runtime usa nginx (no node).
**Solución**: Builder compila → copia `dist/` a nginx. No hay node en runtime.
**Verificación**: `docker exec <container> which node` → not found.

## Healthcheck
**Problema**: `wget /` siempre 200 (sirve index.html), aunque app falle en JS.
**Solución**: Endpoint real `/health` servido por nginx (location = /health → return 200 JSON).
**Verificación**: `curl /health` → `{"status":"ok"}` independiente de React.

## SPA Routing + Nginx
**Problema**: Refresh en `/venta/123` → 404 si nginx no tiene fallback.
**Solución**: `try_files $uri $uri/ /index.html;` en location /.
**Verificación**: `docker run` → refresh en ruta profunda → 200 OK.

## Proxy Dev vs Prod
**Problema**: En dev, `/api` proxy a localhost:3000. En prod, NO hay proxy (nginx sirve estáticos, API en otro dominio).
**Solución**: `vite.config.ts` proxy solo en `mode !== 'production'`.
**Verificación**: Build production → no hay proxy config en dist.

## School Context (Multi-tenant)
**Problema**: `school_id` viene en JWT, pero hooks necesitan contexto reactivo.
**Solución**: `SchoolProvider` decodifica JWT en cliente + `x-school-id` header en axios interceptor.
**Evidencia**: `src/hooks/useSchool.ts` + `src/api/client.ts` interceptor.

## Axios Interceptors
**Problema**: 401 → refresh token → retry request original.
**Solución**: Interceptor response en `src/api/client.ts` con queue para evitar refresh loops.
**Verificación**: Test `useAuth.test.tsx` cubre flujo refresh.

## Tailwind 4 + Vite
**Problema**: Tailwind 4 usa `@import "tailwindcss"` en CSS, no `tailwind.config.js`.
**Solución**: `@tailwindcss/vite` plugin + `@import "tailwindcss"` en `index.css`.
**Evidencia**: `vite.config.ts` plugin + `src/index.css`.

## React 19 + StrictMode
**Problema**: StrictMode monta/desmonta doble en dev → efectos secundarios dobles.
**Solución**: Cleanup functions en useEffect + `AbortController` en fetches.
**Evidencia**: `useProducts.ts`, `useSale.ts` usan AbortController.
**Supersedido 2026-10-13 (POS-108)**: la cancelación la maneja React Query por observer/signal; ver "Polling, cache local y costos Railway".

## Husky + Commit Message
**Problema**: Commits sin ticket no trazables.
**Solución**: `.husky/commit-msg` valida formato `[TICKET-123]-descripcion`.
**Excepción**: Merge commits y reverts permitidos (validar en regex).
## Polling, cache local y costos Railway (POS-108, 2026-10-13)
**Problema**: `useShift` polleaba `/cash-shifts/active` cada 10s incondicional (~259k req/mes por tab, impidiendo App Sleep) y el buscador disparaba 1 request por tecla.
**Reglas vigentes**:
1. **PROHIBIDO `setInterval` para refetch fuera de `src/hooks/useSyncGate.ts`** — CI falla (`npm run guardrails`). Sync periódico = compuerta (visible + actividad <10min) + `refetchInterval` de React Query.
2. **Capa de datos = React Query + persistencia IndexedDB** (`src/lib/queryClient.ts`, `src/lib/persistence.ts`). Solo queries root `products`/`clients` se persisten; turno/ventas/movimientos JAMÁS (whitelist `shouldPersistQuery`).
3. **Escrituras SIEMPRE online** (mutations, `retry: 0` por defecto del client). Offline quedan pausadas (`networkMode:'online'`) y se disparan solas al reconectar — el cajero no hace nada, el carrito no se pierde. NO imprimir ni confirmar comprobante hasta respuesta del servidor.
4. **Anti-duplicados de ventas** (`src/pages/POS/hooks/saleIntegrity.ts`): `idempotencyKey` (UUID por intento) viaja en el body — el back lo descarta hoy (Zod sin `.strict()`) y la dedup se activa sola cuando el team back lo soporte. Resultado incierto (respuesta perdida): NUNCA retry ciego → reconciliar con `GET /sales?sellerId=…&fromDate=…` antes de reenviar la misma key.
5. **Service Worker**: `public/sw.js` (hand-rolled) hace PASSTHROUGH de `/config.js` (inyección runtime), `/health` y `/api/*`. Guardado por guardrails. Update de versión SOLO con confirmación del usuario (puede estar cobrando).
6. **Sin health-pings de conectividad** — detección pasiva vía eventos (`ConnectivityBadge`); un ping rompería App Sleep.
7. `useSyncGate` comparte UN solo set de listeners + timer para toda la app (store singleton con useSyncExternalStore).

## Los toasts deben RENDERIZARSE (POS-108, 2026-10-14)
**Problema**: `ToastProvider` acumulaba `toasts` en estado pero ningún componente
los dibujaba en el POS → todo error de venta era invisible (el cajero solo veía
"Guardando…"). La verificación debe hacerse sobre UI real, no sobre el contexto.
**Regla**: si existe un canal de feedback, hay un test que prueba que el mensaje
llega al DOM (`useToast.viewport.test.tsx`). Además: las mutations NUNCA se
persisten (`shouldDehydrateMutation: () => false`) — restaurar una mutation
pausada la revivía tras cada recarga; y el cobro tiene watchdog 30s con
reconciliación (`resolveAfterWatchdog`) ante API dormida/caída.

## IndexedDB: object stores NO se crean en runtime (POS-108 hotfix, 2026-10-14)
**Problema**: idb-keyval `createStore(db, name)` crea el store SOLO al abrir la DB
con schema nuevo. Un store por namespace (`rq-anon` en login, `rq-<school>:<user>`
post-login) explotaba para todo namespace posterior al primero
(`NotFoundError: object store not found`) como rejection no capturada por
persistClient en cada mutation.
**Regla**: IndexedDB usa UN store fijo (`cache`) y los namespaces van en el prefijo
de la key (`pos-query:<schoolId>:<userId>`). Para cambiar la forma de la DB:
renombrarla (`*-v2`) y borrar la legacy en best-effort — nunca upgrades manuales.
**Evidencia**: `src/lib/persistence.ts` + test de regresión multi-namespace.

## SVG paths copiados a mano se corruptúan (POS-110, 2026-10-14)
**Problema**: el icono `building-library` del header POS (`POSHeader.tsx`) tenía un
`d` corrupto: le faltaba el segmento `c1.747 0 3.332.477 4.5 1.253v13C19.832...`
(un copy/paste truncado). React DOM loguea `Error: <path> attribute d: Expected
number` en consola aunque el icono se vea "bien" a simple vista — el navegador solo
descarta el segmento inválido y sigue.
**Regla**: ante error `attribute d: Expected number`, comparar SIEMPRE contra la
fuente canónica del icono (Heroicons) o contra otra ocurrencia del mismo icono en el
propio repo (el mismo path estaba correcto en `LoginPage.tsx`). No "reparar" cifras
a ojo.
**Evidencia**: `src/pages/POS/components/POSHeader/POSHeader.tsx` ahora comparte el
path exacto de `src/pages/LoginPage.tsx:253`.

## Contrato del API: items viajan como `productId`, no `product` (POS-111, 2026-10-14)
**Problema**: cobrar en staging devolvía
`400 {"message":"Datos de entrada inválidos","details":{"body.items.N.productId":["Invalid input: expected string, received undefined"]}}`.
El API nueva (hexagonal, `internal/handler/sales/sales.schemas.ts`) espera
`items[].productId`; el API vieja aceptaba `items[].product` — por eso el mismo
front "funcionaba" en prod y fallaba en staging sin haber tocado el código.
**Regla**: el POS modela el item como `{ product, quantity }` (CartItem) y SOLO
convierte en el borde HTTP — cada hook que postea items usa `toWireItems()`
propio (`useSale.ts`, `useReturn.ts`, `useQuotes.ts`). Si el back cambia el
contrato otra vez, el ajuste vive en UN punto por hook, no en el dominio.
**Diagnóstico**: ante un 400 con `message: "Datos de entrada inválidos"`, mirar
`details`: el field path (`body.items.0.productId`) dice EXACTAMENTE qué campo
falla. No confundir con 404 (producto inexistente) ni 409 (sin turno abierto).

## ClientPicker: búsqueda por acción explícita, no por cada tecla (POS-201, 2026-10-16)
**Problema**: al seleccionar un cliente, el POS quedaba "tildado" ~30s. El endpoint
`GET /clients?search=...` del backend hace COLLSCAN en MongoDB (falta índice de
texto en `fullName`, `dni`, `phone`; `$or` + `$regex` case-insensitive no usa
índices B-tree). Antes el frontend disparaba 1 request por tecla (debounce 300ms),
multiplicando la pausa.
**Regla**: `ClientPicker` busca SOLO por acción explícita (Enter o botón
"Buscar"), no por cada cambio de input. Se muestra estado de carga ("Buscando
clientes…") para que el cajero sepa que está trabajando, no que está tildado.
**Diagnóstico de raíz (backend pendiente)**: agregar índice de texto en
`internal/repository/mongo/customers/client.schema.ts` y cambiar la query a
`$text` en `mongoose-client-repository.ts`. Hasta entonces, el frontend reduce
la frecuencia de requests pero no elimina la pausa por búsqueda.

## Reset de campos del POS al finalizar venta (POS-202, 2026-10-16)
**Problema**: al finalizar una venta, solo se vaciaba el carrito (`clearCart` en `completeSale`, `useSaleFlow.ts`). Los campos `discountValue`, `discountType`, `amountReceived`, `paymentMethod`, `selectedClient` y `search` se mantenían con los valores de la venta anterior, haciendo que un descuento aplicado se "filtrara" a la siguiente venta.
**Causa raíz**: `clearSale()` (que resetea TODO, `usePOSPage.ts:184`) solo se invocaba al **confirmar** el modal de éxito (`POSPage.tsx:106`, `onConfirmSaleSuccess`). Al cerrar el modal por Escape o clic fuera (`onCloseSaleSuccess`), solo se cerraba el modal sin resetear.
**Regla**: `onCloseSaleSuccess` también invoca `clearSale()`, así que al cerrar el modal de éxito por **cualquier vía** todos los campos vuelven al estado inicial. El reset ocurre **después del modal**, no inmediatamente tras el checkout, para no borrar datos si la venta falla y el cajero quiere reintentar.
