# StockPro Clinique - Documentation

## Vue d'ensemble

**StockPro Clinique** est une application web de gestion des stocks pour les établissements de restauration collective (cliniques, EHPAD, cantines).

**Version**: 2.0
**Dernière mise à jour**: 2026-01-19
**Stack**: React 19 + TypeScript + Supabase + TailwindCSS 4

---

## Documents

| Document | Description |
|----------|-------------|
| [RLS_SECURITY.md](./RLS_SECURITY.md) | Documentation des politiques Row Level Security Supabase |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │Dashboard│  │Products │  │ Outputs │  │Deliveries│ ...       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                       │
│                   ┌─────▼─────┐                                │
│                   │  api.ts   │ (React Query + Supabase)       │
│                   └─────┬─────┘                                │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Row Level Security                     │  │
│  │  - Toutes les tables ont RLS activé                       │  │
│  │  - Policies explicites pour anon + authenticated          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Tables:                                                        │
│  • Core: products, outputs, suppliers, deliveries, etc.         │
│  • HACCP: temperature_equipment, temperature_readings           │
│  • Staff: staff, schedule_events, user_profiles                │
│  • Audit: activity_log, traceability_photos                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités

### Gestion de Stock
- Inventaire produits avec catégories
- Alertes stock minimum
- Ajustement rapide (+/-)
- Import CSV livraisons
- Scan OCR bons de livraison

### HACCP & Traçabilité
- Relevés de température (frigos, congélateurs)
- Indicateurs de conformité (vert/rouge)
- Photos d'étiquettes produits
- Taux de complétion traçabilité

### Planning
- Planning du personnel (travail, congés, maladie)
- Calendrier interactif
- Validation par responsable

### Recettes & Menus
- Fiches recettes avec coût
- Ingrédients liés aux produits
- Planning menus journalier/hebdomadaire
- Calcul automatique des besoins

---

## Configuration

### Variables d'environnement

```env
# frontend/.env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase MCP (optionnel)

Pour utiliser les outils MCP Supabase:
```json
// .mcp.json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@anthropic/supabase-mcp@latest", "--project-ref", "xxx"]
    }
  }
}
```

---

## Déploiement

L'application est déployée sur **Vercel**.

```bash
# Build local
cd frontend
npm run build

# Déploiement (auto via GitHub)
git push origin main
```

---

## Sécurité

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec des policies explicites:
- SELECT, INSERT, UPDATE, DELETE autorisés pour `anon` et `authenticated`
- Documentation complète dans [RLS_SECURITY.md](./RLS_SECURITY.md)

### Recommandations futures

1. Implémenter Supabase Auth
2. Hasher les PIN codes du personnel
3. Restreindre DELETE sur données HACCP
4. Ajouter audit trail inviolable

---

## Support

Pour toute question technique, consulter:
1. Ce dossier de documentation
2. Les commentaires dans le code source
3. La documentation Supabase officielle
