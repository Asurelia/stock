# StockPro Clinique
Clinic inventory management app (React + Supabase). Deployed on Vercel.

## Tech Stack
- React 19 + TypeScript + Vite (in `/frontend`)
- TanStack React Query + React Router v7
- Radix UI / shadcn/ui + TailwindCSS 4
- React Hook Form + Zod
- Supabase (PostgreSQL) with RLS — see `docs/RLS_SECURITY.md`
- Tesseract.js for OCR scanning

## Commands
```bash
cd frontend
npm run dev      # Vite dev server (port 5173)
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
```

## Important Files
- `frontend/src/lib/api.ts` — Supabase API wrapper
- `frontend/src/lib/database.types.ts` — Generated DB types
- `frontend/src/components/layout/Layout.tsx` — Main layout with sidebar

## Rules
- **NEVER** modify root-level JS files (`app.js`, `app-clinic.js`, etc.) — legacy, not used
- **NEVER** modify `/server` — replaced by Supabase
- All Supabase tables have RLS enabled — respect security policies
- All work happens inside `/frontend`
