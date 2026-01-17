// ============= Deliveries Module =============
// Handles delivery operations (incoming stock)

const Deliveries = {
    getAll() {
        return Storage.get(Storage.KEYS.DELIVERIES);
    },

    getById(id) {
        return this.getAll().find(d => d.id === id);
    },

    add(delivery) {
        const deliveries = this.getAll();
        delivery.id = 'd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        delivery.createdAt = new Date().toISOString();
        deliveries.push(delivery);
        Storage.set(Storage.KEYS.DELIVERIES, deliveries);

        // Update stock for each item
        if (delivery.items) {
            delivery.items.forEach(item => {
                Products.updateQuantity(item.productId, item.quantity);
            });
        }
        return delivery;
    },

    delete(id) {
        const deliveries = this.getAll();
        const delivery = deliveries.find(d => d.id === id);
        if (delivery && delivery.items) {
            delivery.items.forEach(item => {
                Products.updateQuantity(item.productId, -item.quantity);
            });
        }
        Storage.set(Storage.KEYS.DELIVERIES, deliveries.filter(d => d.id !== id));
    }
};

// Export global
window.Deliveries = Deliveries;
