# StockPro - Modèle de Données Visuel

## Diagramme Entité-Relation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    STOCKPRO DATABASE                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │    SUPPLIERS     │
                                    │   (Fournisseurs) │
                                    ├──────────────────┤
                                    │ id (sup_xxx)     │
                                    │ name             │
                                    │ category         │
                                    │ phone            │
                                    │ email            │
                                    │ orderDays[]      │
                                    │ deliveryDays[]   │
                                    │ productIds[] ────┼──────────┐
                                    │ logoUrl          │          │
                                    └──────────────────┘          │
                                                                  │
                                                                  ▼
┌──────────────────┐           ┌──────────────────┐        ┌──────────────────┐
│     OUTPUTS      │◄──────────│     PRODUCTS     │───────►│   DELIVERIES     │
│    (Sorties)     │   réf     │    (Produits)    │  réf   │   (Livraisons)   │
├──────────────────┤           ├──────────────────┤        ├──────────────────┤
│ id (o_xxx)       │           │ id (p_xxx)       │        │ id (d_xxx)       │
│ productId ───────┼──────────►│ name             │◄───────┼─ items[].productId│
│ quantity         │           │ category         │        │ date             │
│ reason           │           │ unit             │        │ supplier         │
│ date             │           │ quantity         │        │ items[]          │
│ createdAt        │           │ minStock         │        │ photo            │
└──────────────────┘           │ avgConsumption   │        │ total            │
                               │ price            │        └──────────────────┘
                               │ createdAt        │
                               │ lastUpdated      │
                               └────────┬─────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │     RECIPES      │  │      PHOTOS      │  │      MENUS       │
         │    (Recettes)    │  │    (Galerie)     │  │   (Planning)     │
         ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
         │ id (rec_xxx)     │  │ id (ph_xxx)      │  │ id (m_xxx)       │
         │ name             │  │ data (base64)    │  │ weekNumber       │
         │ portions         │  │ type             │  │ year             │
         │ ingredients[] ───┼──┤ description      │  │ days{}           │
         │ dietaryTags[]    │  │ createdAt        │  └──────────────────┘
         │ photo            │  └──────────────────┘
         │ instructions     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐        ┌──────────────────┐
         │   CLINIC_MENUS   │───────►│  DAILY_FORECAST  │
         │ (Menus Clinique) │  réf   │   (Prévisions)   │
         ├──────────────────┤        ├──────────────────┤
         │ id (cm_xxx)      │        │ id               │
         │ date             │        │ date             │
         │ patientLunch ────┼────┐   │ patients         │
         │ patientDinner────┼────┤   │ staff            │
         │ staffLunch ──────┼────┤   │ notes            │
         │ punctualOrders[] │    │   └──────────────────┘
         │ notes            │    │
         │ forecast ────────┼────┘
         └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLÉS LOCALSTORAGE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  stockpro_products      → Products[]                                                    │
│  stockpro_outputs       → Outputs[]                                                     │
│  stockpro_deliveries    → Deliveries[]                                                  │
│  stockpro_photos        → Photos[]                                                      │
│  stockpro_menus         → Menus[]                                                       │
│  stockpro_suppliers     → Suppliers[]                                                   │
│  stockpro_recipes       → Recipes[]                                                     │
│  stockpro_clinic_menus  → ClinicMenus[]                                                 │
│  stockpro_forecasts     → DailyForecast[]                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Structures de Données Détaillées

### Product (Produit)
```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCT                              │
├─────────────────┬───────────────┬───────────────────────────┤
│ Champ           │ Type          │ Exemple                   │
├─────────────────┼───────────────┼───────────────────────────┤
│ id              │ string        │ "p_1705493200_abc123"     │
│ name            │ string        │ "Tomates"                 │
│ category        │ string        │ "Légumes"                 │
│ unit            │ string        │ "kg"                      │
│ quantity        │ number        │ 15.5                      │
│ minStock        │ number?       │ 5                         │
│ avgConsumption  │ number?       │ 2.5                       │
│ price           │ number?       │ 3.50                      │
│ createdAt       │ ISO string    │ "2024-01-17T10:00:00Z"    │
│ lastUpdated     │ ISO string    │ "2024-01-17T14:30:00Z"    │
└─────────────────┴───────────────┴───────────────────────────┘
```

### Output (Sortie)
```
┌─────────────────────────────────────────────────────────────┐
│                         OUTPUT                              │
├─────────────────┬───────────────┬───────────────────────────┤
│ id              │ string        │ "o_1705493200_xyz789"     │
│ productId       │ string (FK)   │ "p_1705493200_abc123"     │
│ quantity        │ number        │ 2.5                       │
│ reason          │ string?       │ "Service midi"            │
│ date            │ YYYY-MM-DD    │ "2024-01-17"              │
│ createdAt       │ ISO string    │ "2024-01-17T12:00:00Z"    │
└─────────────────┴───────────────┴───────────────────────────┘
```

### Delivery (Livraison)
```
┌─────────────────────────────────────────────────────────────┐
│                        DELIVERY                             │
├─────────────────┬───────────────┬───────────────────────────┤
│ id              │ string        │ "d_1705493200_def456"     │
│ date            │ YYYY-MM-DD    │ "2024-01-17"              │
│ supplier        │ string        │ "Metro"                   │
│ items           │ Item[]        │ [{productId, qty, price}] │
│ photo           │ base64?       │ "data:image/jpeg;..."     │
│ total           │ number?       │ 156.80                    │
│ createdAt       │ ISO string    │ "2024-01-17T08:00:00Z"    │
└─────────────────┴───────────────┴───────────────────────────┘

    items[]:
    ┌─────────────────────────────────────────────────────────┐
    │ productId       │ string (FK)   │ "p_xxx"               │
    │ quantity        │ number        │ 10                    │
    │ unitPrice       │ number?       │ 2.50                  │
    └─────────────────┴───────────────┴───────────────────────┘
```

### Supplier (Fournisseur)
```
┌─────────────────────────────────────────────────────────────┐
│                        SUPPLIER                             │
├─────────────────┬───────────────┬───────────────────────────┤
│ id              │ string        │ "sup_1705493200_jkl345"   │
│ name            │ string        │ "Primeur Local"           │
│ category        │ string        │ "fruits-legumes"          │
│ phone           │ string?       │ "01.23.45.67.89"          │
│ email           │ string?       │ "contact@primeur.fr"      │
│ address         │ string?       │ "12 rue du Marché"        │
│ orderDays       │ string[]?     │ ["lundi", "jeudi"]        │
│ deliveryDays    │ string[]?     │ ["mardi", "vendredi"]     │
│ minOrder        │ number?       │ 100                       │
│ productIds      │ string[]?     │ ["p_xxx", "p_yyy"]        │
│ logoUrl         │ base64?       │ "data:image/png;..."      │
│ notes           │ string?       │ "Livraison matin..."      │
│ createdAt       │ ISO string    │ "2024-01-17T09:00:00Z"    │
│ updatedAt       │ ISO string?   │ "2024-01-17T15:00:00Z"    │
└─────────────────┴───────────────┴───────────────────────────┘
```

### Recipe (Recette)
```
┌─────────────────────────────────────────────────────────────┐
│                         RECIPE                              │
├─────────────────┬───────────────┬───────────────────────────┤
│ id              │ string        │ "rec_1705493200_mno678"   │
│ name            │ string        │ "Poulet rôti"             │
│ portions        │ number        │ 10                        │
│ ingredients     │ Ingredient[]  │ [{productId, quantity}]   │
│ dietaryTags     │ string[]?     │ ["normal", "sans-sel"]    │
│ photo           │ base64?       │ "data:image/jpeg;..."     │
│ instructions    │ string?       │ "1. Préchauffer..."       │
│ createdAt       │ ISO string    │ "2024-01-17T11:00:00Z"    │
│ updatedAt       │ ISO string?   │ "2024-01-17T16:00:00Z"    │
└─────────────────┴───────────────┴───────────────────────────┘

    ingredients[]:
    ┌─────────────────────────────────────────────────────────┐
    │ productId       │ string (FK)   │ "p_xxx"               │
    │ quantity        │ number        │ 0.5 (par portion)     │
    └─────────────────┴───────────────┴───────────────────────┘
```

### ClinicMenu (Menu Clinique)
```
┌─────────────────────────────────────────────────────────────┐
│                      CLINIC_MENU                            │
├─────────────────┬───────────────┬───────────────────────────┤
│ id              │ string        │ "cm_1705493200"           │
│ date            │ YYYY-MM-DD    │ "2024-01-17"              │
│ patientLunch    │ Meal?         │ {recipeId, portions}      │
│ patientDinner   │ Meal?         │ {recipeId, portions}      │
│ staffLunch      │ Meal?         │ {recipeId, portions}      │
│ punctualOrders  │ Order[]?      │ [{recipeId, quantity}]    │
│ notes           │ string?       │ "Régime spécial ch.12"    │
│ forecast        │ Forecast?     │ {patients: 45, staff: 12} │
└─────────────────┴───────────────┴───────────────────────────┘

    Meal:
    ┌─────────────────────────────────────────────────────────┐
    │ recipeId        │ string (FK)   │ "rec_xxx"             │
    │ portions        │ number        │ 50                    │
    └─────────────────┴───────────────┴───────────────────────┘
```

---

## Flux de Données

```
                    ┌─────────────┐
                    │   ENTRÉES   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Livraison │  │ Ajust.   │  │  Scan    │
        │ Manuelle │  │ Stock    │  │  OCR     │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └──────────┬──┴─────────────┘
                        ▼
              ┌─────────────────┐
              │    PRODUCTS     │
              │  (Stock actuel) │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │  SORTIES  │ │  RECETTES │ │ ANALYTICS │
   │  (-qty)   │ │(ingrédients)│ │(rapports) │
   └───────────┘ └─────┬─────┘ └───────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  CLINIC MENUS   │
              │ (besoins/jour)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  SORTIE RAPIDE  │
              │ (décrémente)    │
              └─────────────────┘
```

---

*Modèle de données - StockPro v3*
