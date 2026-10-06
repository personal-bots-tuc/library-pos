---
type: Overview
version: <sha-corto>
validated: 2026-10-05
update_when: when purpose, capabilities, or ownership change
scope:
  - src/pages/POS
  - src/components
  - src/hooks
  - src/api
---

# Overview - Library System POS

## Purpose
Punto de venta para bibliotecas escolares. Permite a librarios gestionar ventas, devoluciones, turnos de caja y clientes.

## Capabilities
- **Ventas**: Carrito, productos, pagos (efectivo, tarjeta, transferencia), comprobantes
- **Clientes**: Selección, creación rápida, historial de compras
- **Turnos de caja**: Apertura, cierre, movimientos, arqueo
- **Devoluciones**: Proceso guiado, notas de crédito
- **Autenticación**: Login JWT, refresh tokens, roles
- **Escuelas**: Contexto multi-tenant (school_id en JWT)

## Users
- **Librarios**: Operan POS diario (rol: librarian)
- **Sistema**: Consume API backend (Express + Mongoose)

## Tech Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS 4 + React Router 7
- Vitest + React Testing Library
- ESLint (flat config) + Prettier + Husky
- Docker multi-stage (node:22 → nginx:alpine)
- Railway deployment (auto-deploy on push)

## Code Map
```
src/
├── pages/
│   ├── POS/           # Página principal POS
│   │   ├── components/   # UI components (Cart, ProductSection, Payment, etc.)
│   │   └── hooks/        # Lógica de negocio (useCart, useSale, useShift, etc.)
│   └── LoginPage.tsx
├── components/        # Shared UI (Modal, Toast, Skeleton, DisabledScreen)
├── hooks/             # Shared hooks (useAuth, useSchool, useToast)
├── api/               # Axios client + endpoints (auth, client, schools)
├── test/              # Vitest setup + utils
└── main.tsx           # Entry point
```

## Ownership
- Team: Personal Bots TUC
- Maintainer: @ariel