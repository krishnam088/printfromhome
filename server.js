const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const nodemailer = require('nodemailer');
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
    identity: { type: String, unique: true }, // Mobile Number
    email: { type: String, default: '' },      // Gmail Address
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

// Nodemailer Transporter Setup using Port 465 (SSL) to bypass Render port 587 restriction
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true, // Port 465 ke liye true hota hai (SSL)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000
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
        const { name, identity, email, password } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Gmail address is mandatory for signup!" });
        }

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10); 
        const normalizedEmail = email.trim().toLowerCase();
        
        const existingUser = await User.findOne({ $or: [{ identity: normalizedIdentity }, { email: normalizedEmail }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "This mobile number or Gmail is already registered!" });
        }

        const newUser = new User({ 
            name: name.trim(), 
            identity: normalizedIdentity, 
            email: normalizedEmail,
            password, 
            dateCreated: new Date().toLocaleString() 
        });
        
        await newUser.save();
        res.status(201).json({ success: true, userId: newUser.identity, name: newUser.name, email: newUser.email });
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
        res.json({ success: true, name: user.name, identity: user.identity, email: user.email || '' });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/auth/update-email', async (req, res) => {
    try {
        const { identity, email } = req.body;
        if (!identity || !email) {
            return res.status(400).json({ success: false, message: "Identity and Email are required!" });
        }
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ identity: normalizedIdentity });
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        user.email = email.trim().toLowerCase();
        await user.save();
        res.json({ success: true, message: "Gmail updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/update-profile', async (req, res) => {
    try {
        const { identity, name, currentPassword, newPassword } = req.body;
        if (!identity) return res.status(400).json({ success: false, message: "Identity is required!" });

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ identity: normalizedIdentity });
        
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        if (name) user.name = name.trim();

        if (newPassword) {
            if (!currentPassword || user.password !== currentPassword) {
                return res.status(401).json({ success: false, message: "Incorrect current password!" });
            }
            user.password = newPassword;
        }

        await user.save();
        res.json({ success: true, message: "Profile updated successfully in database!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/verify-identity', async (req, res) => {
    try {
        const { identity } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ identity: normalizedIdentity });
        
        if (!user) {
            return res.status(404).json({ success: false, message: "Mobile number not registered!" });
        }
        res.json({ success: true, message: "Mobile verified successfully." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { identity, newPassword } = req.body;
        if (!identity || !newPassword) {
            return res.status(400).json({ success: false, message: "Missing data!" });
        }
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ identity: normalizedIdentity });
        
        if (!user) return res.status(404).json({ success: false, message: "User not found!" });
        
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: "Password reset successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- UPDATED BROADCAST NOTIFICATION API (Using Verified Sender Email) ---
app.post('/api/admin/send-notification', async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: "Subject and Message are required!" });
        }

        const users = await User.find({});
        const recipientEmails = users.map(u => u.email).filter(em => em && em.includes('@'));

        if (recipientEmails.length === 0) {
            return res.status(400).json({ success: false, message: "No users with email found!" });
        }

        // Response turant bhej diya taaki admin panel hang na ho
        res.json({ success: true, message: `✅ Broadcasting started via Brevo API to ${recipientEmails.length} users in background!` });

        // Background loop using Brevo HTTP API with verified sender email
        for (const email of recipientEmails) {
            try {
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': process.env.SMTP_PASS,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { name: "Print From Home", email: "printfromhomesupport@gmail.com" },
                        to: [{ email: email }],
                        subject: subject,
                        htmlContent: `
                            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div style="background: #0070f3; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                                    <h2 style="margin: 0; font-size: 1.2rem;">📢 Print From Home - Update</h2>
                                </div>
                                <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; color: #1e293b;">
                                    <h3 style="color: #0f172a; margin-top: 0;">${subject}</h3>
                                    <p style="font-size: 0.95rem; line-height: 1.6; color: #475569; white-space: pre-line;">${message}</p>
                                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                                    <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-bottom: 0;">Print From Home, Varanasi.</p>
                                </div>
                            </div>
                        `
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    console.error(`Brevo API Error for ${email}:`, result);
                }
            } catch (innerErr) {
                console.error(`Failed to send via API to ${email}:`, innerErr);
            }
        }
    } catch (err) {
        console.error("Email Broadcast Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Email send failed: " + err.message });
        }
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

        let parsedConfig = [];
        try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

        // STRICT INVENTORY CHECK (Server Guard)
        for (const item of parsedConfig) {
            if (item.printType === 'snack' || (item.fileName && item.fileName.startsWith('Product:'))) {
                let prodName = item.fileName.replace('Product: ', '').split(' (Qty:')[0].trim();
                let qtyRequested = item.copies || item.qty || 1;
                let product = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });
                if (!product || product.stockQuantity < qtyRequested) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `⚠️ Sorry! "${prodName}" has only ${product ? product.stockQuantity : 0} units left in stock.` 
                    });
                }
            }
        }

        const selectedPaymentMode = paymentMode || "online";
        const numericId = String(Math.floor(100000 + Math.random() * 900000));

        const docFiles = req.files ? req.files.filter(f => f.fieldname === 'document') : [];
        const filesMappedList = docFiles.map(f => ({ name: f.originalname, filename: f.filename, url: f.path || f.url }));

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
                message: "Order is Out for Delivery or Delivered. Cannot be cancelled." 
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
            if (order.status && order.status.includes('Delivered')) {
                return res.status(400).json({ success: false, message: "Cannot modify delivered order." });
            }
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