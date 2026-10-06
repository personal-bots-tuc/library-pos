---
type: Runbook
version: <sha-corto>
validated: 2026-10-05
update_when: when commands, validation steps, or Definition of Done change
scope:
  - package.json
  - vite.config.ts
  - Dockerfile
  - .github/workflows/ci.yml
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

# Rollback
railway rollback

# Variables
railway variables set VITE_API_BASE_URL=https://api.tudominio.com
```

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

### Documentation
- [ ] Guías afectadas actualizadas en mismo PR (`docs/agent/`)
- [ ] `version` y `validated` actualizados en frontmatter
- [ ] `scope` corregido si rutas cambiaron
- [ ] `CHANGELOG.md` actualizado (Keep a Changelog format)
- [ ] `traps.md` actualizado si hay gotchas nuevos

## Rollback Procedure
```bash
# Opción 1: GitHub Actions (recomendado)
gh workflow run ci.yml -f environment=production -f rollback=true

# Opción 2: Railway CLI
railway service librarysystem-pos rollback

# Opción 3: Railway Dashboard → Deployments → "Rollback to this deployment"
```

## Troubleshooting

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Healthcheck fails | Puerto incorrecto en nginx.conf | Verificar `PORT` en entrypoint + nginx.conf.template |
| config.js vacío | Variables no inyectadas | Verificar build args + Railway variables |
| 404 en deep links | SPA fallback roto | Verificar `try_files $uri $uri/ /index.html` |
| CORS error | Backend no permite origin | Agregar origin a `CORS_ORIGINS` en backend |
| Build timeout | `.dockerignore` incompleto | Agregar node_modules, dist, tests, docs |