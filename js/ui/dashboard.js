// ============= Dashboard UI Module =============
// Handles dashboard rendering and updates

(function () {
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
        if (suggestionsList) {
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

    App.quickOrderSuggestion = function (productId, qty) {
        // Opens delivery modal with pre-filled suggestion
        this.prepareDeliveryModal();
        this.openModal('deliveryModal');
    };

    console.log('✅ Dashboard UI loaded');
})();
