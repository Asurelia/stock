// ============= Menus Module =============
// Handles weekly menu planning

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

// Export global
window.Menus = Menus;
