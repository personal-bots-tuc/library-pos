---
type: Repository
app: librarysystem-pos
archetype: frontend
version: 3bec361
validated: 2026-10-08
update_when: when repo identity, reading order, or maintenance rules change
---

# AGENTS.md - Library System POS

## Identity
Frontend POS para sistema de biblioteca escolar. Punto de venta para librarios.
Consumidores: librarios (usuarios finales), Admin (via API compartida).
No hace: gestión de usuarios, reportes globales, configuración de escuela.

## How to use this repository
Read these guides in order:
1. [overview.md](docs/agent/overview.md) — purpose and capability map.
2. [architecture.md](docs/agent/architecture.md) — layout and request/data flow.
3. [contracts.md](docs/agent/contracts.md) — exposed and consumed interfaces.
4. [runbook.md](docs/agent/runbook.md) — commands and Definition of Done.
5. [traps.md](docs/agent/traps.md) — non-obvious behavior.
6. [DEPLOYMENT_PIPELINE.md](docs/DEPLOYMENT_PIPELINE.md) — flujo develop→staging→prod de este repo + protocolo IA.
7. [STAGING_VALIDATION_CHECKLIST.md](docs/STAGING_VALIDATION_CHECKLIST.md) — gate manual obligatorio antes de promover a producción.

## Maintenance rule
When code changes, update the relevant guide in the same PR. Record new,
non-obvious gotchas in traps.md. Review consumers before breaking a contract.
Add a CHANGELOG.md entry ([Unreleased]) with ticket + PR links in the same PR.

## Ticket naming convention (Jira → Git → PR)
Usar siempre el formato incremental **`[POS-XXX]`** en commits, ramas y PRs.
- **Formato:** `[POS-XXX]-descripcion` (ej. `[POS-201]-fix descuento visual en TOTAL`)
- **Rama:** `feature/[POS-XXX]-descripcion` desde `develop`
- **Commit:** `[POS-XXX]-descripcion` (validado por `.husky/commit-msg`)
- **PR:** título debe incluir `[POS-XXX]`
- **CHANGELOG:** referencia el ticket en la entrada `[Unreleased]`
- **Numeración incremental:** tomar el último número usado en Jira/GitHub Projects y sumar 1 (ej. si el último es POS-200, el siguiente es POS-201). No saltar números ni reusar tickets cerrados.
- **Documentar aquí:** cualquier cambio a esta convención se anota en este archivo.