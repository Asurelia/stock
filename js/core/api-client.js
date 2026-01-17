// ============= API Client Module =============
// Handles communication with the backend API
// Falls back to localStorage if API is unavailable

(function () {
    // API sur le même serveur (Express sert le frontend ET l'API)
    const API_BASE = '/api';
    let apiAvailable = null; // null = unknown, true = available, false = unavailable

    // Check if API is available
    async function checkApiAvailability() {
        if (apiAvailable !== null) return apiAvailable;

        try {
            const response = await fetch(`${API_BASE}/products`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(2000)
            });
            apiAvailable = response.ok;
            console.log(apiAvailable ? '✅ API Backend connecté' : '⚠️ API Backend non disponible');
        } catch (e) {
            apiAvailable = false;
            console.log('⚠️ API Backend non disponible, utilisation localStorage');
        }
        return apiAvailable;
    }

    // Generic API request handler
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    // ============= API Client Object =============
    window.ApiClient = {
        API_BASE,

        // Check if API is ready
        async isAvailable() {
            return await checkApiAvailability();
        },

        // Reset availability check (useful for reconnection)
        resetAvailability() {
            apiAvailable = null;
        },

        // ============= Products =============
        products: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return Storage.get(Storage.KEYS.PRODUCTS);
                }
                try {
                    return await apiRequest('/products');
                } catch (e) {
                    console.error('API products.getAll failed:', e);
                    return Storage.get(Storage.KEYS.PRODUCTS);
                }
            },

            async getById(id) {
                const all = await this.getAll();
                return all.find(p => p.id === id);
            },

            async save(product) {
                if (!(await checkApiAvailability())) {
                    return Products.save(product);
                }
                try {
                    if (product.id) {
                        await apiRequest(`/products/${product.id}`, 'PUT', product);
                    } else {
                        product = await apiRequest('/products', 'POST', product);
                    }
                    // Also update localStorage for offline access
                    Products.save(product);
                    return product;
                } catch (e) {
                    console.error('API products.save failed:', e);
                    return Products.save(product);
                }
            },

            async delete(id) {
                if (!(await checkApiAvailability())) {
                    return Products.delete(id);
                }
                try {
                    await apiRequest(`/products/${id}`, 'DELETE');
                    Products.delete(id);
                } catch (e) {
                    console.error('API products.delete failed:', e);
                    Products.delete(id);
                }
            }
        },

        // ============= Outputs =============
        outputs: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return Storage.get(Storage.KEYS.OUTPUTS);
                }
                try {
                    return await apiRequest('/outputs');
                } catch (e) {
                    console.error('API outputs.getAll failed:', e);
                    return Storage.get(Storage.KEYS.OUTPUTS);
                }
            },

            async add(output) {
                if (!(await checkApiAvailability())) {
                    return Outputs.add(output);
                }
                try {
                    const result = await apiRequest('/outputs', 'POST', output);
                    Outputs.add(output); // Keep localStorage in sync
                    return result;
                } catch (e) {
                    console.error('API outputs.add failed:', e);
                    return Outputs.add(output);
                }
            },

            async delete(id) {
                if (!(await checkApiAvailability())) {
                    return Outputs.delete(id);
                }
                try {
                    await apiRequest(`/outputs/${id}`, 'DELETE');
                    Outputs.delete(id);
                } catch (e) {
                    console.error('API outputs.delete failed:', e);
                    Outputs.delete(id);
                }
            }
        },

        // ============= Deliveries =============
        deliveries: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return Storage.get(Storage.KEYS.DELIVERIES);
                }
                try {
                    return await apiRequest('/deliveries');
                } catch (e) {
                    console.error('API deliveries.getAll failed:', e);
                    return Storage.get(Storage.KEYS.DELIVERIES);
                }
            },

            async add(delivery) {
                if (!(await checkApiAvailability())) {
                    return Deliveries.add(delivery);
                }
                try {
                    const result = await apiRequest('/deliveries', 'POST', delivery);
                    Deliveries.add(delivery);
                    return result;
                } catch (e) {
                    console.error('API deliveries.add failed:', e);
                    return Deliveries.add(delivery);
                }
            },

            async delete(id) {
                if (!(await checkApiAvailability())) {
                    return Deliveries.delete(id);
                }
                try {
                    await apiRequest(`/deliveries/${id}`, 'DELETE');
                    Deliveries.delete(id);
                } catch (e) {
                    console.error('API deliveries.delete failed:', e);
                    Deliveries.delete(id);
                }
            }
        },

        // ============= Suppliers =============
        suppliers: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return Suppliers.getAll();
                }
                try {
                    return await apiRequest('/suppliers');
                } catch (e) {
                    console.error('API suppliers.getAll failed:', e);
                    return Suppliers.getAll();
                }
            },

            async save(supplier) {
                if (!(await checkApiAvailability())) {
                    return Suppliers.save(supplier);
                }
                try {
                    const result = await apiRequest('/suppliers', 'POST', supplier);
                    Suppliers.save(supplier);
                    return result;
                } catch (e) {
                    console.error('API suppliers.save failed:', e);
                    return Suppliers.save(supplier);
                }
            },

            async delete(id) {
                if (!(await checkApiAvailability())) {
                    return Suppliers.delete(id);
                }
                try {
                    await apiRequest(`/suppliers/${id}`, 'DELETE');
                    Suppliers.delete(id);
                } catch (e) {
                    console.error('API suppliers.delete failed:', e);
                    Suppliers.delete(id);
                }
            }
        },

        // ============= Recipes =============
        recipes: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return Recipes.getAll();
                }
                try {
                    return await apiRequest('/recipes');
                } catch (e) {
                    console.error('API recipes.getAll failed:', e);
                    return Recipes.getAll();
                }
            },

            async save(recipe) {
                if (!(await checkApiAvailability())) {
                    return Recipes.save(recipe);
                }
                try {
                    const result = await apiRequest('/recipes', 'POST', recipe);
                    Recipes.save(recipe);
                    return result;
                } catch (e) {
                    console.error('API recipes.save failed:', e);
                    return Recipes.save(recipe);
                }
            },

            async delete(id) {
                if (!(await checkApiAvailability())) {
                    return Recipes.delete(id);
                }
                try {
                    await apiRequest(`/recipes/${id}`, 'DELETE');
                    Recipes.delete(id);
                } catch (e) {
                    console.error('API recipes.delete failed:', e);
                    Recipes.delete(id);
                }
            }
        },

        // ============= Clinic Menus =============
        menus: {
            async getAll() {
                if (!(await checkApiAvailability())) {
                    return ClinicMenus.getAll();
                }
                try {
                    return await apiRequest('/menus');
                } catch (e) {
                    console.error('API menus.getAll failed:', e);
                    return ClinicMenus.getAll();
                }
            },

            async getByDate(date) {
                const all = await this.getAll();
                return all.find(m => m.date === date);
            },

            async save(menu) {
                if (!(await checkApiAvailability())) {
                    return ClinicMenus.save(menu);
                }
                try {
                    const result = await apiRequest('/menus', 'POST', menu);
                    ClinicMenus.save(menu);
                    return result;
                } catch (e) {
                    console.error('API menus.save failed:', e);
                    return ClinicMenus.save(menu);
                }
            }
        },

        // ============= Sync =============
        async sync() {
            if (!(await checkApiAvailability())) {
                console.log('Sync impossible: API non disponible');
                return false;
            }
            try {
                // Get all local data
                const localData = {
                    products: Storage.get(Storage.KEYS.PRODUCTS),
                    outputs: Storage.get(Storage.KEYS.OUTPUTS),
                    deliveries: Storage.get(Storage.KEYS.DELIVERIES)
                };

                // Send to server for sync
                const result = await apiRequest('/sync', 'POST', {
                    lastSync: localStorage.getItem('stockpro_last_sync'),
                    changes: localData
                });

                // Update last sync time
                localStorage.setItem('stockpro_last_sync', new Date().toISOString());

                console.log('✅ Synchronisation réussie');
                return true;
            } catch (e) {
                console.error('Sync failed:', e);
                return false;
            }
        },

        // ============= Export all data =============
        async exportAll() {
            if (!(await checkApiAvailability())) {
                return Storage.exportAll();
            }
            try {
                return await apiRequest('/export');
            } catch (e) {
                console.error('API export failed:', e);
                return Storage.exportAll();
            }
        },

        // ============= Today's reminders =============
        async getReminders() {
            if (!(await checkApiAvailability())) {
                return {
                    orderReminders: Suppliers.getTodayOrderReminders(),
                    deliveryReminders: Suppliers.getTodayDeliveries()
                };
            }
            try {
                return await apiRequest('/reminders');
            } catch (e) {
                console.error('API reminders failed:', e);
                return {
                    orderReminders: Suppliers.getTodayOrderReminders(),
                    deliveryReminders: Suppliers.getTodayDeliveries()
                };
            }
        }
    };

    console.log('✅ API Client loaded');
})();
