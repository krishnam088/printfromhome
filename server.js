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

// Database Files
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const STORE_CONFIG_FILE = path.join(__dirname, 'store_config.json');

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
if (!fs.existsSync(STORE_CONFIG_FILE)) fs.writeFileSync(STORE_CONFIG_FILE, JSON.stringify({ isOpen: true }));

function readUsersFromDatabase() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveUsersToDatabase(usersArray) {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2)); } catch (e) {}
}

function readOrdersFromDatabase() {
    try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveOrdersToDatabase(ordersArray) {
    try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersArray, null, 2)); } catch (e) {}
}

function getStoreConfig() {
    try { return JSON.parse(fs.readFileSync(STORE_CONFIG_FILE, 'utf8')); } catch (e) { return { isOpen: true }; }
}
function saveStoreConfig(config) {
    try { fs.writeFileSync(STORE_CONFIG_FILE, JSON.stringify(config, null, 2)); } catch (e) {}
}

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

// Web entry & Manifest cache control routes
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/manifest-festive.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'manifest-festive.json'));
});

app.get('/sw-admin.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw-admin.js')); });
app.get('/sw.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw.js')); });

// Store Status APIs
app.get('/api/store-status', (req, res) => {
    const config = getStoreConfig();
    res.json({ success: true, isOpen: config.isOpen });
});

const handleStoreToggle = (req, res) => {
    try {
        const { isOpen } = req.body;
        const updatedConfig = { isOpen: Boolean(isOpen), updatedAt: new Date().toISOString() };
        saveStoreConfig(updatedConfig);
        res.json({ success: true, isOpen: updatedConfig.isOpen });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/store-status/toggle', handleStoreToggle);
app.post('/api/admin/toggle-store', handleStoreToggle);

// Auth APIs
app.post('/api/auth/signup', (req, res) => {
    try {
        const { name, identity, password } = req.body;
        const usersFromFile = readUsersFromDatabase();
        const combinedUsers = [...usersFromFile, ...globalUsersDatabaseArray];
        
        if (combinedUsers.some(u => u.identity.toLowerCase() === identity.toLowerCase().trim())) {
            return res.status(400).json({ success: false, message: "Already registered!" });
        }

        const newUser = { name: name.trim(), identity: identity.toLowerCase().trim(), password, dateCreated: new Date().toLocaleString() };
        globalUsersDatabaseArray.push(newUser);
        usersFromFile.push(newUser);
        saveUsersToDatabase(usersFromFile);

        res.status(201).json({ success: true, userId: newUser.identity, name: newUser.name });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { identity, password } = req.body;
        const usersFromFile = readUsersFromDatabase();
        const combinedUsers = [...usersFromFile, ...globalUsersDatabaseArray];
        const user = combinedUsers.find(u => u.identity.toLowerCase() === identity.toLowerCase().trim() && u.password === password);
        
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        res.json({ success: true, name: user.name, identity: user.identity });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Orders & Payments
app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        const storeConf = getStoreConfig();
        if (!storeConf.isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        const { totalAmount, configDetails, address, customerName, phone } = req.body;
        const finalAmount = totalAmount ? totalAmount.trim() : "42";
        const razorpayOrder = await razorpay.orders.create({ amount: Math.round(parseFloat(finalAmount) * 100), currency: "INR", receipt: `rcpt_${Date.now()}` });
        
        const filesMappedList = req.files ? req.files.map(f => ({ name: f.originalname, filename: f.filename, url: `/uploads/${f.filename}` })) : [];
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
            status: 'Pending Payment',
            date: new Date().toLocaleString(),
            timestamp: new Date().toISOString()
        };

        orders = readOrdersFromDatabase();
        orders.push(newOrder);
        saveOrdersToDatabase(orders);

        res.status(201).json({ success: true, order_id: razorpayOrder.id, amount: razorpayOrder.amount, key_id: razorpay.key_id });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order failed" });
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
            return res.json({ success: true });
        }
        res.status(404).json({ success: false });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/admin/orders', (req, res) => { 
    orders = readOrdersFromDatabase();
    res.json(orders); 
});

const handleStatusUpdate = (req, res) => {
    const orderId = req.params.orderId || req.body.orderId;
    const status = req.body.status;
    orders = readOrdersFromDatabase();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        order.status = status; 
        saveOrdersToDatabase(orders);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false });
};

app.post('/api/admin/orders/update-status', handleStatusUpdate);
app.post('/api/admin/orders/:orderId/status', handleStatusUpdate);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});