// ============= Analytics UI Module =============
// Handles analytics charts and forecasting

(function () {
    App.renderAnalytics = function () {
        const outputs = Outputs.getAll();
        const deliveries = Deliveries.getAll();

        const totalEntries = deliveries.reduce((sum, d) => sum + (d.items?.length || 0), 0);
        const totalExits = outputs.length;

        const totalMovements = document.getElementById('totalMovements');
        const totalEntriesEl = document.getElementById('totalEntries');
        const totalExitsEl = document.getElementById('totalExits');

        if (totalMovements) totalMovements.textContent = totalEntries + totalExits;
        if (totalEntriesEl) totalEntriesEl.textContent = totalEntries;
        if (totalExitsEl) totalExitsEl.textContent = totalExits;

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
        if (!container) return;

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
        XLSX.utils.book_append_sheet(wb, ws, 'Produits');
        XLSX.writeFile(wb, `stockpro_export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                        this.showToast('Import réussi', 'success');
                        this.renderMainContent();
                        this.bindEvents();
                    } else {
                        this.showToast('Erreur d\'import', 'error');
                    }
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    if (typeof XLSX !== 'undefined') {
                        const wb = XLSX.read(evt.target.result, { type: 'binary' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                        // Skip header row and import products
                        const imported = [];
                        for (let i = 1; i < data.length; i++) {
                            const row = data[i];
                            if (row[0]) {
                                imported.push({
                                    name: row[0],
                                    category: row[1] || '',
                                    quantity: parseFloat(row[2]) || 0,
                                    unit: row[3] || '',
                                    minStock: parseFloat(row[4]) || 0,
                                    avgConsumption: parseFloat(row[5]) || 0,
                                    price: parseFloat(row[6]) || 0
                                });
                            }
                        }

                        imported.forEach(p => Products.save(p));
                        this.showToast(`${imported.length} produits importés`, 'success');
                        this.renderMainContent();
                        this.bindEvents();
                    }
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Erreur lors de l\'import', 'error');
            }
        };

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    console.log('✅ Analytics UI loaded');
})();
