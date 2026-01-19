# Documentation Row Level Security (RLS) - StockPro Clinique

## Vue d'ensemble

Ce document décrit les politiques de sécurité Row Level Security (RLS) implémentées dans la base de données Supabase de StockPro Clinique.

**Date de mise à jour**: 2026-01-19
**Version**: 2.0
**Auteur**: Claude Code

---

## État actuel de la sécurité

### Mode de fonctionnement

L'application fonctionne actuellement **SANS authentification Supabase Auth**. Elle utilise la **clé anon** (publique) pour tous les appels API.

| Aspect | État |
|--------|------|
| RLS activé | ✅ Oui sur toutes les tables |
| Authentification Supabase | ❌ Non utilisée |
| Clé utilisée | `anon` (publique) |
| Niveau de sécurité | ⚠️ Basique (accès complet via anon) |

### Pourquoi cette configuration ?

1. **Application interne** - Utilisée uniquement sur le réseau de la clinique
2. **Simplicité** - Pas de gestion de comptes utilisateurs
3. **Rapidité de déploiement** - MVP fonctionnel rapidement

---

## Tables et leurs policies

### Légende des icônes

| Icône | Signification |
|-------|---------------|
| ✅ | Autorisé pour ce rôle |
| ❌ | Interdit pour ce rôle |
| ⚠️ | Point d'attention sécurité |

---

### 1. `products` - Produits

**Description**: Table principale contenant l'inventaire des produits.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `products_select_all` |
| INSERT | ✅ | ✅ | `products_insert_all` |
| UPDATE | ✅ | ✅ | `products_update_all` |
| DELETE | ✅ | ✅ | `products_delete_all` |

**Utilisée par**: `outputs`, `deliveries`, `delivery_items`, `recipe_ingredients`, `traceability_photos`

**Bugs potentiels si restreinte**:
- Impossible d'ajouter des produits
- Impossible de mettre à jour les stocks
- Les sorties de stock échoueraient

**Recommandation future**: Restreindre DELETE à `authenticated` uniquement.

---

### 2. `outputs` - Sorties de stock

**Description**: Enregistre les sorties de stock (consommation, pertes, etc.)

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `outputs_select_all` |
| INSERT | ✅ | ✅ | `outputs_insert_all` |
| UPDATE | ✅ | ✅ | `outputs_update_all` |
| DELETE | ✅ | ✅ | `outputs_delete_all` |

**Dépendances**: `products` (FK), `recipes` (FK optionnel)

**Trigger associé**: `trigger_output_stock` - Met à jour automatiquement `products.quantity`

**Bugs potentiels si DELETE restreint**:
- Impossible d'annuler une sortie erronée
- Le stock ne serait pas restauré correctement

---

### 3. `suppliers` - Fournisseurs

**Description**: Liste des fournisseurs de la clinique.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `suppliers_select_all` |
| INSERT | ✅ | ✅ | `suppliers_insert_all` |
| UPDATE | ✅ | ✅ | `suppliers_update_all` |
| DELETE | ✅ | ✅ | `suppliers_delete_all` |

**Utilisée par**: `products` (FK), `deliveries` (FK)

**Supprimable**: ✅ Oui, mais vérifie les dépendances d'abord.

---

### 4. `deliveries` - Livraisons

**Description**: Enregistre les livraisons reçues.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `deliveries_select_all` |
| INSERT | ✅ | ✅ | `deliveries_insert_all` |
| UPDATE | ✅ | ✅ | `deliveries_update_all` |
| DELETE | ✅ | ✅ | `deliveries_delete_all` |

**Dépendances**: `suppliers` (FK), `products` (FK)

---

### 5. `delivery_items` - Articles de livraison

**Description**: Détail des articles par livraison.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `delivery_items_select_all` |
| INSERT | ✅ | ✅ | `delivery_items_insert_all` |
| UPDATE | ✅ | ✅ | `delivery_items_update_all` |
| DELETE | ✅ | ✅ | `delivery_items_delete_all` |

**Trigger associé**: `trigger_delivery_item_stock` - Met à jour `products.quantity`

---

### 6. `recipes` - Recettes

**Description**: Recettes de cuisine de la clinique.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `recipes_select_all` |
| INSERT | ✅ | ✅ | `recipes_insert_all` |
| UPDATE | ✅ | ✅ | `recipes_update_all` |
| DELETE | ✅ | ✅ | `recipes_delete_all` |

**Utilisée par**: `recipe_ingredients`, `menu_recipes`, `outputs`

---

### 7. `recipe_ingredients` - Ingrédients des recettes

**Description**: Liste des ingrédients par recette.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `recipe_ingredients_select_all` |
| INSERT | ✅ | ✅ | `recipe_ingredients_insert_all` |
| UPDATE | ✅ | ✅ | `recipe_ingredients_update_all` |
| DELETE | ✅ | ✅ | `recipe_ingredients_delete_all` |

**Dépendances**: `recipes` (FK), `products` (FK)

**Note**: CASCADE DELETE depuis `recipes`.

---

### 8. `menus` - Menus

**Description**: Menus planifiés par date.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `menus_select_all` |
| INSERT | ✅ | ✅ | `menus_insert_all` |
| UPDATE | ✅ | ✅ | `menus_update_all` |
| DELETE | ✅ | ✅ | `menus_delete_all` |

**Utilisée par**: `menu_recipes`

---

### 9. `menu_recipes` - Recettes des menus

**Description**: Association menus ↔ recettes.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `menu_recipes_select_all` |
| INSERT | ✅ | ✅ | `menu_recipes_insert_all` |
| UPDATE | ✅ | ✅ | `menu_recipes_update_all` |
| DELETE | ✅ | ✅ | `menu_recipes_delete_all` |

**Dépendances**: `menus` (FK), `recipes` (FK)

---

### 10. `temperature_equipment` - Équipements de température

**Description**: Frigos, congélateurs et chambres froides.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `temp_equipment_select_all` |
| INSERT | ✅ | ✅ | `temp_equipment_insert_all` |
| UPDATE | ✅ | ✅ | `temp_equipment_update_all` |
| DELETE | ✅ | ✅ | `temp_equipment_delete_all` |

**Utilisée par**: `temperature_readings`

---

### 11. `temperature_readings` - Relevés de température ⚠️

**Description**: Relevés HACCP de température.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `temp_readings_select_all` |
| INSERT | ✅ | ✅ | `temp_readings_insert_all` |
| UPDATE | ✅ | ✅ | `temp_readings_update_all` |
| DELETE | ✅ | ✅ | `temp_readings_delete_all` |

**⚠️ Point d'attention HACCP**: Les relevés de température sont des données réglementaires. En production, il est recommandé de :
- Restreindre UPDATE à `authenticated` uniquement
- Restreindre DELETE à `authenticated` uniquement
- Implémenter un audit trail

**Dépendances**: `temperature_equipment` (FK)

---

### 12. `traceability_photos` - Photos de traçabilité ⚠️

**Description**: Photos d'étiquettes pour la traçabilité.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `traceability_photos_select_all` |
| INSERT | ✅ | ✅ | `traceability_photos_insert_all` |
| UPDATE | ✅ | ✅ | `traceability_photos_update_all` |
| DELETE | ✅ | ✅ | `traceability_photos_delete_all` |

**⚠️ Point d'attention HACCP**: Comme les relevés de température, ces photos sont des preuves de traçabilité.

**Dépendances**: `products` (FK), `outputs` (FK)

---

### 13. `staff` - Collaborateurs ⚠️

**Description**: Personnel de la clinique.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `staff_select_all` |
| INSERT | ✅ | ✅ | `staff_insert_all` |
| UPDATE | ✅ | ✅ | `staff_update_all` |
| DELETE | ✅ | ✅ | `staff_delete_all` |

**⚠️ Données sensibles**:
- `pin_code` : Code PIN stocké en clair (devrait être hashé)
- `signature_data` : Signature électronique
- `email`, `phone` : Données personnelles

**Utilisée par**: `schedule_events`, `user_profiles`

**Recommandation future**:
- Hasher `pin_code` avec bcrypt
- Restreindre SELECT sur les colonnes sensibles
- Implémenter une vue publique sans données sensibles

---

### 14. `schedule_events` - Événements du planning

**Description**: Planning des collaborateurs (congés, travail, etc.)

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `schedule_events_select_all` |
| INSERT | ✅ | ✅ | `schedule_events_insert_all` |
| UPDATE | ✅ | ✅ | `schedule_events_update_all` |
| DELETE | ✅ | ✅ | `schedule_events_delete_all` |

**Dépendances**: `staff` (FK x2 : staff_id, validated_by)

---

### 15. `user_profiles` - Profils utilisateurs

**Description**: Profils applicatifs (admin, manager, user).

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `user_profiles_select_all` |
| INSERT | ✅ | ✅ | `user_profiles_insert_all` |
| UPDATE | ✅ | ✅ | `user_profiles_update_all` |
| DELETE | ✅ | ✅ | `user_profiles_delete_all` |

**Dépendances**: `staff` (FK optionnel)

**Utilisée par**: `activity_log`

---

### 16. `activity_log` - Journal d'activité

**Description**: Audit trail des actions.

| Opération | anon | authenticated | Policy |
|-----------|------|---------------|--------|
| SELECT | ✅ | ✅ | `activity_log_select_all` |
| INSERT | ✅ | ✅ | `activity_log_insert_all` |
| UPDATE | ✅ | ✅ | `activity_log_update_all` |
| DELETE | ✅ | ✅ | `activity_log_delete_all` |

**Dépendances**: `user_profiles` (FK)

**Recommandation future**: Rendre INSERT ONLY pour garantir l'intégrité de l'audit trail.

---

## Tables additionnelles

### `clinic_menus` (ancienne structure)
- Même configuration que `menus`
- Conservée pour compatibilité

### `forecasts` - Prévisions
- Même configuration standard

### `photos` - Photos générales
- Même configuration standard

---

## Comment modifier les policies

### Restreindre DELETE à authenticated uniquement

```sql
-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "products_delete_all" ON products;

-- Créer la nouvelle policy restreinte
CREATE POLICY "products_delete_authenticated" ON products
    FOR DELETE TO authenticated
    USING (true);
```

**⚠️ Impact**: Les utilisateurs non authentifiés ne pourront plus supprimer.

### Implémenter auth.uid() (avec Supabase Auth)

```sql
-- Ajouter une colonne user_id si nécessaire
ALTER TABLE products ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Policy pour que les utilisateurs voient uniquement leurs données
CREATE POLICY "users_own_products" ON products
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Créer un rôle admin

```sql
CREATE POLICY "admin_full_access" ON products
    FOR ALL TO authenticated
    USING (
        (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
```

---

## Bugs potentiels par table

| Table | Bug si SELECT restreint | Bug si INSERT restreint | Bug si UPDATE restreint | Bug si DELETE restreint |
|-------|------------------------|------------------------|------------------------|------------------------|
| products | Dashboard vide | Impossible d'ajouter | Stock figé | Impossible de supprimer |
| outputs | Historique invisible | Sorties impossibles | Corrections impossibles | Annulations impossibles |
| staff | Planning invisible | Ajout personnel impossible | Modification impossible | Suppression impossible |
| temperature_readings | HACCP inaccessible | Relevés impossibles | - | - |

---

## Checklist de sécurité

### Actuellement implémenté ✅

- [x] RLS activé sur toutes les tables
- [x] Policies explicites avec clause TO
- [x] 4 policies par table (SELECT, INSERT, UPDATE, DELETE)
- [x] Documentation des dépendances

### À implémenter pour plus de sécurité ⚠️

- [ ] Authentification Supabase Auth
- [ ] Hashage du pin_code dans staff
- [ ] Policies basées sur auth.uid()
- [ ] Restriction DELETE sur données HACCP
- [ ] Audit trail inviolable (INSERT ONLY)
- [ ] Rotation régulière de la clé anon

---

## Sources et références

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Securing Your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Understanding API Keys](https://supabase.com/docs/guides/api/api-keys)

---

## Contact

Pour toute question sur la sécurité de la base de données, contacter l'équipe technique.
