---
type: Traps
version: <sha-corto>
validated: 2026-10-05
update_when: when new non-obvious behavior is confirmed
---

# Traps - Library System POS

## Runtime Config (CRÍTICO)
**Problema**: `VITE_*` variables se inyectan en build-time por Vite, pero Railway inyecta variables en runtime.
**Solución**: Usamos `config.template.js` + `entrypoint.sh` + `envsubst` para generar `config.js` en runtime.
**Evidencia**: `index.html` carga `<script src="/config.js">` ANTES de `<script type="module" src="/src/main.tsx">`.
**App accede**: `window.__ENV__.VITE_API_BASE_URL` (NO `import.meta.env.VITE_API_BASE_URL` en producción).

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

## Husky + Commit Message
**Problema**: Commits sin ticket no trazables.
**Solución**: `.husky/commit-msg` valida formato `[TICKET-123]-descripcion`.
**Excepción**: Merge commits y reverts permitidos (validar en regex).