// ============= App Methods (Part 2) =============

// Dashboard Methods
App.updateDashboard = function () {
    const products = Products.getAll();
    const criticalProducts = Products.getCriticalProducts();
    const todayOutputs = Outputs.getTodayOutputs();

    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalValue').textContent = Products.getTotalValue().toFixed(2) + ' €';
    document.getElementById('todayOutputsCount').textContent = todayOutputs.length;
    document.getElementById('criticalCount').textContent = criticalProducts.length;

    // Alerts banner
    const alertsBanner = document.getElementById('alertsBanner');
    if (criticalProducts.length > 0) {
        alertsBanner.style.display = 'flex';
        document.getElementById('alertCount').textContent = criticalProducts.length;
    } else {
        alertsBanner.style.display = 'none';
    }

    // Low stock list
    const lowStockProducts = Products.getLowStockProducts();
    const lowStockList = document.getElementById('lowStockList');
    if (lowStockProducts.length > 0) {
        lowStockList.innerHTML = lowStockProducts.map(p => {
            const status = Products.getStockStatus(p);
            const days = Products.getDaysRemaining(p);
            const daysText = days === Infinity ? '-' : days + 'j';
            return `<div class="low-stock-item ${status === 'low' ? 'warning' : ''}">
                <span><strong>${p.name}</strong> - ${p.quantity} ${p.unit}</span>
                <span class="badge badge-${status}">${daysText}</span>
            </div>`;
        }).join('');
    } else {
        lowStockList.innerHTML = '<p class="empty-state">Tous les stocks sont OK</p>';
    }

    // Suggestions
    const suggestions = Products.getSuggestions();
    const suggestionsList = document.getElementById('suggestionsList');
    if (suggestions.length > 0) {
        suggestionsList.innerHTML = suggestions.slice(0, 5).map(s =>
            `<div class="suggestion-item">
                <span>${s.product.name}: +${s.suggestedQty.toFixed(1)} ${s.product.unit}</span>
                <button onclick="App.quickOrderSuggestion('${s.product.id}', ${s.suggestedQty})">Commander</button>
            </div>`
        ).join('');
    } else {
        suggestionsList.innerHTML = '<p class="empty-state">Aucune suggestion</p>';
    }

    this.renderDashboardChart();
};

App.renderDashboardChart = function () {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    if (this.charts.stock) this.charts.stock.destroy();

    const products = Products.getAll().slice(0, 8);
    this.charts.stock = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.name.substring(0, 10)),
            datasets: [{
                label: 'Stock actuel',
                data: products.map(p => p.quantity),
                backgroundColor: products.map(p => {
                    const status = Products.getStockStatus(p);
                    return status === 'critical' ? '#ef4444' : status === 'low' ? '#f59e0b' : '#10b981';
                }),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
};

// Products Methods
App.productSortColumn = 'name';
App.productSortDirection = 'asc';

App.renderProducts = function () {
    const search = document.getElementById('searchProducts')?.value?.toLowerCase() || '';
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const stockFilter = document.getElementById('filterStock')?.value || '';

    let products = Products.getAll();

    // Update category filter options (always refresh)
    const categories = Products.getCategories();
    const filterCat = document.getElementById('filterCategory');
    if (filterCat) {
        const currentValue = filterCat.value;
        filterCat.innerHTML = '<option value="">Toutes catégories</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.textContent = cat;
            if (cat === currentValue) opt.selected = true;
            filterCat.appendChild(opt);
        });
    }

    // Apply filters
    if (search) products = products.filter(p => p.name.toLowerCase().includes(search));
    if (categoryFilter) products = products.filter(p => p.category === categoryFilter);
    if (stockFilter) products = products.filter(p => Products.getStockStatus(p) === stockFilter);

    // Apply sorting
    products = this.sortProducts(products);

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun produit trouvé</td></tr>';
        return;
    }

    // Affichage plat quand on trie par autre chose que nom ou catégorie
    const useFlat = this.productSortColumn !== 'name' && this.productSortColumn !== 'category';

    let html = '';

    if (useFlat) {
        // Affichage plat - tri global visible
        products.forEach(p => {
            const status = Products.getStockStatus(p);
            const days = Products.getDaysRemaining(p);
            const daysText = days === Infinity ? '-' : days + 'j';
            const value = ((p.quantity || 0) * (p.price || 0)).toFixed(2);
            html += `<tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category || '-'}</td>
                <td><span class="badge badge-${status}">${p.quantity}</span></td>
                <td>${p.unit}</td>
                <td>${p.minStock || '-'}</td>
                <td>${daysText}</td>
                <td>${value} €</td>
                <td class="actions">
                    <button class="btn-sm btn-adjust" onclick="App.quickAdjustStock('${p.id}')" title="Ajuster stock">➖➕</button>
                    <button class="btn-sm btn-edit" onclick="App.editProduct('${p.id}')" title="Modifier">✏️</button>
                    <button class="btn-sm btn-delete" onclick="App.deleteProduct('${p.id}')" title="Supprimer">🗑️</button>
                </td>
            </tr>`;
        });
    } else {
        // Regroupement par catégorie
        const grouped = {};
        products.forEach(p => {
            const cat = p.category || 'Sans catégorie';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
        });

        const sortedCategories = Object.keys(grouped).sort();

        sortedCategories.forEach(category => {
            const catProducts = grouped[category];
            html += `<tr class="category-header-row">
                <td colspan="8">
                    <div class="category-header-cell">
                        <span class="category-name">${category}</span>
                        <span class="category-badge">${catProducts.length}</span>
                    </div>
                </td>
            </tr>`;

            catProducts.forEach(p => {
                const status = Products.getStockStatus(p);
                const days = Products.getDaysRemaining(p);
                const daysText = days === Infinity ? '-' : days + 'j';
                const value = ((p.quantity || 0) * (p.price || 0)).toFixed(2);
                html += `<tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.category || '-'}</td>
                    <td><span class="badge badge-${status}">${p.quantity}</span></td>
                    <td>${p.unit}</td>
                    <td>${p.minStock || '-'}</td>
                    <td>${daysText}</td>
                    <td>${value} €</td>
                    <td class="actions">
                        <button class="btn-sm btn-adjust" onclick="App.quickAdjustStock('${p.id}')" title="Ajuster stock">➖➕</button>
                        <button class="btn-sm btn-edit" onclick="App.editProduct('${p.id}')" title="Modifier">✏️</button>
                        <button class="btn-sm btn-delete" onclick="App.deleteProduct('${p.id}')" title="Supprimer">🗑️</button>
                    </td>
                </tr>`;
            });
        });
    }

    tbody.innerHTML = html;
    this.updateSortIcons();
};

App.sortProducts = function (products) {
    const col = this.productSortColumn;
    const dir = this.productSortDirection === 'asc' ? 1 : -1;

    return products.sort((a, b) => {
        let valA, valB;
        switch (col) {
            case 'name': valA = a.name?.toLowerCase() || ''; valB = b.name?.toLowerCase() || ''; break;
            case 'category': valA = a.category?.toLowerCase() || ''; valB = b.category?.toLowerCase() || ''; break;
            case 'quantity': valA = a.quantity || 0; valB = b.quantity || 0; break;
            case 'unit': valA = a.unit?.toLowerCase() || ''; valB = b.unit?.toLowerCase() || ''; break;
            case 'minStock': valA = a.minStock || 0; valB = b.minStock || 0; break;
            case 'days': valA = Products.getDaysRemaining(a); valB = Products.getDaysRemaining(b); break;
            case 'value': valA = (a.quantity || 0) * (a.price || 0); valB = (b.quantity || 0) * (b.price || 0); break;
            default: valA = a.name?.toLowerCase() || ''; valB = b.name?.toLowerCase() || '';
        }
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
};

App.sortProductsBy = function (column) {
    if (this.productSortColumn === column) {
        this.productSortDirection = this.productSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        this.productSortColumn = column;
        this.productSortDirection = 'asc';
    }
    this.renderProducts();
};

App.updateSortIcons = function () {
    document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            if (th.dataset.sort === this.productSortColumn) {
                icon.textContent = this.productSortDirection === 'asc' ? '↑' : '↓';
                th.classList.add('sorted');
            } else {
                icon.textContent = '↕';
                th.classList.remove('sorted');
            }
        }
    });
};

App.quickAdjustStock = function (productId) {
    const product = Products.getById(productId);
    if (!product) return;

    const delta = prompt(`Ajuster le stock de "${product.name}"\nQuantité actuelle: ${product.quantity} ${product.unit}\n\nEntrez la variation (ex: -5 ou +10):`);
    if (delta === null) return;

    const change = parseFloat(delta);
    if (isNaN(change)) {
        this.showToast('Valeur invalide', 'error');
        return;
    }

    Products.updateQuantity(productId, change);
    this.showToast(`Stock ajusté: ${change > 0 ? '+' : ''}${change} ${product.unit}`, 'success');
    this.renderProducts();
    this.updateDashboard();
};

App.resetProductForm = function () {
    document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
};

App.editProduct = function (id) {
    const product = Products.getById(id);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productUnit').value = product.unit || '';
    document.getElementById('productQuantity').value = product.quantity || 0;
    document.getElementById('productMinStock').value = product.minStock || '';
    document.getElementById('productAvgConsumption').value = product.avgConsumption || '';
    document.getElementById('productPrice').value = product.price || '';

    this.openModal('productModal');
};

App.handleProductSubmit = function (e) {
    e.preventDefault();
    const product = {
        id: document.getElementById('productId').value || null,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        unit: document.getElementById('productUnit').value,
        quantity: parseFloat(document.getElementById('productQuantity').value) || 0,
        minStock: parseFloat(document.getElementById('productMinStock').value) || 0,
        avgConsumption: parseFloat(document.getElementById('productAvgConsumption').value) || 0,
        price: parseFloat(document.getElementById('productPrice').value) || 0
    };

    Products.save(product);
    this.closeModal('productModal');
    this.showToast(product.id ? 'Produit modifié' : 'Produit ajouté', 'success');
    this.renderProducts();
    this.updateDashboard();
    this.updateAlertBadge();
    this.renderMainContent();
    this.bindEvents();
};

App.deleteProduct = function (id) {
    if (confirm('Supprimer ce produit ?')) {
        Products.delete(id);
        this.showToast('Produit supprimé', 'success');
        this.renderProducts();
        this.updateDashboard();
        this.updateAlertBadge();
    }
};

// Outputs Methods
App.renderOutputs = function () {
    this.renderTodayOutputs();
    this.renderOutputsHistory();
};

App.renderTodayOutputs = function () {
    const outputs = Outputs.getTodayOutputs();
    const container = document.getElementById('todayOutputsList');

    if (outputs.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune sortie aujourd\'hui</p>';
        return;
    }

    container.innerHTML = outputs.map(o => {
        const product = Products.getById(o.productId);
        return `<div class="output-card">
            <span class="product-name">${product?.name || 'Produit inconnu'}</span>
            <span class="quantity">-${o.quantity} ${product?.unit || ''}</span>
            <span class="reason">${o.reason || ''}</span>
        </div>`;
    }).join('');
};

App.renderOutputsHistory = function () {
    const from = document.getElementById('outputsDateFrom')?.value || '';
    const to = document.getElementById('outputsDateTo')?.value || '';

    let outputs = Outputs.getAll();
    if (from && to) outputs = Outputs.getByDateRange(from, to);

    outputs.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('outputsHistoryBody');
    if (outputs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun historique</td></tr>';
        return;
    }

    tbody.innerHTML = outputs.slice(0, 50).map(o => {
        const product = Products.getById(o.productId);
        return `<tr>
            <td>${new Date(o.date).toLocaleDateString('fr-FR')}</td>
            <td>${product?.name || 'Inconnu'}</td>
            <td class="badge badge-critical">-${o.quantity}</td>
            <td>${o.reason || '-'}</td>
            <td class="actions"><button class="btn-sm btn-delete" onclick="App.deleteOutput('${o.id}')">🗑️</button></td>
        </tr>`;
    }).join('');
};

App.prepareOutputModal = function () {
    const select = document.getElementById('outputProduct');
    const products = Products.getAll();
    select.innerHTML = '<option value="">Sélectionner...</option>' + products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('outputForm').reset();
    document.getElementById('outputDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('outputStockInfo').textContent = '';
};

App.handleOutputSubmit = function (e) {
    e.preventDefault();
    const output = {
        productId: document.getElementById('outputProduct').value,
        quantity: parseFloat(document.getElementById('outputQuantity').value) || 0,
        reason: document.getElementById('outputReason').value,
        date: document.getElementById('outputDate').value
    };

    if (!output.productId || output.quantity <= 0) {
        this.showToast('Veuillez remplir tous les champs', 'error');
        return;
    }

    Outputs.add(output);
    this.closeModal('outputModal');
    this.showToast('Sortie enregistrée', 'success');
    this.renderOutputs();
    this.updateDashboard();
    this.updateAlertBadge();
};

App.deleteOutput = function (id) {
    if (confirm('Annuler cette sortie ?')) {
        Outputs.delete(id);
        this.showToast('Sortie annulée', 'success');
        this.renderOutputs();
        this.updateDashboard();
    }
};

// Deliveries Methods
App.renderDeliveries = function () {
    const deliveries = Deliveries.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('deliveriesGrid');

    if (deliveries.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune livraison</p>';
        return;
    }

    container.innerHTML = deliveries.map(d => {
        const itemsCount = d.items?.length || 0;
        const total = d.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0) || 0;
        return `<div class="delivery-card">
            <div class="delivery-header">
                <span class="delivery-date">${new Date(d.date).toLocaleDateString('fr-FR')}</span>
                <span class="delivery-supplier">${d.supplier}</span>
            </div>
            <div class="delivery-items-preview">${itemsCount} article(s) - ${total.toFixed(2)} €</div>
            ${d.photoUrl ? `<img src="${d.photoUrl}" class="delivery-photo-thumb" onclick="App.viewPhoto('${d.photoUrl}')">` : ''}
            <button class="btn-sm btn-delete" style="margin-top:0.5rem" onclick="App.deleteDelivery('${d.id}')">Supprimer</button>
        </div>`;
    }).join('');
};

App.prepareDeliveryModal = function () {
    document.getElementById('deliveryForm').reset();
    document.getElementById('deliveryId').value = '';
    document.getElementById('deliveryDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('deliveryItemsList').innerHTML = '';
    document.getElementById('deliveryPhotoPreview').innerHTML = '';
    document.getElementById('deliveryTotal').textContent = '0.00 €';
    this.deliveryPhotoData = null;
    this.addDeliveryItemRow();
};

App.addDeliveryItemRow = function () {
    const container = document.getElementById('deliveryItemsList');
    const products = Products.getAll();
    const row = document.createElement('div');
    row.className = 'delivery-item-row';
    row.innerHTML = `
        <select class="delivery-product"><option value="">Produit...</option>${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
        <input type="number" class="delivery-qty" placeholder="Qté" min="0" step="0.01" oninput="App.updateDeliveryTotal()">
        <input type="number" class="delivery-price" placeholder="Prix" min="0" step="0.01" oninput="App.updateDeliveryTotal()">
        <button type="button" class="remove-item" onclick="this.parentElement.remove(); App.updateDeliveryTotal();">✕</button>
    `;
    container.appendChild(row);
};

App.updateDeliveryTotal = function () {
    const rows = document.querySelectorAll('.delivery-item-row');
    let total = 0;
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.delivery-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.delivery-price')?.value) || 0;
        total += qty * price;
    });
    document.getElementById('deliveryTotal').textContent = total.toFixed(2) + ' €';
};

App.handleDeliverySubmit = function (e) {
    e.preventDefault();

    const rows = document.querySelectorAll('.delivery-item-row');
    const items = [];
    rows.forEach(row => {
        const productId = row.querySelector('.delivery-product')?.value;
        const quantity = parseFloat(row.querySelector('.delivery-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.delivery-price')?.value) || 0;
        if (productId && quantity > 0) {
            items.push({ productId, quantity, price });
        }
    });

    const delivery = {
        date: document.getElementById('deliveryDate').value,
        supplier: document.getElementById('deliverySupplier').value,
        items: items,
        photoUrl: this.deliveryPhotoData || null
    };

    if (!delivery.date || !delivery.supplier) {
        this.showToast('Veuillez remplir la date et le fournisseur', 'error');
        return;
    }

    Deliveries.add(delivery);
    this.closeModal('deliveryModal');
    this.showToast('Livraison enregistrée', 'success');
    this.renderDeliveries();
    this.updateDashboard();
    this.updateAlertBadge();
};

App.deleteDelivery = function (id) {
    if (confirm('Supprimer cette livraison ?')) {
        Deliveries.delete(id);
        this.showToast('Livraison supprimée', 'success');
        this.renderDeliveries();
        this.updateDashboard();
    }
};

// Photos Methods
App.renderPhotos = function (filter = 'all') {
    const photos = Photos.getByType(filter);
    const container = document.getElementById('photoGallery');

    if (photos.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune photo</p>';
        return;
    }

    container.innerHTML = photos.map(p => `
        <div class="photo-card" onclick="App.viewPhoto('${p.dataUrl}')">
            <img src="${p.dataUrl}" alt="${p.description || 'Photo'}">
            <div class="overlay">
                <span>${p.description || p.type}</span>
                <span>${new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
        </div>
    `).join('');
};

App.resetPhotoForm = function () {
    document.getElementById('photoForm').reset();
    document.getElementById('photoPreview').innerHTML = '';
    this.photoData = null;
};

App.handlePhotoPreview = async function (e, previewId, target) {
    const file = e.target.files[0];
    if (!file) return;

    const compressed = await Photos.compressImage(file);
    const preview = document.getElementById(previewId);
    preview.innerHTML = `<img src="${compressed}">`;

    if (target === 'delivery') {
        this.deliveryPhotoData = compressed;
    } else {
        this.photoData = compressed;
    }
};

App.handlePhotoSubmit = function (e) {
    e.preventDefault();

    if (!this.photoData) {
        this.showToast('Veuillez sélectionner une photo', 'error');
        return;
    }

    const photo = {
        dataUrl: this.photoData,
        type: document.getElementById('photoType').value,
        description: document.getElementById('photoDescription').value
    };

    Photos.add(photo);
    this.closeModal('photoModal');
    this.showToast('Photo ajoutée', 'success');
    this.renderPhotos();
};

App.viewPhoto = function (url) {
    document.getElementById('photoViewerImage').src = url;
    this.openModal('photoViewerModal');
};

// OCR Methods
App.handleOCR = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const progress = document.getElementById('ocrProgress');
    const result = document.getElementById('ocrResult');
    const progressFill = document.getElementById('ocrProgressFill');
    const statusText = document.getElementById('ocrStatus');

    progress.style.display = 'block';
    result.style.display = 'none';

    try {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js non chargé');
        }

        const worker = await Tesseract.createWorker('fra', 1, {
            logger: m => {
                if (m.progress) {
                    progressFill.style.width = (m.progress * 100) + '%';
                    statusText.textContent = m.status || 'Traitement...';
                }
            }
        });

        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        document.getElementById('ocrText').textContent = text;
        result.style.display = 'block';
        this.showToast('Texte extrait avec succès', 'success');

    } catch (error) {
        console.error('OCR Error:', error);
        this.showToast('Erreur OCR: ' + error.message, 'error');
    } finally {
        progress.style.display = 'none';
    }
};

// Menus Methods
App.renderMenus = function () {
    document.getElementById('currentWeekLabel').textContent = `Semaine ${this.currentWeek} - ${this.currentYear}`;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' };

    const menu = Menus.getWeek(this.currentWeek, this.currentYear) || { weekNumber: this.currentWeek, year: this.currentYear, days: {} };

    const container = document.getElementById('menuGrid');
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

// Analytics Methods
App.renderAnalytics = function () {
    const outputs = Outputs.getAll();
    const deliveries = Deliveries.getAll();

    const totalEntries = deliveries.reduce((sum, d) => sum + (d.items?.length || 0), 0);
    const totalExits = outputs.length;

    document.getElementById('totalMovements').textContent = totalEntries + totalExits;
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('totalExits').textContent = totalExits;

    this.renderCategoryChart();
    this.renderConsumptionChart();
    this.renderForecast();
};

App.renderCategoryChart = function () {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (this.charts.category) this.charts.category.destroy();

    const products = Products.getAll();
    const categoryValues = {};
    products.forEach(p => {
        const value = (p.quantity || 0) * (p.price || 0);
        categoryValues[p.category] = (categoryValues[p.category] || 0) + value;
    });

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

    this.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryValues),
            datasets: [{
                data: Object.values(categoryValues),
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8', padding: 10 } } }
        }
    });
};

App.renderConsumptionChart = function () {
    const ctx = document.getElementById('consumptionChart');
    if (!ctx) return;

    if (this.charts.consumption) this.charts.consumption.destroy();

    const products = Products.getAll().sort((a, b) => (b.avgConsumption || 0) - (a.avgConsumption || 0)).slice(0, 6);

    this.charts.consumption = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: products.map(p => p.name.substring(0, 12)),
            datasets: [{
                label: 'Conso./jour',
                data: products.map(p => p.avgConsumption || 0),
                backgroundColor: '#6366f1',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
};

App.renderForecast = function () {
    const suggestions = Products.getSuggestions();
    const container = document.getElementById('forecastList');

    if (suggestions.length === 0) {
        container.innerHTML = '<p class="empty-state">Pas de commande à prévoir</p>';
        return;
    }

    container.innerHTML = suggestions.slice(0, 5).map(s => {
        const days = Products.getDaysRemaining(s.product);
        const daysText = days === Infinity ? '-' : days + ' jours';
        return `<div class="forecast-item">
            <span>${s.product.name}</span>
            <span>Stock: ${daysText}</span>
        </div>`;
    }).join('');
};

// Export/Import Methods
App.exportJSON = function () {
    const data = Storage.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockpro_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Export JSON réussi', 'success');
};

App.exportExcel = function () {
    if (typeof XLSX === 'undefined') {
        this.showToast('XLSX non disponible', 'error');
        return;
    }

    const products = Products.getAll();
    const wsData = [['Nom', 'Catégorie', 'Quantité', 'Unité', 'Stock Min', 'Conso/Jour', 'Prix', 'Valeur']];
    products.forEach(p => {
        wsData.push([p.name, p.category, p.quantity, p.unit, p.minStock || '', p.avgConsumption || '', p.price || '', ((p.quantity || 0) * (p.price || 0)).toFixed(2)]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
    XLSX.writeFile(wb, `inventaire_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showToast('Export Excel réussi', 'success');
};

App.handleImport = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            if (file.name.endsWith('.json')) {
                if (Storage.importAll(evt.target.result)) {
                    this.showToast('Import JSON réussi', 'success');
                    this.renderMainContent();
                    this.bindEvents();
                    this.updateDashboard();
                }
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                if (typeof XLSX === 'undefined') {
                    this.showToast('XLSX non disponible', 'error');
                    return;
                }
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                data.forEach(row => {
                    Products.save({
                        name: row['Nom'] || row.name,
                        category: row['Catégorie'] || row.category || 'Autre',
                        quantity: parseFloat(row['Quantité'] || row.quantity) || 0,
                        unit: row['Unité'] || row.unit || 'pièce',
                        minStock: parseFloat(row['Stock Min'] || row.minStock) || 0,
                        avgConsumption: parseFloat(row['Conso/Jour'] || row.avgConsumption) || 0,
                        price: parseFloat(row['Prix'] || row.price) || 0
                    });
                });

                this.showToast('Import Excel réussi', 'success');
                this.renderMainContent();
                this.bindEvents();
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Erreur d\'import: ' + error.message, 'error');
        }
    };

    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
};

App.quickOrderSuggestion = function (productId, qty) {
    this.showToast(`Commande suggérée: ${qty.toFixed(1)} unités`, 'info');
};

// ============= V2 Clinic Methods =============

// Recipes Methods
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
    if (recipes.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune recette. Créez votre première fiche recette.</p>';
        return;
    }

    const I = window.Icons || {};
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
    document.getElementById('recipePhotoPreview').innerHTML = '';
    document.getElementById('recipeIngredientsList').innerHTML = '';
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

    // Get selected dietary tags
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
    document.getElementById('recipeInstructions').value = recipe.instructions || '';

    // Photo preview
    if (recipe.photoUrl) {
        document.getElementById('recipePhotoPreview').innerHTML = `<img src="${recipe.photoUrl}">`;
        this.recipePhotoData = recipe.photoUrl;
    }

    // Dietary tags
    document.querySelectorAll('#recipeDietaryTags input').forEach(cb => {
        cb.checked = (recipe.dietaryTags || []).includes(cb.value);
    });

    // Ingredients
    const container = document.getElementById('recipeIngredientsList');
    container.innerHTML = '';
    (recipe.ingredients || []).forEach(ing => {
        this.addRecipeIngredientRow();
        const rows = container.querySelectorAll('.ingredient-row');
        const lastRow = rows[rows.length - 1];
        lastRow.querySelector('.recipe-ingredient-product').value = ing.productId;
        lastRow.querySelector('.recipe-ingredient-qty').value = ing.quantity;
    });

    this.openModal('recipeModal');
};

App.deleteRecipe = function (id) {
    if (confirm('Supprimer cette recette ?')) {
        Recipes.delete(id);
        this.showToast('Recette supprimée', 'success');
        this.renderRecipes();
    }
};

// Clinic Menus Methods
App.currentMenuDate = new Date().toISOString().split('T')[0];

App.renderClinicMenus = function () {
    document.getElementById('menuDate').value = this.currentMenuDate;

    const menu = ClinicMenus.getByDate(this.currentMenuDate) || { date: this.currentMenuDate };

    // Patient Lunch
    this.renderMenuMeal('patientLunchContent', menu.patientLunch);
    // Patient Dinner
    this.renderMenuMeal('patientDinnerContent', menu.patientDinner);
    // Staff Lunch
    this.renderMenuMeal('staffLunchContent', menu.staffLunch);

    // Punctual Orders
    const punctualContainer = document.getElementById('punctualOrdersList');
    if (menu.punctualOrders && menu.punctualOrders.length > 0) {
        punctualContainer.innerHTML = menu.punctualOrders.map((order, idx) => {
            const recipe = Recipes.getById(order.recipeId);
            return `<div class="punctual-order-item">
                <div class="order-details">
                    <div class="order-name">${recipe?.name || order.description || 'Commande'}</div>
                    <div class="order-qty">${order.quantity} portion(s)</div>
                </div>
                <button class="btn-sm btn-delete" onclick="App.deletePunctualOrder(${idx})">${Icons.trash || 'X'}</button>
            </div>`;
        }).join('');
    } else {
        punctualContainer.innerHTML = '<p class="empty-state">Aucune commande</p>';
    }

    // Notes
    document.getElementById('menuNotes').value = menu.notes || '';

    // Ingredient needs
    this.renderClinicIngredientNeeds();
};

App.renderMenuMeal = function (containerId, mealData) {
    const container = document.getElementById(containerId);
    if (!mealData || !mealData.recipeId) {
        container.innerHTML = '<p class="empty-state">Non défini</p>';
        return;
    }

    const recipe = Recipes.getById(mealData.recipeId);
    if (!recipe) {
        container.innerHTML = '<p class="empty-state">Recette non trouvée</p>';
        return;
    }

    const tags = (recipe.dietaryTags || []).map(tagId => {
        const tag = DietaryTags.find(t => t.id === tagId);
        return tag ? `<span class="dietary-tag" style="background: ${tag.color}20; color: ${tag.color}">${tag.label}</span>` : '';
    }).join('');

    container.innerHTML = `
        <div class="recipe-name">${recipe.name}</div>
        <div class="recipe-portions">${mealData.portions || recipe.portions} portions</div>
        <div class="dietary-tags">${tags}</div>
    `;
};

App.openMenuMealModal = function (mealType) {
    this.currentMealType = mealType;
    document.getElementById('menuMealForm')?.reset();

    // Populate recipe select
    const recipes = Recipes.getAll();
    const select = document.getElementById('menuMealRecipe');
    select.innerHTML = '<option value="">Sélectionner une recette...</option>' +
        recipes.map(r => `<option value="${r.id}">${r.name} (${r.portions}p)</option>`).join('');

    // Load existing data if any
    const menu = ClinicMenus.getByDate(this.currentMenuDate);
    if (menu && menu[mealType]) {
        select.value = menu[mealType].recipeId || '';
        document.getElementById('menuMealPortions').value = menu[mealType].portions || '';
    }

    this.openModal('menuMealModal');
};

App.handleMenuMealSubmit = function (e) {
    e.preventDefault();

    const recipeId = document.getElementById('menuMealRecipe').value;
    const portions = parseInt(document.getElementById('menuMealPortions').value) || 0;

    if (!recipeId) {
        this.showToast('Veuillez sélectionner une recette', 'error');
        return;
    }

    let menu = ClinicMenus.getByDate(this.currentMenuDate) || { date: this.currentMenuDate };
    menu[this.currentMealType] = { recipeId, portions };
    ClinicMenus.save(menu);

    this.closeModal('menuMealModal');
    this.showToast('Menu mis à jour', 'success');
    this.renderClinicMenus();
};

App.saveMenuNotes = function () {
    let menu = ClinicMenus.getByDate(this.currentMenuDate) || { date: this.currentMenuDate };
    menu.notes = document.getElementById('menuNotes').value;
    ClinicMenus.save(menu);
    this.showToast('Notes sauvegardées', 'success');
};

App.addPunctualOrder = function () {
    const recipes = Recipes.getAll();
    const recipeId = prompt('ID de la recette (ou nom):', '');
    const qty = parseInt(prompt('Nombre de portions:', '1')) || 1;

    if (!recipeId) return;

    let menu = ClinicMenus.getByDate(this.currentMenuDate) || { date: this.currentMenuDate };
    if (!menu.punctualOrders) menu.punctualOrders = [];
    menu.punctualOrders.push({ recipeId, quantity: qty, description: recipeId });
    ClinicMenus.save(menu);
    this.renderClinicMenus();
};

App.deletePunctualOrder = function (idx) {
    let menu = ClinicMenus.getByDate(this.currentMenuDate);
    if (!menu || !menu.punctualOrders) return;

    menu.punctualOrders.splice(idx, 1);
    ClinicMenus.save(menu);
    this.renderClinicMenus();
};

App.renderClinicIngredientNeeds = function () {
    const menu = ClinicMenus.getByDate(this.currentMenuDate);
    const container = document.getElementById('clinicIngredientsList');

    if (!menu) {
        container.innerHTML = '<p class="empty-state">Définissez les menus pour voir les besoins</p>';
        return;
    }

    const needs = ClinicMenus.calculateNeeds(menu);
    if (needs.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun ingrédient nécessaire</p>';
        return;
    }

    container.innerHTML = needs.map(n => {
        const product = Products.getById(n.productId);
        if (!product) return '';
        const available = product.quantity || 0;
        const missing = n.quantity > available;
        const statusClass = missing ? 'danger' : '';

        return `<div class="quick-exit-item">
            <input type="checkbox" id="ing_${n.productId}" ${!missing ? 'checked' : ''}>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="stock-status ${statusClass}">Stock: ${available} ${product.unit} | Besoin: ${n.quantity.toFixed(1)}</div>
            </div>
            <input type="number" class="exit-qty" data-product="${n.productId}" value="${Math.min(n.quantity, available).toFixed(1)}" min="0" step="0.1">
            <span>${product.unit}</span>
        </div>`;
    }).join('');
};

App.executeMenuExit = function () {
    const items = document.querySelectorAll('#clinicIngredientsList .quick-exit-item');
    let count = 0;

    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const qtyInput = item.querySelector('.exit-qty');
        const productId = qtyInput?.dataset.product;
        const quantity = parseFloat(qtyInput?.value) || 0;

        if (checkbox?.checked && productId && quantity > 0) {
            Outputs.add({
                productId,
                quantity,
                reason: 'Menu du ' + this.currentMenuDate,
                date: this.currentMenuDate
            });
            count++;
        }
    });

    if (count > 0) {
        this.showToast(`${count} sortie(s) enregistrée(s)`, 'success');
        this.updateDashboard();
        this.updateAlertBadge();
        this.renderClinicMenus();
    } else {
        this.showToast('Aucun produit sélectionné', 'warning');
    }
};

// Enhanced OCR Methods
App.handleEnhancedOCR = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const progress = document.getElementById('ocrProgress');
    const result = document.getElementById('ocrResult');
    const progressFill = document.getElementById('ocrProgressFill');
    const statusText = document.getElementById('ocrStatus');

    progress.style.display = 'block';
    result.style.display = 'none';

    try {
        progressFill.style.width = '20%';
        statusText.textContent = 'Analyse en cours...';

        const ocrResult = await EnhancedOCR.processDeliveryNote(file);

        progressFill.style.width = '100%';
        statusText.textContent = 'Terminé';

        // Display matched items
        const matchedContainer = document.getElementById('ocrMatchedItems');
        if (ocrResult.matchedItems && ocrResult.matchedItems.length > 0) {
            this.ocrMatchedData = ocrResult.matchedItems;

            matchedContainer.innerHTML = ocrResult.matchedItems.map((item, idx) => {
                const scoreClass = item.matchScore > 0.7 ? 'high' : item.matchScore > 0.4 ? 'medium' : 'low';
                const productName = item.matchedProduct?.name || 'Non trouvé';

                return `<div class="ocr-matched-item">
                    <input type="checkbox" id="ocrItem${idx}" ${item.matchScore > 0.5 ? 'checked' : ''} data-idx="${idx}">
                    <div>
                        <div class="ocr-product-name">${productName}</div>
                        <div class="ocr-detected-text">"${item.raw}"</div>
                    </div>
                    <input type="number" id="ocrQty${idx}" value="${item.quantity || 1}" min="0" step="0.1">
                    <span class="ocr-match-score ${scoreClass}">${Math.round(item.matchScore * 100)}%</span>
                </div>`;
            }).join('');

            result.style.display = 'block';
        } else {
            matchedContainer.innerHTML = '<p class="empty-state">Aucun produit détecté</p>';
            result.style.display = 'block';
        }

    } catch (error) {
        console.error('Enhanced OCR Error:', error);
        this.showToast('Erreur OCR: ' + error.message, 'error');
    } finally {
        progress.style.display = 'none';
    }
};

App.confirmOCRImport = function () {
    if (!this.ocrMatchedData) return;

    const items = [];
    this.ocrMatchedData.forEach((item, idx) => {
        const checkbox = document.getElementById(`ocrItem${idx}`);
        const qtyInput = document.getElementById(`ocrQty${idx}`);

        if (checkbox?.checked && item.matchedProduct) {
            items.push({
                productId: item.matchedProduct.id,
                quantity: parseFloat(qtyInput?.value) || item.quantity || 1,
                price: item.price || 0
            });
        }
    });

    if (items.length === 0) {
        this.showToast('Aucun produit sélectionné', 'warning');
        return;
    }

    // Create delivery
    const delivery = {
        date: new Date().toISOString().split('T')[0],
        supplier: 'Import OCR',
        items: items
    };

    Deliveries.add(delivery);
    this.showToast(`${items.length} produit(s) ajouté(s) au stock`, 'success');
    document.getElementById('ocrResult').style.display = 'none';
    this.ocrMatchedData = null;
    this.updateDashboard();
    this.updateAlertBadge();
    this.renderDeliveries();
};

// Quick Exit Methods
App.openQuickExitModal = function () {
    const menu = ClinicMenus.getTodayMenu();

    if (!menu) {
        this.showToast('Aucun menu défini pour aujourd\'hui', 'warning');
        return;
    }

    const items = QuickExit.generateFromMenu(menu);

    const container = document.getElementById('quickExitList');
    if (!container) {
        // Fallback if modal not exists yet
        this.switchTab('menus');
        return;
    }

    container.innerHTML = items.map(item => {
        const statusClass = item.needed > item.currentStock ? 'danger' : '';
        return `<div class="quick-exit-item">
            <input type="checkbox" checked data-product="${item.productId}">
            <div class="product-info">
                <div class="product-name">${item.productName}</div>
                <div class="stock-status ${statusClass}">Stock: ${item.currentStock} | Besoin: ${item.needed.toFixed(1)}</div>
            </div>
            <input type="number" class="quick-exit-qty" value="${Math.min(item.needed, item.currentStock).toFixed(1)}" min="0" step="0.1">
            <span>${item.unit}</span>
        </div>`;
    }).join('');

    this.openModal('quickExitModal');
};

App.executeQuickExit = function () {
    const items = document.querySelectorAll('#quickExitList .quick-exit-item');
    let count = 0;

    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const productId = checkbox?.dataset.product;
        const quantity = parseFloat(item.querySelector('.quick-exit-qty')?.value) || 0;

        if (checkbox?.checked && productId && quantity > 0) {
            Outputs.add({
                productId,
                quantity,
                reason: 'Sortie rapide menu',
                date: new Date().toISOString().split('T')[0]
            });
            count++;
        }
    });

    if (count > 0) {
        this.closeModal('quickExitModal');
        this.showToast(`${count} sortie(s) enregistrée(s)`, 'success');
        this.updateDashboard();
        this.updateAlertBadge();
    }
};

// Update Dashboard to show today's menu
App.renderTodayMenuSummary = function () {
    const menu = ClinicMenus.getTodayMenu();
    const container = document.getElementById('todayMenuSummary');
    if (!container) return;

    if (!menu) {
        container.innerHTML = '<p class="empty-state">Aucun menu défini</p>';
        return;
    }

    const getRecipeName = (mealData) => {
        if (!mealData?.recipeId) return null;
        return Recipes.getById(mealData.recipeId)?.name;
    };

    const patientLunch = getRecipeName(menu.patientLunch);
    const patientDinner = getRecipeName(menu.patientDinner);
    const staffLunch = getRecipeName(menu.staffLunch);

    let html = '';
    if (patientLunch) html += `<div><strong>Patients midi:</strong> ${patientLunch}</div>`;
    if (patientDinner) html += `<div><strong>Patients soir:</strong> ${patientDinner}</div>`;
    if (staffLunch) html += `<div><strong>Personnel:</strong> ${staffLunch}</div>`;

    container.innerHTML = html || '<p class="empty-state">Aucun menu défini</p>';
};

// Override updateDashboard to include menu summary
const originalUpdateDashboard = App.updateDashboard;
App.updateDashboard = function () {
    originalUpdateDashboard.call(this);
    this.renderTodayMenuSummary();
};

// Extend switchTab for new sections
const originalSwitchTab = App.switchTab;
App.switchTab = function (tabName) {
    originalSwitchTab.call(this, tabName);
    if (tabName === 'recipes') this.renderRecipes();
    else if (tabName === 'menus') this.renderClinicMenus();
};

// Extend bindEvents for V2
const originalBindEvents = App.bindEvents;
App.bindEvents = function () {
    originalBindEvents.call(this);

    // Recipes bindings
    document.getElementById('btnAddRecipe')?.addEventListener('click', () => this.openRecipeModal());
    document.getElementById('recipeForm')?.addEventListener('submit', (e) => this.handleRecipeSubmit(e));
    document.getElementById('btnAddRecipeIngredient')?.addEventListener('click', () => this.addRecipeIngredientRow());
    document.getElementById('btnUploadRecipePhoto')?.addEventListener('click', () => document.getElementById('recipePhoto')?.click());
    document.getElementById('recipePhoto')?.addEventListener('change', (e) => this.handlePhotoPreview(e, 'recipePhotoPreview', 'recipe'));
    document.getElementById('searchRecipes')?.addEventListener('input', () => this.renderRecipes());
    document.getElementById('filterDietary')?.addEventListener('change', () => this.renderRecipes());

    // Clinic Menus bindings
    document.getElementById('menuDate')?.addEventListener('change', (e) => {
        this.currentMenuDate = e.target.value;
        this.renderClinicMenus();
    });
    document.getElementById('prevDay')?.addEventListener('click', () => {
        const d = new Date(this.currentMenuDate);
        d.setDate(d.getDate() - 1);
        this.currentMenuDate = d.toISOString().split('T')[0];
        this.renderClinicMenus();
    });
    document.getElementById('nextDay')?.addEventListener('click', () => {
        const d = new Date(this.currentMenuDate);
        d.setDate(d.getDate() + 1);
        this.currentMenuDate = d.toISOString().split('T')[0];
        this.renderClinicMenus();
    });
    document.querySelectorAll('.btn-edit-menu').forEach(btn => {
        btn.addEventListener('click', () => this.openMenuMealModal(btn.dataset.meal));
    });
    document.getElementById('menuMealForm')?.addEventListener('submit', (e) => this.handleMenuMealSubmit(e));
    document.getElementById('btnSaveMenuNotes')?.addEventListener('click', () => this.saveMenuNotes());
    document.getElementById('btnAddPunctual')?.addEventListener('click', () => this.addPunctualOrder());
    document.getElementById('btnExecuteMenuExit')?.addEventListener('click', () => this.executeMenuExit());

    // Quick Exit bindings
    document.getElementById('quickExitMenu')?.addEventListener('click', () => this.openQuickExitModal());
    document.getElementById('btnQuickExit')?.addEventListener('click', () => this.openQuickExitModal());
    document.getElementById('btnExecuteQuickExit')?.addEventListener('click', () => this.executeQuickExit());

    // Enhanced OCR bindings
    document.getElementById('ocrInput')?.removeEventListener('change', this.handleOCR);
    document.getElementById('ocrInput')?.addEventListener('change', (e) => this.handleEnhancedOCR(e));
    document.getElementById('btnConfirmOCR')?.addEventListener('click', () => this.confirmOCRImport());

    // Suppliers bindings
    document.getElementById('btnAddSupplier')?.addEventListener('click', () => this.openSupplierModal());
    document.getElementById('supplierForm')?.addEventListener('submit', (e) => this.handleSupplierSubmit(e));
};

// ============= Suppliers Methods =============

App.expandedSupplier = null;

App.renderSuppliers = function () {
    const suppliers = Suppliers.getAll();
    const container = document.getElementById('suppliersGrid');
    const banner = document.getElementById('orderRemindersBanner');
    const categories = Suppliers.getCategories();

    // Check for order reminders
    const todayReminders = Suppliers.getTodayOrderReminders();
    if (todayReminders.length > 0) {
        banner.style.display = 'flex';
        const names = todayReminders.map(s => s.name).join(', ');
        document.getElementById('orderRemindersText').innerHTML =
            `<strong>Commandez aujourd'hui chez :</strong> ${names}`;
    } else {
        banner.style.display = 'none';
    }

    if (suppliers.length === 0) {
        container.innerHTML = `<p class="empty-state">Aucun fournisseur enregistré. Ajoutez vos premiers fournisseurs.</p>`;
        return;
    }

    const I = window.Icons || {};
    const daysLabels = { 'lundi': 'Lun', 'mardi': 'Mar', 'mercredi': 'Mer', 'jeudi': 'Jeu', 'vendredi': 'Ven', 'samedi': 'Sam', 'dimanche': 'Dim' };

    // Group suppliers by category
    const grouped = {};
    categories.forEach(cat => grouped[cat.id] = { category: cat, suppliers: [] });

    suppliers.forEach(s => {
        const catId = s.category || 'autre';
        if (!grouped[catId]) grouped[catId] = { category: Suppliers.getCategoryById(catId), suppliers: [] };
        grouped[catId].suppliers.push(s);
    });

    // Render grouped categories
    let html = '';

    Object.entries(grouped).forEach(([catId, data]) => {
        if (data.suppliers.length === 0) return;

        const cat = data.category;
        html += `
        <div class="supplier-category-group">
            <div class="category-header" style="--cat-color: ${cat.color}">
                <span class="category-icon">${cat.icon}</span>
                <span class="category-label">${cat.label}</span>
                <span class="category-count">${data.suppliers.length}</span>
            </div>
            <div class="category-suppliers">
        `;

        data.suppliers.forEach(s => {
            const isOrderDay = todayReminders.some(r => r.id === s.id);
            const isExpanded = this.expandedSupplier === s.id;
            const orderDaysHtml = (s.orderDays || []).map(d => `<span class="day-tag order">${daysLabels[d] || d}</span>`).join('');
            const deliveryDaysHtml = (s.deliveryDays || []).map(d => `<span class="day-tag delivery">${daysLabels[d] || d}</span>`).join('');

            html += `
            <div class="supplier-card-mini ${isOrderDay ? 'highlight-order' : ''} ${isExpanded ? 'expanded' : ''}" 
                 data-id="${s.id}" onclick="App.toggleSupplierCard('${s.id}')">
                <div class="supplier-mini-header">
                    <div class="supplier-logo" style="background: ${cat.color}20; color: ${cat.color}">
                        ${s.logoUrl ? `<img src="${s.logoUrl}" alt="${s.name}">` : cat.icon}
                    </div>
                    <div class="supplier-mini-info">
                        <h4>${s.name}</h4>
                        ${isOrderDay ? '<span class="order-badge">📞</span>' : ''}
                    </div>
                    <div class="supplier-expand-icon">${isExpanded ? '▲' : '▼'}</div>
                </div>
                
                <div class="supplier-expanded-content" style="display: ${isExpanded ? 'block' : 'none'}">
                    <div class="supplier-contact-info">
                        ${s.phone ? `<a href="tel:${s.phone}" class="contact-link"><span>📞</span>${s.phone}</a>` : ''}
                        ${s.email ? `<a href="mailto:${s.email}" class="contact-link"><span>✉️</span>${s.email}</a>` : ''}
                        ${s.contact ? `<div class="contact-person"><span>👤</span>${s.contact}</div>` : ''}
                    </div>
                    <div class="supplier-schedule-mini">
                        <div class="schedule-row-mini">
                            <span>Commande:</span>
                            <div class="days-tags">${orderDaysHtml || '<span class="empty">Non défini</span>'}</div>
                        </div>
                        <div class="schedule-row-mini">
                            <span>Livraison:</span>
                            <div class="days-tags">${deliveryDaysHtml || '<span class="empty">Non défini</span>'}</div>
                        </div>
                    </div>
                    ${s.notes ? `<div class="supplier-notes">${s.notes}</div>` : ''}
                    <div class="supplier-card-actions">
                        <button class="btn-edit-mini" onclick="event.stopPropagation(); App.editSupplier('${s.id}')">
                            ${I.edit || '✏️'} Modifier
                        </button>
                        <button class="btn-delete-mini" onclick="event.stopPropagation(); App.deleteSupplier('${s.id}')">
                            ${I.trash || '🗑️'}
                        </button>
                    </div>
                </div>
            </div>
            `;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
};

App.toggleSupplierCard = function (supplierId) {
    if (this.expandedSupplier === supplierId) {
        this.expandedSupplier = null;
    } else {
        this.expandedSupplier = supplierId;
    }
    this.renderSuppliers();
};


App.openSupplierModal = function (supplierId = null) {
    const form = document.getElementById('supplierForm');
    if (!form) {
        // Create modal dynamically if not exists
        this.createSupplierModal();
    }

    document.getElementById('supplierForm')?.reset();
    document.getElementById('supplierId').value = supplierId || '';
    document.getElementById('supplierModalTitle').textContent = supplierId ? 'Modifier Fournisseur' : 'Ajouter un Fournisseur';

    // Clear day checkboxes
    document.querySelectorAll('#supplierOrderDays input, #supplierDeliveryDays input').forEach(cb => cb.checked = false);

    if (supplierId) {
        const supplier = Suppliers.getById(supplierId);
        if (supplier) {
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierContact').value = supplier.contact || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';

            // Category
            if (document.getElementById('supplierCategory')) {
                document.getElementById('supplierCategory').value = supplier.category || 'autre';
            }

            // Logo
            if (supplier.logoUrl) {
                document.getElementById('supplierLogoUrl').value = supplier.logoUrl;
                const preview = document.getElementById('supplierLogoPreview');
                if (preview) preview.innerHTML = `<img src="${supplier.logoUrl}" alt="Logo">`;
            } else {
                const cat = Suppliers.getCategoryById(supplier.category);
                const preview = document.getElementById('supplierLogoPreview');
                if (preview) preview.innerHTML = `<span>${cat?.icon || '📦'}</span>`;
            }

            (supplier.orderDays || []).forEach(day => {
                const cb = document.querySelector(`#supplierOrderDays input[value="${day}"]`);
                if (cb) cb.checked = true;
            });

            (supplier.deliveryDays || []).forEach(day => {
                const cb = document.querySelector(`#supplierDeliveryDays input[value="${day}"]`);
                if (cb) cb.checked = true;
            });
        }
    }

    this.openModal('supplierModal');
};

App.createSupplierModal = function () {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const daysLabels = { 'lundi': 'Lun', 'mardi': 'Mar', 'mercredi': 'Mer', 'jeudi': 'Jeu', 'vendredi': 'Ven', 'samedi': 'Sam', 'dimanche': 'Dim' };
    const categories = Suppliers.getCategories();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'supplierModal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2 id="supplierModalTitle">Ajouter un Fournisseur</h2>
                <button class="modal-close" data-close="supplierModal">✕</button>
            </div>
            <form id="supplierForm" class="modal-form">
                <input type="hidden" id="supplierId">
                <input type="hidden" id="supplierLogoUrl">
                
                <div class="form-row">
                    <div class="form-group supplier-logo-upload">
                        <label>Logo</label>
                        <div class="logo-preview" id="supplierLogoPreview">
                            <span>📦</span>
                        </div>
                        <input type="file" id="supplierLogoInput" accept="image/*" hidden>
                        <button type="button" class="btn-sm" id="btnChooseSupplierLogo">Changer</button>
                    </div>
                    <div class="form-group" style="flex: 2">
                        <label for="supplierName">Nom du fournisseur *</label>
                        <input type="text" id="supplierName" required placeholder="Ex: Metro, Promocash...">
                        <div class="form-group" style="margin-top: 0.75rem">
                            <label for="supplierCategory">Catégorie</label>
                            <select id="supplierCategory">
                                ${categories.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="supplierPhone">Téléphone</label>
                        <input type="tel" id="supplierPhone" placeholder="01 23 45 67 89">
                    </div>
                    <div class="form-group">
                        <label for="supplierEmail">Email</label>
                        <input type="email" id="supplierEmail" placeholder="commande@fournisseur.fr">
                    </div>
                </div>

                <div class="form-group">
                    <label for="supplierContact">Nom du contact</label>
                    <input type="text" id="supplierContact" placeholder="Ex: Jean Dupont">
                </div>
                <div class="form-group">
                    <label>Jours de commande</label>
                    <div class="days-checkbox-group" id="supplierOrderDays">
                        ${days.map(d => `<label class="day-checkbox"><input type="checkbox" value="${d}"><span>${daysLabels[d]}</span></label>`).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>Jours de livraison</label>
                    <div class="days-checkbox-group" id="supplierDeliveryDays">
                        ${days.map(d => `<label class="day-checkbox"><input type="checkbox" value="${d}"><span>${daysLabels[d]}</span></label>`).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label for="supplierNotes">Notes</label>
                    <textarea id="supplierNotes" rows="2" placeholder="Infos supplémentaires..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" data-close="supplierModal">Annuler</button>
                    <button type="submit" class="btn-primary">Enregistrer</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Bind events for new modal
    modal.querySelector('.modal-overlay').addEventListener('click', () => this.closeModal('supplierModal'));
    modal.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => this.closeModal('supplierModal'));
    });
    modal.querySelector('#supplierForm').addEventListener('submit', (e) => this.handleSupplierSubmit(e));

    // Logo upload binding
    modal.querySelector('#btnChooseSupplierLogo')?.addEventListener('click', () => {
        document.getElementById('supplierLogoInput').click();
    });
    modal.querySelector('#supplierLogoInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('supplierLogoUrl').value = ev.target.result;
                const preview = document.getElementById('supplierLogoPreview');
                preview.innerHTML = `<img src="${ev.target.result}" alt="Logo">`;
            };
            reader.readAsDataURL(file);
        }
    });
};

App.handleSupplierSubmit = function (e) {
    e.preventDefault();

    const orderDays = [];
    document.querySelectorAll('#supplierOrderDays input:checked').forEach(cb => orderDays.push(cb.value));

    const deliveryDays = [];
    document.querySelectorAll('#supplierDeliveryDays input:checked').forEach(cb => deliveryDays.push(cb.value));

    const supplier = {
        id: document.getElementById('supplierId')?.value || null,
        name: document.getElementById('supplierName')?.value || '',
        category: document.getElementById('supplierCategory')?.value || 'autre',
        logoUrl: document.getElementById('supplierLogoUrl')?.value || '',
        phone: document.getElementById('supplierPhone')?.value || '',
        email: document.getElementById('supplierEmail')?.value || '',
        contact: document.getElementById('supplierContact')?.value || '',
        notes: document.getElementById('supplierNotes')?.value || '',
        orderDays: orderDays,
        deliveryDays: deliveryDays
    };

    if (!supplier.name) {
        this.showToast('Veuillez entrer un nom de fournisseur', 'error');
        return;
    }

    Suppliers.save(supplier);
    this.closeModal('supplierModal');
    this.showToast(supplier.id ? 'Fournisseur modifié' : 'Fournisseur ajouté', 'success');
    this.renderSuppliers();
};

App.editSupplier = function (id) {
    this.openSupplierModal(id);
};

App.deleteSupplier = function (id) {
    if (confirm('Supprimer ce fournisseur ?')) {
        Suppliers.delete(id);
        this.showToast('Fournisseur supprimé', 'success');
        this.renderSuppliers();
    }
};

// Extend switchTab for suppliers
const originalSwitchTabV3 = App.switchTab;
App.switchTab = function (tabName) {
    originalSwitchTabV3.call(this, tabName);
    if (tabName === 'suppliers') this.renderSuppliers();
};

// Check for order reminders on dashboard load
const originalUpdateDashboardV3 = App.updateDashboard;
App.updateDashboard = function () {
    originalUpdateDashboardV3.call(this);
    this.checkOrderReminders();
};

App.checkOrderReminders = function () {
    const reminders = Suppliers.getTodayOrderReminders();
    if (reminders.length > 0) {
        const names = reminders.map(s => s.name).join(', ');
        // Show reminder on dashboard
        const alertsBanner = document.getElementById('alertsBanner');
        if (alertsBanner) {
            const existingContent = alertsBanner.querySelector('.alert-content');
            if (existingContent && !existingContent.innerHTML.includes('Commander')) {
                existingContent.innerHTML += `<br><strong>📞 Commander aujourd'hui:</strong> ${names}`;
                alertsBanner.style.display = 'flex';
            }
        }
    }
};

// ============= Recipe Scanner Methods =============

App.scannedRecipeData = null;

App.toggleRecipeScan = function () {
    const section = document.getElementById('recipeScanSection');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        this.resetRecipeScan();
    } else {
        section.style.display = 'none';
    }
};

App.resetRecipeScan = function () {
    document.getElementById('recipeScanProgress').style.display = 'none';
    document.getElementById('recipeScanPreview').style.display = 'none';
    document.getElementById('recipeScanResults').style.display = 'none';
    document.getElementById('scannedRecipeName').value = '';
    document.getElementById('scannedRecipePortions').value = '1';
    document.getElementById('scannedIngredientsList').innerHTML = '';
    this.scannedRecipeData = null;
};

App.handleRecipeScan = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const progressSection = document.getElementById('recipeScanProgress');
    const previewSection = document.getElementById('recipeScanPreview');
    const resultsSection = document.getElementById('recipeScanResults');
    const progressFill = document.getElementById('recipeScanProgressFill');
    const statusText = document.getElementById('recipeScanStatus');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('recipePreviewImg').src = e.target.result;
        previewSection.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Start OCR
    progressSection.style.display = 'block';
    progressFill.style.width = '10%';
    statusText.textContent = 'Préparation...';

    try {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js non chargé');
        }

        progressFill.style.width = '30%';
        statusText.textContent = 'Analyse de l\'image...';

        const worker = await Tesseract.createWorker('fra');

        progressFill.style.width = '50%';
        statusText.textContent = 'Reconnaissance du texte...';

        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        progressFill.style.width = '80%';
        statusText.textContent = 'Extraction des ingrédients...';

        // Parse the recipe
        const parsedRecipe = this.parseRecipeText(text);
        this.scannedRecipeData = parsedRecipe;

        progressFill.style.width = '100%';
        statusText.textContent = 'Terminé !';

        // Display results
        this.displayScannedRecipe(parsedRecipe);
        resultsSection.style.display = 'block';

        setTimeout(() => {
            progressSection.style.display = 'none';
        }, 500);

    } catch (error) {
        console.error('Recipe scan error:', error);
        this.showToast('Erreur lors du scan: ' + error.message, 'error');
        progressSection.style.display = 'none';
    }
};

App.parseRecipeText = function (text) {
    const lines = text.split('\n').filter(l => l.trim().length > 2);

    // Try to find recipe name (usually first non-empty line or bold text)
    let recipeName = '';
    let portions = 1;
    const ingredients = [];

    // Patterns for ingredients: "200g de farine", "3 oeufs", "1/2 litre de lait"
    const ingredientPatterns = [
        /^(\d+[\.,]?\d*)\s*(kg|g|gr|ml|cl|l|litre|pièce|pc|unité|cuillère|cs|cc)?\s*(?:de\s+)?(.+)/i,
        /^(\d+)\s+(.+)/,
        /^(\d+\/\d+)\s*(kg|g|ml|cl|l)?\s*(?:de\s+)?(.+)/i
    ];

    // Patterns for portions: "pour 4 personnes", "8 parts", "6 portions"
    const portionPatterns = [
        /pour\s+(\d+)\s*(personnes?|parts?|portions?|couverts?)/i,
        /(\d+)\s*(personnes?|parts?|portions?|couverts?)/i
    ];

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // First meaningful line could be the name
        if (index === 0 && trimmed.length > 3 && !trimmed.match(/^\d/)) {
            recipeName = trimmed.substring(0, 100); // Limit length
        }

        // Check for portions
        for (const pattern of portionPatterns) {
            const match = trimmed.match(pattern);
            if (match) {
                portions = parseInt(match[1]) || 1;
            }
        }

        // Check for ingredients
        for (const pattern of ingredientPatterns) {
            const match = trimmed.match(pattern);
            if (match) {
                let quantity = match[1];
                let unit = match[2] || '';
                let name = match[3] || match[2] || '';

                // Handle fractions
                if (quantity.includes('/')) {
                    const parts = quantity.split('/');
                    quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    quantity = parseFloat(quantity.replace(',', '.')) || 0;
                }

                // Normalize unit
                unit = this.normalizeUnit(unit);

                // Clean name
                name = name.replace(/[,;.]+$/, '').trim();

                if (name.length > 2 && quantity > 0) {
                    // Try to match with existing products
                    const matchedProduct = this.findMatchingProduct(name);

                    ingredients.push({
                        raw: trimmed,
                        quantity: quantity,
                        unit: unit,
                        name: name,
                        matched: matchedProduct,
                        selected: matchedProduct !== null
                    });
                }
                break; // Only match first pattern
            }
        }
    });

    return {
        name: recipeName,
        portions: portions,
        ingredients: ingredients,
        rawText: text
    };
};

App.normalizeUnit = function (unit) {
    if (!unit) return '';
    unit = unit.toLowerCase();
    const mapping = {
        'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg',
        'g': 'g', 'gr': 'g', 'gramme': 'g', 'grammes': 'g',
        'l': 'L', 'litre': 'L', 'litres': 'L',
        'cl': 'cl', 'centilitre': 'cl',
        'ml': 'cl',
        'pc': 'pièce', 'pièce': 'pièce', 'pièces': 'pièce', 'unité': 'pièce',
        'cs': 'cuillère', 'cuillère': 'cuillère', 'c.s': 'cuillère',
        'cc': 'cuillère', 'c.c': 'cuillère'
    };
    return mapping[unit] || unit;
};

App.findMatchingProduct = function (ingredientName) {
    const products = Products.getAll();
    const nameLower = ingredientName.toLowerCase();

    // Exact match
    let match = products.find(p => p.name.toLowerCase() === nameLower);
    if (match) return match;

    // Partial match
    match = products.find(p =>
        p.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name.toLowerCase())
    );
    if (match) return match;

    // Word-based match
    const words = nameLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
        match = products.find(p => p.name.toLowerCase().includes(word));
        if (match) return match;
    }

    return null;
};

App.displayScannedRecipe = function (recipe) {
    document.getElementById('scannedRecipeName').value = recipe.name;
    document.getElementById('scannedRecipePortions').value = recipe.portions;

    const container = document.getElementById('scannedIngredientsList');
    const products = Products.getAll();
    const productOptions = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    container.innerHTML = recipe.ingredients.map((ing, index) => `
        <div class="scanned-ingredient-row" data-index="${index}">
            <div class="ingredient-checkbox">
                <input type="checkbox" id="ing_check_${index}" ${ing.selected ? 'checked' : ''}>
            </div>
            <div class="ingredient-details">
                <div class="ingredient-raw">${ing.raw}</div>
                <div class="ingredient-parsed">
                    <input type="number" class="ing-qty" value="${ing.quantity}" step="0.1" min="0">
                    <input type="text" class="ing-unit" value="${ing.unit}" placeholder="unité">
                    <select class="ing-product">
                        <option value="">-- Choisir produit --</option>
                        ${productOptions}
                    </select>
                    ${ing.matched ? `<span class="match-indicator">✓ ${ing.matched.name}</span>` : '<span class="no-match">Aucune correspondance</span>'}
                </div>
            </div>
        </div>
    `).join('');

    // Pre-select matched products
    recipe.ingredients.forEach((ing, index) => {
        if (ing.matched) {
            const select = container.querySelector(`[data-index="${index}"] .ing-product`);
            if (select) select.value = ing.matched.id;
        }
    });
};

App.confirmRecipeScan = function () {
    const name = document.getElementById('scannedRecipeName').value.trim();
    const portions = parseInt(document.getElementById('scannedRecipePortions').value) || 1;

    if (!name) {
        this.showToast('Veuillez entrer un nom de recette', 'error');
        return;
    }

    // Collect selected ingredients
    const ingredients = [];
    const rows = document.querySelectorAll('.scanned-ingredient-row');

    rows.forEach((row, index) => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) return;

        const qty = parseFloat(row.querySelector('.ing-qty').value) || 0;
        const unit = row.querySelector('.ing-unit').value;
        const productId = row.querySelector('.ing-product').value;

        if (productId && qty > 0) {
            ingredients.push({
                productId: productId,
                quantity: qty,
                unit: unit
            });
        }
    });

    // Create the recipe
    const recipe = {
        name: name,
        portions: portions,
        ingredients: ingredients,
        photoUrl: document.getElementById('recipePreviewImg').src || null,
        dietaryTags: [],
        instructions: ''
    };

    Recipes.save(recipe);
    this.showToast('Recette créée avec succès !', 'success');
    this.toggleRecipeScan();
    this.renderRecipes();
};

// Bind Recipe Scanner events
const originalBindEventsV4 = App.bindEvents;
App.bindEvents = function () {
    originalBindEventsV4.call(this);

    // Recipe scanner bindings
    document.getElementById('btnScanRecipe')?.addEventListener('click', () => this.toggleRecipeScan());
    document.getElementById('btnChooseRecipePhoto')?.addEventListener('click', () => {
        document.getElementById('recipeScanInput').click();
    });
    document.getElementById('recipeScanInput')?.addEventListener('change', (e) => this.handleRecipeScan(e));
    document.getElementById('btnCancelRecipeScan')?.addEventListener('click', () => this.toggleRecipeScan());
    document.getElementById('btnConfirmRecipeScan')?.addEventListener('click', () => this.confirmRecipeScan());

    // Note: Les headers triables sont gérés par délégation d'événements dans index-modular.html
    // Ne pas ajouter de listeners ici pour éviter le double déclenchement

    // Export / Email buttons
    document.getElementById('btnExportStock')?.addEventListener('click', () => this.exportStock());
    document.getElementById('btnEmailStock')?.addEventListener('click', () => this.emailStock());
};

// Export Stock to CSV
App.exportStock = function () {
    const products = Products.getAll();
    if (products.length === 0) {
        this.showToast('Aucun produit à exporter', 'warning');
        return;
    }

    // Create CSV content
    const headers = ['Produit', 'Catégorie', 'Quantité', 'Unité', 'Stock Min', 'Prix Unitaire', 'Valeur'];
    const rows = products.map(p => [
        p.name,
        p.category || '',
        p.quantity || 0,
        p.unit || '',
        p.minStock || '',
        p.price || 0,
        ((p.quantity || 0) * (p.price || 0)).toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    this.showToast('Stock exporté en CSV', 'success');
};

// Email Stock Report
App.emailStock = function () {
    const products = Products.getAll();
    const totalValue = Products.getTotalValue().toFixed(2);
    const criticalCount = Products.getCriticalProducts().length;
    const lowCount = Products.getLowStockProducts().length;

    // Group by category
    const grouped = {};
    products.forEach(p => {
        const cat = p.category || 'Autre';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    // Build email body
    let body = `RAPPORT DE STOCK - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    body += `Résumé:\n`;
    body += `- Total produits: ${products.length}\n`;
    body += `- Valeur totale: ${totalValue} €\n`;
    body += `- Stocks critiques: ${criticalCount}\n`;
    body += `- Stocks bas: ${lowCount}\n\n`;
    body += `Détail par catégorie:\n`;
    body += `${'='.repeat(40)}\n\n`;

    Object.keys(grouped).sort().forEach(cat => {
        body += `${cat}:\n`;
        grouped[cat].forEach(p => {
            const status = Products.getStockStatus(p);
            const alert = status === 'critical' ? '⚠️' : status === 'low' ? '⚡' : '';
            body += `  ${alert} ${p.name}: ${p.quantity} ${p.unit}\n`;
        });
        body += '\n';
    });

    // Open email client
    const subject = encodeURIComponent(`Rapport Stock - ${new Date().toLocaleDateString('fr-FR')}`);
    const mailtoBody = encodeURIComponent(body);
    window.location.href = `mailto:?subject=${subject}&body=${mailtoBody}`;

    this.showToast('Email préparé', 'success');
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());
