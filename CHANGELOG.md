# Changelog

All notable changes to this project will be documented in this format.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Venta/preview/devolución/presupuesto fallaban con 400 en staging (POS-111)** — el API nueva (hexagonal) espera `items[].productId` en el body; el POS enviaba `items[].product` (contrato de la API vieja que sigue en producción, por eso main "funcionaba"). Fix: conversión `toWireItems()` en el borde HTTP de `useSale`, `useReturn` y `useQuotes` — el modelo interno (`CartItem.product`) no cambia. Tests actualizados para asertar el payload del wire.
- **Error SVG `<path> attribute d: Expected number` en consola (POS-110)** — el icono `building-library` del header del POS tenía un atributo `d` corrupto (copy/paste truncado: faltaba el segmento `c1.747 0 ... 4.5 1.253v13C19.832...`). Chrome/React DOM logueaba el error en cada render del header, ensuciando la consola durante el flujo de venta. Fix: path restaurado con la versión canónica de Heroicons (idéntica a la ya correcta de `LoginPage.tsx`).
- **Crash IndexedDB tras login (POS-108 hotfix)** — los object stores de IndexedDB
  solo se crean en la primera apertura de la DB: un store por namespace (`rq-anon`
  en login) explotaba con `NotFoundError` para cualquier namespace posterior, y
  `persistClient` lanzaba rejection sin capturar en cada mutation. Fix: un solo
  store fijo + namespace como prefijo de key + DB `-v2` con limpieza legacy.
  Test de regresión multi-namespace incluido.
- **POS bloqueado en "Guardando…" al cobrar (POS-108)** — Tres causas combinadas:
  (1) los toasts existían en estado pero NUNCA se renderizaban en el DOM del POS
  (viewport ausente) → cualquier error de venta era invisible;
  (2) las mutations pausadas se persistían en IndexedDB y reaparecían tras cada
  recarga → bloqueo permanente (ahora `shouldDehydrateMutation: () => false`);
  (3) sin watchdog: una API dormida/caída dejaba el flujo en espera infinita.
  Ahora: watchdog de 30s con reconciliación (`useSaleFlow`), toasts visibles,
  badge ámbar distingue "se enviará al reconectar", con test dedicado.

### Added
- **Optimización de costos Railway (App Sleep) + offline-first de lectura (POS-108)** —
  (1) Capa de datos migrada a React Query con persistencia en IndexedDB namespaced por
  `schoolId:userId` (`src/lib/persistence.ts`, `src/providers/QueryProvider.tsx`): el catálogo
  sobrevive al sleep del backend y abre instantáneo, purgándose en logout.
  (2) `useSyncGate` (`src/hooks/useSyncGate.ts`): única compuerta permitida para sync
  automático (pestaña visible + actividad <10min). El turno activo pollea cada 60s solo
  con turno abierto y compuertas abiertas (antes: 10s incondicional ≈259k req/mes/tab);
  el catálogo sincroniza cada 10min (antes: 1 request por tecla de búsqueda — ahora filtro
  client-side).
  (3) Anti-duplicados de ventas (`src/pages/POS/hooks/saleIntegrity.ts`): lock sincrónico
  + `idempotencyKey` por intento (viaja al back; se activa cuando el team back lo soporte)
  + reconciliación contra `GET /sales` ante resultado incierto en vez de retry ciego.
  (4) PWA: `public/sw.js` hand-rolled (navegaciones network-first, assets cache-first,
  `/config.js`/`/health`/`/api/*` siempre red), manifest y banner de actualización con
  confirmación del usuario (nunca recarga a mitad de venta).
  (5) `ConnectivityBadge` informativo sin acciones (detección pasiva, sin health-pings).
  (6) Guardrail de CI `npm run guardrails` (`ci/guardrails.mjs`): falla si aparece
  `setInterval` fuera de `useSyncGate` o si `sw.js` pierde los passthroughs.

### Added
- Pipeline staging→production: workflow `smoke-staging.yml` (smoke tests automáticos post-deploy en staging), checklist de validación manual obligatorio (`docs/STAGING_VALIDATION_CHECKLIST.md`), PR template con sección RELEASE, branch protection (`develop`/`main`) y GitHub Environments (`staging`/`production`). [[POS-100](https://github.com/personal-bots-tuc/library-pos/pull/2)], [[#3](https://github.com/personal-bots-tuc/library-pos/pull/3)]
- `docs/DEPLOYMENT_PIPELINE.md` — fuente de verdad del mecanismo de deploy de este repo. [POS-102](https://github.com/personal-bots-tuc/library-pos/pull/5), [[POS-103](https://github.com/personal-bots-tuc/library-pos/pull/8)]
- `src/lib/runtime-config.ts` — lectura de config runtime via `window.__ENV__`. [POS-104](https://github.com/personal-bots-tuc/library-pos/pull/11)
- Initial Docker + Railway deployment setup

### Fixed
- Login PIN en producción/staging: el cliente axios leía `import.meta.env.VITE_API_BASE_URL` (vacío en build Docker) y enviaba requests al mismo dominio (nginx respondía 405); ahora usa `runtime-config.ts` → apunta a la API real. [POS-104](https://github.com/personal-bots-tuc/library-pos/pull/11)
- Runtime configuration via nginx + envsubst
- Healthcheck endpoint /health
- GitHub Actions CI/CD pipeline
- Documentation structure (docs/agent/)

### Changed
- Migrated from Vercel to Railway
- Unified package manager to npm
- Aligned TypeScript configs to project references

### Fixed
- SPA routing in production via nginx try_files
- CORS configuration for preview deployments

## [1.0.0] - 2026-10-05
### Added
- Initial release# Auto-deploy validation jueves,  8 de octubre de 2026, 22:36:16 -03
