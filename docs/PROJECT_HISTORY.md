# SolarJi — Project History & Optimization Story

This document records **everything that was built, changed, and optimized** during the development and performance improvement phases of SolarJi. It serves as a changelog, decision log, and onboarding guide for understanding *why* the system works the way it does today.

---

## Table of Contents

1. [Project Origin & Goals](#1-project-origin--goals)
2. [Initial System (Before Optimizations)](#2-initial-system-before-optimizations)
3. [Problems We Hit in Production](#3-problems-we-hit-in-production)
4. [Optimization Phases (Chronological)](#4-optimization-phases-chronological)
5. [Complete List of Optimizations](#5-complete-list-of-optimizations)
6. [Feature Work Done Alongside Performance](#6-feature-work-done-alongside-performance)
7. [Architecture Decisions & Rationale](#7-architecture-decisions--rationale)
8. [Infrastructure & Region Guidance](#8-infrastructure--region-guidance)
9. [File-by-File Change Map](#9-file-by-file-change-map)
10. [Before vs After (Expected Impact)](#10-before-vs-after-expected-impact)
11. [What Was Intentionally NOT Changed](#11-what-was-intentionally-not-changed)
12. [Remaining Opportunities](#12-remaining-opportunities)
13. [Service Complaints & Environment Hardening](#13-service-complaints--environment-hardening-may-2026)

---

## 1. Project Origin & Goals

SolarJi was built as a **specialized CRM + inventory platform** for solar installation businesses in India. Core requirements:

- Track leads through an **11-stage solar-specific pipeline** (site visit → KESCO filing → meter install → commission)
- **Gamify sales** with a points system rewarding fast stage progression
- Manage **hardware inventory** with purchase/sale vouchers
- Support **four roles**: Admin, Stock Manager, Manager (sales), Employee
- Provide **admin analytics**, **quotation generation**, and **after-sales complaint handling**

Tech choices: React + Vite frontend, Express + MongoDB backend, JWT auth, Cloudinary for site photos, Nodemailer (SMTP) for complaint emails.

---

## 2. Initial System (Before Optimizations)

The first working version had:

| Area | Original behavior |
|------|-------------------|
| Auth | JWT in localStorage; `GET /auth/me` on every app load |
| Auth middleware | Every API request → `User.findById()` database lookup |
| Leads | Full list fetched to frontend; client-side filter/search |
| Users | Full user list loaded for admin page and assignee dropdowns |
| Stock | Full items + vouchers loaded into global cache |
| Dashboards | Multiple separate API calls or heavy unoptimized queries |
| Stock vouchers | Loop: fetch item → update item (N+1 queries) |
| Search | Regex scans on lead fields |
| Indexes | Minimal or default MongoDB indexes |
| Frontend bundle | All CRM/stock/admin pages in initial JS bundle |
| Caching | None (server or client session) |

This worked for small datasets but became slow on Render with real data and cross-region MongoDB latency.

---

## 3. Problems We Hit in Production

### 3.1 Slow API Response Times

Observed on Render (production):

| Endpoint | Typical latency |
|----------|-----------------|
| `GET /auth/me` | ~1.1s |
| `GET /dashboard/crm` | ~1.5s |
| Lead list (full fetch) | Grew with dataset size |

### 3.2 Root Causes Identified

1. **Geographic mismatch:** MongoDB Atlas in **Mumbai (ap-south-1)** + Render in **Oregon** = ~200–350ms per DB round-trip, multiplied by many queries per request
2. **DB hit on every request:** Legacy JWT only stored user `id` → `protect` middleware queried MongoDB every time
3. **Redundant `/me` on load:** Frontend called `/auth/me` even when token was valid
4. **Full list fetching:** Users, stock items, vouchers, leads all loaded entirely into memory
5. **N+1 stock updates:** Voucher create/delete updated items one-by-one in loops
6. **Unoptimized dashboards:** Heavy queries without caching or aggregation
7. **No compression:** Large JSON responses uncompressed
8. **CORS preflight:** No preflight cache → extra OPTIONS requests

### 3.3 UX Symptoms

- Dashboard felt slow on **every visit** (no cache)
- Leads page lagged with hundreds of leads
- Sidebar/navigation fixes were needed separately
- Admin bulk operations missing

---

## 4. Optimization Phases (Chronological)

### Phase 1 — RBAC & Access Control Foundation

**Goal:** Proper three-role system before scaling data access.

- Added `manager` role (Stock Manager) distinct from admin and user
- `stockAccess` middleware for stock routes
- Lead visibility: employees see only assigned leads; admin/manager see all
- Frontend `ProtectedRoute` with `adminOnly` and `stockOnly`
- Sidebar shows modules based on role
- Login redirects: admin → `/admin`, manager → `/stock`, user → `/crm`

### Phase 2 — Leads Module Overhaul

**Goal:** Handle large lead volumes without loading everything.

- Server-side pagination: `GET /leads?page&limit&stage&search`
- MongoDB text index on name, phone, city, email
- `buildLeadFilter()` utility for consistent role + search scoping
- Optimized stats endpoint with aggregation
- Bulk select + bulk delete on Leads page (admin only)
- `POST /leads/bulk-delete` (max 100 IDs)
- Frontend `fetchLeadsPage` with query-key cache in DataCacheContext
- Shared `PaginationBar` component

### Phase 3 — Dashboard Optimization (Not Background Prefetch)

**Goal:** Fast dashboards without prefetching data in the background (explicit user request).

- New dedicated routes: `/dashboard/crm`, `/dashboard/admin`, `/dashboard/stock`
- Lightweight aggregated queries with `Promise.all` and `$facet`
- **Server-side in-memory cache** (45s TTL) per dashboard key
- Cache invalidation on lead/user/stock mutations
- **Client-side session cache** in DataCacheContext with inflight deduplication
- Force refresh option on dashboard pages

### Phase 4 — Authentication Performance (JWT Session Model)

**Goal:** Eliminate DB lookup and `/me` call on every load.

**Backend:**
- JWT payload expanded: `{ id, name, email, role, phone, points }`
- `protect` middleware uses JWT claims directly (fast path)
- Legacy tokens (id-only) still work with one DB lookup until re-login
- `POST /auth/refresh` and `/auth/me` return fresh token
- Stage changes and points reset return new `token` in response

**Frontend:**
- JWT moved to **sessionStorage** (tab-scoped, more secure)
- One-time migration from localStorage
- User decoded client-side on boot — **no mandatory `/me`**
- Axios interceptor applies `res.data.token` automatically
- `AuthContext.updateSessionUser` for in-memory patches

### Phase 5 — Stock N+1 Fix

**Goal:** Voucher operations should not loop per item.

- `loadStockItemMap()` — batch fetch all items by ID
- `applyVoucherRowChange()` — compute deltas in memory
- `buildStockBulkOps()` + `StockItem.bulkWrite()` — single write
- Same pattern for voucher delete (reverse transaction)

### Phase 6 — Pagination Everywhere

**Goal:** Stop loading full collections on list pages.

| Resource | Endpoint | Frontend page |
|----------|----------|---------------|
| Users | `GET /users?page&limit&search` | `Users.jsx` |
| Stock items | `GET /stock/items?page&limit&search` | `StockItems.jsx` |
| Stock vouchers | `GET /stock/vouchers?page&limit&type` + summary | `VoucherList.jsx` |
| Assignees (dropdown) | `GET /users/assignees` (minimal fields) | NewLead, LeadDetail |
| Voucher form picker | `GET /stock/items?picker=1&limit=100` | `VoucherForm.jsx` |

### Phase 7 — Server & Network Optimizations

- `compression()` middleware (gzip)
- `Cache-Control: no-store` on all `/api` routes
- `etag: false` on Express
- CORS `maxAge: 86400` (24h preflight cache)
- `syncIndexes()` on DB connect
- Compound indexes on all major models

### Phase 8 — Frontend Bundle & UX

- `React.lazy()` + `Suspense` for 10 CRM/stock/admin pages
- Lazy loading on lead note images
- Print stock report fetches up to 500 rows **only on print click**
- Debounced search (350ms) on paginated lists

---

## 5. Complete List of Optimizations

### Backend

| # | Optimization | File(s) |
|---|--------------|---------|
| 1 | JWT embedded claims (no DB per request) | `middleware/auth.js`, `utils/token.js` |
| 2 | Token refresh on mutating endpoints | `routes/auth.js`, `routes/leads.js`, `routes/users.js` |
| 3 | gzip compression | `server.js` |
| 4 | API no-store + etag disabled | `server.js` |
| 5 | CORS preflight cache 24h | `server.js` |
| 6 | MongoDB index sync on connect | `config/db.js` |
| 7 | Text search index on leads | `models/Lead.js`, `utils/leads.js` |
| 8 | Compound indexes all models | `models/*.js` |
| 9 | Server pagination utility | `utils/pagination.js` |
| 10 | Paginated users API | `routes/users.js` |
| 11 | Assignees lightweight endpoint | `routes/users.js` |
| 12 | Paginated stock items + picker mode | `routes/stock.js` |
| 13 | Paginated vouchers + summary aggregate | `routes/stock.js` |
| 14 | Stock bulkWrite (N+1 fix) | `routes/stock.js` |
| 15 | Dashboard dedicated routes | `routes/dashboard.js` |
| 16 | Dashboard 45s in-memory cache | `utils/cache.js`, `utils/dashboardCache.js` |
| 17 | Cache invalidation on mutations | All mutation routes |
| 18 | Lead stats aggregation | `routes/leads.js` |
| 19 | Bulk delete leads | `routes/leads.js` |
| 20 | `.lean()` on read-only queries | Dashboard, assignees, picker |
| 21 | Parallel Promise.all queries | Lists, dashboards |
| 22 | Google DNS for MongoDB SRV | `config/db.js` |

### Frontend

| # | Optimization | File(s) |
|---|--------------|---------|
| 1 | sessionStorage JWT (not localStorage) | `utils/session.js` |
| 2 | Client-side JWT decode on boot | `utils/session.js`, `AuthContext.jsx` |
| 3 | Token auto-refresh interceptor | `api/axios.js` |
| 4 | Legacy localStorage migration | `utils/session.js` |
| 5 | DataCacheContext with inflight dedup | `context/DataCacheContext.jsx` |
| 6 | Dashboard session cache | `DataCacheContext.jsx` |
| 7 | Leads page cache by query key | `DataCacheContext.jsx` |
| 8 | Assignees cache (ref-based) | `DataCacheContext.jsx` |
| 9 | Server-paginated Users page | `pages/crm/Users.jsx` |
| 10 | Server-paginated StockItems | `pages/stock/StockItems.jsx` |
| 11 | Server-paginated VoucherList | `pages/stock/VoucherList.jsx` |
| 12 | Picker mode in VoucherForm | `pages/stock/VoucherForm.jsx` |
| 13 | fetchAssignees in NewLead/LeadDetail | `pages/crm/NewLead.jsx`, `LeadDetail.jsx` |
| 14 | React.lazy code splitting | `App.jsx` |
| 15 | Shared PaginationBar | `components/PaginationBar.jsx` |
| 16 | Debounced search on lists | Leads, Users, StockItems |
| 17 | Print-on-demand stock report | `StockItems.jsx` |
| 18 | Lazy images on lead notes | `LeadDetail.jsx` |
| 19 | Bulk select/delete UI (admin) | `Leads.jsx` |

---

## 6. Feature Work Done Alongside Performance

These features were implemented during the same development period:

| Feature | Description |
|---------|-------------|
| Three-role RBAC | admin, manager (Stock Manager), user (Employee) |
| Sidebar role-based nav | CRM / Stock / Admin links |
| Server-side lead pagination | 20 per page default |
| Bulk lead delete | Admin selects multiple leads |
| Dashboard endpoints | CRM, Admin, Stock lightweight APIs |
| Session dashboard cache | 45s client + server |
| Assignees endpoint | Dropdown without full user list |
| Voucher purchase/sales summary | Totals on paginated voucher list |
| Low stock alert on StockItems | From dashboard stock cache |
| Points reset (all / per user) | Admin actions with cache invalidation |
| **Service complaints module** | Public form, admin assignment, employee inbox |
| **Env example files** | `env.example`, `backend/.env.example`, `frontend/.env.example` |
| **No hardcoded credentials/URLs** | `VITE_API_URL` required; seed admin from env |

---

## 7. Architecture Decisions & Rationale

### Why JWT in sessionStorage (not localStorage)?

- Tab closes → token gone (better on shared PCs)
- Still avoids server session store (stateless API)
- User chose JWT session approach over server-side sessions

### Why embed claims in JWT?

- Eliminates `User.findById()` on every API call
- Biggest single backend win for Render deployment
- Trade-off: points/name changes need token refresh (handled automatically)

### Why NOT background prefetch for dashboards?

- User explicitly requested: optimize endpoints, don't prefetch in background
- Session cache on visit is sufficient with 45s server cache

### Why server pagination instead of client cache for lists?

- Dataset grows unbounded (leads, vouchers)
- Client cache of full lists doesn't scale
- Paginated API + page-level cache is predictable

### Why require VITE_API_URL (no code fallback)?

- All deployment targets differ (local, Render, staging)
- Prevents accidental hardcoded production URLs in source
- Build and dev fail fast if env is missing

### Why admin-assigned complaints (no env assignee)?

- Admin controls which employees handle service requests
- Public submissions stay **unassigned** until admin picks a handler
- `handlesComplaints` flag on User — toggled in User Management, not seed

### Why in-memory cache (not Redis)?

- Single Render instance — simple, no extra cost
- 45s TTL acceptable for dashboard stats
- Invalidated immediately on writes

---

## 8. Infrastructure & Region Guidance

### Problem Discovered

MongoDB Atlas: **Mumbai (ap-south-1)**  
Render: **Oregon (us-west)**

This adds ~200–350ms latency **per database query**, compounding across dashboards and auth.

### Recommendation

| Service | Action |
|---------|--------|
| MongoDB Atlas | Keep **Mumbai** (India data + users) |
| Render | Move **Oregon → Singapore** (closest Render region to Mumbai) |
| Expected DB latency | ~30–80ms (vs 200–350ms) |

### Steps

1. Render Dashboard → Service → Settings → Region → **Singapore**
2. Manual Deploy
3. Keep same `MONGO_URI`
4. Retest `/dashboard/crm`, login, leads list

### If Still Slow

- Upgrade Atlas tier (shared clusters throttle under load)
- Consider AWS/GCP Mumbai for backend (lowest possible latency)
- Ensure frontend users aren't hitting US-only CDN for API

---

## 9. File-by-File Change Map

### Backend — Created or Significantly Modified

```
backend/src/
├── server.js                 + compression, CORS maxAge, no-store
├── config/db.js              + syncIndexes, DNS fix
├── middleware/auth.js        + JWT fast path, stockAccess, RBAC helpers
├── utils/
│   ├── cache.js              NEW — generic TTL cache
│   ├── dashboardCache.js     NEW — dashboard keys + invalidation
│   ├── pagination.js         NEW — parsePagination, paginationMeta
│   ├── token.js              NEW — signUserToken, tokenPayloadForUser
│   └── leads.js              NEW — buildLeadFilter
├── routes/
│   ├── auth.js               + refresh, enriched token response
│   ├── users.js              + pagination, assignees
│   ├── leads.js              + pagination, text search, bulk delete, stats
│   ├── stock.js              + pagination, picker, bulkWrite, summary
│   ├── dashboard.js          NEW — crm/admin/stock aggregated endpoints
│   └── complaints.js         NEW — public register + CRM inbox
├── models/
│   ├── Complaint.js          NEW — complaints + indexes
│   ├── Lead.js               + text + compound indexes
│   ├── User.js               + compound indexes + handlesComplaints
│   ├── StockItem.js          + compound indexes
│   ├── StockVoucher.js       + compound indexes
│   └── QuotationTemplate.js  + indexes
└── utils/
    └── mail.js               NEW — Nodemailer complaint emails
```

### Frontend — Created or Significantly Modified

```
frontend/src/
├── config/api.js             NEW — VITE_API_URL (required)
├── api/axios.js              + token refresh interceptor, uses config/api
├── utils/session.js          NEW — sessionStorage JWT, decode, migration
├── constants/complaints.js   NEW — categories & status badges
├── context/
│   ├── AuthContext.jsx       + canAccessComplaints, canManageAllComplaints
│   └── DataCacheContext.jsx  + dashboard cache, leads pages, assignees
├── components/
│   ├── PaginationBar.jsx     NEW — shared pagination UI
│   └── ProtectedRoute.jsx    + complaintsOnly guard
├── App.jsx                   + /complaint, /crm/complaints lazy routes
└── pages/
    ├── website/
    │   └── RegisterComplaint.jsx  NEW — public complaint form
    ├── crm/
    │   ├── Complaints.jsx    NEW — admin assign + employee inbox
    │   ├── Users.jsx         + handlesComplaints toggle
    │   ├── Leads.jsx         + server pagination, bulk delete
    │   ├── Users.jsx         + server pagination
    │   ├── LeadDetail.jsx    + fetchAssignees, lazy images
    │   └── NewLead.jsx       + fetchAssignees
    └── stock/
        ├── StockItems.jsx    + pagination, print-on-demand
        ├── VoucherList.jsx   + pagination + summary
        └── VoucherForm.jsx   + picker mode API
```

---

## 10. Before vs After (Expected Impact)

| Scenario | Before | After |
|----------|--------|-------|
| App load (authenticated) | `/me` DB query + wait | JWT decode locally (~0ms) |
| Each API request | DB user lookup | JWT verify only (no DB) |
| CRM dashboard revisit (<45s) | Full re-query | Server cache hit + client cache |
| Leads page (500 leads) | Fetch all 500 | Fetch 20 per page |
| Users admin page | Fetch all users | Paginated 20/page |
| Stock voucher create (10 items) | 10+ sequential updates | 1 batch fetch + 1 bulkWrite |
| Lead search | Regex collection scan | `$text` index |
| Initial JS bundle | All pages included | Lazy chunks per module |
| JSON response size | Uncompressed | gzip compressed |
| CORS preflight | Every time | Cached 24h |

*Actual numbers depend on region alignment (Mumbai + Singapore vs Mumbai + Oregon).*

---

## 11. What Was Intentionally NOT Changed

| Item | Reason |
|------|--------|
| Background dashboard prefetch | User requested endpoint optimization only |
| Redis/external cache | Scope/cost — in-memory sufficient for single instance |
| Lead detail ownership check for `user` role | Known gap — not in optimization scope |
| MongoDB region migration | User keeps Mumbai — fix Render region instead |
| Git commits | Only when user explicitly requests |
| Seeding complaint handlers | Admin enables access per user in UI |

---

## 12. Remaining Opportunities

| Priority | Item |
|----------|------|
| High | Move Render Oregon → Singapore |
| High | Add ownership check on `GET/PUT /leads/:id` for user role |
| Medium | Redis cache if scaling to multiple Render instances |
| Medium | Server-side PDF for quotations/vouchers |
| Medium | Automated tests (Jest, Supertest, Cypress) |
| Low | WebSocket for real-time lead assignment notifications |
| Low | Recharts analytics on admin dashboard |
| Low | Service worker / PWA for offline read |
| Low | Email customer when admin assigns complaint handler |

---

## 13. Service Complaints & Environment Hardening (May 2026)

### Service Complaints Module

| Component | Detail |
|-----------|--------|
| Public form | `/complaint` — 23 solar service categories, no login |
| API | `POST /api/complaints` (public), protected list/detail/update |
| Assignment | **Admin-only** — complaints created unassigned; admin picks employee |
| Employee access | `handlesComplaints` flag on User; JWT claim; re-login after toggle |
| Email | Nodemailer + SMTP env vars; confirmation without coordinator until assigned |
| CRM UI | `/crm/complaints` — admin sees all + reassign; employees see assigned only |
| Admin dashboard | Quick link to complaints inbox |

### Environment & Credentials

| Change | Detail |
|--------|--------|
| `env.example` | Root reference for all variables |
| `backend/.env.example` | Server, Cloudinary, SMTP, seed admin vars |
| `frontend/.env.example` | Required `VITE_API_URL` |
| `frontend/src/config/api.js` | Single source for API base URL; throws if unset |
| `seed.js` | Admin credentials from `SEED_ADMIN_*` only — no complaint handler seed |
| Removed | Hardcoded Render API URL, `COMPLAINT_ASSIGNEE_EMAIL`, seeded handler users |

### Production Bug Fix

**Duplicate index on `complaintNumber`:** Field had `unique: true` plus redundant `schema.index({ complaintNumber: 1 })`. `syncIndexes()` on boot failed on Render with index name conflict. Fixed by keeping field-level unique index only.

---

## Summary

SolarJi evolved from a functional but monolithic data-loading app into a **paginated, cached, JWT-optimized** production system. The biggest wins came from:

1. **JWT claims** — no DB on every request  
2. **Server + client dashboard cache** — fast repeat visits  
3. **Pagination everywhere** — bounded payload sizes  
4. **Stock bulkWrite** — fixed N+1  
5. **MongoDB indexes + aggregation** — faster queries  
6. **Region alignment** — Mumbai Atlas + Singapore Render (recommended)
7. **Service complaints** — public intake + admin-controlled assignment
8. **Env-driven config** — no hardcoded secrets or API URLs

For technical details see [`ARCHITECTURE.md`](./ARCHITECTURE.md).  
For setup and quick start see [`../README.md`](../README.md).

---

*Document compiled from full development session — May 2026 (updated for complaints & env hardening).*
