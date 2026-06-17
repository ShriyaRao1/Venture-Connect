# GovInfo Search — MVP Implementation Plan

A government notifications search portal with full-text search, JWT auth, admin dashboard, PDF processing, and a standalone scraper.

---

## Project Location

```
C:\Users\USER\.gemini\antigravity\scratch\govinfo-search\
├── backend\
├── frontend\
├── .gitignore
└── README.md
```

---

## Phase Overview

| Phase | Scope | Blocker? |
|-------|-------|----------|
| 1 | DB Schema + Seed Data | ✅ Confirm before Phase 2 |
| 2 | Backend Search API + Auth + Admin | ✅ Confirm before Phase 3 |
| 3 | Frontend: Home + Search Results + Detail | ✅ Confirm before Phase 4 |
| 4 | Frontend: Auth pages + Admin Dashboard | ✅ Confirm before Phase 5 |
| 5 | Scraper script | Final |

---

## Phase 1 — Database & Seed Data

### Files
#### [NEW] `backend/db/schema.sql`
- `Notification` table: `id`, `title`, `description`, `department`, `source_url`, `pdf_text`, `published_date`, `created_at`
- `User` table: `id`, `name`, `email`, `password_hash`, `role` (default `'user'`)
- `FULLTEXT INDEX` on `(title, description, pdf_text)`

#### [NEW] `backend/db/seed.sql`
- 15–20 realistic Indian government notifications seeded across departments:
  - **Education**: CBSE results, NTA NEET/JEE notices, UGC guidelines
  - **Agriculture**: PM-Kisan Yojana, crop insurance deadlines
  - **Finance**: Income tax filing deadlines, GST council notices
  - **Health**: AIIMS recruitment, National Health Mission tenders
  - **Social Welfare**: NSP scholarship, SC/ST fellowships, Aadhaar update deadlines
- Each row has a believable `published_date`, `source_url`, and short `description`

---

## Phase 2 — Backend (Express + MySQL)

### Stack
- `express`, `mysql2`, `jsonwebtoken`, `bcryptjs`, `multer`, `pdf-parse`, `cors`, `dotenv`

### Project Structure
```
backend/
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── connection.js        ← mysql2 pool
├── middleware/
│   ├── auth.js              ← verifyToken middleware
│   └── adminOnly.js         ← role check middleware
├── routes/
│   ├── search.js            ← GET /api/search
│   ├── notifications.js     ← GET /api/notifications/:id
│   ├── auth.js              ← POST /api/auth/register, /login
│   └── admin.js             ← POST /api/admin/notifications, GET /api/admin/stats
├── uploads/                 ← multer destination (gitignored)
├── .env.example
├── package.json
└── server.js
```

### Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/search` | None | Full-text search with `?q=`&`department=` |
| GET | `/api/notifications/:id` | None | Single notification detail |
| POST | `/api/auth/register` | None | Register user (bcrypt hash) |
| POST | `/api/auth/login` | None | Login → returns JWT |
| POST | `/api/admin/notifications` | JWT + admin | Upload notification + PDF |
| GET | `/api/admin/stats` | JWT + admin | Dashboard stats |

### Search Logic
1. Strip stopwords from `q` (hardcoded array: `["the","is","in","of","and","to","a","an","for","on","with","at","by","from"]`)
2. Build `MATCH(title, description, pdf_text) AGAINST(? IN BOOLEAN MODE)` query
3. Apply `WHERE department = ?` if filter is present
4. Return rows sorted by MySQL relevance score

---

## Phase 3 — Frontend: Core Pages

### Stack
- `vite` + `react`, `axios`, `react-router-dom`, `bootstrap` (CDN or npm)

### Project Structure
```
frontend/
├── src/
│   ├── api/
│   │   └── axiosInstance.js     ← Axios instance + interceptor
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── NotificationCard.jsx
│   │   └── DepartmentBadge.jsx
│   ├── pages/
│   │   ├── HomePage.jsx          ← search bar + dept filter
│   │   ├── SearchResultsPage.jsx ← result cards grid
│   │   ├── NotificationDetailPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── AdminDashboard.jsx
│   ├── context/
│   │   └── AuthContext.jsx       ← JWT state + login/logout helpers
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── vite.config.js
```

### Pages
- **HomePage**: Centered search bar + department `<select>` + Search button → navigates to `/search?q=...&department=...`
- **SearchResultsPage**: Reads URL params, calls `/api/search`, renders `<NotificationCard>` grid; shows loading spinner and empty state
- **NotificationDetailPage**: Calls `/api/notifications/:id`, shows full description, metadata, PDF link, "Back to results"
- **LoginPage / RegisterPage**: Controlled forms, on success store JWT in `localStorage` via `AuthContext`
- **AdminDashboard**: Protected route (redirect if no admin token), stats cards + add-notification form with PDF upload

---

## Phase 4 — Admin Dashboard + Auth Pages

Included in Phase 3 structure above. Admin dashboard renders stats from `/api/admin/stats` and a form that `POST`s to `/api/admin/notifications` with `multipart/form-data`.

---

## Phase 5 — Scraper

```
backend/scraper/
└── scrape.js    ← standalone Node script
```
- Uses `axios` + `cheerio` to fetch a public government results page (e.g., `https://www.results.gov.in/`)
- Parses notification titles + links from the DOM
- Inserts 5 rows into `Notification` table using the existing DB pool
- Run with: `node backend/scraper/scrape.js`

---

## Git & Project Setup

### `.gitignore` covers
- `node_modules/`, `.env`, `dist/`, `build/`, `backend/uploads/`

### `README.md` includes
- Prerequisites (Node 18+, MySQL 8+)
- `.env` variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`
- Setup steps: schema → seed → npm install (both) → run dev servers
- Git init + first commit commands

---

## Open Questions

> [!IMPORTANT]
> **MySQL credentials**: When generating the `.env.example`, should I use default values (`root` / empty password / `govinfo_db`) as placeholders, or do you have specific credentials you'd like documented?

> [!NOTE]
> **Bootstrap version**: I'll use Bootstrap 5 via CDN in `index.html` for simplicity — no npm install needed. Okay to proceed this way?

> [!NOTE]
> **Scraper target**: `results.gov.in` can be unreliable. I'll write the scraper targeting it but include a fallback mock insert mode if the site is unreachable, so the script still demonstrates the insert logic. Acceptable?

> [!NOTE]
> **PDF uploads storage**: PDFs will be stored in `backend/uploads/` (gitignored). The `pdf_text` extracted field will live in MySQL. No cloud storage is needed for the MVP — confirmed?

---

## Verification Plan

### After Each Phase
- Phase 1: Run `schema.sql` + `seed.sql` against a local MySQL instance and verify row counts
- Phase 2: Test all endpoints with `curl` or Postman; verify FULLTEXT search returns ranked results
- Phase 3: Start Vite dev server, manually test search flow end-to-end in browser
- Phase 4: Verify admin login redirects, stats populate, PDF upload extracts text
- Phase 5: Run scraper, verify new rows appear in search results
