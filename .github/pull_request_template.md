## Tipo de PR
- [ ] Feature / fix / chore (base: `develop`)
- [ ] **RELEASE** `develop` → `main` (completar sección Release)

---

## Checklist estándar (todo PR)
- [ ] CI verde (`lint-test-typecheck`)
- [ ] Cambios acotados al scope del ticket
- [ ] Sin secretos ni `.env` en el diff

---

## Sección RELEASE (solo `develop` → `main`)

### Pre-merge (obligatorio)
- [ ] Workflow `Smoke Tests Staging` VERDE en `develop`
- [ ] `docs/STAGING_VALIDATION_CHECKLIST.md` ejecutado, APROBADO y firmado
- [ ] Changelog / bump de versión si aplica

### Cambios incluidos
<!-- Listar PRs/features mergeados a develop desde el último release -->

### Plan de rollback
Railway Dashboard → `library-pos` → Deployments → "Redeploy" en el deployment anterior.

### Post-merge (ejecutar tras deploy)
- [ ] Smoke manual en producción: home 200 + `/health` OK + login OK
- [ ] Consola del navegador sin errores críticos
