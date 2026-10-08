---
type: DeploymentPipeline
app: librarysystem-pos
version: 3bec361
validated: 2026-10-08
update_when: cuando cambie el mecanismo de deploy, las URLs, los gates o el flujo de promoción de ESTE repo
---

# Pipeline de Despliegue — POS (library-pos)

> **Gobernanza:** las reglas transversales (flujo, branches, protecciones, ambientes, reglas de oro multi-IA) se rigen por la versión canónica del workspace: `librarySystem/Docs/DEPLOYMENT_PIPELINE.md`.
> **Este archivo manda en este repo:** mecanismo de deploy, URLs, rollback y validaciones propias. Si cambia algo de este servicio, se actualiza AQUÍ en el mismo PR del cambio.

## Protocolo IA (obligatorio)

**Al entrar (antes de escribir código):**
1. Leer `AGENTS.md` → `docs/agent/*` en orden → este documento → `docs/STAGING_VALIDATION_CHECKLIST.md`.
2. Confirmar que el scope del ticket coincide con tu rol (código frontend ≠ infra).

**Al salir (en el mismo PR):**
1. Actualizar guías `docs/agent/*` afectadas (respetando `update_when` y `scope` de cada frontmatter).
2. Actualizar `version`/`validated` de las guías tocadas.
3. Entrada en `CHANGELOG.md` → `[Unreleased]` con ticket + PR enlazados.

## Flujo obligatorio

```
feature/[POS-XXX]-desc ─PR+CI verde─► develop ─auto-deploy─► STAGING
    ─smoke verde + checklist manual firmado─► PR develop→main (template RELEASE)
    ─1 aprobación─► main ─deploy─► PRODUCTION
```

**Prohibido:** push directo a `develop`/`main`, promover sin checklist firmado, mergear PR con CI roja.

## Mecanismo de deploy de ESTE servicio

| Ambiente | Mecanismo | Rama | URL |
|----------|-----------|------|-----|
| Staging | Railway (auto-deploy al configurar watcher; fallback manual `railway link -s library-pos -e staging && railway up -d -y` desde `develop`) | `develop` | https://library-pos-staging.up.railway.app |
| Production | Railway (watcher `main`; fallback manual `railway up -d -y` desde `main`) | `main` | https://library-pos-production.up.railway.app |

> **Pendiente operativo:** branch watchers de Railway §8 del doc maestro. Mientras no estén, los deploys se disparan manual con el comando indicado.
> **Nota histórica:** este repo usó rama `master` como default; estandarizada a `main` el 2026-10-07. La rama remota `master` queda huérfana hasta confirmar que ningún watcher la usa (ver §8 del doc maestro).

Runtime: nginx non-root + `envsubst` en entrypoint genera `config.js` desde `config.template.js` con `VITE_API_BASE_URL`, `VITE_APP_NAME` (variables Railway por environment).

## Validaciones antes de promover a producción

- [ ] Workflow **Smoke Tests Staging** verde en `develop` (corre solo tras CI Pipeline).
- [ ] `docs/STAGING_VALIDATION_CHECKLIST.md` ejecutado, APROBADO y firmado (humano o IA).
- [ ] PR release con sección RELEASE completa.
- [ ] 1 aprobación en el PR a `main`.

## Post-producción

- Smoke manual: `/` 200, `/health` → `{"status":"ok"}`, `/config.js` apunta a API **production**, login POS OK, refresh en ruta profunda 200.
- Monitorear `railway logs -s library-pos -e production` 10 min sin crashes ni 5xx.

## Rollback de ESTE servicio

Railway Dashboard → service `library-pos` → environment → **Deployments → "Redeploy"** en el deployment previo sano.

> `railway rollback` NO existe en CLI v4 (usar `railway redeploy` solo para redeployar el último). El workflow `rollback` de `gh workflow run ci.yml` pertenece al repo API, no a este.

## Reglas de oro (resumen; canónica en doc maestro §0)

1. Nada a `main` sin pasar por `develop` + validación.
2. Nada a `develop` sin CI verde en PR.
3. No commitear trabajo ajeno sin autorización.
4. Nada de `railway up/down` "de prueba" en directorios linkeados.
5. Commits: `[POS-XXX]-descripcion` (husky lo exige).
6. Merge a `main` requiere 1 aprobación (bypass admin solo en bootstrap documentado).
