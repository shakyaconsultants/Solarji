# SolarJi — System Architecture (Detailed)

This document describes the full technical architecture of SolarJi: how components connect, how data flows, how security works, and how performance optimizations are implemented.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Authentication & Session Model](#7-authentication--session-model)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Database Design](#9-database-design)
10. [API Reference (Complete)](#10-api-reference-complete)
11. [Caching Strategy (Multi-Layer)](#11-caching-strategy-multi-layer)
12. [Performance Optimizations](#12-performance-optimizations)
13. [File Upload Pipeline](#13-file-upload-pipeline)
14. [Business Logic Deep Dives](#14-business-logic-deep-dives)
15. [Deployment & Infrastructure](#15-deployment--infrastructure)
16. [Environment Variables](#16-environment-variables)
17. [Known Limitations & Future Work](#17-known-limitations--future-work)

---

## 1. System Overview

**SolarJi** is a full-stack solar business management platform. It combines:

- **CRM** — 11-stage lead pipeline with notes, images, assignment, and gamification
- **Stock** — Voucher-based inventory (purchase/sale) with automatic quantity updates
- **Admin** — User management, quotation templates, cross-module analytics
- **Service complaints** — Public registration form, admin-assigned routing, employee inbox
- **Public website** — Marketing home page, quotation generator, complaint form

The system is a **layered monolith**: one Express API server, one React SPA, one MongoDB database. It is **stateless at the HTTP layer** (JWT auth) but uses **in-memory server caches** for dashboard endpoints.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite)                                                     │  │
│  │  ├── Public routes: /, /quotation, /complaint, /login              │  │
│  │  ├── Protected routes: /crm/*, /stock/*, /admin                       │  │
│  │  ├── AuthContext (JWT decode from sessionStorage)                    │  │
│  │  ├── DataCacheContext (client-side cache + dedup)                    │  │
│  │  └── axios → Bearer token on every /api request                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS (REST JSON)
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                               │
│  Render: https://solarji.onrender.com  (recommended region: Singapore)      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ compression │→ │ CORS + JSON  │→ │ protect     │→ │ Route handlers  │ │
│  │ middleware  │  │ no-store /api│  │ adminOnly   │  │ (auth, leads,   │ │
│  │             │  │ etag: false  │  │ stockAccess │  │  stock, etc.)   │ │
│  └─────────────┘  └──────────────┘  └─────────────┘  └────────┬────────┘ │
│                                                                  │          │
│  ┌──────────────────────────────────────────────────────────────▼────────┐ │
│  │ Utils: pagination, buildLeadFilter, token, dashboardCache (45s TTL)   │ │
│  └──────────────────────────────────────────────────────────────┬────────┘ │
└───────────────────────────────────────────────────────────────────┼─────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┼───────┐
                    │                                               ▼       │
                    │  MongoDB Atlas (ap-south-1 Mumbai recommended)      │
                    │  Collections: users, leads, complaints, stockitems,   │
                    │               stockvouchers, quotationtemplates     │
                    └───────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────────────────────┐
                    │  Cloudinary — lead note images (WebP, resized)        │
                    └───────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| Frontend runtime | React | 18+ |
| Frontend build | Vite | Fast HMR, code splitting |
| Styling | Tailwind CSS | Utility-first, responsive |
| Routing | React Router DOM | SPA, protected routes |
| HTTP client | Axios | Interceptors for JWT |
| Icons / Toasts | Lucide React, react-hot-toast | |
| Backend runtime | Node.js | |
| Backend framework | Express | REST API |
| Database | MongoDB Atlas | Mongoose ODM |
| Auth | JWT (jsonwebtoken) | 7-day expiry, embedded claims |
| Password | SHA-256 (client) + bcrypt (server) | Plain password never sent |
| Images | Multer + Sharp + Cloudinary | WebP, max 1600px |
| Email | Nodemailer (SMTP) | Complaint confirmation emails |
| Compression | compression (gzip) | All responses |

---

## 4. Repository Structure

```
solarji/
├── README.md                    # Project overview & quick start
├── env.example                  # Consolidated env reference
├── docs/
│   ├── ARCHITECTURE.md          # This file
│   └── PROJECT_HISTORY.md       # Development story & optimizations
├── start.bat                    # Windows: start backend + frontend
│
├── backend/
│   ├── package.json
│   ├── .htaccess                # cPanel/Passenger deploy
│   └── src/
│       ├── server.js            # Express entry, middleware, route mounting
│       ├── seed.js              # Admin user (from env) + sample stock
│       ├── config/
│       │   ├── db.js            # Mongo connect + syncIndexes + DNS fix
│       │   └── cloudinary.js
│       ├── middleware/
│       │   ├── auth.js          # JWT protect, RBAC helpers
│       │   └── upload.js        # Image upload pipeline
│       ├── models/              # Mongoose schemas + indexes
│       ├── routes/              # API handlers
│       └── utils/               # Shared logic
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── main.jsx             # Providers: Router → Auth → DataCache
        ├── App.jsx              # Routes + lazy loading
        ├── api/
        │   ├── axios.js         # Base URL, interceptors
        │   └── crypto.js        # SHA-256 for login
        ├── utils/session.js     # JWT in sessionStorage
        ├── context/
        │   ├── AuthContext.jsx
        │   └── DataCacheContext.jsx
        ├── components/
        └── pages/
            ├── website/         # Public
            ├── auth/
            ├── crm/
            ├── stock/
            └── admin/
```

---

## 5. Backend Architecture

### 5.1 Request Lifecycle

Every API request follows this pipeline:

```
HTTP Request
    → compression (gzip response)
    → CORS check (CLIENT_URL + localhost auto-allow)
    → express.json() body parser
    → /api → Cache-Control: no-store
    → Route-specific middleware:
         protect → adminOnly / stockAccess (optional)
    → Route handler
    → JSON response (optionally includes refreshed token)
```

### 5.2 Route Modules

| Mount path | File | Responsibility |
|------------|------|----------------|
| `/api/auth` | `routes/auth.js` | Login, me, refresh |
| `/api/users` | `routes/users.js` | User CRUD, assignees, points reset |
| `/api/leads` | `routes/leads.js` | Lead CRUD, stages, notes, stats, bulk delete |
| `/api/stock` | `routes/stock.js` | Items, vouchers, bulk stock updates |
| `/api/quotations` | `routes/quotations.js` | Quotation templates |
| `/api/complaints` | `routes/complaints.js` | Public register + CRM inbox |
| `/api/dashboard` | `routes/dashboard.js` | Aggregated CRM/Admin/Stock dashboards |
| `/api/health` | `server.js` | Health check |

### 5.3 Middleware Details

#### `protect` (`middleware/auth.js`)

1. Extracts `Bearer` token from `Authorization` header
2. Verifies JWT with `JWT_SECRET`
3. **Fast path (new tokens):** If payload contains `id` + `role`, builds `req.user` from JWT — **no database query**
4. **Legacy path:** If token only has `id`, loads user from MongoDB once (until user re-logs in)

#### `adminOnly`

Allows only `role === 'admin'`.

#### `stockAccess`

Allows `admin` or `stock_manager`.

#### `complaintsAccess`

Allows `admin` or users with `handlesComplaints: true` (embedded in JWT).

#### `canManageAllComplaints`

Admin only — view all complaints and assign/reassign to employees with complaint access.

### 5.4 Utility Modules

| File | Functions | Purpose |
|------|-----------|---------|
| `utils/token.js` | `signUserToken`, `tokenPayloadForUser` | JWT with embedded user claims |
| `utils/pagination.js` | `parsePagination`, `paginationMeta` | Standard page/limit/skip (max 100) |
| `utils/leads.js` | `buildLeadFilter` | Role scoping + stage + `$text` search |
| `utils/cache.js` | `get`, `set`, `invalidatePrefix` | Generic in-memory TTL cache |
| `utils/dashboardCache.js` | `crmKey`, `adminKey`, `stockKey`, invalidators | 45s dashboard cache |

### 5.5 Stock Voucher Engine (N+1 Fix)

Creating or deleting a voucher:

1. Collect all item IDs from voucher rows
2. **Single batch query:** `StockItem.find({ _id: { $in: ids } })` → Map
3. Compute quantity deltas in memory
4. Validate no negative stock
5. **Single bulk write:** `StockItem.bulkWrite([...])`
6. Save/delete voucher document
7. Invalidate dashboard caches

This replaced per-item loops that caused N+1 query patterns.

---

## 6. Frontend Architecture

### 6.1 Provider Tree

```
main.jsx
  └── BrowserRouter
        └── AuthProvider          ← session user from JWT decode
              └── DataCacheProvider  ← lists, dashboards, assignees cache
                    └── App       ← routes + Toaster
```

### 6.2 Routing Strategy

| Route group | Loading | Protection |
|-------------|---------|------------|
| `/`, `/quotation`, `/complaint`, `/login` | Eager import | Public |
| `/crm/*`, `/stock/*`, `/admin` | `React.lazy()` + `Suspense` | `ProtectedRoute` |

**Post-login redirects** (`Login.jsx`):
- `admin` → `/admin`
- `stock_manager` → `/stock`
- `manager` / `user` → `/crm`

### 6.3 ProtectedRoute

Checks:
- Authenticated (token exists + valid decode)
- `adminOnly` prop → admin role required
- `stockOnly` prop → admin or stock_manager required
- `complaintsOnly` prop → admin or `handlesComplaints`

### 6.4 Data Fetching Patterns

| Page | Pattern |
|------|---------|
| Leads | Server pagination via `fetchLeadsPage` + local page state |
| Users | Direct `GET /users?page&limit&search` |
| Stock Items | Direct `GET /stock/items?page&limit&search` |
| Vouchers | Direct `GET /stock/vouchers?page&limit&type` |
| Voucher Form | `GET /stock/items?picker=1&limit=100` (minimal fields) |
| Dashboards | `fetchDashboardCrm/Admin/Stock` with session cache |
| Assignee dropdowns | `fetchAssignees` → `GET /users/assignees` |
| Complaints inbox | `GET /complaints` (admin: all; employee: assigned only) |

### 6.5 Layout & Navigation

- `Layout.jsx` — Shell with sidebar + content area
- `Sidebar.jsx` — Module-aware nav (CRM / Stock / Admin links based on role)

---

## 7. Authentication & Session Model

### 7.1 Login Flow

```
User enters email + password
    → frontend: SHA-256(password) via Web Crypto API
    → POST /api/auth/login { email, password: hash }
    → server: bcrypt.compare(hash, user.password)
    → server: signUserToken(user) with claims:
         { id, name, email, role, phone, points, handlesComplaints }
    → response: { token, user }
    → frontend: sessionStorage.setItem('solarji_token', token)
    → AuthContext: decode JWT → instant user state (no /me call)
```

### 7.2 Session Storage (Not localStorage)

JWT is stored in **`sessionStorage`**:
- Cleared when browser tab closes (more secure for shared machines)
- One-time migration from legacy `localStorage` keys

### 7.3 Bootstrap (Page Refresh)

```
App load
    → migrateLegacyAuthStorage()
    → getSessionUser() = decode JWT client-side
    → If valid: user available immediately (loading=false)
    → No mandatory GET /auth/me on every refresh
```

Server still validates signature on every API call via `protect`.

### 7.4 Token Auto-Refresh

Several endpoints return a fresh `token` in the response body when user data changes (points, stage change, reset points). Axios response interceptor:

```javascript
if (res.data?.token) applyRefreshedToken(res.data.token);
```

Updates sessionStorage and AuthContext user state.

### 7.5 JWT Payload Structure

```json
{
  "id": "ObjectId string",
  "name": "User Name",
  "email": "user@example.com",
  "role": "admin | manager | stock_manager | user",
  "phone": "+91...",
  "points": 12,
  "handlesComplaints": false,
  "iat": 1234567890,
  "exp": 1235172690
}
```

Expiry: **7 days**.

---

## 8. Role-Based Access Control (RBAC)

### 8.1 Roles

| Role | DB value | UI label | Description |
|------|----------|----------|-------------|
| Admin | `admin` | Admin | Full access |
| Stock Manager | `stock_manager` | Stock Manager | All leads + full stock |
| Manager | `manager` | Manager | All leads, CRM only (no stock) |
| Employee | `user` | Employee | Own leads only; complaints if enabled |

### 8.2 Permission Matrix (CRM & Stock)

| Capability | admin | stock_manager | manager | user |
|------------|:-----:|:-------------:|:-------:|:----:|
| View all leads | ✓ | ✓ | ✓ | ✗ (assigned only) |
| Create/edit leads | ✓ | ✓ | ✓ | ✓ |
| Delete lead(s) | ✓ | ✗ | ✗ | ✗ |
| Bulk delete leads | ✓ | ✗ | ✗ | ✗ |
| User management | ✓ | ✗ | ✗ | ✗ |
| Reset points | ✓ | ✗ | ✗ | ✗ |
| Stock module | ✓ | ✓ | ✗ | ✗ |
| Admin dashboard | ✓ | ✗ | ✗ | ✗ |
| Quotation templates (CRUD) | ✓ | ✗ | ✗ | ✗ |
| View quotation templates | ✓ | ✓ | ✓ | ✓ |
| CRM dashboard | ✓ (all) | ✓ (all) | ✓ (all) | ✓ (scoped) |

### 8.3 Service Complaints

| Capability | admin | user + handlesComplaints |
|------------|:-----:|:------------------------:|
| Public form `/complaint` | ✓ (no auth) | ✓ (no auth) |
| Complaints inbox | ✓ | ✓ (assigned only) |
| View all complaints | ✓ | ✗ |
| Assign / reassign | ✓ | ✗ |
| Enable complaint access on users | ✓ | ✗ |

**Assignment model:** Public `POST /complaints` creates records with `assignedTo: null`. Admin assigns via `PUT /complaints/:id` with `assignedTo` set to a user where `handlesComplaints: true`. No environment variable controls default routing.

### 8.4 Lead Data Scoping

`buildLeadFilter(req)` in `utils/leads.js`:

- **admin / manager / stock_manager:** No `assignedTo` restriction (optional query param)
- **user:** `filter.assignedTo = req.user._id`

Applied to: lead list, stats, CRM dashboard aggregations.

---

## 9. Database Design

### 9.1 Entity Relationship (Logical)

```
User ──────< Lead (assignedTo, createdBy)
User ──────< Complaint (assignedTo, nullable until admin assigns)
User ──────< StockVoucher (createdBy)
User ──────< QuotationTemplate (createdBy)
StockItem ──< StockVoucher.items[].item
Lead ─────── stageHistory[], notes[]
```

### 9.2 Collections & Indexes

#### User

| Index | Purpose |
|-------|---------|
| `{ isActive: 1, points: -1 }` | Leaderboard |
| `{ role: 1 }` | Role queries |
| `{ isActive: 1, handlesComplaints: 1 }` | Complaint handler dropdown |
| `email` unique | Login |

#### Complaint

| Index | Purpose |
|-------|---------|
| `complaintNumber` unique | Auto `CP-00001` numbering (field-level only — do not duplicate with `schema.index()`) |
| `{ assignedTo: 1, status: 1, createdAt: -1 }` | Employee / admin filtered lists |
| `{ status: 1, createdAt: -1 }` | Status filter |
| `{ email: 1 }` | Customer lookup |

**23 issue categories** (inverter fault, panel damage, battery, etc.). **Statuses:** Open → In Progress → Resolved → Closed.

#### Lead

| Index | Purpose |
|-------|---------|
| Text on name, phone, city, email | `$text` search |
| `{ assignedTo: 1, updatedAt: -1 }` | Employee lead list |
| `{ stage: 1, updatedAt: -1 }` | Stage filter |
| `{ createdAt: -1 }` | Recent leads |

**11 pipeline stages:** Lead → Calling → Visit → Filing → Loan Filing → Loan Process → Installation → Kesco Filing → Kesco Process → Meter Install → Commission

#### StockItem

| Index | Purpose |
|-------|---------|
| `{ isActive: 1, name: 1 }` | Item list / picker |
| `{ isActive: 1, category: 1 }` | Category filter |
| `{ isActive: 1, minQuantity: 1, quantity: 1 }` | Low stock queries |
| `name` unique | Duplicate prevention |

#### StockVoucher

| Index | Purpose |
|-------|---------|
| `{ type: 1, createdAt: -1 }` | Filtered voucher list |
| `{ createdAt: -1 }` | Recent vouchers |
| `voucherNumber` unique | PV-00001 / SV-00001 auto-gen |

#### QuotationTemplate

| Index | Purpose |
|-------|---------|
| `{ isActive: 1, updatedAt: -1 }` | Template list |

**Index sync:** `syncIndexes()` runs on every DB connect (`config/db.js`).

---

## 10. API Reference (Complete)

Base URL: set via `VITE_API_URL` at frontend build time (e.g. `http://localhost:5000/api` or your Render API URL)

### Complaints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/complaints/categories` | Public | List of 23 issue categories |
| POST | `/complaints` | Public | Register complaint (unassigned) |
| GET | `/complaints` | complaintsAccess | Paginated list (scoped by role) |
| GET | `/complaints/:id` | complaintsAccess | Detail |
| PUT | `/complaints/:id` | complaintsAccess | Update status/notes; admin can set `assignedTo` |

**List query params:** `page`, `limit`, `status`, `search`, `assignedTo` (admin only)

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login |
| GET | `/auth/me` | protect | Current user + fresh token |
| POST | `/auth/refresh` | protect | Re-issue JWT |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/assignees` | protect | Minimal list for dropdowns |
| GET | `/users/complaint-handlers` | admin | Users with `handlesComplaints: true` |
| GET | `/users` | admin | Paginated (`page`, `limit`, `search`) |
| POST | `/users` | admin | Create user (supports `handlesComplaints`) |
| PUT | `/users/:id` | admin | Update user (supports `handlesComplaints`) |
| DELETE | `/users/:id` | admin | Delete user |
| POST | `/users/reset-points` | admin | Reset all points |
| POST | `/users/:id/reset-points` | admin | Reset one user |

### Leads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leads` | protect | Paginated list |
| GET | `/leads/stages` | protect | Stage enum list |
| GET | `/leads/stats` | protect | Aggregated stats |
| GET | `/leads/leaderboard` | protect | Points ranking |
| POST | `/leads/bulk-delete` | admin | Delete up to 100 IDs |
| GET | `/leads/:id` | protect | Full lead detail |
| POST | `/leads` | protect | Create lead |
| PUT | `/leads/:id` | protect | Update fields |
| PUT | `/leads/:id/stage` | protect | Change stage + points |
| PUT | `/leads/:id/assign` | protect | Reassign |
| POST | `/leads/:id/notes` | protect | Add note + images (multipart) |
| DELETE | `/leads/:id/notes/:noteId` | protect | Delete note |
| DELETE | `/leads/:id` | admin | Delete lead |

**List query params:** `page`, `limit`, `stage`, `search`, `assignedTo`

### Stock

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stock/items` | stock | Paginated list OR `picker=1` mode |
| POST | `/stock/items` | stock | Create item |
| PUT | `/stock/items/:id` | stock | Update item |
| DELETE | `/stock/items/:id` | stock | Soft delete |
| GET | `/stock/vouchers` | stock | Paginated + `summary` totals |
| GET | `/stock/vouchers/:id` | stock | Single voucher |
| POST | `/stock/vouchers` | stock | Create + update stock |
| DELETE | `/stock/vouchers/:id` | stock | Delete + reverse stock |

### Quotations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quotations/templates` | protect | Active templates |
| POST | `/quotations/templates` | admin | Create |
| PUT | `/quotations/templates/:id` | admin | Update |
| DELETE | `/quotations/templates/:id` | admin | Soft delete |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/crm` | protect | CRM stats (role-scoped, cached 45s) |
| GET | `/dashboard/admin` | admin | Admin overview (cached 45s) |
| GET | `/dashboard/stock` | stock | Stock overview (cached 45s) |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | `{ status: 'ok' }` |

---

## 11. Caching Strategy (Multi-Layer)

### Layer 1: Server Dashboard Cache (45s TTL)

```
Key patterns:
  dash:crm:{userId}   — per-user CRM dashboard
  dash:admin          — admin dashboard
  dash:stock          — stock dashboard

Invalidation triggers:
  Lead create/update/delete/stage → invalidateCrm + invalidateAdmin
  User CRUD / points → invalidateCrm + invalidateAdmin
  Stock item/voucher → invalidateStock + invalidateAdmin
```

Implementation: `utils/cache.js` + `utils/dashboardCache.js`

### Layer 2: Client DataCacheContext

| Cache | Key / Flag | Invalidation |
|-------|------------|--------------|
| Dashboard CRM/Admin/Stock | `ready.current['dashboard:*']` | `invalidateDashboard*` |
| Leads pages | JSON key `{page,limit,stage,search}` | `invalidateLeadsPages` |
| Assignees | `ready.current.assignees` | `invalidateAssignees` |
| Lead details | `ready.current.leadDetails` Set | Per-id refresh |
| Legacy full lists | `ensureUsers`, `ensureStockItems` | Still available for older flows |

**Inflight deduplication:** Concurrent identical requests share one Promise.

### Layer 3: HTTP Headers

- API responses: `Cache-Control: no-store` (browsers don't cache API JSON)
- CORS preflight: `maxAge: 86400` (24h — reduces OPTIONS overhead)
- `etag: false` on Express (avoids 304 confusion on dynamic API)

### Layer 4: JWT Session (No /me on Load)

User identity cached in tab session via decoded JWT — eliminates one round-trip on every page load.

---

## 12. Performance Optimizations

| Optimization | Where | Impact |
|--------------|-------|--------|
| JWT claims in token | `token.js`, `auth.js` | Skip DB on every request |
| Client JWT decode | `session.js`, `AuthContext` | Instant UI bootstrap |
| sessionStorage auth | `session.js` | Tab-scoped, migrated from localStorage |
| gzip compression | `server.js` | Smaller JSON payloads |
| MongoDB indexes + syncIndexes | All models, `db.js` | Faster queries |
| Lead `$text` search | Lead model + `buildLeadFilter` | Indexed search vs regex scan |
| Server pagination | leads, users, stock | Load 20 rows not thousands |
| Parallel Promise.all | List+count, dashboards | Halves query wait time |
| `.lean()` on read-only | Dashboards, assignees | Less Mongoose overhead |
| Stock bulkWrite | `stock.js` vouchers | N+1 → 2 queries |
| Dashboard aggregation | `dashboard.js` | One round-trip for stats |
| React.lazy code splitting | `App.jsx` | Smaller initial bundle |
| Picker mode stock items | `?picker=1&limit=100` | Minimal fields for forms |
| Print-on-demand | StockItems print | Fetch 500 rows only when printing |
| Voucher summary aggregate | GET `/stock/vouchers` | Totals without loading all rows |
| Lazy images | LeadDetail | `loading="lazy"` on note images |
| CORS maxAge | `server.js` | Fewer preflight requests |

---

## 13. File Upload Pipeline

```
POST /leads/:id/notes (multipart/form-data)
    → multer memoryStorage (max 6 files, MIME whitelist)
    → Sharp: auto-rotate, resize max 1600px, WebP quality 75
    → Cloudinary upload stream
    → Save note with image URLs on Lead document
    → On failure: destroy uploaded Cloudinary assets (rollback)
```

Env tuning: `UPLOAD_MAX_FILE_MB`, `UPLOAD_MAX_FILES`, `UPLOAD_MAX_DIMENSION`, `UPLOAD_COMPRESSION_QUALITY`

---

## 14. Business Logic Deep Dives

### 14.1 Gamification (Points)

When a lead moves to the next stage:

```javascript
function calcPoints(stageSinceDate) {
  const daysElapsed = Math.floor((now - since) / (1000 * 60 * 60 * 24));
  return 5 - daysElapsed;
}
```

Points are added to the **assigned user's** `points` field. Response includes refreshed JWT with new points.

### 14.2 Stock Voucher Types

| Type | Prefix | Effect on quantity |
|------|--------|------------------|
| ADD (Purchase) | PV- | +quantity |
| SELL (Sales) | SV- | -quantity |

Delete voucher **reverses** the original transaction type.

### 14.3 Voucher Number Generation

Auto-incremented per type: `PV-00001`, `SV-00001`, etc.

### 14.4 Service Complaints Flow

```
Customer → POST /complaints (public)
    → Complaint created (assignedTo: null, status: Open)
    → Optional SMTP confirmation email (no coordinator until assigned)
    → Admin sees "Unassigned" in /crm/complaints
    → Admin assigns to employee with handlesComplaints: true
    → Employee sees only complaints where assignedTo = self
```

Complaint numbers auto-generate as `CP-00001`, `CP-00002`, …

Admin enables complaint access per user in User Management. JWT must be refreshed (re-login) after toggling `handlesComplaints`.

---

## 15. Deployment & Infrastructure

### Recommended Topology (India)

| Component | Recommended | Notes |
|-----------|-------------|-------|
| MongoDB Atlas | **ap-south-1 (Mumbai)** | Data locality |
| Render backend | **Singapore** | Closest Render region to Mumbai |
| Frontend | Static host (Netlify/Vercel/cPanel) | Set `CLIENT_URL` on backend |

**Avoid:** MongoDB Mumbai + Render Oregon (~200–350ms DB latency per query).

### Backend (Render)

1. Connect GitHub repo
2. Root directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Environment: see [§16 Environment Variables](#16-environment-variables)
6. Region: **Singapore** (if Atlas is Mumbai)

### Frontend

1. Set `VITE_API_URL` to your API base URL
2. `npm run build` in `frontend/`
3. Deploy `dist/` to static host

### DNS Fix (Development)

Some networks fail MongoDB SRV lookups. `db.js` sets Google DNS (`8.8.8.8`, `8.8.4.4`).

---

## 16. Environment Variables

All secrets and URLs are configured via environment variables — nothing is hardcoded in application code. Copy from example files:

| File | Copy to |
|------|---------|
| `backend/.env.example` | `backend/.env` |
| `frontend/.env.example` | `frontend/.env` |
| `env.example` | Reference for both (Render dashboard) |

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
CLIENT_URL=https://your-frontend.com,http://localhost:5173

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@yourcompany.com

# Optional upload tuning
UPLOAD_MAX_FILE_MB=10
UPLOAD_MAX_FILES=6
UPLOAD_MAX_DIMENSION=1600
UPLOAD_COMPRESSION_QUALITY=75

# Required only for npm run seed
SEED_ADMIN_EMAIL=admin@yourcompany.com
SEED_ADMIN_PASSWORD=...
SEED_ADMIN_NAME=Admin
SEED_ADMIN_PHONE=+91...
```

### Frontend (`frontend/.env`)

```env
# Required — app throws at startup if unset
VITE_API_URL=http://localhost:5000/api
```

For production builds, set `VITE_API_URL` in `.env.production` or the host/CI build environment.

---

## 17. Known Limitations & Future Work

| Item | Status |
|------|--------|
| `GET /leads/:id` not scoped to assignee for `user` role | Known gap — user with ID can view any lead |
| In-memory server cache lost on restart / not shared across instances | OK for single Render instance |
| No WebSocket real-time updates | Future: Socket.io |
| No automated tests | Future: Jest + Cypress |
| Render has no Mumbai region | Singapore is best available match |
| Duplicate Mongoose index on same field | Use `unique: true` OR `schema.index()`, not both |
| `handlesComplaints` change requires re-login | JWT embeds flag until refresh |

---

*Last updated: May 2026 — includes service complaints, env hardening, and index fixes.*
