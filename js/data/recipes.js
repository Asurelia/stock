// ============= Recipes Module =============
// Handles recipe management with cost calculation

const Recipes = {
    getAll() {
        return Storage.get(Storage.KEYS.RECIPES);
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
        Storage.set(Storage.KEYS.RECIPES, recipes);
        return recipe;
    },

    delete(id) {
        const recipes = this.getAll().filter(r => r.id !== id);
        Storage.set(Storage.KEYS.RECIPES, recipes);
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

// Export global
window.Recipes = Recipes;
