// ============= StockPro Server - Express API =============
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { DB, initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve index-modular.html as the default for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index-modular.html'));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// File upload config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ============= API Routes =============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============= Products =============
app.get('/api/products', (req, res) => {
    try {
        const products = DB.getAll('products');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', (req, res) => {
    try {
        const product = {
            ...req.body,
            id: req.body.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DB.insert('products', product);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    try {
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        DB.update('products', req.params.id, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        DB.delete('products', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Outputs =============
app.get('/api/outputs', (req, res) => {
    try {
        const outputs = DB.getAll('outputs');
        res.json(outputs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/outputs', (req, res) => {
    try {
        const output = {
            ...req.body,
            id: req.body.id || 'out_' + Date.now(),
            createdAt: new Date().toISOString()
        };

        // Update product quantity
        const product = DB.getById('products', output.productId);
        if (product) {
            const newQty = Math.max(0, (product.quantity || 0) - output.quantity);
            DB.update('products', output.productId, { quantity: newQty, updatedAt: new Date().toISOString() });
        }

        DB.insert('outputs', output);
        res.json(output);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/outputs/:id', (req, res) => {
    try {
        DB.delete('outputs', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Deliveries =============
app.get('/api/deliveries', (req, res) => {
    try {
        const deliveries = DB.getAll('deliveries').map(d => ({
            ...d,
            items: JSON.parse(d.items || '[]')
        }));
        res.json(deliveries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/deliveries', (req, res) => {
    try {
        const delivery = {
            id: req.body.id || 'del_' + Date.now(),
            date: req.body.date,
            supplier: req.body.supplier,
            photoUrl: req.body.photoUrl || null,
            items: JSON.stringify(req.body.items || []),
            createdAt: new Date().toISOString()
        };

        // Update product quantities
        (req.body.items || []).forEach(item => {
            const product = DB.getById('products', item.productId);
            if (product) {
                const newQty = (product.quantity || 0) + (item.quantity || 0);
                const newPrice = item.price || product.price;
                DB.update('products', item.productId, {
                    quantity: newQty,
                    price: newPrice,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        DB.insert('deliveries', delivery);
        res.json({ ...delivery, items: req.body.items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/deliveries/:id', (req, res) => {
    try {
        DB.delete('deliveries', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Recipes =============
app.get('/api/recipes', (req, res) => {
    try {
        const recipes = DB.getAll('recipes').map(r => ({
            ...r,
            dietaryTags: JSON.parse(r.dietaryTags || '[]'),
            ingredients: JSON.parse(r.ingredients || '[]')
        }));
        res.json(recipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/recipes', (req, res) => {
    try {
        const recipe = {
            id: req.body.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: req.body.name,
            portions: req.body.portions || 1,
            photoUrl: req.body.photoUrl || null,
            dietaryTags: JSON.stringify(req.body.dietaryTags || []),
            ingredients: JSON.stringify(req.body.ingredients || []),
            instructions: req.body.instructions || '',
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DB.insert('recipes', recipe);
        res.json({ ...recipe, dietaryTags: req.body.dietaryTags, ingredients: req.body.ingredients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/recipes/:id', (req, res) => {
    try {
        DB.delete('recipes', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Clinic Menus =============
app.get('/api/menus', (req, res) => {
    try {
        const menus = DB.getAll('clinic_menus').map(m => ({
            ...m,
            patientLunch: JSON.parse(m.patientLunch || 'null'),
            patientDinner: JSON.parse(m.patientDinner || 'null'),
            staffLunch: JSON.parse(m.staffLunch || 'null'),
            punctualOrders: JSON.parse(m.punctualOrders || '[]'),
            forecast: JSON.parse(m.forecast || '{}')
        }));
        res.json(menus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/menus/:date', (req, res) => {
    try {
        const menus = DB.getByField('clinic_menus', 'date', req.params.date);
        if (menus.length === 0) {
            res.json(null);
        } else {
            const m = menus[0];
            res.json({
                ...m,
                patientLunch: JSON.parse(m.patientLunch || 'null'),
                patientDinner: JSON.parse(m.patientDinner || 'null'),
                staffLunch: JSON.parse(m.staffLunch || 'null'),
                punctualOrders: JSON.parse(m.punctualOrders || '[]'),
                forecast: JSON.parse(m.forecast || '{}')
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/menus', (req, res) => {
    try {
        const menu = {
            id: req.body.id || 'menu_' + Date.now(),
            date: req.body.date,
            patientLunch: JSON.stringify(req.body.patientLunch || null),
            patientDinner: JSON.stringify(req.body.patientDinner || null),
            staffLunch: JSON.stringify(req.body.staffLunch || null),
            punctualOrders: JSON.stringify(req.body.punctualOrders || []),
            notes: req.body.notes || '',
            forecast: JSON.stringify(req.body.forecast || {}),
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DB.insert('clinic_menus', menu);
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Suppliers =============
app.get('/api/suppliers', (req, res) => {
    try {
        const suppliers = DB.getAll('suppliers').map(s => ({
            ...s,
            orderDays: JSON.parse(s.orderDays || '[]'),
            deliveryDays: JSON.parse(s.deliveryDays || '[]')
        }));
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suppliers', (req, res) => {
    try {
        const supplier = {
            id: req.body.id || 'sup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: req.body.name,
            phone: req.body.phone || '',
            email: req.body.email || '',
            contact: req.body.contact || '',
            orderDays: JSON.stringify(req.body.orderDays || []),
            deliveryDays: JSON.stringify(req.body.deliveryDays || []),
            notes: req.body.notes || '',
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        DB.insert('suppliers', supplier);
        res.json({ ...supplier, orderDays: req.body.orderDays, deliveryDays: req.body.deliveryDays });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/suppliers/:id', (req, res) => {
    try {
        DB.delete('suppliers', req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Sync Endpoint =============
app.post('/api/sync', (req, res) => {
    try {
        const { lastSync, changes } = req.body;

        // Apply incoming changes
        if (changes) {
            changes.forEach(change => {
                if (change.operation === 'create' || change.operation === 'update') {
                    DB.insert(change.table, change.data);
                } else if (change.operation === 'delete') {
                    DB.delete(change.table, change.recordId);
                }
            });
        }

        // Return all data for full sync
        const data = DB.exportToLocalStorage();
        res.json({
            success: true,
            data,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Import LocalStorage Data =============
app.post('/api/import', (req, res) => {
    try {
        DB.importFromLocalStorage(req.body);
        res.json({ success: true, message: 'Données importées avec succès' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export all data
app.get('/api/export', (req, res) => {
    try {
        const data = DB.exportToLocalStorage();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Today's reminders =============
app.get('/api/reminders', (req, res) => {
    try {
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const today = days[new Date().getDay()];

        const suppliers = DB.getAll('suppliers').map(s => ({
            ...s,
            orderDays: JSON.parse(s.orderDays || '[]'),
            deliveryDays: JSON.parse(s.deliveryDays || '[]')
        }));

        const orderReminders = suppliers.filter(s => s.orderDays.includes(today));
        const deliveryReminders = suppliers.filter(s => s.deliveryDays.includes(today));

        // Get low stock products
        const products = DB.getAll('products');
        const lowStock = products.filter(p => {
            const qty = p.quantity || 0;
            const min = p.minStock || 0;
            return min > 0 && qty <= min * 1.5;
        });

        res.json({
            orderReminders,
            deliveryReminders,
            lowStock,
            today
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= Serve PWA files =============
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'mobile.html'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'service-worker.js'));
});

// Start server
async function startServer() {
    // Initialize database first
    await initDB();

    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║          🏥 StockPro Clinique - Serveur                ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║  Local:    http://localhost:${PORT}                       ║`);
        console.log(`║  Réseau:   http://0.0.0.0:${PORT}                         ║`);
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║  📱 Mobile: http://localhost:' + PORT + '/mobile              ║');
        console.log('║  🖥️  PC:     http://localhost:' + PORT + '/index.html         ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log('║  Pour accès internet: ngrok http ' + PORT + '                 ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
    });
}

startServer().catch(console.error);
