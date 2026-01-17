// =============================================
// StockPro - Application de Gestion des Stocks
// =============================================

// ============= Storage Module =============
const Storage = {
    KEYS: {
        PRODUCTS: 'stockpro_products',
        OUTPUTS: 'stockpro_outputs',
        DELIVERIES: 'stockpro_deliveries',
        PHOTOS: 'stockpro_photos',
        MENUS: 'stockpro_menus',
        SETTINGS: 'stockpro_settings'
    },

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Storage get error:', e);
            return [];
        }
    },

    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            if (e.name === 'QuotaExceededError') {
                App.showToast('Espace de stockage plein. Veuillez exporter vos données.', 'error');
            }
            return false;
        }
    },

    exportAll() {
        const data = {
            products: this.get(this.KEYS.PRODUCTS),
            outputs: this.get(this.KEYS.OUTPUTS),
            deliveries: this.get(this.KEYS.DELIVERIES),
            photos: this.get(this.KEYS.PHOTOS),
            menus: this.get(this.KEYS.MENUS),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    },

    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.products) this.set(this.KEYS.PRODUCTS, data.products);
            if (data.outputs) this.set(this.KEYS.OUTPUTS, data.outputs);
            if (data.deliveries) this.set(this.KEYS.DELIVERIES, data.deliveries);
            if (data.photos) this.set(this.KEYS.PHOTOS, data.photos);
            if (data.menus) this.set(this.KEYS.MENUS, data.menus);
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
};

// ============= Products Module =============
const Products = {
    getAll() {
        return Storage.get(Storage.KEYS.PRODUCTS);
    },

    getById(id) {
        return this.getAll().find(p => p.id === id);
    },

    save(product) {
        const products = this.getAll();
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index > -1) {
                products[index] = { ...products[index], ...product, lastUpdated: new Date().toISOString() };
            }
        } else {
            product.id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            product.createdAt = new Date().toISOString();
            product.lastUpdated = product.createdAt;
            products.push(product);
        }
        Storage.set(Storage.KEYS.PRODUCTS, products);
        return product;
    },

    delete(id) {
        const products = this.getAll().filter(p => p.id !== id);
        Storage.set(Storage.KEYS.PRODUCTS, products);
    },

    updateQuantity(id, delta) {
        const products = this.getAll();
        const index = products.findIndex(p => p.id === id);
        if (index > -1) {
            products[index].quantity = Math.max(0, (products[index].quantity || 0) + delta);
            products[index].lastUpdated = new Date().toISOString();
            Storage.set(Storage.KEYS.PRODUCTS, products);
        }
    },

    getCategories() {
        const products = this.getAll();
        return [...new Set(products.map(p => p.category).filter(Boolean))];
    },

    getDaysRemaining(product) {
        if (!product.avgConsumption || product.avgConsumption <= 0) return Infinity;
        return Math.floor(product.quantity / product.avgConsumption);
    },

    getStockStatus(product) {
        if (product.quantity <= 0) return 'critical';
        if (product.minStock && product.quantity <= product.minStock) return 'critical';
        if (product.minStock && product.quantity <= product.minStock * 1.5) return 'low';
        return 'ok';
    },

    getCriticalProducts() {
        return this.getAll().filter(p => this.getStockStatus(p) === 'critical');
    },

    getLowStockProducts() {
        return this.getAll().filter(p => ['critical', 'low'].includes(this.getStockStatus(p)));
    },

    getTotalValue() {
        return this.getAll().reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
    },

    getSuggestions() {
        return this.getAll()
            .filter(p => {
                if (!p.minStock) return false;
                return p.quantity < p.minStock * 2;
            })
            .map(p => ({
                product: p,
                suggestedQty: Math.max(0, (p.minStock * 3) - p.quantity)
            }));
    }
};

// ============= Outputs Module =============
const Outputs = {
    getAll() {
        return Storage.get(Storage.KEYS.OUTPUTS);
    },

    getByDate(date) {
        return this.getAll().filter(o => o.date === date);
    },

    getByDateRange(from, to) {
        return this.getAll().filter(o => o.date >= from && o.date <= to);
    },

    getTodayOutputs() {
        const today = new Date().toISOString().split('T')[0];
        return this.getByDate(today);
    },

    add(output) {
        const outputs = this.getAll();
        output.id = 'o_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        output.createdAt = new Date().toISOString();
        if (!output.date) output.date = new Date().toISOString().split('T')[0];
        outputs.push(output);
        Storage.set(Storage.KEYS.OUTPUTS, outputs);
        Products.updateQuantity(output.productId, -output.quantity);
        return output;
    },

    delete(id) {
        const outputs = this.getAll();
        const output = outputs.find(o => o.id === id);
        if (output) {
            Products.updateQuantity(output.productId, output.quantity);
        }
        Storage.set(Storage.KEYS.OUTPUTS, outputs.filter(o => o.id !== id));
    }
};

// ============= Deliveries Module =============
const Deliveries = {
    getAll() {
        return Storage.get(Storage.KEYS.DELIVERIES);
    },

    getById(id) {
        return this.getAll().find(d => d.id === id);
    },

    add(delivery) {
        const deliveries = this.getAll();
        delivery.id = 'd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        delivery.createdAt = new Date().toISOString();
        deliveries.push(delivery);
        Storage.set(Storage.KEYS.DELIVERIES, deliveries);

        // Update stock for each item
        if (delivery.items) {
            delivery.items.forEach(item => {
                Products.updateQuantity(item.productId, item.quantity);
            });
        }
        return delivery;
    },

    delete(id) {
        const deliveries = this.getAll();
        const delivery = deliveries.find(d => d.id === id);
        if (delivery && delivery.items) {
            delivery.items.forEach(item => {
                Products.updateQuantity(item.productId, -item.quantity);
            });
        }
        Storage.set(Storage.KEYS.DELIVERIES, deliveries.filter(d => d.id !== id));
    }
};

// ============= Photos Module =============
const Photos = {
    getAll() {
        return Storage.get(Storage.KEYS.PHOTOS);
    },

    getByType(type) {
        if (!type || type === 'all') return this.getAll();
        return this.getAll().filter(p => p.type === type);
    },

    add(photo) {
        const photos = this.getAll();
        photo.id = 'ph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        photo.createdAt = new Date().toISOString();
        photos.push(photo);
        Storage.set(Storage.KEYS.PHOTOS, photos);
        return photo;
    },

    delete(id) {
        const photos = this.getAll().filter(p => p.id !== id);
        Storage.set(Storage.KEYS.PHOTOS, photos);
    },

    async compressImage(file, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};

// ============= Menus Module =============
const Menus = {
    getAll() {
        return Storage.get(Storage.KEYS.MENUS);
    },

    getWeek(weekNumber, year) {
        return this.getAll().find(m => m.weekNumber === weekNumber && m.year === year);
    },

    save(menu) {
        const menus = this.getAll();
        const index = menus.findIndex(m => m.weekNumber === menu.weekNumber && m.year === menu.year);
        if (index > -1) {
            menus[index] = menu;
        } else {
            menu.id = 'm_' + Date.now();
            menus.push(menu);
        }
        Storage.set(Storage.KEYS.MENUS, menus);
        return menu;
    },

    getCurrentWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 604800000;
        return Math.ceil((diff / oneWeek) + 1);
    },

    getIngredientNeeds(menu) {
        const needs = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        days.forEach(day => {
            const meals = menu.days?.[day] || [];
            meals.forEach(meal => {
                (meal.ingredients || []).forEach(ing => {
                    if (needs[ing.productId]) {
                        needs[ing.productId].quantity += ing.quantity * (meal.servings || 1);
                    } else {
                        needs[ing.productId] = {
                            productId: ing.productId,
                            quantity: ing.quantity * (meal.servings || 1)
                        };
                    }
                });
            });
        });

        return Object.values(needs);
    }
};

// ============= App Core =============
const App = {
    currentTab: 'dashboard',
    currentWeek: Menus.getCurrentWeekNumber(),
    currentYear: new Date().getFullYear(),
    charts: {},
    deliveryPhotoData: null,
    photoData: null,

    init() {
        this.renderMainContent();
        this.bindEvents();
        this.updateDashboard();
        this.updateAlertBadge();

        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        setTimeout(() => {
            if (document.getElementById('outputDate')) document.getElementById('outputDate').value = today;
            if (document.getElementById('deliveryDate')) document.getElementById('deliveryDate').value = today;
            if (document.getElementById('outputsDateFrom')) document.getElementById('outputsDateFrom').value = monthAgo;
            if (document.getElementById('outputsDateTo')) document.getElementById('outputsDateTo').value = today;
            if (document.getElementById('analyticsFrom')) document.getElementById('analyticsFrom').value = monthAgo;
            if (document.getElementById('analyticsTo')) document.getElementById('analyticsTo').value = today;
            if (document.getElementById('todayDate')) document.getElementById('todayDate').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        }, 100);
    },

    renderMainContent() {
        const main = document.getElementById('mainContent');
        main.innerHTML = this.getTemplates();
    },

    getTemplates() {
        const I = window.Icons || {};
        return `
        <section class="tab-content active" id="tab-dashboard">
            <div class="page-header"><h1>Dashboard</h1><p class="subtitle">Vue d'ensemble de votre inventaire</p></div>
            <div class="alerts-banner" id="alertsBanner" style="display:none"><div class="alert-icon">${I.alert || ''}</div><div class="alert-content"><strong id="alertCount">0</strong> produit(s) en stock critique</div><button class="btn-view-alerts" id="btnViewAlerts">Voir</button></div>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon blue">${I.package || ''}</div><div class="stat-info"><span class="stat-value" id="totalProducts">0</span><span class="stat-label">Produits</span></div></div>
                <div class="stat-card"><div class="stat-icon green">${I.euro || ''}</div><div class="stat-info"><span class="stat-value" id="totalValue">0 €</span><span class="stat-label">Valeur Stock</span></div></div>
                <div class="stat-card"><div class="stat-icon orange">${I.logout || ''}</div><div class="stat-info"><span class="stat-value" id="todayOutputsCount">0</span><span class="stat-label">Sorties Aujourd'hui</span></div></div>
                <div class="stat-card"><div class="stat-icon red">${I.alert || ''}</div><div class="stat-info"><span class="stat-value" id="criticalCount">0</span><span class="stat-label">Stock Critique</span></div></div>
            </div>
            <div class="quick-actions"><h2>Actions Rapides</h2>
                <div class="actions-grid">
                    <button class="action-btn" id="quickAddProduct"><span class="action-icon">${I.plus || ''}</span><span>Ajouter Produit</span></button>
                    <button class="action-btn" id="quickAddOutput"><span class="action-icon">${I.logout || ''}</span><span>Sortie Stock</span></button>
                    <button class="action-btn" id="quickAddDelivery"><span class="action-icon">${I.truck || ''}</span><span>Nouvelle Livraison</span></button>
                    <button class="action-btn" id="quickScanOCR"><span class="action-icon">${I.scan || ''}</span><span>Scanner Bon</span></button>
                    <button class="action-btn highlight" id="quickExitMenu"><span class="action-icon">${I.zap || ''}</span><span>Sortie Rapide</span></button>
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-card"><h3>${I.clipboard || ''} Menu du Jour</h3><div id="todayMenuSummary"><p class="empty-state">Aucun menu défini</p></div></div>
                <div class="dashboard-card"><h3>${I.chart || ''} Évolution du Stock</h3><canvas id="stockChart"></canvas></div>
                <div class="dashboard-card full-width"><h3>${I.alert || ''} Produits à Surveiller</h3><div class="low-stock-list" id="lowStockList"><p class="empty-state">Tous les stocks sont OK</p></div></div>
            </div>
        </section>
        <section class="tab-content" id="tab-products">
            <div class="page-header">
                <h1>Gestion des Produits</h1>
                <div class="header-actions">
                    <button class="btn-secondary" id="btnExportStock">${I.download || ''} Exporter Stock</button>
                    <button class="btn-secondary" id="btnEmailStock">${I.mail || ''} Envoyer par Email</button>
                    <button class="btn-primary" id="btnAddProduct">${I.plus || ''} Ajouter</button>
                </div>
            </div>
            <div class="filters-bar">
                <div class="search-box"><span class="search-icon">${I.search || ''}</span><input type="text" id="searchProducts" placeholder="Rechercher..."></div>
                <select id="filterCategory" class="filter-select"><option value="">Toutes catégories</option></select>
                <select id="filterStock" class="filter-select"><option value="">Tous stocks</option><option value="critical">Critique</option><option value="low">Bas</option><option value="ok">OK</option></select>
            </div>
            <div class="table-container">
                <table class="data-table sortable-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-sort="name">Produit <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="category">Catégorie <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="quantity">Quantité <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="unit">Unité <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="minStock">Min <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="days">Jours <span class="sort-icon">↕</span></th>
                            <th class="sortable" data-sort="value">Valeur <span class="sort-icon">↕</span></th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productsTableBody"></tbody>
                </table>
            </div>
        </section>

        <section class="tab-content" id="tab-recipes">
            <div class="page-header"><h1>Fiches Recettes</h1>
                <div class="header-actions">
                    <button class="btn-secondary" id="btnScanRecipe">${I.camera || ''} Scanner une Fiche</button>
                    <button class="btn-primary" id="btnAddRecipe">${I.plus || ''} Nouvelle Recette</button>
                </div>
            </div>
            <div class="recipe-scan-section" id="recipeScanSection" style="display:none">
                <div class="scan-card">
                    <h3>${I.scan || ''} Scanner une Fiche Technique</h3>
                    <p>Prenez en photo votre fiche recette existante pour l'importer automatiquement</p>
                    <div class="scan-upload">
                        <input type="file" id="recipeScanInput" accept="image/*" hidden>
                        <button class="btn-scan" id="btnChooseRecipePhoto">${I.camera || ''} Choisir une photo</button>
                    </div>
                    <div class="scan-progress" id="recipeScanProgress" style="display:none">
                        <div class="progress-bar"><div class="progress-fill" id="recipeScanProgressFill"></div></div>
                        <span id="recipeScanStatus">Analyse de la fiche...</span>
                    </div>
                    <div class="scan-preview" id="recipeScanPreview" style="display:none">
                        <img id="recipePreviewImg" src="" alt="Aperçu">
                    </div>
                    <div class="scan-results" id="recipeScanResults" style="display:none">
                        <h4>${I.check || ''} Informations extraites</h4>
                        <div class="form-group">
                            <label>Nom de la recette</label>
                            <input type="text" id="scannedRecipeName" placeholder="Nom détecté...">
                        </div>
                        <div class="form-group">
                            <label>Nombre de portions</label>
                            <input type="number" id="scannedRecipePortions" value="1" min="1">
                        </div>
                        <h4>${I.package || ''} Ingrédients détectés</h4>
                        <div id="scannedIngredientsList" class="scanned-ingredients"></div>
                        <div class="form-actions">
                            <button class="btn-secondary" id="btnCancelRecipeScan">Annuler</button>
                            <button class="btn-primary" id="btnConfirmRecipeScan">${I.check || ''} Créer la Recette</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="filters-bar">
                <div class="search-box"><span class="search-icon">${I.search || ''}</span><input type="text" id="searchRecipes" placeholder="Rechercher une recette..."></div>
                <select id="filterDietary" class="filter-select"><option value="">Tous régimes</option></select>
            </div>
            <div class="recipes-grid" id="recipesGrid"><p class="empty-state">Aucune recette. Scannez ou créez votre première fiche recette.</p></div>
        </section>

        <section class="tab-content" id="tab-outputs">
            <div class="page-header"><h1>Sorties Journalières</h1>
                <div class="header-actions">
                    <button class="btn-secondary" id="btnQuickExit">${I.zap || ''} Sortie Rapide</button>
                    <button class="btn-primary" id="btnAddOutput">${I.plus || ''} Nouvelle</button>
                </div>
            </div>
            <div class="today-section"><h2>${I.calendar || ''} Sorties du <span id="todayDate"></span></h2><div class="outputs-grid" id="todayOutputsList"><p class="empty-state">Aucune sortie aujourd'hui</p></div></div>
            <div class="history-section"><h2>${I.clipboard || ''} Historique</h2><div class="date-filter"><input type="date" id="outputsDateFrom" class="date-input"><span>à</span><input type="date" id="outputsDateTo" class="date-input"><button class="btn-secondary" id="btnFilterOutputs">Filtrer</button></div><div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Motif</th><th>Actions</th></tr></thead><tbody id="outputsHistoryBody"></tbody></table></div></div>
        </section>
        <section class="tab-content" id="tab-deliveries">
            <div class="page-header"><h1>Gestion des Livraisons</h1><button class="btn-primary" id="btnAddDelivery">${I.plus || ''} Nouvelle</button></div>
            <div class="ocr-section"><div class="ocr-card"><h3>${I.scan || ''} Scanner un Bon (OCR)</h3><p>Uploadez une photo pour extraction automatique et ajout en stock</p><div class="ocr-upload"><input type="file" id="ocrInput" accept="image/*" hidden><button class="btn-ocr" id="btnOCR">${I.camera || ''} Choisir image</button><div class="ocr-progress" id="ocrProgress" style="display:none"><div class="progress-bar"><div class="progress-fill" id="ocrProgressFill"></div></div><span id="ocrStatus">Analyse...</span></div></div><div class="ocr-result" id="ocrResult" style="display:none"><h4>Produits détectés :</h4><div id="ocrMatchedItems"></div><button class="btn-primary" id="btnConfirmOCR">${I.check || ''} Valider et Ajouter au Stock</button></div></div></div>
            <div class="deliveries-list"><h2>${I.truck || ''} Livraisons Récentes</h2><div class="deliveries-grid" id="deliveriesGrid"><p class="empty-state">Aucune livraison</p></div></div>
        </section>
        <section class="tab-content" id="tab-photos">
            <div class="page-header"><h1>Galerie Photos</h1><button class="btn-primary" id="btnAddPhoto">${I.camera || ''} Ajouter</button></div>
            <div class="photo-filters"><button class="filter-btn active" data-filter="all">Toutes</button><button class="filter-btn" data-filter="stock">Stock</button><button class="filter-btn" data-filter="delivery">Bons</button><button class="filter-btn" data-filter="recipe">Recettes</button></div>
            <div class="photo-gallery" id="photoGallery"><p class="empty-state">Aucune photo</p></div>
        </section>
        <section class="tab-content" id="tab-menus">
            <div class="page-header"><h1>Menus Clinique</h1><div class="date-navigation"><button class="btn-icon" id="prevDay">${I.chevronLeft || ''}</button><input type="date" id="menuDate" class="date-input"><button class="btn-icon" id="nextDay">${I.chevronRight || ''}</button></div></div>
            <div class="clinic-menu-grid">
                <div class="menu-section patients">
                    <div class="menu-header"><h2>${I.users || ''} Repas Patients</h2></div>
                    <div class="menu-card" id="patientLunchCard">
                        <h3>Déjeuner</h3>
                        <div class="menu-content" id="patientLunchContent"><p class="empty-state">Non défini</p></div>
                        <button class="btn-edit-menu" data-meal="patientLunch">${I.edit || ''}</button>
                    </div>
                    <div class="menu-card" id="patientDinnerCard">
                        <h3>Dîner</h3>
                        <div class="menu-content" id="patientDinnerContent"><p class="empty-state">Non défini</p></div>
                        <button class="btn-edit-menu" data-meal="patientDinner">${I.edit || ''}</button>
                    </div>
                </div>
                <div class="menu-section staff">
                    <div class="menu-header"><h2>${I.user || ''} Repas Personnel</h2></div>
                    <div class="menu-card" id="staffLunchCard">
                        <h3>Déjeuner</h3>
                        <div class="menu-content" id="staffLunchContent"><p class="empty-state">Non défini</p></div>
                        <button class="btn-edit-menu" data-meal="staffLunch">${I.edit || ''}</button>
                    </div>
                </div>
                <div class="menu-section punctual">
                    <div class="menu-header"><h2>${I.clipboard || ''} Commandes Ponctuelles</h2><button class="btn-secondary" id="btnAddPunctual">${I.plus || ''}</button></div>
                    <div id="punctualOrdersList"><p class="empty-state">Aucune commande</p></div>
                </div>
            </div>
            <div class="menu-notes-section">
                <h3>${I.clipboard || ''} Notes du jour</h3>
                <textarea id="menuNotes" placeholder="Spécificités, régimes adaptés, remarques..."></textarea>
                <button class="btn-primary" id="btnSaveMenuNotes">${I.check || ''} Sauvegarder</button>
            </div>
            <div class="ingredients-section">
                <h2>${I.package || ''} Besoins en Ingrédients</h2>
                <div class="ingredients-list" id="clinicIngredientsList"><p class="empty-state">Définissez les menus pour voir les besoins</p></div>
                <button class="btn-primary" id="btnExecuteMenuExit">${I.zap || ''} Sortir les Ingrédients</button>
            </div>
        </section>
        <section class="tab-content" id="tab-suppliers">
            <div class="page-header"><h1>Gestion des Fournisseurs</h1><button class="btn-primary" id="btnAddSupplier">${I.plus || ''} Ajouter</button></div>
            <div class="order-reminders-banner" id="orderRemindersBanner" style="display:none">
                <div class="alert-icon">${I.alert || ''}</div>
                <div class="alert-content">
                    <strong>Rappel Commande !</strong>
                    <span id="orderRemindersText">Vous devez passer commande chez un fournisseur aujourd'hui.</span>
                </div>
            </div>
            <div class="suppliers-grid" id="suppliersGrid">
                <p class="empty-state">Aucun fournisseur enregistré. Ajoutez vos premiers fournisseurs.</p>
            </div>
        </section>
        <section class="tab-content" id="tab-analytics">

            <div class="page-header"><h1>Analytiques</h1><div class="date-range"><input type="date" id="analyticsFrom" class="date-input"><span>à</span><input type="date" id="analyticsTo" class="date-input"></div></div>
            <div class="analytics-stats">
                <div class="stat-card large"><div class="stat-icon purple">${I.chart || ''}</div><div class="stat-info"><span class="stat-value" id="totalMovements">0</span><span class="stat-label">Mouvements</span></div></div>
                <div class="stat-card large"><div class="stat-icon blue">${I.truck || ''}</div><div class="stat-info"><span class="stat-value" id="totalEntries">0</span><span class="stat-label">Entrées</span></div></div>
                <div class="stat-card large"><div class="stat-icon orange">${I.logout || ''}</div><div class="stat-info"><span class="stat-value" id="totalExits">0</span><span class="stat-label">Sorties</span></div></div>
            </div>
            <div class="charts-grid">
                <div class="chart-card"><h3>${I.chart || ''} Évolution</h3><canvas id="stockEvolutionChart"></canvas></div>
                <div class="chart-card"><h3>${I.package || ''} Par Catégorie</h3><canvas id="categoryChart"></canvas></div>
                <div class="chart-card"><h3>${I.chart || ''} Top Consommations</h3><canvas id="consumptionChart"></canvas></div>
                <div class="chart-card"><h3>${I.clipboard || ''} Prévisions</h3><div class="forecast-list" id="forecastList"><p class="empty-state">Pas assez de données</p></div></div>
            </div>
        </section>
        ${this.getModalsTemplate()}`;
    },

    getModalsTemplate() {
        const productOptions = Products.getAll().map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        return `
        <div class="modal" id="productModal"><div class="modal-overlay"></div><div class="modal-content">
            <div class="modal-header"><h2 id="productModalTitle">Ajouter un Produit</h2><button class="modal-close" data-close="productModal">✕</button></div>
            <form id="productForm" class="modal-form"><input type="hidden" id="productId">
                <div class="form-group"><label for="productName">Nom *</label><input type="text" id="productName" required placeholder="Ex: Tomates"></div>
                <div class="form-row"><div class="form-group"><label for="productCategory">Catégorie *</label><select id="productCategory" required><option value="">Sélectionner...</option><option value="Légumes">Légumes</option><option value="Fruits">Fruits</option><option value="Viandes">Viandes</option><option value="Poissons">Poissons</option><option value="Produits laitiers">Produits laitiers</option><option value="Épicerie sèche">Épicerie sèche</option><option value="Surgelés">Surgelés</option><option value="Boissons">Boissons</option><option value="Condiments">Condiments</option><option value="Autre">Autre</option></select></div><div class="form-group"><label for="productUnit">Unité *</label><select id="productUnit" required><option value="">Sélectionner...</option><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="cl">cl</option><option value="pièce">pièce</option><option value="boîte">boîte</option><option value="carton">carton</option><option value="bouteille">bouteille</option><option value="sachet">sachet</option></select></div></div>
                <div class="form-row"><div class="form-group"><label for="productQuantity">Quantité *</label><input type="number" id="productQuantity" required min="0" step="0.01" placeholder="0"></div><div class="form-group"><label for="productMinStock">Stock min</label><input type="number" id="productMinStock" min="0" step="0.01" placeholder="0"></div></div>
                <div class="form-row"><div class="form-group"><label for="productAvgConsumption">Conso./jour</label><input type="number" id="productAvgConsumption" min="0" step="0.01" placeholder="0"></div><div class="form-group"><label for="productPrice">Prix (€)</label><input type="number" id="productPrice" min="0" step="0.01" placeholder="0.00"></div></div>
                <div class="form-actions"><button type="button" class="btn-secondary" data-close="productModal">Annuler</button><button type="submit" class="btn-primary">Enregistrer</button></div>
            </form>
        </div></div>
        <div class="modal" id="outputModal"><div class="modal-overlay"></div><div class="modal-content">
            <div class="modal-header"><h2>Nouvelle Sortie</h2><button class="modal-close" data-close="outputModal">✕</button></div>
            <form id="outputForm" class="modal-form">
                <div class="form-group"><label for="outputProduct">Produit *</label><select id="outputProduct" required><option value="">Sélectionner...</option>${productOptions}</select><p class="stock-info" id="outputStockInfo"></p></div>
                <div class="form-group"><label for="outputQuantity">Quantité *</label><input type="number" id="outputQuantity" required min="0.01" step="0.01" placeholder="0"></div>
                <div class="form-group"><label for="outputReason">Motif</label><select id="outputReason"><option value="Service midi">Service midi</option><option value="Service soir">Service soir</option><option value="Perte">Perte</option><option value="Casse">Casse</option><option value="Péremption">Péremption</option><option value="Autre">Autre</option></select></div>
                <div class="form-group"><label for="outputDate">Date</label><input type="date" id="outputDate"></div>
                <div class="form-actions"><button type="button" class="btn-secondary" data-close="outputModal">Annuler</button><button type="submit" class="btn-primary">Enregistrer</button></div>
            </form>
        </div></div>
        <div class="modal" id="deliveryModal"><div class="modal-overlay"></div><div class="modal-content modal-large">
            <div class="modal-header"><h2>Nouvelle Livraison</h2><button class="modal-close" data-close="deliveryModal">✕</button></div>
            <form id="deliveryForm" class="modal-form"><input type="hidden" id="deliveryId">
                <div class="form-row"><div class="form-group"><label for="deliveryDate">Date *</label><input type="date" id="deliveryDate" required></div><div class="form-group"><label for="deliverySupplier">Fournisseur *</label><input type="text" id="deliverySupplier" required placeholder="Nom"></div></div>
                <div class="form-group"><label>Photo du bon</label><div class="photo-upload"><input type="file" id="deliveryPhoto" accept="image/*" hidden><button type="button" class="btn-upload" id="btnUploadDeliveryPhoto"><span>📷</span> Choisir</button><div class="photo-preview" id="deliveryPhotoPreview"></div></div></div>
                <div class="delivery-items"><h3>Articles</h3><div class="items-list" id="deliveryItemsList"></div><button type="button" class="btn-secondary" id="btnAddDeliveryItem"><span>➕</span> Ajouter article</button></div>
                <div class="delivery-total"><span>Total :</span><strong id="deliveryTotal">0.00 €</strong></div>
                <div class="form-actions"><button type="button" class="btn-secondary" data-close="deliveryModal">Annuler</button><button type="submit" class="btn-primary">Enregistrer</button></div>
            </form>
        </div></div>
        <div class="modal" id="photoModal"><div class="modal-overlay"></div><div class="modal-content">
            <div class="modal-header"><h2>Ajouter Photo</h2><button class="modal-close" data-close="photoModal">✕</button></div>
            <form id="photoForm" class="modal-form">
                <div class="form-group"><label>Photo *</label><div class="photo-upload"><input type="file" id="photoFile" accept="image/*" required hidden><button type="button" class="btn-upload" id="btnUploadPhoto"><span>📷</span> Choisir</button><div class="photo-preview" id="photoPreview"></div></div></div>
                <div class="form-group"><label for="photoType">Type</label><select id="photoType"><option value="stock">Stock</option><option value="delivery">Bon</option><option value="inventory">Inventaire</option></select></div>
                <div class="form-group"><label for="photoDescription">Description</label><input type="text" id="photoDescription" placeholder="Description"></div>
                <div class="form-actions"><button type="button" class="btn-secondary" data-close="photoModal">Annuler</button><button type="submit" class="btn-primary">Enregistrer</button></div>
            </form>
        </div></div>
        <div class="modal" id="mealModal"><div class="modal-overlay"></div><div class="modal-content">
            <div class="modal-header"><h2>Ajouter Plat</h2><button class="modal-close" data-close="mealModal">✕</button></div>
            <form id="mealForm" class="modal-form"><input type="hidden" id="mealDay"><input type="hidden" id="mealId">
                <div class="form-group"><label for="mealName">Nom *</label><input type="text" id="mealName" required placeholder="Ex: Poulet rôti"></div>
                <div class="form-row"><div class="form-group"><label for="mealType">Type</label><select id="mealType"><option value="lunch">Déjeuner</option><option value="dinner">Dîner</option></select></div><div class="form-group"><label for="mealServings">Couverts</label><input type="number" id="mealServings" min="1" value="1"></div></div>
                <div class="meal-ingredients"><h3>Ingrédients</h3><div class="ingredients-inputs" id="mealIngredientsList"></div><button type="button" class="btn-secondary" id="btnAddMealIngredient"><span>➕</span> Ajouter</button></div>
                <div class="form-actions"><button type="button" class="btn-secondary" data-close="mealModal">Annuler</button><button type="submit" class="btn-primary">Enregistrer</button></div>
            </form>
        </div></div>
        <div class="modal" id="photoViewerModal"><div class="modal-overlay"></div><div class="modal-content modal-fullscreen"><button class="modal-close light" data-close="photoViewerModal">✕</button><img id="photoViewerImage" src="" alt="Photo"></div></div>`;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span><button class="toast-close">✕</button>`;
        container.appendChild(toast);
        toast.querySelector('.toast-close').onclick = () => toast.remove();
        setTimeout(() => toast.remove(), 4000);
    },

    openModal(modalId) { document.getElementById(modalId).classList.add('active'); },
    closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); },

    switchTab(tabName) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        this.currentTab = tabName;
        if (tabName === 'dashboard') this.updateDashboard();
        else if (tabName === 'products') this.renderProducts();
        else if (tabName === 'outputs') this.renderOutputs();
        else if (tabName === 'deliveries') this.renderDeliveries();
        else if (tabName === 'photos') this.renderPhotos();
        else if (tabName === 'menus') this.renderMenus();
        else if (tabName === 'analytics') this.renderAnalytics();
        document.getElementById('sidebar').classList.remove('open');
    },

    updateAlertBadge() {
        const criticalCount = Products.getCriticalProducts().length;
        const badge = document.getElementById('alertBadge');
        if (badge) {
            badge.textContent = criticalCount;
            badge.style.display = criticalCount > 0 ? 'block' : 'none';
        }
    },

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); this.switchTab(item.dataset.tab); });
        });
        document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
        document.getElementById('sidebarClose').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));

        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-close]')) this.closeModal(e.target.dataset.close);
            if (e.target.matches('.modal-overlay')) e.target.closest('.modal').classList.remove('active');
        });

        document.getElementById('quickAddProduct')?.addEventListener('click', () => { this.resetProductForm(); this.openModal('productModal'); });
        document.getElementById('btnAddProduct')?.addEventListener('click', () => { this.resetProductForm(); this.openModal('productModal'); });
        document.getElementById('quickAddOutput')?.addEventListener('click', () => { this.prepareOutputModal(); this.openModal('outputModal'); });
        document.getElementById('btnAddOutput')?.addEventListener('click', () => { this.prepareOutputModal(); this.openModal('outputModal'); });
        document.getElementById('quickAddDelivery')?.addEventListener('click', () => { this.prepareDeliveryModal(); this.openModal('deliveryModal'); });
        document.getElementById('btnAddDelivery')?.addEventListener('click', () => { this.prepareDeliveryModal(); this.openModal('deliveryModal'); });
        document.getElementById('btnAddPhoto')?.addEventListener('click', () => { this.resetPhotoForm(); this.openModal('photoModal'); });

        document.getElementById('productForm')?.addEventListener('submit', (e) => this.handleProductSubmit(e));
        document.getElementById('outputForm')?.addEventListener('submit', (e) => this.handleOutputSubmit(e));
        document.getElementById('deliveryForm')?.addEventListener('submit', (e) => this.handleDeliverySubmit(e));
        document.getElementById('photoForm')?.addEventListener('submit', (e) => this.handlePhotoSubmit(e));
        document.getElementById('mealForm')?.addEventListener('submit', (e) => this.handleMealSubmit(e));

        document.getElementById('btnAddDeliveryItem')?.addEventListener('click', () => this.addDeliveryItemRow());
        document.getElementById('btnUploadPhoto')?.addEventListener('click', () => document.getElementById('photoFile').click());
        document.getElementById('photoFile')?.addEventListener('change', (e) => this.handlePhotoPreview(e, 'photoPreview', 'photo'));
        document.getElementById('btnUploadDeliveryPhoto')?.addEventListener('click', () => document.getElementById('deliveryPhoto').click());
        document.getElementById('deliveryPhoto')?.addEventListener('change', (e) => this.handlePhotoPreview(e, 'deliveryPhotoPreview', 'delivery'));

        document.getElementById('btnOCR')?.addEventListener('click', () => document.getElementById('ocrInput').click());
        document.getElementById('quickScanOCR')?.addEventListener('click', () => { this.switchTab('deliveries'); setTimeout(() => document.getElementById('ocrInput').click(), 100); });
        document.getElementById('ocrInput')?.addEventListener('change', (e) => this.handleOCR(e));

        document.getElementById('searchProducts')?.addEventListener('input', () => this.renderProducts());
        document.getElementById('filterCategory')?.addEventListener('change', () => this.renderProducts());
        document.getElementById('filterStock')?.addEventListener('change', () => this.renderProducts());
        document.getElementById('btnFilterOutputs')?.addEventListener('click', () => this.renderOutputsHistory());

        document.getElementById('outputProduct')?.addEventListener('change', (e) => {
            const product = Products.getById(e.target.value);
            if (product) document.getElementById('outputStockInfo').textContent = `Stock: ${product.quantity} ${product.unit}`;
        });

        document.getElementById('prevWeek')?.addEventListener('click', () => { this.currentWeek--; if (this.currentWeek < 1) { this.currentWeek = 52; this.currentYear--; } this.renderMenus(); });
        document.getElementById('nextWeek')?.addEventListener('click', () => { this.currentWeek++; if (this.currentWeek > 52) { this.currentWeek = 1; this.currentYear++; } this.renderMenus(); });
        document.getElementById('btnAddMealIngredient')?.addEventListener('click', () => this.addMealIngredientRow());
        document.getElementById('btnCheckStock')?.addEventListener('click', () => this.checkMenuStock());

        document.querySelectorAll('.photo-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.photo-filters .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderPhotos(btn.dataset.filter);
            });
        });

        document.getElementById('btnExportJSON')?.addEventListener('click', () => this.exportJSON());
        document.getElementById('btnExportExcel')?.addEventListener('click', () => this.exportExcel());
        document.getElementById('btnImport')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.handleImport(e));
        document.getElementById('btnViewAlerts')?.addEventListener('click', () => this.switchTab('products'));
    }
};
