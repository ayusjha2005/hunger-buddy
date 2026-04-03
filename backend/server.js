const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();

// ── CORS: allow local dev + deployed frontend ──────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,   // set on Render: e.g. https://hunger-buddy.vercel.app
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // allow requests with no origin (Postman, curl, etc.)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Models
const Outlet   = require('./models/Outlet');
const MenuItem = require('./models/MenuItem');

// ── C++ Engine path: .exe on Windows, plain binary on Linux ────
function getEnginePath() {
    const isWin = process.platform === 'win32';
    return isWin
        ? path.join(__dirname, '../cpp_engine/engine.exe')
        : path.join(__dirname, '../cpp_engine/engine');
}

// Async wrapper — falls back to JS implementations if engine fails
function runCppEngine(action, payload) {
    return new Promise((resolve, reject) => {
        const enginePath = getEnginePath();
        let child;
        try {
            child = spawn(enginePath, []);
        } catch (spawnErr) {
            return reject(new Error('Engine not found: ' + spawnErr.message));
        }

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => { output += data.toString(); });
        child.stderr.on('data', (data) => { errorOutput += data.toString(); });

        child.on('error', (err) => reject(new Error('Spawn error: ' + err.message)));

        child.on('close', (code) => {
            if (code !== 0) {
                console.error('C++ Error:', errorOutput);
                reject(new Error(`Engine exited ${code}. ${errorOutput}`));
            } else {
                try {
                    const result = JSON.parse(output);
                    if (result.error) reject(new Error(result.error));
                    else resolve(result);
                } catch (e) {
                    reject(new Error('Failed to parse engine output'));
                }
            }
        });

        child.stdin.write(JSON.stringify({ action, ...payload }) + '\n');
        child.stdin.end();
    });
}

// ── JS fallbacks (used when C++ engine unavailable) ────────────
function jsFallback(action, payload) {
    if (action === 'sort') {
        const arr = [...payload.menu];
        const key = payload.sortBy === 'price' ? 'price' : 'name';
        arr.sort((a, b) => (a[key] > b[key] ? 1 : -1));
        return { result: arr };
    }
    if (action === 'search') {
        const found = payload.menu.find(
            item => item.name.toLowerCase() === payload.targetName.toLowerCase()
        );
        return { result: found || null };
    }
    if (action === 'add_cart') {
        return { result: [...payload.cart, payload.newItem] };
    }
    if (action === 'queue_wait') {
        return { wait_time: (payload.queue_orders.length + 1) * 7 };
    }
    throw new Error('Unknown action: ' + action);
}

async function runEngine(action, payload) {
    try {
        return await runCppEngine(action, payload);
    } catch (err) {
        console.warn(`C++ engine failed (${err.message}), using JS fallback.`);
        return jsFallback(action, payload);
    }
}

// ── Routes ─────────────────────────────────────────────────────
app.get('/api/outlets', async (req, res) => {
    try {
        const outlets = await Outlet.find();
        res.json(outlets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/menu/:outletId', async (req, res) => {
    try {
        const menu = await MenuItem.find({ outletId: req.params.outletId });
        res.json(menu);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/menu/sort', async (req, res) => {
    try {
        const { outletId, sortBy } = req.body;
        const menu = await MenuItem.find({ outletId }).lean();
        const result = await runEngine('sort', { menu, sortBy });
        res.json(result.result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/menu/search', async (req, res) => {
    try {
        const { outletId, targetName } = req.body;
        const menu = await MenuItem.find({ outletId }).lean();
        const result = await runEngine('search', { menu, targetName });
        res.json(result.result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cart/add', async (req, res) => {
    try {
        const { cart, newItem } = req.body;
        const result = await runEngine('add_cart', { cart, newItem });
        res.json(result.result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/order/simulate', async (req, res) => {
    try {
        const existingQueueLength = Math.floor(Math.random() * 5);
        const existingQueue = Array(existingQueueLength).fill({ status: 'processing' });
        const queueRes = await runEngine('queue_wait', { queue_orders: existingQueue });
        res.json({ success: true, waitTimeMinutes: queueRes.wait_time });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check route for Render
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Seed Data Route
app.post('/api/seed', async (req, res) => {
    try {
        await Outlet.deleteMany({});
        await MenuItem.deleteMany({});

        const oasis = new Outlet({
            name: 'Oasis Kitchens',
            location: 'Food Court, Block A',
            rating: 4.7,
            imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=60'
        });
        const puriVuri = new Outlet({
            name: 'Puri Vuri Express',
            location: 'Food Court, Block B',
            rating: 4.5,
            imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=60'
        });
        const cakeStories = new Outlet({
            name: 'Cake Stories',
            location: 'Food Court, Block C',
            rating: 4.8,
            imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=60'
        });
        await Outlet.insertMany([oasis, puriVuri, cakeStories]);

        const IMG = {
            pizzaVeg:      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80',
            pizzaVeg2:     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
            pizzaVeg3:     'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
            pizzaChicken:  'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80',
            pizzaChicken2: 'https://images.unsplash.com/photo-1604917877934-07d8d248d396?auto=format&fit=crop&w=400&q=80',
            sandwich:      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=400&q=80',
            clubSandwich:  'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
            garlicBread:   'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&q=80',
            cheeseBread:   'https://images.unsplash.com/photo-1585238341710-4d3ff484184d?auto=format&fit=crop&w=400&q=80',
            chickenBread:  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
            fries:         'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=400&q=80',
            cheeseFries:   'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=400&q=80',
            nuggets:       'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=400&q=80',
            cheeseBalls:   'https://images.unsplash.com/photo-1571066811602-716837d681de?auto=format&fit=crop&w=400&q=80',
            wings:         'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80',
            chickenStrips: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=400&q=80',
            lollipop:      'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=400&q=80',
            vegRoll:       'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=400&q=80',
            paneerRoll:    'https://images.unsplash.com/photo-1605908502724-9093a79a1b39?auto=format&fit=crop&w=400&q=80',
            chickenRoll:   'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=400&q=80',
            shawarma:      'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80',
            paniPuri:      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=400&q=80',
            dahiPuri:      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=400&q=80',
            kachori:       'https://images.unsplash.com/photo-1630408788978-24e0f3b62d11?auto=format&fit=crop&w=400&q=80',
            alooTikki:     'https://images.unsplash.com/photo-1630408788978-24e0f3b62d11?auto=format&fit=crop&w=400&q=80',
            chocoCake:     'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80',
            redVelvet:     'https://images.unsplash.com/photo-1535141192574-5f1bb5e36c6c?auto=format&fit=crop&w=400&q=80',
        };

        await MenuItem.insertMany([
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Margherita Pizza', price: 140, imageUrl: IMG.pizzaVeg, description: 'Classic tomato base with fresh mozzarella & basil.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Triple Treat Pizza', price: 160, imageUrl: IMG.pizzaVeg2, description: 'Three-cheese loaded veggie delight.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Uni Corn Cheese Pizza', price: 160, imageUrl: IMG.pizzaVeg3, description: 'Sweet corn with creamy cheese and herbs.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Mumbai Style Pizza', price: 180, imageUrl: IMG.pizzaVeg2, description: 'Tangy chutney base with street-style toppings.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Paneer Tikka Pizza', price: 180, imageUrl: IMG.pizzaVeg3, description: 'Spiced paneer chunks on a cheesy crust.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Mushroom Pizza', price: 180, imageUrl: IMG.pizzaVeg, description: 'Sautéed mushrooms with garlic and oregano.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'BBQ Paneer Pizza', price: 180, imageUrl: IMG.pizzaVeg2, description: 'Smoky BBQ sauce with grilled paneer.' },
            { outletId: oasis._id, subCategory: 'Pizza (Veg)', category: 'Veg', name: 'Farm House Pizza', price: 180, imageUrl: IMG.pizzaVeg3, description: 'Garden fresh veggies on a crispy base.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Chicken Tikka Pizza', price: 220, imageUrl: IMG.pizzaChicken, description: 'Marinated chicken tikka with smoky flavours.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Peri Peri Chicken Pizza', price: 230, imageUrl: IMG.pizzaChicken2, description: 'Spicy peri peri sauce with grilled chicken.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'BBQ Chicken Pizza', price: 230, imageUrl: IMG.pizzaChicken, description: 'Juicy BBQ chicken strips on cheesy base.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Mumbai Style Chicken Pizza', price: 230, imageUrl: IMG.pizzaChicken2, description: 'Desi-style chicken with chutney base.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Tandoori Chicken Pizza', price: 240, imageUrl: IMG.pizzaChicken, description: 'Tandoor-roasted chicken with capsicum.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Pepper BBQ Chicken Pizza', price: 240, imageUrl: IMG.pizzaChicken2, description: 'Cracked pepper and BBQ chicken combination.' },
            { outletId: oasis._id, subCategory: 'Pizza (Non-Veg)', category: 'Non-Veg', name: 'Farm House Chicken Pizza', price: 240, imageUrl: IMG.pizzaChicken, description: 'Premium loaded chicken and vegetable pizza.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'Chicken Sandwich', price: 180, imageUrl: IMG.sandwich, description: 'Grilled chicken with fresh veggies and sauce.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'Chicken Keema Sandwich', price: 190, imageUrl: IMG.sandwich, description: 'Spiced chicken mince with tangy chutney.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'American Chicken Club Sandwich', price: 200, imageUrl: IMG.clubSandwich, description: 'Triple-decker with chicken, lettuce and cheese.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'Chicken Tikka Sandwich', price: 200, imageUrl: IMG.sandwich, description: 'Tikka-marinated chicken in a toasted bun.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'Mumbai Style Chicken Sandwich', price: 200, imageUrl: IMG.clubSandwich, description: 'Street-style spiced chicken with green chutney.' },
            { outletId: oasis._id, subCategory: 'Sandwiches', category: 'Non-Veg', name: 'Oasis Melt Chicken Sandwich', price: 200, imageUrl: IMG.sandwich, description: 'Signature melted cheese and chicken combo.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Veg', name: 'Cheese Toast Garlic Bread', price: 140, imageUrl: IMG.garlicBread, description: 'Crispy garlic toast loaded with cheese.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Veg', name: 'Cheese Corn Garlic Bread', price: 140, imageUrl: IMG.cheeseBread, description: 'Sweet corn and cheddar on garlic toast.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Veg', name: 'Stuffed Garlic Bread Exotica', price: 150, imageUrl: IMG.cheeseBread, description: 'Oven-stuffed with exotic veggie filling.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Veg', name: 'Triple Cheese Garlic Bread', price: 160, imageUrl: IMG.garlicBread, description: 'Three-cheese melt on crispy garlic base.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Veg', name: 'Mushroom Arabita', price: 200, imageUrl: IMG.cheeseBread, description: 'Sautéed mushrooms in arabiata sauce on bread.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Non-Veg', name: 'Chicken Garlic Bread', price: 160, imageUrl: IMG.chickenBread, description: 'Juicy chicken topped garlic bread.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Non-Veg', name: 'Chicken Cheese Garlic Bread', price: 170, imageUrl: IMG.chickenBread, description: 'Chicken and melted cheese on crispy garlic base.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Non-Veg', name: 'Masala Keema Garlic Bread', price: 170, imageUrl: IMG.chickenBread, description: 'Spiced minced chicken on toasted garlic bread.' },
            { outletId: oasis._id, subCategory: 'Garlic Breads', category: 'Non-Veg', name: 'Chicken Tikka Garlic Bread', price: 180, imageUrl: IMG.chickenBread, description: 'Tikka-marinated chicken on herb garlic base.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Veg Stix', price: 90, imageUrl: IMG.fries, description: 'Crispy vegetable sticks with dipping sauce.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Jalapeno Cheeseballs', price: 100, imageUrl: IMG.cheeseBalls, description: 'Golden cheeseballs with a jalapeño kick.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'French Fries', price: 120, imageUrl: IMG.fries, description: 'Classic golden crispy fries.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Peri Peri Fries', price: 120, imageUrl: IMG.fries, description: 'Spicy peri peri seasoned fries.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Cheese Fries', price: 120, imageUrl: IMG.cheeseFries, description: 'Crispy fries smothered in cheese sauce.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Veg Nuggets', price: 130, imageUrl: IMG.nuggets, description: 'Golden veggie nuggets with dipping sauce.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Veg', name: 'Cheese Nuggets', price: 140, imageUrl: IMG.nuggets, description: 'Molten cheese filled crispy nuggets.' },
            { outletId: oasis._id, subCategory: 'Fries & Sides', category: 'Non-Veg', name: 'Chicken Nuggets', price: 140, imageUrl: IMG.nuggets, description: 'Tender chicken nuggets, golden fried.' },
            { outletId: oasis._id, subCategory: 'Fried Chicken', category: 'Non-Veg', name: 'Buffalo Wings (6 pcs)', price: 180, imageUrl: IMG.wings, description: 'Crispy buffalo chicken wings with sauce.' },
            { outletId: oasis._id, subCategory: 'Fried Chicken', category: 'Non-Veg', name: 'Buffalo Chicken Strips (6 pcs)', price: 200, imageUrl: IMG.chickenStrips, description: 'Juicy chicken strips in buffalo coating.' },
            { outletId: oasis._id, subCategory: 'Fried Chicken', category: 'Non-Veg', name: 'Popcorn Chicken (Small)', price: 150, imageUrl: IMG.lollipop, description: 'Bite-sized crispy popcorn chicken.' },
            { outletId: oasis._id, subCategory: 'Fried Chicken', category: 'Non-Veg', name: 'Popcorn Chicken (Large)', price: 200, imageUrl: IMG.lollipop, description: 'Large portion of crispy popcorn chicken.' },
            { outletId: oasis._id, subCategory: 'Fried Chicken', category: 'Non-Veg', name: 'Fried Lollipop (5 pcs)', price: 200, imageUrl: IMG.wings, description: 'Spiced chicken lollipops, deep fried.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Veg', name: 'Chat-Pata Frankie', price: 90, imageUrl: IMG.vegRoll, description: 'Tangy spiced vegetable roll.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Veg', name: 'Easy Paneer Frankie', price: 100, imageUrl: IMG.paneerRoll, description: 'Soft paneer and veggies in a warm wrap.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Veg', name: 'Paneer Tikka Frankie', price: 100, imageUrl: IMG.paneerRoll, description: 'Tikka spiced grilled paneer frankie.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Non-Veg', name: 'Egg Spread Frankie', price: 110, imageUrl: IMG.chickenRoll, description: 'Egg base spread with tangy chutney.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Non-Veg', name: 'Bombay Street Chicken Frankie', price: 120, imageUrl: IMG.chickenRoll, description: 'Street-style spiced chicken in a roll.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Non-Veg', name: 'Chettinad Chicken Frankie', price: 120, imageUrl: IMG.chickenRoll, description: 'South Indian chettinad spiced chicken wrap.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Non-Veg', name: 'Crispy Chicken Frankie', price: 130, imageUrl: IMG.chickenRoll, description: 'Crunchy fried chicken wrapped in soft bread.' },
            { outletId: oasis._id, subCategory: 'Frankies', category: 'Non-Veg', name: 'Punjabi Chicken Tikka Frankie', price: 130, imageUrl: IMG.chickenRoll, description: 'Punjabi-style tikka chicken in a hearty roll.' },
            { outletId: oasis._id, subCategory: 'Shawarma', category: 'Non-Veg', name: 'Classic Arabian Shawarma', price: 150, imageUrl: IMG.shawarma, description: 'Traditional Arabian chicken shawarma.' },
            { outletId: oasis._id, subCategory: 'Shawarma', category: 'Non-Veg', name: 'Roasted Chicken Shawarma', price: 150, imageUrl: IMG.shawarma, description: 'Slow-roasted chicken with garlic sauce.' },
            { outletId: oasis._id, subCategory: 'Shawarma', category: 'Non-Veg', name: 'Persian Barbeque Shawarma', price: 150, imageUrl: IMG.shawarma, description: 'Persian-spiced BBQ wrap with fresh salad.' },
            { outletId: oasis._id, subCategory: 'Shawarma', category: 'Non-Veg', name: 'Arabian Special Chicken Shawarma', price: 160, imageUrl: IMG.shawarma, description: 'Special house-blend spiced chicken shawarma.' },
        ]);

        await MenuItem.insertMany([
            { outletId: puriVuri._id, subCategory: 'Pani Puri', category: 'Veg', name: 'Pani Puri', price: 50, imageUrl: IMG.paniPuri, description: 'Crispy puris filled with spiced water and filling.' },
            { outletId: puriVuri._id, subCategory: 'Pani Puri', category: 'Veg', name: 'Dahi Puri', price: 80, imageUrl: IMG.dahiPuri, description: 'Puris filled with yogurt, chutneys and sev.' },
            { outletId: puriVuri._id, subCategory: 'Chaat', category: 'Veg', name: 'Raj Kachori', price: 100, imageUrl: IMG.kachori, description: 'Giant kachori with yogurt, chutneys and sprouts.' },
            { outletId: puriVuri._id, subCategory: 'Chaat', category: 'Veg', name: 'Aloo Tikki', price: 90, imageUrl: IMG.alooTikki, description: 'Crispy potato patties with tangy chutneys.' },
        ]);

        await MenuItem.insertMany([
            { outletId: cakeStories._id, subCategory: 'Cakes', category: 'Veg', name: 'Chocolate Cake', price: 80, imageUrl: IMG.chocoCake, description: 'Rich dark chocolate layered cake.' },
            { outletId: cakeStories._id, subCategory: 'Cakes', category: 'Veg', name: 'Red Velvet Cake', price: 120, imageUrl: IMG.redVelvet, description: 'Velvety red cake with cream cheese frosting.' },
        ]);

        res.json({ message: 'Seed data inserted! 3 outlets, full menus.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Backend running on port ${process.env.PORT || 5000}`);
    });
}).catch(err => {
    console.error('Mongo connection error:', err);
});
