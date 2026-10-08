---
type: Runbook
version: 3bec361
validated: 2026-10-08
update_when: when commands, validation steps, or Definition of Done change
scope:
  - package.json
  - vite.config.ts
  - Dockerfile
  - nginx-main.conf
  - .github/workflows/ci.yml
  - .github/workflows/smoke-staging.yml
  - .github/pull_request_template.md
  - nginx.conf.template
  - entrypoint.sh
---

# Runbook - Library System POS

## Prerequisites
- Node.js 22+
- npm 10+
- Docker 24+ (para build local)
- Railway CLI (opcional, para debug)

## Commands

### Development
```bash
# Instalar dependencias
npm ci

# Servidor dev (con proxy a localhost:3000)
npm run dev

# Typecheck
npm run typecheck

# Lint
npm run lint
npm run lint:fix

# Format
npm run format

# Tests
npm run test          # Watch mode
npm run test:run      # CI mode
npm run test:coverage # Con coverage thresholds
npm run test:ui       # UI visual
```

### Build & Docker
```bash
# Build producción (TypeScript + Vite)
npm run build

# Preview build local
npm run preview

# Docker build
docker build -t librarysystem-pos .

# Docker run (con variables)
docker run -d -p 5173:5173 \
  -e VITE_API_BASE_URL=https://api.test.com \
  -e VITE_APP_NAME="Test POS" \
  -e PORT=5173 \
  librarysystem-pos

# Verificar healthcheck
curl http://localhost:5173/health
# → {"status":"ok"}

# Verificar config.js
curl http://localhost:5173/config.js
# → window.__ENV__.VITE_API_BASE_URL="https://api.test.com"
```

### Railway Deployment
```bash
# Login
railway login

# Link project
railway link

# Deploy manual
railway up

# Ver logs
railway logs

# Rollback REAL: NO existe `railway rollback` en CLI v4.
# Redeploy del último deployment (restart/recovery):
railway redeploy -s library-pos -e production -y
# Rollback a versión anterior: Railway Dashboard → library-pos → Deployments → "Redeploy" en el deployment previo.

# Variables
railway variables set VITE_API_BASE_URL=https://api.tudominio.com
```

## Pipeline de despliegue

> Fuente de verdad del mecanismo de este repo: [../DEPLOYMENT_PIPELINE.md](../DEPLOYMENT_PIPELINE.md)

Flujo obligatorio:
1. Rama `feature/[POS-XXX]-desc` desde `develop` → PR a `develop` → CI verde → merge.
2. Merge a `develop` → deploy a staging → workflow **Smoke Tests Staging** corre automáticamente.
3. Smoke VERDE + [../STAGING_VALIDATION_CHECKLIST.md](../STAGING_VALIDATION_CHECKLIST.md) ejecutado, APROBADO y firmado.
4. PR `develop` → `main` (template con sección RELEASE completa) → 1 aprobación → merge → producción.
5. Post-prod: smoke manual en producción + logs 10 min.

**Prohibido:** push directo a `develop`/`main`; promover sin checklist firmado; mergear con CI roja.

## Definition of Done (Checklist Obligatorio por PR)

### Code Quality
- [ ] `npm run lint` → 0 errors, 0 warnings
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run test:run -- --coverage` → ≥80% lines, ≥80% functions, ≥75% branches
- [ ] `npm run build` → `dist/` generado sin errores

### Docker Validation
- [ ] `docker build -t test .` → build OK (< 5 min)
- [ ] `docker run -d -p 5173:5173 -e VITE_API_BASE_URL=https://api.test.com test` → container healthy
- [ ] `curl -f http://localhost:5173/health` → `{"status":"ok"}`
- [ ] `curl -f http://localhost:5173/config.js` → variables pobladas correctamente
- [ ] `curl -f http://localhost:5173/` → HTML con `<script src="/config.js">`
- [ ] SPA routing: refresh en `/cualquier-ruta` → 200 OK (no 404)

### Security
- [ ] Security headers presentes (`curl -I`)
- [ ] No secrets en imagen (`docker history`)
- [ ] Non-root user (`docker exec <container> whoami` → nginx)

### Railway
- [ ] Auto-deploy activado en Railway para `main` y `develop`
- [ ] Variables de entorno configuradas en Railway (staging + prod)
- [ ] Dominios custom configurados + SSL
- [ ] Healthcheck passing en Railway logs
- [ ] Preview deployment (`*.railway.app`) accesible y funcional

### Pipeline (obligatorio para promover a producción)
- [ ] Workflow **Smoke Tests Staging** verde en `develop`
- [ ] `docs/STAGING_VALIDATION_CHECKLIST.md` ejecutado, APROBADO y firmado
- [ ] PR `develop`→`main` con sección RELEASE completa y 1 aprobación

### Documentation
- [ ] Guías afectadas actualizadas en mismo PR (`docs/agent/`)
- [ ] `version` y `validated` actualizados en frontmatter
- [ ] `scope` corregido si rutas cambiaron
- [ ] `CHANGELOG.md` actualizado (Keep a Changelog format)
- [ ] `traps.md` actualizado si hay gotchas nuevos

## Rollback Procedure
```bash
# ÚNICO camino de rollback real en este repo:
# Railway Dashboard → service library-pos → environment → Deployments → "Redeploy" en el deployment previo sano.

# Redeploy del último deployment (NO es rollback; sirve para restart/recovery):
railway redeploy -s library-pos -e production -y
```
> NOTA: `gh workflow run ci.yml -f rollback=true` existe SOLO en el repo API (arieltecay/api-library-system), no aquí.

## Troubleshooting

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Healthcheck fails | Puerto incorrecto en nginx.conf | Verificar `PORT` en entrypoint + nginx.conf.template |
| config.js vacío | Variables no inyectadas | Verificar build args + Railway variables |
| 404 en deep links | SPA fallback roto | Verificar `try_files $uri $uri/ /index.html` |
| CORS error | Backend no permite origin | Agregar origin a `CORS_ORIGINS` en backend |
| Build timeout | `.dockerignore` incompleto | Agregar node_modules, dist, tests, docs |