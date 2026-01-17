// ============= Outputs UI Module =============
// Handles stock outputs (sorties) rendering and management

(function () {
    App.renderOutputs = function () {
        this.renderTodayOutputs();
        this.renderOutputsHistory();
    };

    App.renderTodayOutputs = function () {
        const outputs = Outputs.getTodayOutputs();
        const container = document.getElementById('todayOutputsList');
        if (!container) return;

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
        if (!tbody) return;

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
        const stockInfo = document.getElementById('outputStockInfo');
        if (stockInfo) stockInfo.textContent = '';
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
        if (this.updateAlertBadge) this.updateAlertBadge();
    };

    App.deleteOutput = function (id) {
        if (confirm('Annuler cette sortie ?')) {
            Outputs.delete(id);
            this.showToast('Sortie annulée', 'success');
            this.renderOutputs();
            this.updateDashboard();
        }
    };

    console.log('✅ Outputs UI loaded');
})();
