// ============= Storage Module =============
// Handles localStorage operations for all data persistence

const Storage = {
    KEYS: {
        PRODUCTS: 'stockpro_products',
        OUTPUTS: 'stockpro_outputs',
        DELIVERIES: 'stockpro_deliveries',
        PHOTOS: 'stockpro_photos',
        MENUS: 'stockpro_menus',
        SETTINGS: 'stockpro_settings',
        SUPPLIERS: 'stockpro_suppliers',
        RECIPES: 'stockpro_recipes',
        CLINIC_MENUS: 'stockpro_clinic_menus',
        FORECASTS: 'stockpro_forecasts'
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
                if (window.App && App.showToast) {
                    App.showToast('Espace de stockage plein. Veuillez exporter vos données.', 'error');
                }
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
            suppliers: this.get(this.KEYS.SUPPLIERS),
            recipes: this.get(this.KEYS.RECIPES),
            clinicMenus: this.get(this.KEYS.CLINIC_MENUS),
            forecasts: this.get(this.KEYS.FORECASTS),
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
            if (data.suppliers) this.set(this.KEYS.SUPPLIERS, data.suppliers);
            if (data.recipes) this.set(this.KEYS.RECIPES, data.recipes);
            if (data.clinicMenus) this.set(this.KEYS.CLINIC_MENUS, data.clinicMenus);
            if (data.forecasts) this.set(this.KEYS.FORECASTS, data.forecasts);
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
};

// Export global
window.Storage = Storage;
