# Checklist Validación Staging — POS (library-pos)

**Ejecutar SIEMPRE antes de crear el PR `develop` → `main`.**
**Obligatorio para humanos e IAs. Sin este checklist completo NO se promueve a producción.**

**URL staging:** https://library-pos-staging.up.railway.app
**URL producción:** https://library-pos-production.up.railway.app

## Pre-requisitos automáticos
- [ ] CI verde en `develop` (lint-test-typecheck)
- [ ] Workflow `Smoke Tests Staging` verde
- [ ] Deploy en Railway muestra "Success" (environment: staging)

## Validaciones manuales
| # | Check | Cómo validar | Criterio | OK |
|---|-------|--------------|----------|----|
| 1 | Home carga | Abrir URL staging | 200, sin 5xx, HTML carga | [ ] |
| 2 | Config runtime | DevTools → ver `config.js` o `/config.js` | `VITE_API_BASE_URL` apunta a **staging** (api-core-system-staging) | [ ] |
| 3 | Health endpoint | `curl https://library-pos-staging.up.railway.app/health` | `{"status":"ok"}` | [ ] |
| 4 | Navegación SPA | Click en 3 rutas internas (ej. dashboard, lista, detalle) | Sin 404, sin recarga completa de página | [ ] |
| 5 | Login | Flujo login con credenciales de prueba | Token OK, redirige al dashboard | [ ] |
| 6 | Llamada API real | Listado que consuma API staging | Datos cargan, 200 en Network | [ ] |
| 7 | Consola limpia | DevTools → Console | Sin errores JS críticos (rojos) | [ ] |
| 8 | Refresh en ruta profunda | F5 estando en una ruta interna | No da 404 (fallback SPA OK) | [ ] |

## Decisión
- [ ] **APROBADO** → crear PR `develop` → `main` (template de release)
- [ ] **RECHAZADO** → documentar en issue/comentario, fixear en rama nueva, repetir

**Ejecutado por (humano/IA):** __________  **Fecha:** __________  **Commit develop:** __________
