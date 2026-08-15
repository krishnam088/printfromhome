const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
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
    serverSelectionTimeoutMS: 30000, // 30 seconds wait karega
    socketTimeoutMS: 45000
})
    .then(() => console.log(' Connected to MongoDB Atlas successfully!'))
    .catch((err) => console.error(' MongoDB Connection Error:', err));

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

// Nodemailer Force IPv4 SMTP Transporter Setup (Fixes ENETUNREACH error on Render)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // 🔥 Yeh line IPv4 force karegi taaki Render par error na aaye
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Temporary OTP Storage Memory
const otpStorage = {};

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

// --- 🛡️ REAL GMAIL OTP SEND API ROUTE ---
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: "Valid Gmail address required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[normalizedEmail] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 mins validity

        const mailOptions = {
            from: '"Print From Home Support" <printfromhomesupport@gmail.com>',
            to: normalizedEmail,
            subject: 'Verification OTP - Print From Home',
            text: `Your OTP for Print From Home signup is: ${otp}. It is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP sent successfully to your Gmail!" });
    } catch (err) {
        console.error("Real Gmail OTP Send Error:", err);
        res.status(500).json({ success: false, message: "Failed to send email: " + err.message });
    }
}); 

// Auth APIs (MongoDB Connected with OTP Verification)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, identity, password, otp } = req.body;
        const normalizedIdentity = identity.toLowerCase().trim();
        
        // Verify OTP for Email Registrations
        if (normalizedIdentity.includes('@')) {
            if (!otpStorage[normalizedIdentity] || otpStorage[normalizedIdentity].otp !== otp) {
                return res.status(400).json({ success: false, message: "Invalid or incorrect OTP!" });
            }
            if (Date.now() > otpStorage[normalizedIdentity].expires) {
                return res.status(400).json({ success: false, message: "OTP has expired!" });
            }
            delete otpStorage[normalizedIdentity]; // Clear OTP after success
        }

        const existingUser = await User.findOne({ identity: normalizedIdentity });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Already registered!" });
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
        const normalizedIdentity = identity.toLowerCase().trim();
        const user = await User.findOne({ identity: normalizedIdentity, password });
        
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        res.json({ success: true, name: user.name, identity: user.identity });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Orders & Payments (MongoDB Connected with COD & Cart Support)
app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        const isOpen = config ? config.isOpen : true;
        if (!isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        const { totalAmount, configDetails, address, customerName, phone, paymentMode } = req.body;
        const finalAmount = totalAmount ? totalAmount.toString().trim() : "42";
        const selectedPaymentMode = paymentMode || "online";

        // Cash on Delivery (COD) Flow
        if (selectedPaymentMode === 'cod') {
            const filesMappedList = req.files ? req.files.map(f => ({ name: f.originalname, filename: f.filename, url: `/uploads/${f.filename}` })) : [];
            let parsedConfig = [];
            try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

            const codOrderId = 'COD-' + Date.now();
            const newOrder = new Order({
                orderId: codOrderId,
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
        
        const filesMappedList = req.files ? req.files.map(f => ({ name: f.originalname, filename: f.filename, url: `/uploads/${f.filename}` })) : [];
        let parsedConfig = [];
        try { parsedConfig = configDetails ? JSON.parse(configDetails) : []; } catch(e){}

        const newOrder = new Order({
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