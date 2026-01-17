// ============= Outputs Module =============
// Handles stock output operations (sortie de stock)

const Outputs = {
    getAll() {
        return Storage.get(Storage.KEYS.OUTPUTS);
    },

    getByDate(date) {
        return this.getAll().filter(o => o.date === date);
    },

    getByDateRange(from, to) {
        return this.getAll().filter(o => o.date >= from && o.date <= to);
    },

    getTodayOutputs() {
        const today = new Date().toISOString().split('T')[0];
        return this.getByDate(today);
    },

    add(output) {
        const outputs = this.getAll();
        output.id = 'o_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        output.createdAt = new Date().toISOString();
        if (!output.date) output.date = new Date().toISOString().split('T')[0];
        outputs.push(output);
        Storage.set(Storage.KEYS.OUTPUTS, outputs);
        Products.updateQuantity(output.productId, -output.quantity);
        return output;
    },

    delete(id) {
        const outputs = this.getAll();
        const output = outputs.find(o => o.id === id);
        if (output) {
            Products.updateQuantity(output.productId, output.quantity);
        }
        Storage.set(Storage.KEYS.OUTPUTS, outputs.filter(o => o.id !== id));
    }
};

// Export global
window.Outputs = Outputs;
