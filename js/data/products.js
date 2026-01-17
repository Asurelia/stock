// ============= Products Module =============
// Handles product CRUD operations and stock calculations

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

// Export global
window.Products = Products;
