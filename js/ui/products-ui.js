// ============= Products UI Module =============
// Handles products rendering, sorting, filtering, editing
// Categories are collapsible accordions

(function () {
    // Sort state
    if (typeof App.productSortColumn === 'undefined') {
        App.productSortColumn = 'name';
    }
    if (typeof App.productSortDirection === 'undefined') {
        App.productSortDirection = 'asc';
    }

    // Track which categories are expanded (all expanded by default)
    App.expandedCategories = new Set();

    // Toggle category expansion
    App.toggleCategory = function (category) {
        if (this.expandedCategories.has(category)) {
            this.expandedCategories.delete(category);
        } else {
            this.expandedCategories.add(category);
        }
        this.renderProducts();
    };

    // Fonction de tri principale
    App.sortProductsBy = function (column) {
        console.log('Sort by:', column, 'Current:', this.productSortColumn, this.productSortDirection);

        if (this.productSortColumn === column) {
            this.productSortDirection = this.productSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.productSortColumn = column;
            this.productSortDirection = 'asc';
        }

        this.renderProducts();
    };

    // Fonction de tri des produits
    App.sortProducts = function (products) {
        const col = this.productSortColumn;
        const dir = this.productSortDirection === 'asc' ? 1 : -1;

        return [...products].sort((a, b) => {
            let valA, valB;
            switch (col) {
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'category':
                    valA = (a.category || '').toLowerCase();
                    valB = (b.category || '').toLowerCase();
                    break;
                case 'quantity':
                    valA = a.quantity || 0;
                    valB = b.quantity || 0;
                    break;
                case 'unit':
                    valA = (a.unit || '').toLowerCase();
                    valB = (b.unit || '').toLowerCase();
                    break;
                case 'minStock':
                    valA = a.minStock || 0;
                    valB = b.minStock || 0;
                    break;
                case 'days':
                    valA = Products.getDaysRemaining(a);
                    valB = Products.getDaysRemaining(b);
                    if (valA === Infinity) valA = 999999;
                    if (valB === Infinity) valB = 999999;
                    break;
                case 'value':
                    valA = (a.quantity || 0) * (a.price || 0);
                    valB = (b.quantity || 0) * (b.price || 0);
                    break;
                default:
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
            }

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    };

    // Mise à jour des icônes de tri
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

    // Rendu des produits avec catégories déroulantes
    App.renderProducts = function () {
        const search = document.getElementById('searchProducts')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('filterCategory')?.value || '';
        const stockFilter = document.getElementById('filterStock')?.value || '';

        let products = Products.getAll();

        // Mise à jour des options de filtre catégorie
        const categories = Products.getCategories();
        const filterCat = document.getElementById('filterCategory');
        if (filterCat) {
            const currentValue = filterCat.value;
            filterCat.innerHTML = '<option value="">Toutes catégories</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                if (cat === currentValue) opt.selected = true;
                filterCat.appendChild(opt);
            });
        }

        // Appliquer les filtres
        if (search) products = products.filter(p => p.name.toLowerCase().includes(search));
        if (categoryFilter) products = products.filter(p => p.category === categoryFilter);
        if (stockFilter) products = products.filter(p => Products.getStockStatus(p) === stockFilter);

        // Appliquer le tri
        products = this.sortProducts(products);

        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun produit trouvé</td></tr>';
            this.updateSortIcons();
            return;
        }

        // Grouper par catégorie
        const grouped = {};
        products.forEach(p => {
            const cat = p.category || 'Sans catégorie';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
        });

        // Si première fois, tout est expanded
        if (this.expandedCategories.size === 0) {
            Object.keys(grouped).forEach(cat => this.expandedCategories.add(cat));
        }

        const sortedCategories = Object.keys(grouped).sort();

        let html = '';
        sortedCategories.forEach(category => {
            const catProducts = grouped[category];
            const isExpanded = this.expandedCategories.has(category);
            const chevron = isExpanded ? '▼' : '▶';

            // Header de catégorie cliquable
            html += `<tr class="category-header-row" onclick="App.toggleCategory('${category.replace(/'/g, "\\'")}')">
                <td colspan="8">
                    <div class="category-header-cell">
                        <span class="category-chevron">${chevron}</span>
                        <span class="category-name">${category}</span>
                        <span class="category-badge">${catProducts.length}</span>
                    </div>
                </td>
            </tr>`;

            // Produits de cette catégorie (visibles uniquement si expanded)
            if (isExpanded) {
                catProducts.forEach(p => {
                    const status = Products.getStockStatus(p);
                    const days = Products.getDaysRemaining(p);
                    const daysText = days === Infinity ? '-' : days + 'j';
                    const value = ((p.quantity || 0) * (p.price || 0)).toFixed(2);

                    html += `<tr class="product-row" data-category="${category}">
                        <td><strong>${p.name}</strong></td>
                        <td><span class="category-tag">${p.category || '-'}</span></td>
                        <td><span class="badge badge-${status}">${p.quantity}</span></td>
                        <td>${p.unit}</td>
                        <td>${p.minStock || '-'}</td>
                        <td>${daysText}</td>
                        <td>${value} €</td>
                        <td class="actions">
                            <button class="btn-sm btn-adjust" data-action="adjust" data-id="${p.id}" title="Ajuster stock">➖➕</button>
                            <button class="btn-sm btn-edit" data-action="edit" data-id="${p.id}" title="Modifier">✏️</button>
                            <button class="btn-sm btn-delete" data-action="delete" data-id="${p.id}" title="Supprimer">🗑️</button>
                        </td>
                    </tr>`;
                });
            }
        });

        tbody.innerHTML = html;
        this.updateSortIcons();

        // Bind event handlers for action buttons
        this.bindProductActions();
    };

    // Bind action buttons (instead of inline onclick)
    App.bindProductActions = function () {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'adjust':
                        App.quickAdjustStock(id);
                        break;
                    case 'edit':
                        App.editProduct(id);
                        break;
                    case 'delete':
                        App.deleteProduct(id);
                        break;
                }
            });
        });
    };

    // Ajustement rapide du stock
    App.quickAdjustStock = function (productId) {
        const product = Products.getById(productId);
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

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
        if (this.updateDashboard) this.updateDashboard();
    };

    App.resetProductForm = function () {
        const title = document.getElementById('productModalTitle');
        const form = document.getElementById('productForm');
        const idField = document.getElementById('productId');

        if (title) title.textContent = 'Ajouter un Produit';
        if (form) form.reset();
        if (idField) idField.value = '';
    };

    App.editProduct = function (id) {
        const product = Products.getById(id);
        if (!product) {
            console.error('Product not found:', id);
            return;
        }

        const title = document.getElementById('productModalTitle');
        if (title) title.textContent = 'Modifier le Produit';

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

    App.deleteProduct = function (id) {
        const product = Products.getById(id);
        if (!product) {
            console.error('Product not found:', id);
            return;
        }

        if (confirm(`Supprimer "${product.name}" ?`)) {
            Products.delete(id);
            this.showToast('Produit supprimé', 'success');
            this.renderProducts();
            if (this.updateDashboard) this.updateDashboard();
            if (this.updateAlertBadge) this.updateAlertBadge();
        }
    };

    // Export Stock to CSV
    App.exportStock = function () {
        const products = Products.getAll();
        if (products.length === 0) {
            this.showToast('Aucun produit à exporter', 'warning');
            return;
        }

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

        const grouped = {};
        products.forEach(p => {
            const cat = p.category || 'Autre';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
        });

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

        const subject = encodeURIComponent(`Rapport Stock - ${new Date().toLocaleDateString('fr-FR')}`);
        const mailtoBody = encodeURIComponent(body);
        window.location.href = `mailto:?subject=${subject}&body=${mailtoBody}`;

        this.showToast('Email préparé', 'success');
    };

    console.log('✅ Products UI loaded with collapsible categories');
})();
