# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockPro Clinique - A clinic inventory management application built with React + TypeScript + Supabase. The application is fully functional and deployed on Vercel.

## Architecture

### Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **State Management**: TanStack React Query for server state
- **Routing**: React Router v7
- **UI Components**: Radix UI primitives with shadcn/ui patterns in `/src/components/ui`
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Styling**: TailwindCSS 4 with `tw-animate-css`
- **Theme**: next-themes for dark/light mode support

### Legacy Files (NOT USED - kept for reference)
- Root level: `app.js`, `app-methods.js`, `app-clinic.js`, `index.html`, `mobile.html` - Old vanilla JS app
- `/server`: Express + sql.js - Replaced by Supabase

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

## Environment Variables

Frontend requires in `frontend/.env.local`:
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Database Schema (Supabase)

All tables have RLS enabled. See `docs/RLS_SECURITY.md` for security details.

### Core Tables
| Table | Description |
|-------|-------------|
| `products` | Inventory items with stock tracking |
| `outputs` | Stock exits (consumption, losses) |
| `suppliers` | Supplier information |
| `deliveries` | Delivery records |
| `delivery_items` | Items per delivery |
| `recipes` | Recipes with ingredients |
| `recipe_ingredients` | Ingredient-product mapping |
| `menus` | Daily menu planning |
| `menu_recipes` | Menu-recipe associations |

### HACCP & Compliance Tables
| Table | Description |
|-------|-------------|
| `temperature_equipment` | Fridges, freezers, cold rooms |
| `temperature_readings` | Temperature logs for HACCP |
| `traceability_photos` | Product label photos |

### Staff & Planning Tables
| Table | Description |
|-------|-------------|
| `staff` | Employee information |
| `schedule_events` | Staff schedules (work, leave) |
| `user_profiles` | Application user profiles |
| `activity_log` | Audit trail |

## Application Status - FULLY MIGRATED

All pages are implemented in React:

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | KPIs, alerts, recent activity |
| Products | `/products` | Full CRUD, stock adjustments |
| Outputs | `/outputs` | StreamDeck-style grid, traçabilité |
| Deliveries | `/deliveries` | OCR scanning, CSV import |
| Suppliers | `/suppliers` | Contact management |
| Recipes | `/recipes` | Ingredients, cost calculation |
| Menus | `/menus` | Daily/weekly planning |
| Temperatures | `/temperatures` | HACCP compliance readings |
| Traçabilité | `/traceability` | Photo gallery, completion rates |
| Planning | `/planning` | Staff schedules, leave management |
| Production | `/production` | Daily production planning |
| Analytics | `/analytics` | Charts, reports, exports |

## Key Features
- Dark/Light theme toggle
- OCR scanning for delivery slips (Tesseract.js)
- CSV import for bulk deliveries
- Touch-friendly UI (StreamDeck-style outputs)
- HACCP temperature tracking
- Product traceability with photos
- Staff planning with calendar view
