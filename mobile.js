// ============= StockPro Mobile App =============

const MobileApp = {
    // State
    products: [],
    suppliers: [],
    outputs: [],
    currentProduct: null,
    isOnline: navigator.onLine,
    offlineQueue: [],

    // API Base URL
    API_URL: window.location.origin,

    // ============= Initialization =============
    async init() {
        console.log('📱 StockPro Mobile - Initialisation...');

        // Register service worker
        this.registerServiceWorker();

        // Setup online/offline handlers
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Initial sync
        await this.syncData();

        // Update UI
        this.updateDashboard();
        this.renderProducts();
        this.renderSuppliers();

        console.log('✅ StockPro Mobile prêt');
    },

    // ============= Service Worker =============
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('SW registered:', registration.scope);

                // Listen for messages from SW
                navigator.serviceWorker.addEventListener('message', (e) => {
                    if (e.data.type === 'SYNC_REQUIRED') {
                        this.syncData();
                    } else if (e.data.type === 'OFFLINE_QUEUED') {
                        this.offlineQueue.push(e.data.data);
                        this.showToast('Données en attente de synchronisation', 'warning');
                    }
                });
            } catch (error) {
                console.error('SW registration failed:', error);
            }
        }
    },

    // ============= Online/Offline Handling =============
    handleOnline() {
        this.isOnline = true;
        document.getElementById('offlineBanner').style.display = 'none';
        document.getElementById('syncStatus').classList.remove('offline');
        this.syncData();
        this.showToast('Connexion rétablie', 'success');
    },

    handleOffline() {
        this.isOnline = false;
        document.getElementById('offlineBanner').style.display = 'block';
        document.getElementById('syncStatus').classList.add('offline');
        this.showToast('Mode hors-ligne activé', 'warning');
    },

    // ============= Data Sync =============
    async syncData() {
        if (!this.isOnline) return;

        const syncStatus = document.getElementById('syncStatus');
        syncStatus.classList.add('syncing');

        try {
            // Fetch all data from server
            const [products, suppliers, outputs, reminders] = await Promise.all([
                this.api('/api/products'),
                this.api('/api/suppliers'),
                this.api('/api/outputs'),
                this.api('/api/reminders')
            ]);

            this.products = products || [];
            this.suppliers = suppliers || [];
            this.outputs = outputs || [];
            this.reminders = reminders || {};

            // Store in localStorage for offline use
            localStorage.setItem('stockpro_mobile_products', JSON.stringify(this.products));
            localStorage.setItem('stockpro_mobile_suppliers', JSON.stringify(this.suppliers));
            localStorage.setItem('stockpro_mobile_outputs', JSON.stringify(this.outputs));

            syncStatus.classList.remove('syncing', 'offline');
            console.log('✅ Sync complete');

        } catch (error) {
            console.error('Sync error:', error);
            syncStatus.classList.remove('syncing');

            // Load from localStorage if offline
            this.loadFromLocalStorage();
        }
    },

    loadFromLocalStorage() {
        try {
            this.products = JSON.parse(localStorage.getItem('stockpro_mobile_products') || '[]');
            this.suppliers = JSON.parse(localStorage.getItem('stockpro_mobile_suppliers') || '[]');
            this.outputs = JSON.parse(localStorage.getItem('stockpro_mobile_outputs') || '[]');
        } catch (e) {
            console.error('LocalStorage load error:', e);
        }
    },

    // ============= API Helper =============
    async api(endpoint, options = {}) {
        const response = await fetch(this.API_URL + endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
    },

    // ============= Views Navigation =============
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) targetView.classList.add('active');

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Refresh view data
        if (viewName === 'dashboard') this.updateDashboard();
        if (viewName === 'stock' || viewName === 'quick-exit') this.renderProducts();
        if (viewName === 'suppliers') this.renderSuppliers();
    },

    // ============= Dashboard =============
    updateDashboard() {
        // Stats
        document.getElementById('totalProducts').textContent = this.products.length;

        const critical = this.products.filter(p => this.getStockStatus(p) === 'critical').length;
        document.getElementById('criticalCount').textContent = critical;

        const today = new Date().toISOString().split('T')[0];
        const todayExits = this.outputs.filter(o => o.date === today).length;
        document.getElementById('todayExits').textContent = todayExits;

        // Alerts
        this.renderAlerts();

        // Low stock list
        this.renderLowStockList();
    },

    renderAlerts() {
        const alertsSection = document.getElementById('alertsSection');
        const orderReminders = document.getElementById('orderReminders');
        const lowStockAlert = document.getElementById('lowStockAlert');

        // Check for order reminders
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const today = days[new Date().getDay()];
        const todayOrders = this.suppliers.filter(s =>
            s.orderDays && s.orderDays.includes(today)
        );

        if (todayOrders.length > 0) {
            orderReminders.style.display = 'flex';
            document.getElementById('orderRemindersList').textContent =
                todayOrders.map(s => s.name).join(', ');
            alertsSection.style.display = 'block';
        } else {
            orderReminders.style.display = 'none';
        }

        // Check low stock
        const lowStock = this.products.filter(p => {
            const status = this.getStockStatus(p);
            return status === 'critical' || status === 'low';
        });

        if (lowStock.length > 0) {
            lowStockAlert.style.display = 'flex';
            document.getElementById('lowStockCount').textContent = lowStock.length;
            alertsSection.style.display = 'block';
        } else {
            lowStockAlert.style.display = 'none';
        }

        if (todayOrders.length === 0 && lowStock.length === 0) {
            alertsSection.style.display = 'none';
        }
    },

    renderLowStockList() {
        const container = document.getElementById('lowStockList');
        const lowStock = this.products
            .filter(p => this.getStockStatus(p) !== 'ok')
            .sort((a, b) => this.getStockStatus(a) === 'critical' ? -1 : 1)
            .slice(0, 10);

        if (lowStock.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ Tous les stocks sont OK</div>';
            return;
        }

        container.innerHTML = lowStock.map(p => {
            const status = this.getStockStatus(p);
            return `<div class="product-item">
                <div class="product-status ${status}"></div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-details">${p.category || ''}</div>
                </div>
                <div class="product-qty">
                    <span class="qty-value">${p.quantity || 0}</span>
                    <span class="qty-unit">${p.unit || ''}</span>
                </div>
            </div>`;
        }).join('');
    },

    getStockStatus(product) {
        const qty = product.quantity || 0;
        const min = product.minStock || 0;
        if (min <= 0) return 'ok';
        if (qty <= min) return 'critical';
        if (qty <= min * 1.5) return 'low';
        return 'ok';
    },

    // ============= Products / Quick Exit =============
    renderProducts() {
        const container = document.getElementById('productsExitList');
        const stockContainer = document.getElementById('stockList');

        const html = this.products.map(p => {
            const status = this.getStockStatus(p);
            return `<div class="product-item" onclick="MobileApp.openExitModal('${p.id}')">
                <div class="product-status ${status}"></div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-details">${p.category || ''} • Min: ${p.minStock || 0} ${p.unit || ''}</div>
                </div>
                <div class="product-qty">
                    <span class="qty-value">${p.quantity || 0}</span>
                    <span class="qty-unit">${p.unit || ''}</span>
                </div>
                <button class="product-exit-btn">Sortir</button>
            </div>`;
        }).join('');

        if (container) container.innerHTML = html || '<div class="empty-state">Aucun produit</div>';
        if (stockContainer) stockContainer.innerHTML = html || '<div class="empty-state">Aucun produit</div>';
    },

    filterProducts() {
        const search = document.getElementById('searchProduct')?.value?.toLowerCase() || '';
        const container = document.getElementById('productsExitList');

        const filtered = this.products.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.category && p.category.toLowerCase().includes(search))
        );

        container.innerHTML = filtered.map(p => {
            const status = this.getStockStatus(p);
            return `<div class="product-item" onclick="MobileApp.openExitModal('${p.id}')">
                <div class="product-status ${status}"></div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-details">${p.category || ''}</div>
                </div>
                <div class="product-qty">
                    <span class="qty-value">${p.quantity || 0}</span>
                    <span class="qty-unit">${p.unit || ''}</span>
                </div>
                <button class="product-exit-btn">Sortir</button>
            </div>`;
        }).join('') || '<div class="empty-state">Aucun résultat</div>';
    },

    filterStock() {
        const search = document.getElementById('searchStock')?.value?.toLowerCase() || '';
        const container = document.getElementById('stockList');

        const filtered = this.products.filter(p =>
            p.name.toLowerCase().includes(search)
        );

        container.innerHTML = filtered.map(p => {
            const status = this.getStockStatus(p);
            return `<div class="product-item">
                <div class="product-status ${status}"></div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-details">${p.category || ''}</div>
                </div>
                <div class="product-qty">
                    <span class="qty-value">${p.quantity || 0}</span>
                    <span class="qty-unit">${p.unit || ''}</span>
                </div>
            </div>`;
        }).join('') || '<div class="empty-state">Aucun résultat</div>';
    },

    // ============= Exit Modal =============
    openExitModal(productId) {
        this.currentProduct = this.products.find(p => p.id === productId);
        if (!this.currentProduct) return;

        document.getElementById('exitProductName').textContent = this.currentProduct.name;
        document.getElementById('exitCurrentStock').textContent = this.currentProduct.quantity || 0;
        document.getElementById('exitUnit').textContent = this.currentProduct.unit || '';
        document.getElementById('exitQuantity').value = 1;
        document.getElementById('exitReason').value = '';

        document.getElementById('exitModal').classList.add('active');
    },

    closeExitModal() {
        document.getElementById('exitModal').classList.remove('active');
        this.currentProduct = null;
    },

    adjustQty(delta) {
        const input = document.getElementById('exitQuantity');
        const newVal = Math.max(0.1, parseFloat(input.value) + delta);
        input.value = newVal.toFixed(1);
    },

    async confirmExit() {
        if (!this.currentProduct) return;

        const quantity = parseFloat(document.getElementById('exitQuantity').value);
        const reason = document.getElementById('exitReason').value || 'Sortie mobile';

        if (quantity <= 0) {
            this.showToast('Quantité invalide', 'error');
            return;
        }

        const output = {
            productId: this.currentProduct.id,
            quantity: quantity,
            reason: reason,
            date: new Date().toISOString().split('T')[0]
        };

        try {
            if (this.isOnline) {
                await this.api('/api/outputs', { method: 'POST', body: output });
                await this.syncData();
            } else {
                // Queue for later
                this.offlineQueue.push({ type: 'output', data: output });

                // Update local state
                this.currentProduct.quantity = Math.max(0, this.currentProduct.quantity - quantity);
                localStorage.setItem('stockpro_mobile_products', JSON.stringify(this.products));
            }

            this.showToast(`${quantity} ${this.currentProduct.unit} sortis`, 'success');
            this.closeExitModal();
            this.updateDashboard();
            this.renderProducts();

        } catch (error) {
            console.error('Exit error:', error);
            this.showToast('Erreur lors de la sortie', 'error');
        }
    },

    // ============= Suppliers =============
    renderSuppliers() {
        const container = document.getElementById('suppliersList');
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const today = days[new Date().getDay()];
        const daysLabels = { 'lundi': 'Lun', 'mardi': 'Mar', 'mercredi': 'Mer', 'jeudi': 'Jeu', 'vendredi': 'Ven', 'samedi': 'Sam', 'dimanche': 'Dim' };

        if (this.suppliers.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucun fournisseur</div>';
            return;
        }

        container.innerHTML = this.suppliers.map(s => {
            const isOrderDay = s.orderDays && s.orderDays.includes(today);
            const orderDaysHtml = (s.orderDays || []).map(d =>
                `<span class="day-badge order">${daysLabels[d] || d}</span>`
            ).join('');
            const deliveryDaysHtml = (s.deliveryDays || []).map(d =>
                `<span class="day-badge delivery">${daysLabels[d] || d}</span>`
            ).join('');

            return `<div class="supplier-item">
                <div class="supplier-name">${s.name}</div>
                <div class="supplier-contact">
                    ${s.phone ? `📞 <a href="tel:${s.phone}">${s.phone}</a>` : ''}
                    ${s.contact ? ` • ${s.contact}` : ''}
                </div>
                <div class="supplier-days">
                    ${orderDaysHtml ? `<span style="font-size:0.7rem;color:#94a3b8">Cmd:</span>${orderDaysHtml}` : ''}
                    ${deliveryDaysHtml ? `<span style="font-size:0.7rem;color:#94a3b8">Liv:</span>${deliveryDaysHtml}` : ''}
                </div>
                ${isOrderDay ? '<div class="order-today-badge">📞 Commander aujourd\'hui !</div>' : ''}
            </div>`;
        }).join('');
    },

    // ============= OCR Scanner =============
    initScanner() {
        document.getElementById('scanInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ocrProgress = document.getElementById('ocrProgress');
            const ocrResults = document.getElementById('ocrResults');
            const scanResult = document.getElementById('scanResult');

            scanResult.style.display = 'block';
            ocrProgress.style.display = 'flex';
            ocrResults.innerHTML = '';

            try {
                if (typeof Tesseract === 'undefined') {
                    throw new Error('Tesseract.js non chargé');
                }

                const worker = await Tesseract.createWorker('fra');
                const { data: { text } } = await worker.recognize(file);
                await worker.terminate();

                ocrProgress.style.display = 'none';

                // Parse and match products
                const lines = text.split('\n').filter(l => l.trim().length > 3);
                const matches = lines.map(line => {
                    const qtyMatch = line.match(/(\d+[\.,]?\d*)\s*(kg|g|L|cl|pce|bte|crt)?/i);
                    const productName = line.replace(/[\d\.,]+\s*(kg|g|L|cl|pce|bte|crt|€)?/gi, '').trim();

                    // Find matching product
                    const matched = this.products.find(p =>
                        p.name.toLowerCase().includes(productName.toLowerCase()) ||
                        productName.toLowerCase().includes(p.name.toLowerCase())
                    );

                    return {
                        raw: line,
                        quantity: qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : null,
                        productName,
                        matched
                    };
                }).filter(m => m.productName.length > 2);

                ocrResults.innerHTML = matches.map(m => `
                    <div style="padding:8px;background:var(--bg-input);border-radius:8px;margin-bottom:8px;">
                        <div style="font-size:0.875rem">${m.raw}</div>
                        ${m.matched ? `<div style="color:var(--success);font-size:0.75rem">→ ${m.matched.name}</div>` : ''}
                    </div>
                `).join('') || '<div class="empty-state">Aucun produit détecté</div>';

            } catch (error) {
                ocrProgress.style.display = 'none';
                ocrResults.innerHTML = `<div class="empty-state">Erreur: ${error.message}</div>`;
            }
        });
    },

    // ============= Toast Notifications =============
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    MobileApp.init();
    MobileApp.initScanner();
});
