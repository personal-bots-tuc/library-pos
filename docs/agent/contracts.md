---
type: Contracts
version: <sha-corto>
validated: 2026-10-05
update_when: when API contracts, env vars, or external dependencies change
scope:
  - src/api/
  - src/hooks/useAuth.ts
  - src/hooks/useSchool.ts
  - vite.config.ts
  - .env.example
---

# Contracts - Library System POS

## Consumed APIs (Backend)

### Auth
- `POST /auth/login` → `{ accessToken, refreshToken, user }`
- `POST /auth/refresh` → `{ accessToken }`
- `POST /auth/logout` → void

### Schools (Contexto multi-tenant)
- `GET /schools/current` → `{ id, name, settings }`
- Headers: `x-school-id` (desde JWT)

### Products
- `GET /products` → `Product[]` (filtros: search, category, page)
- `GET /products/:id` → `Product`

### Clients
- `GET /clients` → `Client[]` (search, page)
- `POST /clients` → `Client`
- `GET /clients/:id` → `Client`

### Sales
- `POST /sales` → `Sale` (body: items[], clientId, paymentMethod, shiftId)
- `GET /sales/:id` → `Sale` (para comprobante)

### Cash Shifts
- `POST /cash-shifts/open` → `CashShift`
- `POST /cash-shifts/:id/close` → `CashShift`
- `GET /cash-shifts/current` → `CashShift | null`

### Cash Movements
- `POST /cash-movements` → `CashMovement` (type: income/expense, amount, reason)

### Credits (Devoluciones)
- `POST /credits` → `CreditNote` (saleId, items[], reason)

## Environment Variables (Runtime via config.js)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | ✅ | Base URL del API backend | `https://api.tudominio.com` |
| `VITE_APP_NAME` | ✅ | Nombre mostrado en UI | `Library System POS` |
| `VITE_POS_BASE_URL` | ❌ | URL del POS (para admin) | `https://pos.tudominio.com` |

## External Dependencies
- **MercadoPago**: Solo backend (webhook + SDK)
- **Cloudinary**: Solo backend (upload imágenes)
- **Nodemailer**: Solo backend (emails)
- **OpenAI/Z.ai**: Solo backend (IA)

## Build-time Variables (vite define)
```typescript
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || '/api'),
  'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || 'Library System POS'),
}
```

## Compatibility Rules
- **Breaking changes**: Requiere coordinación con backend + admin + bot
- **Versioning**: API versionada en URL (`/api/v1/...`)
- **Deprecation**: 2 versiones mínimas soportadas