// ============= Deliveries UI Module =============
// Handles deliveries rendering and management

(function () {
    App.renderDeliveries = function () {
        const deliveries = Deliveries.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('deliveriesGrid');
        if (!container) return;

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
        const preview = document.getElementById('deliveryPhotoPreview');
        if (preview) preview.innerHTML = '';
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
        if (this.updateAlertBadge) this.updateAlertBadge();
    };

    App.deleteDelivery = function (id) {
        if (confirm('Supprimer cette livraison ?')) {
            Deliveries.delete(id);
            this.showToast('Livraison supprimée', 'success');
            this.renderDeliveries();
            this.updateDashboard();
        }
    };

    console.log('✅ Deliveries UI loaded');
})();
