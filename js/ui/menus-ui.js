// ============= Menus UI Module =============
// Handles weekly menu planning UI

(function () {
    App.renderMenus = function () {
        const weekLabel = document.getElementById('currentWeekLabel');
        if (weekLabel) weekLabel.textContent = `Semaine ${this.currentWeek} - ${this.currentYear}`;

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' };

        const menu = Menus.getWeek(this.currentWeek, this.currentYear) || { weekNumber: this.currentWeek, year: this.currentYear, days: {} };

        const container = document.getElementById('menuGrid');
        if (!container) return;

        container.innerHTML = days.map(day => {
            const meals = menu.days?.[day] || [];
            return `<div class="menu-day" data-day="${day}">
                <h3>${dayNames[day]}</h3>
                <div class="day-meals" id="${day}Meals">
                    ${meals.map(m => `<div class="meal-item">
                        <span>${m.name} (${m.servings}p)</span>
                        <button class="delete-meal" onclick="App.deleteMeal('${day}', '${m.id}')">✕</button>
                    </div>`).join('')}
                </div>
                <button class="btn-add-meal" onclick="App.openMealModal('${day}')">+ Ajouter plat</button>
            </div>`;
        }).join('');

        this.renderIngredientNeeds();
    };

    App.openMealModal = function (day) {
        document.getElementById('mealDay').value = day;
        document.getElementById('mealId').value = '';
        document.getElementById('mealForm').reset();
        document.getElementById('mealIngredientsList').innerHTML = '';
        this.addMealIngredientRow();
        this.openModal('mealModal');
    };

    App.addMealIngredientRow = function () {
        const container = document.getElementById('mealIngredientsList');
        const products = Products.getAll();
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <select class="meal-ingredient-product"><option value="">Produit...</option>${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
            <input type="number" class="meal-ingredient-qty" placeholder="Qté" min="0" step="0.01">
            <button type="button" class="remove-ingredient" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(row);
    };

    App.handleMealSubmit = function (e) {
        e.preventDefault();

        const day = document.getElementById('mealDay').value;
        const rows = document.querySelectorAll('.ingredient-row');
        const ingredients = [];
        rows.forEach(row => {
            const productId = row.querySelector('.meal-ingredient-product')?.value;
            const quantity = parseFloat(row.querySelector('.meal-ingredient-qty')?.value) || 0;
            if (productId && quantity > 0) {
                ingredients.push({ productId, quantity });
            }
        });

        const meal = {
            id: 'meal_' + Date.now(),
            name: document.getElementById('mealName').value,
            type: document.getElementById('mealType').value,
            servings: parseInt(document.getElementById('mealServings').value) || 1,
            ingredients: ingredients
        };

        let menu = Menus.getWeek(this.currentWeek, this.currentYear) || { weekNumber: this.currentWeek, year: this.currentYear, days: {} };
        if (!menu.days[day]) menu.days[day] = [];
        menu.days[day].push(meal);
        Menus.save(menu);

        this.closeModal('mealModal');
        this.showToast('Plat ajouté', 'success');
        this.renderMenus();
    };

    App.deleteMeal = function (day, mealId) {
        let menu = Menus.getWeek(this.currentWeek, this.currentYear);
        if (!menu) return;

        menu.days[day] = (menu.days[day] || []).filter(m => m.id !== mealId);
        Menus.save(menu);
        this.renderMenus();
    };

    App.renderIngredientNeeds = function () {
        const menu = Menus.getWeek(this.currentWeek, this.currentYear);
        const container = document.getElementById('ingredientsList');
        if (!container) return;

        if (!menu || Object.keys(menu.days).length === 0) {
            container.innerHTML = '<p class="empty-state">Ajoutez des plats pour voir les besoins</p>';
            return;
        }

        const needs = Menus.getIngredientNeeds(menu);
        if (needs.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun ingrédient défini</p>';
            return;
        }

        container.innerHTML = needs.map(n => {
            const product = Products.getById(n.productId);
            if (!product) return '';
            const missing = n.quantity > product.quantity;
            return `<div class="ingredient-item ${missing ? 'missing' : ''}">
                <span>${product.name}</span>
                <span>${n.quantity.toFixed(1)} ${product.unit} ${missing ? '⚠️' : '✓'}</span>
            </div>`;
        }).join('');
    };

    App.checkMenuStock = function () {
        const menu = Menus.getWeek(this.currentWeek, this.currentYear);
        if (!menu) {
            this.showToast('Aucun menu cette semaine', 'warning');
            return;
        }

        const needs = Menus.getIngredientNeeds(menu);
        const missing = needs.filter(n => {
            const product = Products.getById(n.productId);
            return product && n.quantity > product.quantity;
        });

        if (missing.length === 0) {
            this.showToast('✅ Tous les ingrédients sont disponibles !', 'success');
        } else {
            this.showToast(`⚠️ ${missing.length} ingrédient(s) manquant(s)`, 'warning');
        }
    };

    console.log('✅ Menus UI loaded');
})();
