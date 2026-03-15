# StockPro Clinique
Clinic inventory management app with AI assistant. Local backend + Vercel frontend.

## Tech Stack
### Frontend (`/frontend`)
- React 19 + TypeScript + Vite
- TanStack React Query + React Router v7
- Radix UI / shadcn/ui + TailwindCSS 4
- React Hook Form + Zod
- Recharts (charts), jsPDF (PDF reports), html5-qrcode (barcode scanner)
- Tesseract.js for OCR scanning

### Backend (`/backend`)
- Express 5 + TypeScript + Prisma ORM + SQLite
- bcryptjs (PIN hashing), multer (file uploads)
- LM Studio integration (Qwen 3.5 — local AI)

## Commands
```bash
npm run dev          # Start both backend + frontend (concurrently)
npm run dev:backend  # Backend only (port 3005)
npm run dev:frontend # Frontend only (port 5173+)

cd frontend
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint

cd backend
npx prisma studio    # Visual DB browser
npx prisma db push   # Apply schema changes
npx tsx prisma/seed.ts  # Seed default admin (PIN: 0000)
```

## Important Files
- `frontend/src/components/layout/nav-config.ts` — Navigation structure (add pages here)
- `frontend/src/components/layout/Layout.tsx` — Main layout with collapsible sidebar
- `frontend/src/lib/api/core.ts` — HTTP client (all API calls go through here)
- `frontend/src/pages/AIAssistantPage.tsx` — AI assistant page
- `backend/src/routes/llm.ts` — AI brain (tools, vision, memory)
- `backend/prisma/schema.prisma` — Database schema (22 models)
- `backend/src/app.ts` — Express route mounting

## Rules
- **NEVER** modify root-level JS files (`app.js`, `app-clinic.js`, etc.) — legacy
- **NEVER** modify `/server` — legacy, replaced by `/backend`
- Backend port configured in `backend/.env` (PORT=3005)
- Frontend proxy in `frontend/vite.config.ts` must match backend port
- All code customization points marked with `/* CUSTOMIZATION: */` comments
- AI features require LM Studio running on localhost:1234
