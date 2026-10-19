#!/usr/bin/env node
/**
 * Guardrails de CI — patrones que generan gasto innecesario en Railway:
 *
 * 1. PROHIBIDO `setInterval(` en src/ fuera de src/hooks/useSyncGate.ts.
 *    Toda sincronización periódica pasa por la compuerta (visible + activo).
 *    Un polling suelto impide App Sleep y factura 24/7. (tests excluidos)
 *
 * 2. El Service Worker debe hacer PASSTHROUGH de /config.js (config se
 *    inyecta en runtime por entrypoint.sh) y de /health.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");

const failures = [];

// ── Regla 1: sin setInterval suelto ──────────────────────────────────────────
const ALLOWED_INTERVAL_FILES = new Set(["src/hooks/useSyncGate.ts"]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

for (const file of walk(src)) {
  const rel = relative(root, file).split("\\").join("/");
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
  if (ALLOWED_INTERVAL_FILES.has(rel)) continue;

  const content = readFileSync(file, "utf8");
  if (/(?<![\w.$])setInterval\s*\(/.test(content)) {
    failures.push(
      `setInterval prohibido fuera de useSyncGate: ${rel}\n` +
        "  → Usá src/hooks/useSyncGate.ts (compuertas visible+activo) + React Query refetchInterval."
    );
  }
}

// ── Regla 2 y 3: sw.js passthroughs ─────────────────────────────────────────
const swPath = join(root, "public", "sw.js");
try {
  const sw = readFileSync(swPath, "utf8");
  if (!/config\.js/.test(sw)) {
    failures.push("public/sw.js debe hacer passthrough de /config.js (se inyecta en runtime con VITE_API_BASE_URL)");
  }
  if (!/health/.test(sw)) {
    failures.push("public/sw.js debe hacer passthrough de /health (healthcheck de Docker)");
  }
} catch {
  failures.push("Falta public/sw.js — la app offline-shell es parte del contrato de costos (App Sleep).");
}

if (failures.length > 0) {
  console.error("❌ Guardrails violados:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("✅ Guardrails OK (sin polling suelto; sw.js con passthrough de config.js/health)");
