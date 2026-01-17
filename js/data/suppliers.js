// ============= Suppliers Module =============
// Handles suppliers management with categories and order reminders

const Suppliers = {
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
        return Storage.get(Storage.KEYS.SUPPLIERS);
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
        Storage.set(Storage.KEYS.SUPPLIERS, suppliers);
        return supplier;
    },

    delete(id) {
        const suppliers = this.getAll().filter(s => s.id !== id);
        Storage.set(Storage.KEYS.SUPPLIERS, suppliers);
    },

    // Get suppliers with order day today
    getTodayOrderReminders() {
        const today = new Date().getDay(); // 0=dimanche, 1=lundi, etc.
        const todayName = this.DAYS[today];
        return this.getAll().filter(s => s.orderDays && s.orderDays.includes(todayName));
    },

    // Get suppliers with delivery day today
    getTodayDeliveries() {
        const today = new Date().getDay();
        const todayName = this.DAYS[today];
        return this.getAll().filter(s => s.deliveryDays && s.deliveryDays.includes(todayName));
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

// Export global
window.Suppliers = Suppliers;
