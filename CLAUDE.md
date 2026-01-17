# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockPro Clinique - A clinic inventory management application currently being migrated from vanilla JavaScript with localStorage to a modern React + TypeScript + Supabase architecture.

## Architecture

### Current State (Migration in Progress)
- **Legacy Application** (root): Vanilla JS SPA (`app.js`, `app-methods.js`, `app-clinic.js`) using localStorage
- **Modern Frontend** (`/frontend`): React 19 + TypeScript + Vite + TailwindCSS 4 + Supabase
- **Legacy Server** (`/server`): Express + sql.js (SQLite in-memory) - being replaced by Supabase

### Frontend Architecture (`/frontend`)
- **State Management**: TanStack React Query for server state
- **Routing**: React Router v7
- **UI Components**: Radix UI primitives with shadcn/ui patterns in `/src/components/ui`
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Styling**: TailwindCSS 4 with `tw-animate-css`

### Key Patterns
- Path alias: `@/` maps to `src/`
- API layer in `/src/lib/api.ts` wraps Supabase calls
- Database types in `/src/lib/database.types.ts`
- Layout component in `/src/components/layout/Layout.tsx` with sidebar navigation

## Commands

### Frontend Development
```bash
cd frontend
npm run dev      # Start Vite dev server (port 5173)
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Legacy Server (if needed)
```bash
cd server
npm run dev      # Start with --watch
npm start        # Production start
```

## Environment Variables

Frontend requires in `frontend/.env.local`:
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Database Schema (Supabase)

Current table: `products`
- `id` (uuid, PK)
- `name` (text)
- `category` (text, nullable)
- `quantity` (numeric)
- `unit` (text, nullable)
- `price` (numeric)
- `minStock` (numeric)
- `created_at` (timestamp)

Additional tables planned (from legacy schema): `outputs`, `deliveries`, `recipes`, `clinic_menus`, `suppliers`, `photos`

## Migration Status

Pages migrated to React:
- Dashboard (`/`)
- Products (`/products`) - fully functional with CRUD

Pages pending migration (showing placeholder):
- Outputs (`/outputs`)
- Deliveries (`/deliveries`)
- Suppliers (`/suppliers`)
- Recipes (`/recipes`)
- Menus (`/menus`)
- Analytics (`/analytics`)
