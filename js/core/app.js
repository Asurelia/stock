// ============= App Core =============
// Main application controller

const App = {
    currentTab: 'dashboard',
    currentWeek: 1,
    currentYear: new Date().getFullYear(),
    charts: {},
    deliveryPhotoData: null,
    photoData: null,
    currentMenuDate: new Date().toISOString().split('T')[0],

    init() {
        // Calculate current week
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 604800000;
        this.currentWeek = Math.ceil((diff / oneWeek) + 1);

        this.renderMainContent();
        this.bindEvents();
        this.updateDashboard();
        this.updateAlertBadge();

        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        setTimeout(() => {
            this.setDefaultDates(today, monthAgo);
        }, 100);

        console.log('✅ StockPro App initialized');
    },

    setDefaultDates(today, monthAgo) {
        const setIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        setIfExists('outputDate', today);
        setIfExists('deliveryDate', today);
        setIfExists('outputsDateFrom', monthAgo);
        setIfExists('outputsDateTo', today);
        setIfExists('analyticsFrom', monthAgo);
        setIfExists('analyticsTo', today);

        const todayDate = document.getElementById('todayDate');
        if (todayDate) {
            todayDate.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    },

    renderMainContent() {
        const main = document.getElementById('mainContent');
        if (main) main.innerHTML = this.getTemplates() + this.getModalsTemplate();
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.onclick = () => toast.remove();
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    switchTab(tabName) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`[data-tab="${tabName}"]`);
        if (navItem) navItem.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) tabContent.classList.add('active');

        this.currentTab = tabName;

        // Render appropriate content
        if (tabName === 'products') this.renderProducts();
        else if (tabName === 'outputs') this.renderOutputs();
        else if (tabName === 'deliveries') this.renderDeliveries();
        else if (tabName === 'photos') this.renderPhotos();
        else if (tabName === 'menus') this.renderMenus();
        else if (tabName === 'analytics') this.renderAnalytics();
        else if (tabName === 'recipes') this.renderRecipes();
        else if (tabName === 'suppliers') this.renderSuppliers();

        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
    },

    updateAlertBadge() {
        const count = Products.getCriticalProducts().length;
        const badge = document.getElementById('alertBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(item.dataset.tab);
            });
        });

        // Mobile sidebar
        document.getElementById('hamburger')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.add('open');
        });
        document.getElementById('sidebarClose')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('open');
        });

        // Quick actions
        document.getElementById('quickAddProduct')?.addEventListener('click', () => {
            this.resetProductForm();
            this.openModal('productModal');
        });
        document.getElementById('quickAddOutput')?.addEventListener('click', () => {
            this.prepareOutputModal();
            this.openModal('outputModal');
        });
        document.getElementById('quickAddDelivery')?.addEventListener('click', () => {
            this.prepareDeliveryModal();
            this.openModal('deliveryModal');
        });

        // Products
        document.getElementById('btnAddProduct')?.addEventListener('click', () => {
            this.resetProductForm();
            this.openModal('productModal');
        });
        document.getElementById('productForm')?.addEventListener('submit', (e) => this.handleProductSubmit(e));
        document.getElementById('searchProducts')?.addEventListener('input', () => this.renderProducts());
        document.getElementById('filterCategory')?.addEventListener('change', () => this.renderProducts());
        document.getElementById('filterStock')?.addEventListener('change', () => this.renderProducts());

        // Sortable headers
        document.querySelectorAll('.sortable-table th.sortable').forEach(th => {
            th.addEventListener('click', () => this.sortProductsBy(th.dataset.sort));
        });

        // Export buttons
        document.getElementById('btnExportStock')?.addEventListener('click', () => this.exportStock());
        document.getElementById('btnEmailStock')?.addEventListener('click', () => this.emailStock());

        // Outputs
        document.getElementById('btnAddOutput')?.addEventListener('click', () => {
            this.prepareOutputModal();
            this.openModal('outputModal');
        });
        document.getElementById('outputForm')?.addEventListener('submit', (e) => this.handleOutputSubmit(e));

        // Deliveries
        document.getElementById('btnAddDelivery')?.addEventListener('click', () => {
            this.prepareDeliveryModal();
            this.openModal('deliveryModal');
        });
        document.getElementById('deliveryForm')?.addEventListener('submit', (e) => this.handleDeliverySubmit(e));
        document.getElementById('btnAddDeliveryItem')?.addEventListener('click', () => this.addDeliveryItemRow());

        // Photos
        document.getElementById('btnAddPhoto')?.addEventListener('click', () => {
            this.resetPhotoForm();
            this.openModal('photoModal');
        });
        document.getElementById('photoForm')?.addEventListener('submit', (e) => this.handlePhotoSubmit(e));

        // Recipes
        document.getElementById('btnAddRecipe')?.addEventListener('click', () => this.openRecipeModal());
        document.getElementById('recipeForm')?.addEventListener('submit', (e) => this.handleRecipeSubmit(e));
        document.getElementById('btnAddRecipeIngredient')?.addEventListener('click', () => this.addRecipeIngredientRow());

        // Suppliers
        document.getElementById('btnAddSupplier')?.addEventListener('click', () => this.openSupplierModal());

        // Menus
        document.getElementById('btnPrevWeek')?.addEventListener('click', () => {
            this.currentWeek--;
            if (this.currentWeek < 1) { this.currentWeek = 52; this.currentYear--; }
            this.renderMenus();
        });
        document.getElementById('btnNextWeek')?.addEventListener('click', () => {
            this.currentWeek++;
            if (this.currentWeek > 52) { this.currentWeek = 1; this.currentYear++; }
            this.renderMenus();
        });
        document.getElementById('mealForm')?.addEventListener('submit', (e) => this.handleMealSubmit(e));
        document.getElementById('btnAddMealIngredient')?.addEventListener('click', () => this.addMealIngredientRow());
        document.getElementById('btnCheckStock')?.addEventListener('click', () => this.checkMenuStock());

        // Export/Import
        document.getElementById('btnExportJSON')?.addEventListener('click', () => this.exportJSON());
        document.getElementById('btnExportExcel')?.addEventListener('click', () => this.exportExcel());
        document.getElementById('btnImport')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.handleImport(e));

        // Modal close buttons
        document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal')?.classList.remove('active');
            });
        });

        // Check order reminders
        if (this.checkOrderReminders) this.checkOrderReminders();
    }
};

// Export global
window.App = App;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
