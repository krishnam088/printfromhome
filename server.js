const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔥 PERMANENT DATABASE FILES FOR CLOUD CORES
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const STORE_CONFIG_FILE = path.join(__dirname, 'store_config.json');

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
if (!fs.existsSync(STORE_CONFIG_FILE)) fs.writeFileSync(STORE_CONFIG_FILE, JSON.stringify({ isOpen: true }));

// Helpers for File DB
function readUsersFromDatabase() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveUsersToDatabase(usersArray) {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2)); } catch (e) { console.error("❌ DB write failure:", e); }
}

function readOrdersFromDatabase() {
    try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveOrdersToDatabase(ordersArray) {
    try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersArray, null, 2)); } catch (e) { console.error("❌ Orders write failure:", e); }
}

function getStoreConfig() {
    try { return JSON.parse(fs.readFileSync(STORE_CONFIG_FILE, 'utf8')); } catch (e) { return { isOpen: true }; }
}
function saveStoreConfig(config) {
    try { fs.writeFileSync(STORE_CONFIG_FILE, JSON.stringify(config, null, 2)); } catch (e) { console.error("❌ Config write failure:", e); }
}

// In-Memory Fallbacks
let globalUsersDatabaseArray = [];
let orders = readOrdersFromDatabase();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sz27MnobxedYSU', 
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

// 🌐 Web entry & isolated app routing
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/manifest-admin.json', (req, res) => { res.sendFile(path.join(__dirname, 'manifest-admin.json')); });
app.get('/sw-admin.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw-admin.js')); });
app.get('/sw.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw.js')); });

// ====================================================================
// 🏪 REMOTE STORE OPERATION CONFIGURATIONS (PERSISTENT)
// ====================================================================

app.get('/api/store-status', (req, res) => {
    const config = getStoreConfig();
    res.json({ success: true, isOpen: config.isOpen });
});

// Toggle handler supporting both routes
const handleStoreToggle = (req, res) => {
    try {
        const { isOpen } = req.body;
        if (typeof isOpen !== 'boolean') {
            return res.status(400).json({ success: false, message: "Invalid flag configurations!" });
        }
        const updatedConfig = { isOpen: isOpen, updatedAt: new Date().toISOString() };
        saveStoreConfig(updatedConfig);
        console.log(`🏪 Operations Parameter Overwritten by Admin: ${isOpen ? 'OPEN' : 'CLOSED'}`);
        res.json({ success: true, isOpen: updatedConfig.isOpen, message: `Store infrastructure synced to ${isOpen ? 'OPEN' : 'CLOSED'}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/store-status/toggle', handleStoreToggle);
app.post('/api/admin/toggle-store', handleStoreToggle);

// ====================================================================
// 🔥 UNLIMITED AUTH API SYSTEMS
// ====================================================================

app.post('/api/auth/signup', (req, res) => {
    try {
        const { name, identity, password } = req.body;
        if (!identity || !password || !name) {
            return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
        }

        const usersFromFile = readUsersFromDatabase();
        const combinedUsers = [...usersFromFile, ...globalUsersDatabaseArray];
        
        const userExists = combinedUsers.some(u => u.identity.toLowerCase() === identity.toLowerCase().trim());
        if (userExists) {
            return res.status(400).json({ success: false, message: "Yeh Gmail/Phone pehle se registered hai bhai!" });
        }

        const newUser = {
            name: name.trim(),
            identity: identity.toLowerCase().trim(),
            password: password,
            dateCreated: new Date().toLocaleString()
        };

        globalUsersDatabaseArray.push(newUser);
        
        const freshFileUsers = readUsersFromDatabase();
        freshFileUsers.push(newUser);
        saveUsersToDatabase(freshFileUsers);

        res.status(201).json({ success: true, message: "Account created successfully!", userId: newUser.identity, name: newUser.name });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { identity, password } = req.body;
        if (!identity || !password) {
            return res.status(400).json({ success: false, message: "Identity aur password zaroori hain!" });
        }

        const usersFromFile = readUsersFromDatabase();
        const combinedUsers = [...usersFromFile, ...globalUsersDatabaseArray];

        const user = combinedUsers.find(u => u.identity.toLowerCase() === identity.toLowerCase().trim() && u.password === password);
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Galat Credentials! Sahi password daalo bhai." });
        }

        res.json({ success: true, message: "Login successful!", name: user.name, identity: user.identity });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ====================================================================
// 🖨️ ORDERS & PRINT PIPELINES MANAGEMENT
// ====================================================================

app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        const storeConf = getStoreConfig();
        if (!storeConf.isOpen) {
            return res.status(403).json({ success: false, message: "🚨 Dukan abhi band hai bhai! Direct cloud orders blocked." });
        }

        const { totalAmount, configDetails, address, customerName, phone } = req.body;
        const finalAmount = totalAmount ? totalAmount.trim() : "42";
        const amountInPaise = Math.round(parseFloat(finalAmount) * 100);

        const options = {
            amount: amountInPaise || 4200, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);
        const filesMappedList = req.files ? req.files.map(f => ({
            name: f.originalname,
            filename: f.filename,
            url: `/uploads/${f.filename}`
        })) : [];

        let parsedConfig = [];
        try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

        const newOrder = {
            orderId: razorpayOrder.id,
            customerName: customerName || 'Customer',
            phone: phone || 'N/A',
            files: filesMappedList,
            fileUrl: filesMappedList.length > 0 ? filesMappedList[0].url : '',
            fileName: filesMappedList.length > 0 ? filesMappedList[0].name : 'Document.pdf',
            configDetails: parsedConfig,
            pages: parsedConfig.length > 0 ? (parsedConfig[0].pages || 1) : 1,
            copies: parsedConfig.length > 0 ? (parsedConfig[0].copies || 1) : 1,
            printType: parsedConfig.length > 0 ? (parsedConfig[0].isColor ? 'Color' : 'Black & White') : 'Black & White',
            binding: parsedConfig.length > 0 ? (parsedConfig[0].binding || 'None') : 'None',
            address: address || 'N/A',
            amount: finalAmount,
            totalAmount: finalAmount,
            paymentMethod: 'Prepaid (Razorpay)',
            status: 'Pending Payment',
            date: new Date().toLocaleString(),
            timestamp: new Date().toISOString()
        };

        orders = readOrdersFromDatabase();
        orders.push(newOrder);
        saveOrdersToDatabase(orders);

        res.status(201).json({ success: true, order_id: razorpayOrder.id, amount: razorpayOrder.amount, key_id: razorpay.key_id });
    } catch (error) {
        console.error("Order creation failed:", error);
        res.status(500).json({ success: false, message: "Order creation failed." });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        orders = readOrdersFromDatabase();
        const order = orders.find(o => o.orderId === orderId);
        
        if (order) {
            order.status = 'Paid / Ready for Print';
            order.paymentId = paymentId; 
            saveOrdersToDatabase(orders);
            return res.json({ success: true, message: "Payment verified successfully!" });
        }
        res.status(404).json({ success: false, message: "Order not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/financials', (req, res) => {
    try {
        orders = readOrdersFromDatabase();
        const paidOrders = orders.filter(o => o.status === 'Paid / Ready for Print' || o.status === 'Delivered' || o.status === 'Printing' || o.status === 'Out for Delivery');
        let totalRevenue = 0;
        let totalCostPrice = 0;

        paidOrders.forEach(order => {
            const amt = parseFloat(order.amount || order.totalAmount) || 0;
            totalRevenue += amt;

            let orderPages = 0;
            if (order.configDetails && Array.isArray(order.configDetails)) {
                order.configDetails.forEach(f => {
                    orderPages += (parseInt(f.pages) || 1) * (parseInt(f.copies) || 1);
                });
            } else {
                orderPages = (parseInt(order.pages) || 1) * (parseInt(order.copies) || 1);
            }
            totalCostPrice += (orderPages * 1.00) + 15.00;
        });

        const netProfitLoss = totalRevenue - totalCostPrice;

        res.json({
            success: true,
            totalOrders: orders.length,
            revenue: totalRevenue.toFixed(2),
            profitLoss: netProfitLoss.toFixed(2)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/orders', (req, res) => { 
    orders = readOrdersFromDatabase();
    res.json(orders); 
});

// Update order status (support both endpoint patterns)
const handleStatusUpdate = (req, res) => {
    const orderId = req.params.orderId || req.body.orderId;
    const status = req.body.status;
    
    if (!orderId || !status) {
        return res.status(400).json({ success: false, message: "Missing tracking parameters!" });
    }

    orders = readOrdersFromDatabase();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        order.status = status; 
        saveOrdersToDatabase(orders);
        console.log(`📦 Order #${orderId} status set to: ${status}`);
        return res.json({ success: true, message: `Tracking infrastructure updated to ${status}` });
    }
    res.status(404).json({ success: false, message: "Order data missing inside central cores." });
};

app.post('/api/admin/orders/update-status', handleStatusUpdate);
app.post('/api/admin/orders/:orderId/status', handleStatusUpdate);

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) { res.download(filePath); } else { res.status(404).send('File missing'); }
});

app.listen(PORT, () => {
    console.log(`🚀 Print From Home Server running perfectly on port ${PORT}`);
});