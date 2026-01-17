// ============= SQLite Database Setup (sql.js) =============
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'stockpro.db');
let db = null;

// Initialize database
async function initDB() {
    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            unit TEXT,
            quantity REAL DEFAULT 0,
            minStock REAL DEFAULT 0,
            avgConsumption REAL DEFAULT 0,
            price REAL DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS outputs (
            id TEXT PRIMARY KEY,
            productId TEXT,
            quantity REAL,
            reason TEXT,
            date TEXT,
            createdAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS deliveries (
            id TEXT PRIMARY KEY,
            date TEXT,
            supplier TEXT,
            photoUrl TEXT,
            items TEXT,
            createdAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            portions INTEGER DEFAULT 1,
            photoUrl TEXT,
            dietaryTags TEXT,
            ingredients TEXT,
            instructions TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clinic_menus (
            id TEXT PRIMARY KEY,
            date TEXT UNIQUE,
            patientLunch TEXT,
            patientDinner TEXT,
            staffLunch TEXT,
            punctualOrders TEXT,
            notes TEXT,
            forecast TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            contact TEXT,
            orderDays TEXT,
            deliveryDays TEXT,
            notes TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            dataUrl TEXT,
            type TEXT,
            description TEXT,
            createdAt TEXT
        )
    `);

    saveDB();
    console.log('✅ Base de données initialisée');
    return db;
}

// Save database to file
function saveDB() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Helper functions
const DB = {
    async init() {
        if (!db) await initDB();
        return db;
    },

    getAll(table) {
        const result = db.exec(`SELECT * FROM ${table}`);
        if (result.length === 0) return [];
        return result[0].values.map(row => {
            const obj = {};
            result[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
    },

    getById(table, id) {
        const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    },

    getByField(table, field, value) {
        const result = db.exec(`SELECT * FROM ${table} WHERE ${field} = '${value}'`);
        if (result.length === 0) return [];
        return result[0].values.map(row => {
            const obj = {};
            result[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
    },

    insert(table, data) {
        const keys = Object.keys(data);
        const values = keys.map(k => {
            const v = data[k];
            return v === null || v === undefined ? null : v;
        });
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        db.run(sql, values);
        saveDB();
    },

    update(table, id, data) {
        const existing = this.getById(table, id);
        if (existing) {
            const merged = { ...existing, ...data };
            this.insert(table, merged);
        }
    },

    delete(table, id) {
        db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
        saveDB();
    },

    // Import from localStorage format
    importFromLocalStorage(data) {
        if (data.products) {
            data.products.forEach(p => this.insert('products', {
                ...p,
                createdAt: p.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
        }
        if (data.outputs) {
            data.outputs.forEach(o => this.insert('outputs', {
                ...o,
                createdAt: o.createdAt || new Date().toISOString()
            }));
        }
        if (data.deliveries) {
            data.deliveries.forEach(d => this.insert('deliveries', {
                ...d,
                items: JSON.stringify(d.items || []),
                createdAt: d.createdAt || new Date().toISOString()
            }));
        }
        if (data.recipes) {
            data.recipes.forEach(r => this.insert('recipes', {
                ...r,
                dietaryTags: JSON.stringify(r.dietaryTags || []),
                ingredients: JSON.stringify(r.ingredients || []),
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
        }
        if (data.suppliers) {
            data.suppliers.forEach(s => this.insert('suppliers', {
                ...s,
                orderDays: JSON.stringify(s.orderDays || []),
                deliveryDays: JSON.stringify(s.deliveryDays || []),
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
        }
        saveDB();
    },

    // Export to localStorage format
    exportToLocalStorage() {
        const parseJSON = (str) => {
            try { return JSON.parse(str); } catch { return str; }
        };

        return {
            products: this.getAll('products'),
            outputs: this.getAll('outputs'),
            deliveries: this.getAll('deliveries').map(d => ({
                ...d,
                items: parseJSON(d.items)
            })),
            recipes: this.getAll('recipes').map(r => ({
                ...r,
                dietaryTags: parseJSON(r.dietaryTags),
                ingredients: parseJSON(r.ingredients)
            })),
            clinic_menus: this.getAll('clinic_menus').map(m => ({
                ...m,
                patientLunch: parseJSON(m.patientLunch),
                patientDinner: parseJSON(m.patientDinner),
                staffLunch: parseJSON(m.staffLunch),
                punctualOrders: parseJSON(m.punctualOrders),
                forecast: parseJSON(m.forecast)
            })),
            suppliers: this.getAll('suppliers').map(s => ({
                ...s,
                orderDays: parseJSON(s.orderDays),
                deliveryDays: parseJSON(s.deliveryDays)
            })),
            photos: this.getAll('photos')
        };
    }
};

module.exports = { DB, initDB };
