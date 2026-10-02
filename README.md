# POS - Sistema de Punto de Venta

Sistema de Punto de Venta para la plataforma Library System.

## 🚀 Quick Start

```bash
npm install
npm run dev        # Desarrollo local
npm run build      # Build producción
npm run preview    # Preview del build
npm run test:run   # Tests
npm run lint       # Lint TypeScript
```

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS
- Vitest

## 📦 Deploy

Deploy automático a Vercel en push a `master` desde `personal-bots-tuc/library-pos`.

<!-- Validando auto-deploy post-migración a personal-bots-tuc -->

---

<!-- OLD README -->
### React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
