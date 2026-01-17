// ============= Suppliers UI Module =============
// Handles suppliers management with expandable cards

(function () {
    App.expandedSupplier = null;

    App.renderSuppliers = function () {
        const container = document.getElementById('suppliersContainer');
        if (!container) return;

        const suppliers = Suppliers.getAll();

        if (suppliers.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun fournisseur. Ajoutez votre premier fournisseur.</p>';
            return;
        }

        // Group suppliers by category
        const grouped = {};
        suppliers.forEach(s => {
            const cat = s.category || 'autre';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(s);
        });

        const DAYS = Suppliers.DAYS;
        const today = new Date().getDay();
        const todayName = DAYS[today];

        let html = '';
        Object.keys(grouped).sort().forEach(catId => {
            const category = Suppliers.getCategoryById(catId);
            const catSuppliers = grouped[catId];

            html += `<div class="supplier-category-group">
                <div class="category-header">
                    <span class="category-icon">${category.icon || '📦'}</span>
                    <span class="category-label">${category.label}</span>
                    <span class="category-count">${catSuppliers.length}</span>
                </div>
                <div class="supplier-cards">`;

            catSuppliers.forEach(s => {
                const isOrderDay = s.orderDays && s.orderDays.includes(todayName);
                const isExpanded = this.expandedSupplier === s.id;
                const logoHtml = s.logoUrl
                    ? `<img src="${s.logoUrl}" class="supplier-logo-mini" alt="${s.name}">`
                    : `<span class="supplier-icon">${category.icon || '📦'}</span>`;

                const orderDaysHtml = s.orderDays?.map(d => `<span class="day-tag">${d.substring(0, 3)}</span>`).join('') || '';
                const deliveryDaysHtml = s.deliveryDays?.map(d => `<span class="day-tag">${d.substring(0, 3)}</span>`).join('') || '';

                html += `<div class="supplier-card-mini ${isOrderDay ? 'order-day' : ''} ${isExpanded ? 'expanded' : ''}" onclick="App.toggleSupplierCard('${s.id}')">
                    <div class="supplier-card-header">
                        ${logoHtml}
                        <div class="supplier-info">
                            <div class="supplier-name">${s.name}</div>
                            ${s.phone ? `<div class="supplier-phone">${s.phone}</div>` : ''}
                        </div>
                        ${isOrderDay ? '<span class="order-badge">📞 Jour de commande</span>' : ''}
                    </div>
                    <div class="supplier-card-details" style="display: ${isExpanded ? 'block' : 'none'}">
                        ${s.email ? `<div class="detail-row"><strong>Email:</strong> <a href="mailto:${s.email}">${s.email}</a></div>` : ''}
                        ${s.contact ? `<div class="detail-row"><strong>Contact:</strong> ${s.contact}</div>` : ''}
                        <div class="detail-row"><strong>Commande:</strong> ${orderDaysHtml || 'Non défini'}</div>
                        <div class="detail-row"><strong>Livraison:</strong> ${deliveryDaysHtml || 'Non défini'}</div>
                        ${s.notes ? `<div class="detail-row"><strong>Notes:</strong> ${s.notes}</div>` : ''}
                        <div class="supplier-actions">
                            <button class="btn-sm btn-edit" onclick="event.stopPropagation(); App.editSupplier('${s.id}')">✏️ Modifier</button>
                            <button class="btn-sm btn-delete" onclick="event.stopPropagation(); App.deleteSupplier('${s.id}')">🗑️ Supprimer</button>
                        </div>
                    </div>
                </div>`;
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
        this.createSupplierModal();

        const form = document.getElementById('supplierForm');
        form.reset();
        document.getElementById('supplierId').value = '';

        const preview = document.getElementById('supplierLogoPreview');
        if (preview) preview.innerHTML = '<span class="logo-placeholder">📦</span>';
        document.getElementById('supplierLogoUrl').value = '';

        if (supplierId) {
            const supplier = Suppliers.getById(supplierId);
            if (supplier) {
                document.getElementById('supplierId').value = supplier.id;
                document.getElementById('supplierName').value = supplier.name || '';
                document.getElementById('supplierPhone').value = supplier.phone || '';
                document.getElementById('supplierEmail').value = supplier.email || '';
                document.getElementById('supplierContact').value = supplier.contact || '';
                document.getElementById('supplierNotes').value = supplier.notes || '';
                document.getElementById('supplierCategory').value = supplier.category || 'autre';

                if (supplier.logoUrl) {
                    document.getElementById('supplierLogoUrl').value = supplier.logoUrl;
                    if (preview) preview.innerHTML = `<img src="${supplier.logoUrl}" alt="Logo">`;
                }

                Suppliers.DAYS.forEach(day => {
                    const orderCb = document.querySelector(`#orderDay_${day}`);
                    const deliveryCb = document.querySelector(`#deliveryDay_${day}`);
                    if (orderCb) orderCb.checked = (supplier.orderDays || []).includes(day);
                    if (deliveryCb) deliveryCb.checked = (supplier.deliveryDays || []).includes(day);
                });
            }
        }

        this.openModal('supplierModal');
    };

    App.handleSupplierSubmit = function (e) {
        e.preventDefault();

        const orderDays = [];
        const deliveryDays = [];
        Suppliers.DAYS.forEach(day => {
            if (document.querySelector(`#orderDay_${day}`)?.checked) orderDays.push(day);
            if (document.querySelector(`#deliveryDay_${day}`)?.checked) deliveryDays.push(day);
        });

        const supplier = {
            id: document.getElementById('supplierId').value || null,
            name: document.getElementById('supplierName').value,
            phone: document.getElementById('supplierPhone').value,
            email: document.getElementById('supplierEmail').value,
            contact: document.getElementById('supplierContact').value,
            notes: document.getElementById('supplierNotes').value,
            category: document.getElementById('supplierCategory').value,
            logoUrl: document.getElementById('supplierLogoUrl').value,
            orderDays: orderDays,
            deliveryDays: deliveryDays
        };

        if (!supplier.name) {
            this.showToast('Veuillez entrer un nom', 'error');
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

    App.checkOrderReminders = function () {
        const reminders = Suppliers.getTodayOrderReminders();
        if (reminders.length > 0) {
            this.showToast(`📞 ${reminders.length} commande(s) à passer aujourd'hui`, 'warning');
        }
    };

    console.log('✅ Suppliers UI loaded');
})();
