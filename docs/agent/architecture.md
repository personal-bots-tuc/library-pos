---
type: Architecture
version: <sha-corto>
validated: 2026-10-05
update_when: when folder layout, layers, entrypoints, or critical flows change
scope:
  - src
  - vite.config.ts
  - Dockerfile
  - nginx.conf.template
  - entrypoint.sh
---

# Architecture - Library System POS

## Layer Structure
```
src/
├── pages/           # Page components (route-level)
│   └── POS/         # Main POS page + sub-components
├── components/      # Shared presentational components
├── hooks/           # Shared logic hooks (state, effects)
├── api/             # API client + endpoint wrappers
├── test/            # Test utilities + setup
└── main.tsx         # App bootstrap
```

## Entry Points
- **Development**: `vite` (port 5173, proxy /api → localhost:3000)
- **Production**: `nginx` (port 5173, serves `dist/`, SPA fallback)
- **Docker Build**: `npm run build` → `dist/` → nginx static serve

## Critical Flows

### 1. Bootstrap
```
main.tsx → SchoolProvider → ToastProvider → App → Router → POSPage
```

### 2. Sale Flow
```
usePOSPage → useCart → useProducts → useSaleFlow → useSale → API /sales
                    ↓
              useClientSelector → API /clients
                    ↓
              useShiftManager → API /cash-shifts
                    ↓
              useCashMovements → API /cash-movements
```

### 3. Auth Flow
```
useAuth → API /auth/login → JWT en localStorage → axios interceptor adjunta Bearer
         → 401 → refresh token → retry
```

## Data Flow
```
User Action → Hook (use*) → API Client (axios) → Backend (Express) → MongoDB
                                    ↓
                              Response → Hook State → UI Update
```

## Deployment Architecture
```
GitHub Push → GitHub Actions (lint, test, build, push GHCR)
                    ↓
              Railway Auto-deploy (detecta imagen nueva)
                    ↓
              Docker: entrypoint.sh → envsubst config.js + nginx.conf
                    ↓
              nginx:80 → SPA + /health + /config.js
                    ↓
              Railway Proxy → Custom Domain (pos.tudominio.com)
```

## Security Boundaries
- **Frontend**: Solo variables `VITE_*` públicas (API URL, nombres)
- **Secrets**: JWT, DB, MP tokens → SOLO en backend
- **CORS**: Backend permite origins de frontend (prod + staging + *.railway.app)