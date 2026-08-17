const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000, 
    socketTimeoutMS: 45000
})
    .then(async () => {
        console.log('✅ Connected to MongoDB Atlas successfully!');
        // Fresh start wipe helper (uncomment if you want to wipe old data on restart)
        // await Order.deleteMany({}); console.log('🧹 Wiped old orders for fresh start!');
    })
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'kvooufhc',
    api_key: process.env.CLOUDINARY_API_KEY || '421693327289623',
    api_secret: process.env.CLOUDINARY_API_SECRET || '8sI8_nKannw61Ew8xbvvsvLn4ms'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'print-from-home-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

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
    paymentId: String,
    verifiedItems: { type: Array, default: [] }
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
    totalSold: { type: Number, default: 0 },
    barcode: { type: String, default: '' },
    imageUrl: { type: String, default: '' }
});
const Product = mongoose.model('Product', productSchema);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sz27MnobxedYSU', 
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

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

app.get('/api/store-status', async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        if (!config) {
            config = await StoreConfig.create({ isOpen: true, updatedAt: new Date().toISOString() });
        }

        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;

        const isTimeWithinOperatingHours = istHours >= 7 && istHours < 22;
        const finalIsOpen = isTimeWithinOperatingHours && config.isOpen;

        res.json({ success: true, isOpen: finalIsOpen, manualOverride: config.isOpen, currentIstHour: istHours });
    } catch (err) {
        res.status(500).json({ success: false, isOpen: true });
    }
});

const handleStoreToggle = async (req, res) => {
    try {
        const { isOpen } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) { config = new StoreConfig(); }
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
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/admin/inventory/add', upload.single('productImage'), async (req, res) => {
    try {
        const { sku, name, purchasePrice, sellingPrice, quantity, barcode, externalImageUrl } = req.body;
        let product = await Product.findOne({ $or: [{ sku }, ...(barcode ? [{ barcode }] : [])] });
        
        let imageUrl = product ? product.imageUrl : '';
        if (req.file && req.file.path) {
            imageUrl = req.file.path; 
        } else if (externalImageUrl) {
            imageUrl = externalImageUrl;
        }

        if (product) {
            product.stockQuantity += Number(quantity);
            if (purchasePrice) product.purchasePrice = Number(purchasePrice);
            if (sellingPrice) product.sellingPrice = Number(sellingPrice);
            if (name) product.name = name;
            if (barcode) product.barcode = barcode;
            if (imageUrl) product.imageUrl = imageUrl;
            await product.save();
        } else {
            product = new Product({
                sku: sku || ('SKU-' + Date.now()),
                name,
                purchasePrice: Number(purchasePrice),
                sellingPrice: Number(sellingPrice),
                stockQuantity: Number(quantity),
                barcode: barcode || '',
                imageUrl: imageUrl || ''
            });
            await product.save();
        }
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/admin/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Product.findByIdAndDelete(id);
        res.json({ success: true, message: "Product removed from inventory successfully!" });
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
            financials: { totalStockValue, totalProfitEarned: totalPotentialProfit }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/store/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const requestedDate = req.query.date;
        const allOrders = await Order.find({ status: { $ne: 'Pending Payment' } });
        const products = await Product.find();
        
        let filteredOrders = allOrders;
        if (requestedDate) {
            filteredOrders = allOrders.filter(o => {
                let dObj = o.timestamp ? new Date(o.timestamp) : new Date();
                let isoDate = dObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                return isoDate === requestedDate;
            });
        }

        let totalProfit = 0;
        filteredOrders.forEach(o => {
            totalProfit += parseFloat(o.totalAmount || o.amount || 0); 
        });

        res.json({
            success: true,
            totalOrders: filteredOrders.length,
            totalProfit: totalProfit,
            variety: products.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/verify-item', async (req, res) => {
    try {
        const { orderId, barcode, skuOrName } = req.body;
        const searchKey = barcode || skuOrName;

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found!" });

        const product = await Product.findOne({ $or: [{ barcode: searchKey }, { sku: searchKey }, { name: { $regex: new RegExp(searchKey, 'i') } }] });
        
        if (!product) {
            return res.status(400).json({ success: false, message: `⚠️ Mismatch! "${searchKey}" is not registered in inventory.` });
        }

        let targetItemName = product.name;
        let configItems = order.configDetails || [];
        if (typeof configItems === 'string') {
            try { configItems = JSON.parse(configItems); } catch(e) { configItems = []; }
        }

        const itemExists = configItems.find(item => {
            let itemName = item.fileName ? item.fileName.replace('Product: ', '').split(' (Qty:')[0].trim() : '';
            return itemName.toLowerCase().includes(targetItemName.toLowerCase()) || targetItemName.toLowerCase().includes(itemName.toLowerCase());
        });

        if (!itemExists) {
            return res.status(400).json({ success: false, message: `⚠️ Mismatch! "${targetItemName}" is not part of this order.` });
        }

        if (!order.verifiedItems) order.verifiedItems = [];
        if (!order.verifiedItems.includes(targetItemName)) {
            order.verifiedItems.push(targetItemName);
        }

        let totalPackingItems = configItems.filter(item => item.printType === 'snack' || (item.fileName && item.fileName.startsWith('Product:'))).length;

        if (totalPackingItems > 0 && order.verifiedItems.length >= totalPackingItems) {
            order.status = 'Out for Delivery';
        }

        await order.save();

        res.json({ 
            success: true, 
            verifiedCount: order.verifiedItems.length, 
            totalItems: totalPackingItems,
            currentStatus: order.status,
            message: `✅ Verified "${targetItemName}" successfully!` 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

async function deductStockForOrder(parsedConfig) {
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
}

app.post('/api/create-order', upload.any(), async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;
        const isTimeWithinOperatingHours = istHours >= 7 && istHours < 22;
        
        const isOpen = config ? (isTimeWithinOperatingHours && config.isOpen) : isTimeWithinOperatingHours;
        if (!isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        const { totalAmount, configDetails, address, customerName, phone, paymentMode } = req.body;
        
        let finalAmountNumeric = parseFloat(String(totalAmount || '42').replace(/[₹,]/g, ''));
        if (isNaN(finalAmountNumeric)) finalAmountNumeric = 42;

        const selectedPaymentMode = paymentMode || "online";
        const numericId = String(Math.floor(100000 + Math.random() * 900000));

        const docFiles = req.files ? req.files.filter(f => f.fieldname === 'document') : [];
        const filesMappedList = docFiles.map(f => ({ name: f.originalname, filename: f.filename, url: f.path || f.url }));
        
        let parsedConfig = [];
        try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

        if (selectedPaymentMode === 'cod') {
            await deductStockForOrder(parsedConfig);

            const newOrder = new Order({
                orderId: numericId,
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
                amount: finalAmountNumeric.toFixed(2),
                totalAmount: finalAmountNumeric.toFixed(2),
                status: 'Ready for Print',
                date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                timestamp: new Date().toISOString(),
                paymentId: 'CASH ON DELIVERY'
            });

            await newOrder.save();
            return res.status(201).json({ success: true, isCod: true, order_id: numericId });
        }

        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create({ 
                amount: Math.round(finalAmountNumeric * 100), 
                currency: "INR", 
                receipt: `rcpt_${numericId}` 
            });
        } catch (rzpErr) {
            console.error("Razorpay Error:", rzpErr);
            return res.status(500).json({ success: false, message: "Payment gateway error: " + rzpErr.message });
        }
        
        const newOrder = new Order({
            orderId: numericId,
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
            amount: finalAmountNumeric.toFixed(2),
            totalAmount: finalAmountNumeric.toFixed(2),
            status: 'Pending Payment',
            date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            timestamp: new Date().toISOString()
        });

        await newOrder.save();
        res.status(201).json({ 
            success: true, 
            order_id: numericId, 
            rzp_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount, 
            key_id: razorpay.key_id 
        });
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
            order.status = 'Ready for Print';
            order.paymentId = paymentId; 
            await order.save();

            let parsedConfig = order.configDetails || [];
            if (typeof parsedConfig === 'string') {
                try { parsedConfig = JSON.parse(parsedConfig); } catch(e){}
            }
            await deductStockForOrder(parsedConfig);

            return res.json({ success: true });
        }
        res.status(404).json({ success: false, message: "Order not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CANCEL ORDER API ---
app.post('/api/orders/cancel', async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found!" });
        }

        if (order.status && (order.status.includes('Out for Delivery') || order.status.includes('Delivered'))) {
            return res.status(400).json({ 
                success: false, 
                message: "Order is Out for Delivery or Delivered. Cannot be cancelled. Please contact customer support." 
            });
        }

        order.status = 'Cancelled by Customer';
        await order.save();

        res.json({ success: true, message: "Order cancelled successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/orders', async (req, res) => { 
    try {
        const orders = await Order.find({ status: { $ne: 'Pending Payment' } }).sort({ timestamp: -1 });
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