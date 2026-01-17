# StockPro - Documentation Complète

## 📋 Table des matières

1. [Présentation](#présentation)
2. [Installation et Démarrage](#installation-et-démarrage)
3. [Architecture](#architecture)
4. [Fonctionnalités](#fonctionnalités)
5. [API Modules JavaScript](#api-modules-javascript)
6. [Structure des Fichiers](#structure-des-fichiers)
7. [Guide de Développement](#guide-de-développement)

---

## Présentation

**StockPro** est une application web de gestion des stocks conçue pour les établissements de restauration collective (cliniques, EHPAD, cantines). Elle permet de :

- 📦 Gérer l'inventaire des produits
- 📤 Suivre les sorties journalières
- 🚚 Enregistrer les livraisons
- 👨‍🍳 Créer et gérer des fiches recettes
- 🏢 Gérer les fournisseurs
- 📅 Planifier les menus clinique
- 📊 Analyser les consommations
- 📸 Scanner les bons de livraison (OCR)

### Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Stockage | localStorage (navigateur) |
| Graphiques | Chart.js |
| OCR | Tesseract.js |
| Export Excel | SheetJS (xlsx) |
| Icônes | Lucide Icons |

---

## Installation et Démarrage

### Prérequis
- Navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Serveur HTTP local (optionnel mais recommandé)

### Démarrage rapide

```bash
# Méthode 1: Avec Node.js
cd f:\Dev\stock
npx serve . -p 3000

# Méthode 2: Avec Python
python -m http.server 3000

# Méthode 3: Double-cliquer sur
start-server.bat
```

Puis ouvrir: `http://localhost:3000/index-modular.html`

### Fichiers d'entrée

| Fichier | Description |
|---------|-------------|
| `index.html` | Version originale (legacy) |
| `index-modular.html` | Version modulaire (recommandée) |
| `mobile.html` | Version mobile optimisée |

---

## Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                          │
│                    (Structure HTML + CSS)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      app.js (Core)                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Storage │  │Products │  │ Outputs │  │Deliveries│       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ Photos  │  │  Menus  │  │   App   │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   app-methods.js (UI)                       │
│  Toutes les méthodes de rendu et d'interaction utilisateur  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   app-clinic.js (Clinic)                    │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐  ┌───────────┐ │
│  │Suppliers│  │ Recipes │  │ ClinicMenus  │  │DailyForecast│
│  └─────────┘  └─────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      localStorage                           │
│                   (Persistance données)                     │
└─────────────────────────────────────────────────────────────┘
```

### Pattern de données

Chaque module de données suit le pattern CRUD standard :

```javascript
const Module = {
    STORAGE_KEY: 'stockpro_xxx',
    
    getAll() { /* Récupère tous les éléments */ },
    getById(id) { /* Récupère par ID */ },
    save(item) { /* Crée ou met à jour */ },
    delete(id) { /* Supprime */ }
};
```

---

## Fonctionnalités

### 1. Dashboard 📊

- **Vue d'ensemble** : Nombre de produits, valeur stock, sorties du jour
- **Alertes** : Produits en stock critique
- **Actions rapides** : Ajouter produit, sortie, livraison
- **Graphique** : Évolution du stock

### 2. Gestion des Produits 📦

| Fonction | Description |
|----------|-------------|
| Ajout/Modification | CRUD complet des produits |
| Catégories | Regroupement par catégorie |
| Stock critique | Alertes automatiques |
| Tri colonnes | Tri par nom, quantité, valeur, etc. |
| Export CSV | Téléchargement de l'inventaire |
| Export Email | Envoi par email |
| Ajustement rapide | +/- stock en un clic |

### 3. Sorties Journalières 📤

- Enregistrement des sorties par produit
- Historique avec filtrage par date
- Motifs : Service midi, Service soir, Perte, etc.
- Mise à jour automatique du stock

### 4. Livraisons 🚚

- Enregistrement multi-articles
- Photo du bon de livraison
- **OCR** : Scan automatique des bons
- Mise à jour automatique du stock

### 5. Fournisseurs 🏢

- Cartes expansibles par catégorie
- Logo personnalisé
- Jours de commande/livraison
- Rappels automatiques
- Suggestions de commande

### 6. Recettes 👨‍🍳

- Fiches recettes avec ingrédients
- Calcul automatique du coût
- Tags régimes (sans sel, mixé, etc.)
- Scan de fiches techniques (OCR)

### 7. Menus Clinique 📅

- Planning journalier (patients + personnel)
- Calcul des besoins en ingrédients
- Sortie rapide des ingrédients
- Prévisions de couverts

### 8. Analytiques 📈

- Graphiques d'évolution
- Répartition par catégorie
- Top consommations
- Prévisions de rupture
- Export JSON / Excel

### 9. Galerie Photos 📸

- Stockage local compressé
- Catégorisation (Stock, Bons, Recettes)
- Visionneuse plein écran

---

## API Modules JavaScript

### Storage

```javascript
// Récupérer des données
Storage.get('stockpro_products')  // → Array

// Sauvegarder des données
Storage.set('stockpro_products', data)  // → boolean

// Export complet
Storage.exportAll()  // → JSON string

// Import complet
Storage.importAll(jsonString)  // → boolean
```

### Products

```javascript
// CRUD
Products.getAll()           // → Array<Product>
Products.getById(id)        // → Product | undefined
Products.save(product)      // → Product
Products.delete(id)         // → void

// Quantités
Products.updateQuantity(id, delta)  // → void

// Helpers
Products.getCategories()    // → Array<string>
Products.getDaysRemaining(product)  // → number
Products.getStockStatus(product)    // → 'ok' | 'low' | 'critical'
Products.getCriticalProducts()      // → Array<Product>
Products.getLowStockProducts()      // → Array<Product>
Products.getTotalValue()            // → number
Products.getSuggestions()           // → Array<{product, suggestedQty}>
```

### Outputs

```javascript
Outputs.getAll()              // → Array<Output>
Outputs.getByDate(date)       // → Array<Output>
Outputs.getByDateRange(from, to)  // → Array<Output>
Outputs.getTodayOutputs()     // → Array<Output>
Outputs.add(output)           // → Output
Outputs.delete(id)            // → void
```

### Deliveries

```javascript
Deliveries.getAll()     // → Array<Delivery>
Deliveries.getById(id)  // → Delivery | undefined
Deliveries.add(delivery)  // → Delivery (met à jour stock auto)
Deliveries.delete(id)   // → void (restaure stock auto)
```

### Suppliers

```javascript
Suppliers.getAll()          // → Array<Supplier>
Suppliers.getById(id)       // → Supplier | undefined
Suppliers.save(supplier)    // → Supplier
Suppliers.delete(id)        // → void

// Helpers
Suppliers.getCategories()           // → Array<Category>
Suppliers.getCategoryById(id)       // → Category
Suppliers.getTodayOrderReminders()  // → Array<Supplier>
Suppliers.getTodayDeliveries()      // → Array<Supplier>
Suppliers.getOrderSuggestions(id)   // → Array<Suggestion>
Suppliers.hasOrderReminders()       // → boolean
```

### Recipes

```javascript
Recipes.getAll()          // → Array<Recipe>
Recipes.getById(id)       // → Recipe | undefined
Recipes.save(recipe)      // → Recipe
Recipes.delete(id)        // → void

// Calculs
Recipes.calculateCost(recipe)      // → number
Recipes.getCostPerPortion(recipe)  // → number
```

### ClinicMenus

```javascript
ClinicMenus.getAll()        // → Array<ClinicMenu>
ClinicMenus.getByDate(date) // → ClinicMenu | undefined
ClinicMenus.save(menu)      // → ClinicMenu
ClinicMenus.delete(date)    // → void
ClinicMenus.getTodayMenu()  // → ClinicMenu | undefined
ClinicMenus.calculateNeeds(menu)  // → Array<{productId, quantity}>
```

### App (Controller)

```javascript
// Navigation
App.switchTab(tabName)      // Changer d'onglet
App.currentTab              // Onglet actuel

// Modales
App.openModal(modalId)      // Ouvrir une modale
App.closeModal(modalId)     // Fermer une modale

// Notifications
App.showToast(message, type)  // type: 'info' | 'success' | 'error' | 'warning'

// Rendering
App.renderProducts()
App.renderOutputs()
App.renderDeliveries()
App.renderSuppliers()
App.renderRecipes()
App.renderMenus()
App.renderPhotos()
App.renderAnalytics()
App.updateDashboard()
App.updateAlertBadge()
```

---

## Structure des Fichiers

```
f:\Dev\stock\
├── index.html              # Point d'entrée (legacy)
├── index-modular.html      # Point d'entrée (recommandé)
├── mobile.html             # Version mobile
│
├── app.js                  # Core: Storage, Products, Outputs, Deliveries, Photos, Menus, App
├── app-methods.js          # UI: Toutes les méthodes de rendu
├── app-clinic.js           # Clinic: Suppliers, Recipes, ClinicMenus, DailyForecast
│
├── styles.css              # Styles principaux (~53KB)
├── mobile.css              # Styles mobile
│
├── js/                     # Modules JavaScript (refactoring)
│   ├── core/               # Modules fondamentaux
│   │   ├── storage.js
│   │   ├── icons.js
│   │   └── app.js
│   ├── data/               # Modules de données
│   │   ├── products.js
│   │   ├── outputs.js
│   │   └── ...
│   └── ui/                 # Modules d'interface
│       ├── dashboard.js
│       ├── products-ui.js
│       └── ...
│
├── docs/                   # Documentation
│   ├── README.md           # Ce fichier
│   └── database-schema.md  # Schéma de base de données
│
├── server/                 # Serveur Node.js (optionnel)
├── icons/                  # Icônes PWA
├── manifest.json           # Manifest PWA
└── service-worker.js       # Service Worker
```

---

## Guide de Développement

### Ajouter un nouveau champ à un produit

1. **Modifier le formulaire** dans `app.js` (méthode `getModalsTemplate`)
2. **Modifier le rendu** dans `app-methods.js` (méthode `renderProducts`)
3. **Mettre à jour la sauvegarde** dans `handleProductSubmit`

### Ajouter une nouvelle collection

1. **Créer le module** avec le pattern CRUD standard
2. **Ajouter la clé** dans `Storage.KEYS`
3. **Exporter globalement** : `window.MonModule = MonModule;`
4. **Documenter** dans `docs/database-schema.md`

### Conventions de code

- IDs : `{prefix}_{timestamp}_{random}`
- Dates : Format ISO pour stockage, `YYYY-MM-DD` pour les jours
- Modules : IIFE pour encapsulation
- Export global : via `window.NomModule`

### Debug

```javascript
// Voir toutes les données
console.log(Storage.exportAll());

// Voir un produit spécifique
console.log(Products.getById('p_xxx'));

// Vider le localStorage (attention!)
localStorage.clear();
```

---

## Support

- **Navigateurs supportés** : Chrome 80+, Firefox 75+, Edge 80+, Safari 13+
- **Stockage** : ~5-10 MB (limite localStorage)
- **PWA** : Installable sur mobile/desktop

---

*Documentation générée le 17 janvier 2024*
