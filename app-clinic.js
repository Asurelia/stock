// ============= StockPro Clinique - Modules V2 =============

// ============= Icons Helper =============
const Icons = {
    dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
    package: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>',
    chef: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></svg>',
    logout: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    truck: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h6a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
    camera: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16l4-8 4 4 6-8"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    alert: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    scan: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>',
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>',
    zap: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    euro: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg>',
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    upload: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
};

// ============= Dietary Tags =============
const DietaryTags = [
    { id: 'normal', label: 'Normal', color: '#10b981' },
    { id: 'sans-sel', label: 'Sans sel', color: '#3b82f6' },
    { id: 'mixe', label: 'Mixé', color: '#f59e0b' },
    { id: 'hache', label: 'Haché', color: '#8b5cf6' },
    { id: 'diabetique', label: 'Diabétique', color: '#ef4444' },
    { id: 'sans-gluten', label: 'Sans gluten', color: '#ec4899' },
    { id: 'vegetarien', label: 'Végétarien', color: '#14b8a6' },
    { id: 'sans-lactose', label: 'Sans lactose', color: '#6366f1' }
];

// ============= Suppliers Module =============
const Suppliers = {
    STORAGE_KEY: 'stockpro_suppliers',
    DAYS: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    CATEGORIES: [
        { id: 'fruits-legumes', label: 'Fruits & Légumes', icon: '🥬', color: '#10b981' },
        { id: 'viandes', label: 'Viandes & Volailles', icon: '🥩', color: '#ef4444' },
        { id: 'poissons', label: 'Poissons & Fruits de mer', icon: '🐟', color: '#3b82f6' },
        { id: 'produits-laitiers', label: 'Produits Laitiers', icon: '🧀', color: '#f59e0b' },
        { id: 'epicerie', label: 'Épicerie & Conserves', icon: '🥫', color: '#8b5cf6' },
        { id: 'boulangerie', label: 'Boulangerie & Pâtisserie', icon: '🥖', color: '#d97706' },
        { id: 'boissons', label: 'Boissons', icon: '🍷', color: '#ec4899' },
        { id: 'surgeles', label: 'Surgelés', icon: '❄️', color: '#06b6d4' },
        { id: 'hygiene', label: 'Hygiène & Entretien', icon: '🧴', color: '#6366f1' },
        { id: 'materiel', label: 'Matériel & Équipement', icon: '🔧', color: '#64748b' },
        { id: 'autre', label: 'Autre', icon: '📦', color: '#94a3b8' }
    ],

    getCategories() {
        return this.CATEGORIES;
    },

    getCategoryById(categoryId) {
        return this.CATEGORIES.find(c => c.id === categoryId) || this.CATEGORIES.find(c => c.id === 'autre');
    },

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    getById(id) {
        return this.getAll().find(s => s.id === id);
    },

    save(supplier) {
        const suppliers = this.getAll();
        if (supplier.id) {
            const index = suppliers.findIndex(s => s.id === supplier.id);
            if (index > -1) {
                suppliers[index] = { ...suppliers[index], ...supplier, updatedAt: new Date().toISOString() };
            }
        } else {
            supplier.id = 'sup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            supplier.createdAt = new Date().toISOString();
            suppliers.push(supplier);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(suppliers));
        return supplier;
    },

    delete(id) {
        const suppliers = this.getAll().filter(s => s.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(suppliers));
    },

    // Get suppliers with order day today
    getTodayOrderReminders() {
        const today = new Date().getDay(); // 0=dimanche, 1=lundi, etc.
        const todayName = this.DAYS[today];

        return this.getAll().filter(s =>
            s.orderDays && s.orderDays.includes(todayName)
        );
    },

    // Get suppliers with delivery day today
    getTodayDeliveries() {
        const today = new Date().getDay();
        const todayName = this.DAYS[today];

        return this.getAll().filter(s =>
            s.deliveryDays && s.deliveryDays.includes(todayName)
        );
    },

    // Get order suggestions for a supplier based on low stock products
    getOrderSuggestions(supplierId) {
        const supplier = this.getById(supplierId);
        if (!supplier || !supplier.productIds) return [];

        return supplier.productIds.map(productId => {
            const product = Products.getById(productId);
            if (!product) return null;

            const status = Products.getStockStatus(product);
            const daysRemaining = Products.getDaysRemaining(product);
            const suggestedQty = Products.getSuggestions().find(s => s.product.id === productId);

            return {
                product,
                status,
                daysRemaining,
                suggestedQty: suggestedQty?.suggestedQty || 0,
                needsOrder: status === 'critical' || status === 'low'
            };
        }).filter(s => s !== null);
    },

    // Check if today is an order day for any supplier
    hasOrderReminders() {
        return this.getTodayOrderReminders().length > 0;
    }
};

window.Suppliers = Suppliers;

// ============= Recipes Module =============
const Recipes = {
    STORAGE_KEY: 'stockpro_recipes',

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    getById(id) {
        return this.getAll().find(r => r.id === id);
    },

    save(recipe) {
        const recipes = this.getAll();
        if (recipe.id) {
            const index = recipes.findIndex(r => r.id === recipe.id);
            if (index > -1) {
                recipes[index] = { ...recipes[index], ...recipe, updatedAt: new Date().toISOString() };
            }
        } else {
            recipe.id = 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            recipe.createdAt = new Date().toISOString();
            recipes.push(recipe);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recipes));
        return recipe;
    },

    delete(id) {
        const recipes = this.getAll().filter(r => r.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recipes));
    },

    calculateCost(recipe) {
        if (!recipe.ingredients) return 0;
        let totalCost = 0;
        recipe.ingredients.forEach(ing => {
            const product = Products.getById(ing.productId);
            if (product && product.price) {
                totalCost += (ing.quantity || 0) * product.price;
            }
        });
        return totalCost;
    },

    getCostPerPortion(recipe) {
        const total = this.calculateCost(recipe);
        return recipe.portions > 0 ? total / recipe.portions : 0;
    }
};

// ============= Clinic Menus Module =============
const ClinicMenus = {
    STORAGE_KEY: 'stockpro_clinic_menus',

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    getByDate(date) {
        return this.getAll().find(m => m.date === date);
    },

    save(menu) {
        const menus = this.getAll();
        const index = menus.findIndex(m => m.date === menu.date);
        if (index > -1) {
            menus[index] = menu;
        } else {
            menu.id = 'cm_' + Date.now();
            menus.push(menu);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(menus));
        return menu;
    },

    delete(date) {
        const menus = this.getAll().filter(m => m.date !== date);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(menus));
    },

    getTodayMenu() {
        const today = new Date().toISOString().split('T')[0];
        return this.getByDate(today);
    },

    calculateNeeds(menu) {
        const needs = {};
        // Use forecast counts if available, otherwise use recipe portions
        const patientCount = menu.forecast?.patients || 0;
        const staffCount = menu.forecast?.staff || 0;

        const addRecipeNeeds = (recipeId, portionOverride) => {
            if (!recipeId) return;
            const recipe = Recipes.getById(recipeId);
            if (!recipe || !recipe.ingredients) return;

            const portions = portionOverride > 0 ? portionOverride : (recipe.portions || 1);
            const multiplier = portions / (recipe.portions || 1);

            recipe.ingredients.forEach(ing => {
                if (needs[ing.productId]) {
                    needs[ing.productId].quantity += ing.quantity * multiplier;
                } else {
                    needs[ing.productId] = {
                        productId: ing.productId,
                        quantity: ing.quantity * multiplier
                    };
                }
            });
        };

        // Patient meals - use patient forecast for portions
        if (menu.patientLunch) addRecipeNeeds(menu.patientLunch.recipeId, patientCount || menu.patientLunch.portions || 0);
        if (menu.patientDinner) addRecipeNeeds(menu.patientDinner.recipeId, patientCount || menu.patientDinner.portions || 0);

        // Staff meals - use staff forecast for portions
        if (menu.staffLunch) addRecipeNeeds(menu.staffLunch.recipeId, staffCount || menu.staffLunch.portions || 0);

        // Punctual orders
        if (menu.punctualOrders) {
            menu.punctualOrders.forEach(order => {
                addRecipeNeeds(order.recipeId, order.quantity || 0);
            });
        }

        return Object.values(needs);
    }
};

// ============= Daily Forecast Module =============
const DailyForecast = {
    STORAGE_KEY: 'stockpro_forecasts',

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    getByDate(date) {
        return this.getAll().find(f => f.date === date) || { date, patients: 0, staff: 0 };
    },

    save(forecast) {
        const forecasts = this.getAll();
        const index = forecasts.findIndex(f => f.date === forecast.date);
        if (index > -1) {
            forecasts[index] = forecast;
        } else {
            forecasts.push(forecast);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(forecasts));
        return forecast;
    },

    getWeekTotal(startDate) {
        let totalPatients = 0;
        let totalStaff = 0;
        const start = new Date(startDate);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const forecast = this.getByDate(dateStr);
            totalPatients += forecast.patients || 0;
            totalStaff += forecast.staff || 0;
        }

        return { totalPatients, totalStaff };
    }
};


// ============= Quick Exit Module =============
const QuickExit = {
    generateFromMenu(menu) {
        const needs = ClinicMenus.calculateNeeds(menu);
        return needs.map(n => {
            const product = Products.getById(n.productId);
            return {
                productId: n.productId,
                productName: product?.name || 'Inconnu',
                needed: n.quantity,
                currentStock: product?.quantity || 0,
                unit: product?.unit || '',
                checked: false
            };
        });
    },

    executeExit(items, reason = 'Menu du jour') {
        const today = new Date().toISOString().split('T')[0];
        items.filter(i => i.checked && i.quantity > 0).forEach(item => {
            Outputs.add({
                productId: item.productId,
                quantity: item.quantity,
                reason: reason,
                date: today
            });
        });
    }
};

// ============= Enhanced OCR Module =============
const EnhancedOCR = {
    async processDeliveryNote(imageFile) {
        return new Promise(async (resolve, reject) => {
            try {
                if (typeof Tesseract === 'undefined') {
                    reject(new Error('Tesseract.js non chargé'));
                    return;
                }

                const worker = await Tesseract.createWorker('fra');
                const { data: { text } } = await worker.recognize(imageFile);
                await worker.terminate();

                const lines = this.parseLines(text);
                const matchedItems = this.matchProducts(lines);

                resolve({
                    rawText: text,
                    lines: lines,
                    matchedItems: matchedItems
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    parseLines(text) {
        const lines = text.split('\n').filter(l => l.trim().length > 3);
        return lines.map(line => {
            // Try to extract quantity and product name
            const qtyMatch = line.match(/(\d+[\.,]?\d*)\s*(kg|g|L|cl|pce|bte|crt)?/i);
            const priceMatch = line.match(/(\d+[\.,]\d{2})\s*€?$/);

            return {
                raw: line.trim(),
                quantity: qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : null,
                unit: qtyMatch ? qtyMatch[2] : null,
                price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null,
                productName: line.replace(/[\d\.,]+\s*(kg|g|L|cl|pce|bte|crt|€)?/gi, '').trim()
            };
        }).filter(l => l.productName.length > 2);
    },

    matchProducts(parsedLines) {
        const products = Products.getAll();
        return parsedLines.map(line => {
            // Find best matching product
            let bestMatch = null;
            let bestScore = 0;

            products.forEach(product => {
                const score = this.similarityScore(line.productName.toLowerCase(), product.name.toLowerCase());
                if (score > bestScore && score > 0.3) {
                    bestScore = score;
                    bestMatch = product;
                }
            });

            return {
                ...line,
                matchedProduct: bestMatch,
                matchScore: bestScore,
                confirmed: false
            };
        });
    },

    similarityScore(str1, str2) {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        let matches = 0;

        words1.forEach(w1 => {
            if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
                matches++;
            }
        });

        return matches / Math.max(words1.length, words2.length);
    },

    createDeliveryFromMatches(matches, supplier, date, photoUrl) {
        const items = matches.filter(m => m.confirmed && m.matchedProduct).map(m => ({
            productId: m.matchedProduct.id,
            quantity: m.quantity || 0,
            price: m.price || 0
        }));

        return {
            date: date,
            supplier: supplier,
            photoUrl: photoUrl,
            items: items
        };
    }
};

// Export for global access
window.Icons = Icons;
window.DietaryTags = DietaryTags;
window.Recipes = Recipes;
window.ClinicMenus = ClinicMenus;
window.DailyForecast = DailyForecast;
window.QuickExit = QuickExit;
window.EnhancedOCR = EnhancedOCR;
