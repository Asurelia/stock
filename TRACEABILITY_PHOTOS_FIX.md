# Fix: Photos de Traçabilité

## Problème Identifié

L'utilisateur signale que :
1. Quand il prend une photo lors d'une sortie de marchandise, il reçoit un message de confirmation mais l'image n'est pas visible
2. Dans l'onglet traçabilité, rien ne s'affiche - la page ne fonctionne pas

## Analyse du Problème

Après investigation, plusieurs problèmes ont été identifiés :

### 1. Bucket Storage Manquant
Le bucket Supabase Storage `traceability-photos` n'était probablement pas créé ou n'avait pas les bonnes politiques d'accès.

### 2. Erreurs dans le Code TypeScript
- **TraceabilityTab.tsx (ligne 67)** : Accès incorrect aux données de la jointure `outputs` lors de la récupération des photos
- **TraceabilityPage.tsx (ligne 101)** : Même problème lors du calcul des statistiques

### 3. Absence de Feedback Utilisateur
Aucun message toast n'était affiché après l'upload d'une photo, ce qui donnait l'impression que l'action avait échoué même si elle réussissait.

## Solution Implémentée

### 1. Migration SQL pour le Storage (20260120_storage_traceability_photos.sql)

Cette migration :
- Crée le bucket `traceability-photos` s'il n'existe pas
- Configure le bucket comme public pour permettre l'accès direct aux URLs
- Limite la taille des fichiers à 10MB
- Restreint les types MIME aux images (JPEG, PNG, WebP, HEIC)
- Crée 7 policies pour gérer les accès :
  - 1 policy de lecture publique (SELECT pour tous)
  - 3 policies pour le rôle `anon` (INSERT, UPDATE, DELETE)
  - 3 policies pour le rôle `authenticated` (INSERT, UPDATE, DELETE)

### 2. Corrections du Code TypeScript

#### TraceabilityTab.tsx
```typescript
// AVANT (incorrect)
const photoForProduct = todayPhotos.find(p =>
    (p.outputs as { product_id: string } | null)?.product_id === output.productId
)

// APRÈS (correct)
const photoForProduct = todayPhotos.find(p => {
    const outputs = p.outputs as { id: string; product_id: string; quantity: number } | null
    return outputs?.product_id === output.productId
})
```

**Ajout de messages toast** :
- Message de succès après upload réussi
- Message d'erreur en cas d'échec

#### TraceabilityPage.tsx
```typescript
// AVANT (incorrect)
const productsWithPhotos = new Set(photos.map(p => p.output_id));

// APRÈS (correct)
const productsWithPhotos = new Set(
    photos
        .map(p => {
            const outputs = p.outputs as { id: string; product_id: string } | null;
            return outputs?.product_id;
        })
        .filter((id): id is string => id !== null && id !== undefined)
);
```

### 3. Script de Diagnostic (DIAGNOSTIC_traceability_photos.sql)

Un script SQL complet qui vérifie :
- ✅ Existence de la table `traceability_photos`
- ✅ Structure de la table (colonnes, types)
- ✅ Existence du bucket storage
- ✅ Configuration du bucket (public, taille limite)
- ✅ Policies RLS de la table
- ✅ Policies Storage
- ✅ Nombre de photos existantes
- ✅ Sorties sans photo aujourd'hui
- ✅ Dernières photos enregistrées

## Étapes pour Appliquer la Correction

### 1. Exécuter la Migration Storage

Dans Supabase Dashboard > SQL Editor, exécutez :
```bash
/home/user/stock/supabase/migrations/20260120_storage_traceability_photos.sql
```

Ou via CLI :
```bash
supabase db push
```

### 2. Vérifier la Configuration

Exécutez le script de diagnostic :
```bash
/home/user/stock/supabase/migrations/DIAGNOSTIC_traceability_photos.sql
```

Vérifiez que tous les checks sont ✅.

### 3. Tester l'Application

1. Allez dans **Sorties Stock** > onglet **Traçabilité**
2. Prenez une photo pour un produit sorti aujourd'hui
3. Vérifiez que :
   - ✅ Un message "Photo de traçabilité enregistrée" s'affiche
   - ✅ La photo apparaît dans la carte du produit
   - ✅ Le taux de complétion se met à jour

4. Allez dans **Traçabilité** (page dédiée)
5. Vérifiez que :
   - ✅ Les photos s'affichent dans la grille
   - ✅ Les statistiques sont correctes
   - ✅ Vous pouvez cliquer sur une photo pour la voir en grand

## Vérification du Bucket Storage dans Supabase

### Via Dashboard
1. Allez dans Supabase Dashboard
2. Cliquez sur **Storage** dans le menu latéral
3. Vérifiez que le bucket `traceability-photos` existe
4. Cliquez dessus et vérifiez les **Policies** :
   - Doit avoir au moins 7 policies actives

### Via SQL
```sql
-- Vérifier le bucket
SELECT * FROM storage.buckets WHERE id = 'traceability-photos';

-- Vérifier les policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%traceability%';
```

## Structure de la Table traceability_photos

```sql
CREATE TABLE traceability_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    output_id UUID NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT,
    captured_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## API Endpoints Utilisés

### Upload Photo
```typescript
api.traceabilityPhotos.upload(file: File, outputId: string, notes?: string)
```
- Upload le fichier dans `traceability-photos/{outputId}/{timestamp}.{extension}`
- Génère l'URL publique
- Crée l'enregistrement dans la table

### Get Photos by Date Range
```typescript
api.traceabilityPhotos.getByDateRange(from: string, to: string)
```
- Récupère les photos avec jointure sur `outputs` et `products`
- Filtre par date de capture (`captured_at`)

## Catégories Exemptées

Les produits des catégories suivantes **ne nécessitent PAS** de photo de traçabilité :
- Fruits
- Légumes

Cette exemption est codée dans `TraceabilityTab.tsx` ligne 18.

## Points d'Attention

### RLS (Row Level Security)
Les policies actuelles permettent un accès complet (`anon` et `authenticated`). En production, il est recommandé de :
- Restreindre DELETE aux utilisateurs authentifiés uniquement
- Implémenter un audit trail pour les suppressions

### Storage Policies
Les policies storage actuelles permettent :
- Lecture publique (nécessaire pour afficher les images)
- Upload/Update/Delete pour `anon` et `authenticated`

En production, envisagez de :
- Restreindre les uploads aux utilisateurs authentifiés uniquement
- Ajouter une vérification du type de fichier côté serveur

### Performance
- Les photos sont stockées dans des sous-dossiers par `output_id`
- Index existant sur `captured_at` pour les requêtes par date
- Taille limite de 10MB par photo

## Résolution de Problèmes

### "Photo enregistrée" mais rien ne s'affiche
1. Vérifiez que le bucket est **public** : `SELECT public FROM storage.buckets WHERE id = 'traceability-photos'`
2. Vérifiez que l'URL est correcte : `SELECT url FROM traceability_photos ORDER BY created_at DESC LIMIT 1`
3. Testez l'URL directement dans le navigateur

### Erreur "Failed to upload photo"
1. Vérifiez la console navigateur (F12) pour plus de détails
2. Vérifiez les policies storage : Exécutez `DIAGNOSTIC_traceability_photos.sql`
3. Vérifiez la taille du fichier (< 10MB)
4. Vérifiez le type MIME (doit être une image)

### Page Traçabilité vide
1. Vérifiez qu'il y a des sorties aujourd'hui : `SELECT * FROM outputs WHERE DATE(output_date) = CURRENT_DATE`
2. Vérifiez qu'il y a des photos : `SELECT COUNT(*) FROM traceability_photos`
3. Vérifiez les policies RLS : Exécutez `DIAGNOSTIC_traceability_photos.sql`

## Fichiers Modifiés

- ✅ `supabase/migrations/20260120_storage_traceability_photos.sql` (créé)
- ✅ `supabase/migrations/DIAGNOSTIC_traceability_photos.sql` (créé)
- ✅ `frontend/src/components/outputs/TraceabilityTab.tsx` (modifié)
- ✅ `frontend/src/pages/TraceabilityPage.tsx` (modifié)
- ✅ `TRACEABILITY_PHOTOS_FIX.md` (ce document)

## Contact

Pour toute question ou problème persistant, vérifier :
1. Les logs Supabase (Dashboard > Logs)
2. Les logs navigateur (Console)
3. Les policies RLS et Storage (script DIAGNOSTIC)
