// ============= Clinic Menus Module =============
// Handles daily menu planning for clinic

const ClinicMenus = {
    getAll() {
        return Storage.get(Storage.KEYS.CLINIC_MENUS);
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
        Storage.set(Storage.KEYS.CLINIC_MENUS, menus);
        return menu;
    },

    delete(date) {
        const menus = this.getAll().filter(m => m.date !== date);
        Storage.set(Storage.KEYS.CLINIC_MENUS, menus);
    },

    getTodayMenu() {
        const today = new Date().toISOString().split('T')[0];
        return this.getByDate(today);
    },

    calculateNeeds(menu) {
        const needs = {};
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

        if (menu.patientLunch) addRecipeNeeds(menu.patientLunch.recipeId, patientCount || menu.patientLunch.portions || 0);
        if (menu.patientDinner) addRecipeNeeds(menu.patientDinner.recipeId, patientCount || menu.patientDinner.portions || 0);
        if (menu.staffLunch) addRecipeNeeds(menu.staffLunch.recipeId, staffCount || menu.staffLunch.portions || 0);

        if (menu.punctualOrders) {
            menu.punctualOrders.forEach(order => {
                addRecipeNeeds(order.recipeId, order.quantity || 0);
            });
        }

        return Object.values(needs);
    }
};

// ============= Daily Forecast Module =============
// Handles patient/staff count forecasts

const DailyForecast = {
    getAll() {
        return Storage.get(Storage.KEYS.FORECASTS);
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
        Storage.set(Storage.KEYS.FORECASTS, forecasts);
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
// Handles quick stock exits based on daily menu

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

// Export globals
window.ClinicMenus = ClinicMenus;
window.DailyForecast = DailyForecast;
window.QuickExit = QuickExit;
