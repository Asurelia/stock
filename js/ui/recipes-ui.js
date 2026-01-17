// ============= Recipes UI Module =============
// Handles recipe management UI with OCR scanning

(function () {
    App.recipePhotoData = null;
    App.scannedRecipeData = null;

    App.renderRecipes = function () {
        const search = document.getElementById('searchRecipes')?.value?.toLowerCase() || '';
        const dietaryFilter = document.getElementById('filterDietary')?.value || '';

        let recipes = Recipes.getAll();

        if (search) recipes = recipes.filter(r => r.name.toLowerCase().includes(search));
        if (dietaryFilter) recipes = recipes.filter(r => (r.dietaryTags || []).includes(dietaryFilter));

        // Update dietary filter options
        const filterDietary = document.getElementById('filterDietary');
        if (filterDietary && filterDietary.options.length <= 1) {
            DietaryTags.forEach(tag => {
                const opt = document.createElement('option');
                opt.value = tag.id;
                opt.textContent = tag.label;
                filterDietary.appendChild(opt);
            });
        }

        const container = document.getElementById('recipesGrid');
        if (!container) return;

        if (recipes.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune recette. Créez votre première fiche recette.</p>';
            return;
        }

        container.innerHTML = recipes.map(r => {
            const cost = Recipes.getCostPerPortion(r);
            const tags = (r.dietaryTags || []).map(tagId => {
                const tag = DietaryTags.find(t => t.id === tagId);
                return tag ? `<span class="dietary-tag" style="background: ${tag.color}20; color: ${tag.color}">${tag.label}</span>` : '';
            }).join('');

            return `<div class="recipe-card" onclick="App.editRecipe('${r.id}')">
                ${r.photoUrl ? `<img class="recipe-card-image" src="${r.photoUrl}" alt="${r.name}">` : '<div class="recipe-card-image"></div>'}
                <div class="recipe-card-body">
                    <div class="recipe-card-title">${r.name}</div>
                    <div class="recipe-card-meta">
                        <span>${r.portions || 1} portions</span>
                        <span class="recipe-cost">${cost.toFixed(2)} €/p</span>
                    </div>
                    <div class="recipe-tags">${tags}</div>
                </div>
            </div>`;
        }).join('');
    };

    App.openRecipeModal = function () {
        document.getElementById('recipeForm')?.reset();
        document.getElementById('recipeId').value = '';
        const preview = document.getElementById('recipePhotoPreview');
        if (preview) preview.innerHTML = '';
        const ingredientsList = document.getElementById('recipeIngredientsList');
        if (ingredientsList) ingredientsList.innerHTML = '';
        this.recipePhotoData = null;
        this.addRecipeIngredientRow();
        this.openModal('recipeModal');
    };

    App.addRecipeIngredientRow = function () {
        const container = document.getElementById('recipeIngredientsList');
        if (!container) return;

        const products = Products.getAll();
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <select class="recipe-ingredient-product"><option value="">Produit...</option>${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
            <input type="number" class="recipe-ingredient-qty" placeholder="Qté" min="0" step="0.01">
            <button type="button" class="remove-ingredient" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(row);
    };

    App.handleRecipeSubmit = function (e) {
        e.preventDefault();

        const rows = document.querySelectorAll('#recipeIngredientsList .ingredient-row');
        const ingredients = [];
        rows.forEach(row => {
            const productId = row.querySelector('.recipe-ingredient-product')?.value;
            const quantity = parseFloat(row.querySelector('.recipe-ingredient-qty')?.value) || 0;
            if (productId && quantity > 0) {
                ingredients.push({ productId, quantity });
            }
        });

        const dietaryTags = [];
        document.querySelectorAll('#recipeDietaryTags input:checked').forEach(cb => {
            dietaryTags.push(cb.value);
        });

        const recipe = {
            id: document.getElementById('recipeId')?.value || null,
            name: document.getElementById('recipeName')?.value || '',
            portions: parseInt(document.getElementById('recipePortions')?.value) || 1,
            photoUrl: this.recipePhotoData || null,
            dietaryTags: dietaryTags,
            ingredients: ingredients,
            instructions: document.getElementById('recipeInstructions')?.value || ''
        };

        if (!recipe.name) {
            this.showToast('Veuillez entrer un nom de recette', 'error');
            return;
        }

        Recipes.save(recipe);
        this.closeModal('recipeModal');
        this.showToast(recipe.id ? 'Recette modifiée' : 'Recette ajoutée', 'success');
        this.renderRecipes();
    };

    App.editRecipe = function (id) {
        const recipe = Recipes.getById(id);
        if (!recipe) return;

        document.getElementById('recipeId').value = recipe.id;
        document.getElementById('recipeName').value = recipe.name || '';
        document.getElementById('recipePortions').value = recipe.portions || 1;
        const instructions = document.getElementById('recipeInstructions');
        if (instructions) instructions.value = recipe.instructions || '';

        if (recipe.photoUrl) {
            const preview = document.getElementById('recipePhotoPreview');
            if (preview) preview.innerHTML = `<img src="${recipe.photoUrl}">`;
            this.recipePhotoData = recipe.photoUrl;
        }

        document.querySelectorAll('#recipeDietaryTags input').forEach(cb => {
            cb.checked = (recipe.dietaryTags || []).includes(cb.value);
        });

        const container = document.getElementById('recipeIngredientsList');
        if (container) {
            container.innerHTML = '';
            (recipe.ingredients || []).forEach(ing => {
                this.addRecipeIngredientRow();
                const rows = container.querySelectorAll('.ingredient-row');
                const lastRow = rows[rows.length - 1];
                lastRow.querySelector('.recipe-ingredient-product').value = ing.productId;
                lastRow.querySelector('.recipe-ingredient-qty').value = ing.quantity;
            });
        }

        this.openModal('recipeModal');
    };

    App.deleteRecipe = function (id) {
        if (confirm('Supprimer cette recette ?')) {
            Recipes.delete(id);
            this.showToast('Recette supprimée', 'success');
            this.renderRecipes();
        }
    };

    App.toggleRecipeScan = function () {
        const section = document.getElementById('recipeScanSection');
        if (section) {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    };

    console.log('✅ Recipes UI loaded');
})();
