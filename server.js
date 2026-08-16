const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB Atlas using MONGO_URI from Render Environment Variables
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 45000
})
    .then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Mongoose Schemas & Models
const userSchema = new mongoose.Schema({
    name: String,
    identity: { type: String, unique: true }, 
    password: String,
    dateCreated: String
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    customerName: String,
    phone: String,
    files: Array,
    fileUrl: String,
    fileName: String,
    configDetails: Array,
    pages: Number,
    copies: Number,
    printType: String,
    binding: String,
    address: String,
    amount: String,
    totalAmount: String,
    status: String,
    date: String,
    timestamp: String,
    paymentId: String
});
const Order = mongoose.model('Order', orderSchema);

const storeConfigSchema = new mongoose.Schema({
    isOpen: { type: Boolean, default: true },
    updatedAt: String
});
const StoreConfig = mongoose.model('StoreConfig', storeConfigSchema);

const productSchema = new mongoose.Schema({
    sku: { type: String, unique: true },
    name: String,
    purchasePrice: Number,
    sellingPrice: Number,
    stockQuantity: Number,
    totalSold: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', productSchema);

// Multer Setup for File Uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// Razorpay Setup
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
app.get('/api/store-status', async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        if (!config) {
            config = await StoreConfig.create({ isOpen: true, updatedAt: new Date().toISOString() });
        }
        res.json({ success: true, isOpen: config.isOpen });
    } catch (err) {
        res.status(500).json({ success: false, isOpen: true });
    }
});

const handleStoreToggle = async (req, res) => {
    try {
        const { isOpen } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) {
            config = new StoreConfig();
        }
        config.isOpen = Boolean(isOpen);
        config.updatedAt = new Date().toISOString();
        await config.save();
        res.json({ success: true, isOpen: config.isOpen });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/store-status/toggle', handleStoreToggle);
app.post('/api/admin/toggle-store', handleStoreToggle);

// --- Auth APIs ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, identity, password } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10); 
        
        const existingUser = await User.findOne({ identity: normalizedIdentity });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "This mobile number is already registered!" });
        }

        const newUser = new User({ 
            name: name.trim(), 
            identity: normalizedIdentity, 
            password, 
            dateCreated: new Date().toLocaleString() 
        });
        
        await newUser.save();
        res.status(201).json({ success: true, userId: newUser.identity, name: newUser.name });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { identity, password } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10); 
        const user = await User.findOne({ identity: normalizedIdentity, password });
        
        if (!user) return res.status(401).json({ success: false, message: "Invalid mobile number or password!" });
        res.json({ success: true, name: user.name, identity: user.identity });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- INVENTORY MANAGEMENT APIS ---
app.post('/api/admin/inventory/add', async (req, res) => {
    try {
        const { sku, name, purchasePrice, sellingPrice, quantity } = req.body;
        let product = await Product.findOne({ sku });
        
        if (product) {
            product.stockQuantity += Number(quantity);
            if (purchasePrice) product.purchasePrice = Number(purchasePrice);
            if (sellingPrice) product.sellingPrice = Number(sellingPrice);
            if (name) product.name = name;
            await product.save();
        } else {
            product = new Product({
                sku,
                name,
                purchasePrice: Number(purchasePrice),
                sellingPrice: Number(sellingPrice),
                stockQuantity: Number(quantity)
            });
            await product.save();
        }
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/inventory/report', async (req, res) => {
    try {
        const products = await Product.find();
        let totalStockValue = 0;
        let totalPotentialProfit = 0;

        products.forEach(p => {
            totalStockValue += (p.purchasePrice || 0) * (p.stockQuantity || 0);
            totalPotentialProfit += ((p.sellingPrice || 0) - (p.purchasePrice || 0)) * (p.totalSold || 0);
        });

        res.json({
            success: true,
            products,
            financials: {
                totalStockValue,
                totalProfitEarned: totalPotentialProfit
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Orders & Payments APIs (Extracting Name and Phone directly from Address/Form payload)
app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        const isOpen = config ? config.isOpen : true;
        if (!isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        const { totalAmount, configDetails, address, customerName, phone, paymentMode } = req.body;
        const finalAmount = totalAmount ? totalAmount.toString().trim() : "42";
        const selectedPaymentMode = paymentMode || "online";

        // Extract Customer Name and Phone from address string if formatted as "... | Contact: Name (Mobile)"
        let parsedCustomerName = customerName || 'Customer';
        let parsedPhone = phone || 'N/A';

        if (address && address.includes('Contact:')) {
            try {
                const contactPart = address.split('Contact:')[1].trim();
                const namePart = contactPart.split('(')[0].trim();
                const phonePart = contactPart.split('(')[1].replace(')', '').trim();
                if (namePart) parsedCustomerName = namePart;
                if (phonePart) parsedPhone = phonePart;
            } catch (e) {}
        }

        const filesMappedList = req.files ? req.files.map(f => ({ name: f.originalname, filename: f.filename, url: `/uploads/${f.filename}` })) : [];
        let parsedConfig = [];
        try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

        // Automatically deduct inventory stock when items are ordered
        if (parsedConfig && parsedConfig.length > 0) {
            for (const item of parsedConfig) {
                if (item.printType === 'snack' || (item.fileName && item.fileName.startsWith('Product:'))) {
                    let prodName = item.fileName.replace('Product: ', '').split(' (Qty:')[0].trim();
                    let qty = item.copies || item.qty || 1;
                    
                    let matchedProd = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });
                    if (matchedProd) {
                        matchedProd.stockQuantity = Math.max(0, matchedProd.stockQuantity - qty);
                        matchedProd.totalSold += qty;
                        await matchedProd.save();
                    }
                }
            }
        }

        // Cash on Delivery (COD) Flow
        if (selectedPaymentMode === 'cod') {
            const codOrderId = 'COD-' + Date.now();
            const newOrder = new Order({
                orderId: codOrderId,
                customerName: parsedCustomerName,
                phone: parsedPhone,
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
                status: 'COD / Ready for Print',
                date: new Date().toLocaleString(),
                timestamp: new Date().toISOString(),
                paymentId: 'CASH ON DELIVERY'
            });

            await newOrder.save();
            return res.status(201).json({ success: true, isCod: true, order_id: codOrderId });
        }

        // Online Razorpay Payment Flow
        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create({ 
                amount: Math.round(parseFloat(finalAmount) * 100), 
                currency: "INR", 
                receipt: `rcpt_${Date.now()}` 
            });
        } catch (rzpErr) {
            console.error("Razorpay API Error:", rzpErr);
            return res.status(500).json({ success: false, message: "Payment gateway error" });
        }
        
        const newOrder = new Order({
            orderId: razorpayOrder.id,
            customerName: parsedCustomerName,
            phone: parsedPhone,
            files: filesMappedList,
            fileUrl: filesMappedList.length > 0 ? filesMappedList[0].url : '',
            fileName: filesMappedList.length > 0 ? filesNavList[0].name : 'Document.pdf',
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
        });

        await newOrder.save();
        res.status(201).json({ success: true, order_id: razorpayOrder.id, amount: razorpayOrder.amount, key_id: razorpay.key_id });
    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ success: false, message: error.message || "Order creation failed" });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = await Order.findOne({ orderId });
        if (order) {
            order.status = 'Paid / Ready for Print';
            order.paymentId = paymentId; 
            await order.save();
            return res.json({ success: true });
        }
        res.status(404).json({ success: false });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/admin/orders', async (req, res) => { 
    try {
        const orders = await Order.find().sort({ timestamp: -1 });
        res.json(orders); 
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const handleStatusUpdate = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        const status = req.body.status;
        const order = await Order.findOne({ orderId });
        if (order) {
            order.status = status; 
            await order.save();
            return res.json({ success: true });
        }
        res.status(404).json({ success: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/admin/orders/update-status', handleStatusUpdate);
app.post('/api/admin/orders/:orderId/status', handleStatusUpdate);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});