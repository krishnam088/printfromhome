const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// 🔥 Sabse pehle express app initialize karein
const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Storage Safe Import
const multerStorageModule = require('multer-storage-cloudinary');
const CloudinaryStorage = multerStorageModule.CloudinaryStorage || 
                          (multerStorageModule.default && multerStorageModule.default.CloudinaryStorage) || 
                          multerStorageModule.default || 
                          multerStorageModule;

const nodemailer = require('nodemailer');
const cron = require('node-cron');
const webpush = require('web-push');
require('dotenv').config();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// Local uploads folder for temporary print documents (Privacy First)
const localUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(localUploadsDir));

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

// Cloudinary Storage is STRICTLY for Store Inventory / Product Images
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'print-from-home-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const uploadCloudinary = multer({ storage: cloudinaryStorage });

// Local Storage for User Print Documents (Ensures privacy, no personal documents go to Cloudinary)
const localDiskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, localUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const uploadLocal = multer({ storage: localDiskStorage });

// 🔥 Yahan purane userSchema ki jagah yeh updated schema rakhein
const userSchema = new mongoose.Schema({
    name: String,
    identity: { type: String, unique: true }, // Mobile Number
    email: { type: String, unique: true, required: true }, // Gmail Address (Unique & Required for OTP Login)
    emailOtp: String,                            // OTP ke liye
    otpExpires: Date,                            // OTP expiry ke liye
    isEmailVerified: { type: Boolean, default: false }, // Verification status
    addresses: { type: Array, default: [] },   // Multi-address support
    dateCreated: String
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    customerName: String,
    phone: String,
    deliveryMode: { type: String, default: 'doorstep' }, // 🔥 Yahan add kiya gaya hai ('doorstep' ya 'pickup')[cite: 4]
    files: Array,
    fileUrl: String,
    fileName: String,
    configDetails: Array,
    pages: Number,
    copies: Number,
    printType: String,
    binding: String,
    address: String,
    userLat: { type: Number, default: 25.3451 }, 
    userLng: { type: Number, default: 83.0012 }, 
    amount: String,
    totalAmount: String,
    status: String,
    date: String,
    timestamp: String,
    paymentId: String,
    verifiedItems: { type: Array, default: [] },
    assignedDeliveryBoy: { type: String, default: '' }, 
    needsStockRestockScan: { type: Boolean, default: false }, 
    netProfitRecorded: { type: Number, default: 0 },
    deliveryFeeCharged: { type: Number, default: 0 },
    isRefundableAmount: { type: Number, default: 0 },
    manualNeftRefundRequired: { type: Boolean, default: false }
});
const Order = mongoose.model('Order', orderSchema);

// Yahan userSchema aur baaki schemas ke niche paste karein:
const tempSignupSchema = new mongoose.Schema({
    name: String,
    identity: String,
    email: String,
    password: String,
    emailOtp: String,
    otpExpires: Date
});
const TempSignup = mongoose.model('TempSignup', tempSignupSchema);

const emailChangeSessionSchema = new mongoose.Schema({
    identity: String,
    oldEmail: String,
    oldOtp: String,
    newEmail: String,
    newOtp: String,
    step: String
});
const EmailChangeSession = mongoose.model('EmailChangeSession', emailChangeSessionSchema);

const deliveryBoySchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    isOnline: { type: Boolean, default: false },
    currentOrderId: { type: String, default: null },
    lastActiveTimestamp: { type: Number, default: 0 }
});
const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);

const storeConfigSchema = new mongoose.Schema({
    isOpen: { type: Boolean, default: true },
    printEnabled: { type: Boolean, default: true }, 
    rainSurgeActive: { type: Boolean, default: false },
    diwaliLaunchMode: { type: Boolean, default: false },
    diwaliMessage: { type: String, default: "🚀 Launching on Diwali! Service starts from Diwali. Thanks for downloading Print From Home! 🙏" },
    openTime: { type: String, default: "07:00" },  // 🔥 Yeh naya field add karein
    closeTime: { type: String, default: "22:00" }, // 🔥 Yeh naya field add karein
    updatedAt: String
});
const StoreConfig = mongoose.model('StoreConfig', storeConfigSchema);

// 🔥 Updated Product Schema with Description & Multiple Images Support
const productSchema = new mongoose.Schema({
    sku: { type: String, unique: true },
    name: String,
    purchasePrice: Number,
    sellingPrice: Number,
    stockQuantity: Number,
    totalSold: { type: Number, default: 0 },
    barcode: { type: String, default: '' },
    category: { type: String, default: 'munchies' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    images: { type: Array, default: [] }
});
const Product = mongoose.model('Product', productSchema);

// 🔔 Safe Web Push Notification Configuration
try {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            'mailto:printfromhomesupport@gmail.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn('⚠️ VAPID keys not configured in environment variables. Push notifications are running in safe fallback mode.');
    }
} catch (vapidErr) {
    console.error('⚠️ VAPID Setup Warning:', vapidErr.message);
}

const pushSubscriptionSchema = new mongoose.Schema({
    identity: String,
    type: { type: String, default: 'stock_alert' },
    productName: { type: String, default: '' },
    subscription: Object,
    createdAt: { type: Date, default: Date.now }
});
const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sz27MnobxedYSU', 
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: 'support@printfromhomes.com', // Aapka Brevo account login email
        pass: process.env.SMTP_PASS         // Wahi Brevo API Key / SMTP Password jo Render par saved hai
    },
    connectionTimeout: 15000,
    socketTimeout: 15000
});

// 🏪 10-Second Rolling Store QR Token Engine
let currentStoreQrToken = "PFH-STORE-INIT-2026";
let qrTokenExpiry = Date.now() + 30000;

setInterval(() => {
    currentStoreQrToken = "PFH-STORE-QR-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Date.now();
    qrTokenExpiry = Date.now() + 20000;
}, 10000);

app.get('/api/admin/live-store-qr', (req, res) => {
    res.json({ success: true, qrToken: currentStoreQrToken, validTill: qrTokenExpiry });
});

// 🔥 FIXED: Exclude pending online payment orders from admin panel view
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find({ status: { $ne: 'Pending Payment' } }).sort({ timestamp: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/delivery/scan-store-qr', async (req, res) => {
    try {
        const { phone, scannedToken } = req.body;
        if (!phone || !scannedToken) {
            return res.status(400).json({ success: false, message: "Phone and QR token are required!" });
        }

        if (scannedToken !== currentStoreQrToken || Date.now() > qrTokenExpiry) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid or Expired Store QR Code! Please scan the live counter screen." });
        }

        let boy = await DeliveryBoy.findOne({ phone });
        if (!boy) {
            boy = new DeliveryBoy({ phone, name: "Partner " + phone.slice(-4) });
        }

        if (boy.currentOrderId) {
            return res.status(400).json({ success: false, message: "⚠️ You already have an active order assigned! Deliver it first." });
        }

        boy.isOnline = true;
        boy.lastActiveTimestamp = Date.now();
        await boy.save();

        const nextOrder = await Order.findOne({ 
            status: 'Ready for Print', 
            $or: [{ assignedDeliveryBoy: { $exists: false } }, { assignedDeliveryBoy: null }, { assignedDeliveryBoy: "" }] 
        });

        if (nextOrder) {
            nextOrder.assignedDeliveryBoy = phone;
            nextOrder.status = 'Out for Delivery';
            await nextOrder.save();

            boy.currentOrderId = nextOrder.orderId;
            await boy.save();

            return res.json({ success: true, message: `✅ Verified! You are checked in & Order #${nextOrder.orderId} is assigned to you.` });
        }

        res.json({ success: true, message: "✅ Checked in successfully! Waiting for next ready order..." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/delivery', (req, res) => { res.sendFile(path.join(__dirname, 'delivery.html')); });
app.get('/store-qr', (req, res) => { res.sendFile(path.join(__dirname, 'store-qr.html')); });
app.get('/picker', (req, res) => { res.sendFile(path.join(__dirname, 'picker.html')); });

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/manifest-festive.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'manifest-festive.json'));
});

app.get('/manifest-delivery.json', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'manifest-delivery.json'));
});

app.get('/sw-admin.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw-admin.js')); });
app.get('/sw.js', (req, res) => { res.sendFile(path.join(__dirname, 'sw.js')); });

// 🔥 Fully completed /api/store-status route
app.get('/api/store-status', async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        if (!config) {
            config = await StoreConfig.create({ isOpen: true, rainSurgeActive: false, openTime: "07:00", closeTime: "22:00", updatedAt: new Date().toISOString() });
        }

        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;
        const istMins = istTotalMinutes % 60;
        const currentMinutesOfDay = istHours * 60 + istMins;

        const openTimeStr = config.openTime || "07:00";
        const closeTimeStr = config.closeTime || "22:00";

        const [openH, openM] = openTimeStr.split(':').map(Number);
        const [closeH, closeM] = closeTimeStr.split(':').map(Number);
        const openMinutesOfDay = openH * 60 + openM;
        const closeMinutesOfDay = closeH * 60 + closeM;

        const isTimeWithinOperatingHours = currentMinutesOfDay >= openMinutesOfDay && currentMinutesOfDay < closeMinutesOfDay;
        const finalIsOpen = isTimeWithinOperatingHours && config.isOpen;

        res.json({ 
            success: true, 
            isOpen: finalIsOpen, 
            printEnabled: config.printEnabled !== false,
            manualOverride: config.isOpen, 
            rainSurgeActive: config.rainSurgeActive, 
            openTime: openTimeStr,   // 🔥 Client ke liye open time bhej rahe hain
            closeTime: closeTimeStr, // 🔥 Client ke liye close time bhej rahe hain
            currentIstHour: istHours 
        });
    } catch (err) {
        res.status(500).json({ success: false, isOpen: true, error: err.message });
    }
});

const handlePrintToggle = async (req, res) => {
    try {
        const { printEnabled } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) { config = new StoreConfig(); }
        config.printEnabled = Boolean(printEnabled);
        config.updatedAt = new Date().toISOString();
        await config.save();
        res.json({ success: true, printEnabled: config.printEnabled });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/admin/toggle-print', handlePrintToggle);

// 🔥 YAHAN APNA NEW DIWALI LAUNCH TOGGLE ROUTE DAL DEIN:
app.post('/api/admin/toggle-diwali-launch', async (req, res) => {
    try {
        const { diwaliLaunchMode, diwaliMessage } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) { config = new StoreConfig(); }
        
        if (diwaliLaunchMode !== undefined) config.diwaliLaunchMode = Boolean(diwaliLaunchMode);
        if (diwaliMessage) config.diwaliMessage = diwaliMessage;
        
        config.updatedAt = new Date().toISOString();
        await config.save();
        res.json({ success: true, diwaliLaunchMode: config.diwaliLaunchMode, diwaliMessage: config.diwaliMessage });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

    // ... baaki ka purana code ...

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

app.get('/api/admin/rain-status', async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        res.json({ success: true, isRainActive: config ? config.rainSurgeActive : false });
    } catch (err) {
        res.status(500).json({ success: false, isRainActive: false });
    }
});

app.post('/api/admin/toggle-rain', async (req, res) => {
    try {
        const { isRainActive } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) config = new StoreConfig();
        config.rainSurgeActive = Boolean(isRainActive);
        config.updatedAt = new Date().toISOString();
        await config.save();
        res.json({ success: true, isRainActive: config.rainSurgeActive });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        const { identity, productName, subscription, type } = req.body;
        await PushSubscription.findOneAndUpdate(
            { identity, productName: productName || '' },
            { subscription, type: type || 'stock_alert' },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Subscribed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/notifications/subscribe-stock', async (req, res) => {
    try {
        const { identity, productName, subscription, type } = req.body;
        await PushSubscription.findOneAndUpdate(
            { identity, productName: productName || '' },
            { subscription, type: type || 'stock_alert' },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Subscribed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

async function autoTriggerStockNotification(productName) {
    try {
        const subs = await PushSubscription.find({ 
            type: 'stock_alert', 
            productName: { $regex: new RegExp(productName, 'i') } 
        });
        
        if (subs.length === 0) return;

        const payload = JSON.stringify({
            title: "🔥 Back in Stock Alert!",
            body: `Great news! "${productName}" is back in stock at Print From Home. Order now!`,
            url: "https://printfromhome.onrender.com"
        });

        for (const sub of subs) {
            try {
                if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                    await webpush.sendNotification(sub.subscription, payload);
                }
                await PushSubscription.deleteOne({ _id: sub._id });
            } catch (err) {}
        }
    } catch (e) {}
}

async function autoTriggerRainSurgeNotification() {
    try {
        let config = await StoreConfig.findOne();
        if (!config || !config.rainSurgeActive) return;

        const subs = await PushSubscription.find({ type: 'weather_alert' });
        const payload = JSON.stringify({
            title: "🌧️ Rainy Day Essentials in 15 Mins!",
            body: "Heavy rain in Varanasi? Stay dry and get your urgent prints & snacks delivered instantly!",
            url: "https://printfromhome.onrender.com"
        });

        for (const sub of subs) {
            try {
                if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                    await webpush.sendNotification(sub.subscription, payload);
                }
            } catch (err) {}
        }
    } catch (e) {}
}

cron.schedule('*/30 * * * *', () => {
    autoTriggerRainSurgeNotification();
});

// --- SIGNUP: SEND EMAIL OTP VIA BREVO HTTP API ---
app.post('/api/auth/send-signup-otp', async (req, res) => {
    try {
        const { name, identity, email, password } = req.body;
        if (!email || !name || !identity || !password) {
            return res.status(400).json({ success: false, message: "Name, mobile number, email, and password are required." });
        }

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10); 
        const normalizedEmail = email.trim().toLowerCase();
        
        const existingUser = await User.findOne({ $or: [{ identity: normalizedIdentity }, { email: normalizedEmail }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "An account with this mobile number or email already exists." });
        }

        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        console.log("📨 Attempting to send OTP via Brevo HTTP API to:", normalizedEmail);

        // 🔥 Brevo HTTP API Call
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASS, // Render par saved aapki Brevo key
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Print From Home", email: "support@printfromhomes.com" },
                to: [{ email: normalizedEmail, name: name.trim() }],
                subject: '🔒 Verify Your Gmail - Print From Home',
                textContent: `Hello ${name},\n\nYour Gmail verification OTP is: ${emailOtp}\nThis OTP is valid for 5 minutes.`
            })
        });

        const brevoData = await brevoRes.json();
        if (!brevoRes.ok) {
            console.error('❌ Brevo HTTP API Failed Response:', brevoData);
            return res.status(500).json({ success: false, message: "Failed to send email OTP via gateway.", error: brevoData.message || JSON.stringify(brevoData) });
        }

        console.log('✅ Brevo HTTP API Success for:', normalizedEmail);

        await TempSignup.findOneAndUpdate(
            { identity: normalizedIdentity },
            { name: name.trim(), identity: normalizedIdentity, email: normalizedEmail, password, emailOtp, otpExpires },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Verification OTP sent successfully to your Gmail!" });
    } catch (err) {
        console.error("❌ Send Signup OTP Exception:", err);
        res.status(500).json({ success: false, message: "Failed to send email OTP: " + err.message });
    }
});

// --- 1. SIGNUP: SEND EMAIL OTP ---

// --- 1. SIGNUP: SEND EMAIL OTP VIA BREVO API ---
app.post('/api/auth/send-signup-otp', async (req, res) => {
    try {
        const { name, identity, email } = req.body;
        if (!email || !name || !identity) {
            return res.status(400).json({ success: false, message: "Name, mobile number, and email are required." });
        }

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10); 
        const normalizedEmail = email.trim().toLowerCase();
        
        const existingUser = await User.findOne({ $or: [{ identity: normalizedIdentity }, { email: normalizedEmail }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "An account with this mobile number or email already exists." });
        }

        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASS,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Print From Home", email: "support@printfromhomes.com" },
                to: [{ email: normalizedEmail, name: name.trim() }],
                subject: 'Verify Your Gmail - Print From Home',
                textContent: `Hello ${name},\n\nYour Gmail verification OTP is: ${emailOtp}\nThis OTP is valid for 5 minutes.`
            })
        });

        if (!brevoRes.ok) {
            const errData = await brevoRes.json();
            return res.status(500).json({ success: false, message: "Failed to send email OTP.", error: errData.message });
        }

        await TempSignup.findOneAndUpdate(
            { identity: normalizedIdentity },
            { name: name.trim(), identity: normalizedIdentity, email: normalizedEmail, emailOtp, otpExpires },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Verification OTP sent successfully to your Gmail." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to send email OTP: " + err.message });
    }
});

// --- 2. SIGNUP: VERIFY OTP & CREATE USER ---
app.post('/api/auth/verify-signup-otp', async (req, res) => {
    try {
        const { name, identity, email, otpInput } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);

        const tempData = await TempSignup.findOne({ identity: normalizedIdentity });
        if (!tempData) {
            return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        if (new Date() > new Date(tempData.otpExpires)) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (String(tempData.emailOtp).trim() !== String(otpInput).trim()) {
            return res.status(400).json({ success: false, message: "Invalid verification code entered." });
        }

        const newUser = new User({
            name: name || tempData.name,
            identity: normalizedIdentity,
            email: email.trim().toLowerCase(),
            isEmailVerified: true,
            dateCreated: new Date().toLocaleString()
        });
        
        await newUser.save();
        await TempSignup.deleteOne({ identity: normalizedIdentity });

        res.status(201).json({ 
            success: true, 
            message: "Account created successfully!", 
            userId: newUser.identity, 
            name: newUser.name, 
            email: newUser.email 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification failed: " + err.message });
    }
});

// --- 3. SEND LOGIN OTP VIA GMAIL (Sirf Email se) ---
app.post('/api/auth/send-login-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Gmail address is required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user) {
            return res.status(404).json({ success: false, message: "This Gmail is not registered. Please create an account first." });
        }

        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailOtp = emailOtp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASS,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Print From Home", email: "support@printfromhomes.com" },
                to: [{ email: user.email, name: user.name }],
                subject: 'Your Login OTP - Print From Home',
                textContent: `Your login OTP is: ${emailOtp}\nValid for 5 minutes.`
            })
        });

        res.json({ success: true, message: "Login OTP sent to your registered Gmail address." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. VERIFY LOGIN OTP ---
app.post('/api/auth/verify-login-otp', async (req, res) => {
    try {
        const { email, otpInput } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (String(user.emailOtp).trim() !== String(otpInput).trim()) {
            return res.status(400).json({ success: false, message: "Invalid verification code entered." });
        }

        user.emailOtp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, name: user.name, identity: user.identity, email: user.email });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 2. SIGNUP: VERIFY OTP & CREATE USER ---
app.post('/api/auth/verify-signup-otp', async (req, res) => {
    try {
        const { identity, otpInput } = req.body;
        if (!identity || !otpInput) {
            return res.status(400).json({ success: false, message: "Mobile number aur OTP dono zaroori hain." });
        }

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        console.log("🔍 Verifying OTP for Identity:", normalizedIdentity, "OTP:", otpInput);

        const tempData = await TempSignup.findOne({ identity: normalizedIdentity });
        if (!tempData) {
            console.warn("⚠️ TempSignup record nahi mila is number ke liye:", normalizedIdentity);
            return res.status(400).json({ success: false, message: "Session expired ya invalid request. Kripya dobara OTP bhejein." });
        }

        if (new Date() > new Date(tempData.otpExpires)) {
            console.warn("⚠️ OTP expire ho chuka hai.");
            return res.status(400).json({ success: false, message: "OTP expire ho chuka hai. Kripya naya OTP request karein." });
        }

        if (String(tempData.emailOtp).trim() !== String(otpInput).trim()) {
            console.warn("⚠️ Galat OTP enter kiya gaya hai.");
            return res.status(400).json({ success: false, message: "Galat OTP! Kripya sahi 6-digit code daalein." });
        }

        const newUser = new User({
            name: tempData.name,
            identity: tempData.identity,
            email: tempData.email,
            password: tempData.password,
            isEmailVerified: true,
            dateCreated: new Date().toLocaleString()
        });
        
        await newUser.save();
        console.log("✅ User successfully MongoDB mein save ho gaya:", newUser.email);

        await TempSignup.deleteOne({ identity: normalizedIdentity });

        res.status(201).json({ 
            success: true, 
            message: "Gmail verify ho gaya aur account successfully ban gaya!", 
            userId: newUser.identity, 
            name: newUser.name, 
            email: newUser.email 
        });
    } catch (err) {
        console.error("❌ Verify Signup OTP Exception:", err);
        res.status(500).json({ success: false, message: "Verification failed: " + err.message });
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

// --- EDIT PROFILE: SEND OLD EMAIL OTP ---
app.post('/api/auth/change-email/send-old-otp', async (req, res) => {
    try {
        const { identity, currentEmail } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const oldOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 🔥 Yahan transporter.sendMail ki jagah naya Brevo API function call karein
        const emailSent = await sendEmailViaBrevoApi(
            currentEmail,
            '🔐 Verify Current Gmail to Change Email',
            `Your OTP to authorize email change is: ${oldOtp}\nValid for 5 minutes.`
        );

        if (!emailSent) {
            return res.status(500).json({ success: false, message: "Failed to send OTP to old email via gateway." });
        }

        await EmailChangeSession.findOneAndUpdate(
            { identity: normalizedIdentity },
            { oldEmail: currentEmail, oldOtp, step: 'VERIFY_OLD' },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "OTP sent to your current (old) Gmail address." });
    } catch (err) {
        console.error("❌ Send Old OTP Error:", err);
        res.status(500).json({ success: false, message: "Failed to send OTP to old email." });
    }
});

// --- EDIT PROFILE: VERIFY OLD OTP & SEND NEW EMAIL OTP ---
app.post('/api/auth/change-email/verify-old-and-send-new', async (req, res) => {
    try {
        const { identity, oldOtpInput, newEmail } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        
        const session = await EmailChangeSession.findOne({ identity: normalizedIdentity });
        if (!session || session.oldOtp !== oldOtpInput) {
            return res.status(400).json({ success: false, message: "Invalid OTP for current email!" });
        }

        const emailExists = await User.findOne({ email: newEmail.trim().toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ success: false, message: "This new Gmail address is already in use by another account." });
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await transporter.sendMail({
            from: 'Print From Home <support@printfromhomes.com>',
            to: newEmail,
            subject: '✨ Verify Your New Gmail Address',
            text: `Your OTP to verify your new Gmail is: ${newOtp}\nValid for 5 minutes.`
        });

        session.newEmail = newEmail.trim().toLowerCase();
        session.newOtp = newOtp;
        session.step = 'VERIFY_NEW';
        await session.save();

        res.json({ success: true, message: "Old email verified! OTP has been sent to your new Gmail address." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Process failed." });
    }
});

// --- EDIT PROFILE: VERIFY NEW OTP & UPDATE DB ---
app.post('/api/auth/change-email/verify-new-and-update', async (req, res) => {
    try {
        const { identity, newOtpInput } = req.body;
        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);

        const session = await EmailChangeSession.findOne({ identity: normalizedIdentity });
        if (!session || session.newOtp !== newOtpInput) {
            return res.status(400).json({ success: false, message: "Invalid OTP for new email!" });
        }

        await User.findOneAndUpdate({ identity: normalizedIdentity }, { email: session.newEmail });
        await EmailChangeSession.deleteOne({ identity: normalizedIdentity });

        res.json({ success: true, message: "Gmail address successfully updated and verified!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update email." });
    }
});

app.post('/api/auth/update-profile', async (req, res) => {
    try {
        const { identity, name } = req.body;
        if (!identity) return res.status(400).json({ success: false, message: "Identity is required!" });

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const user = await User.findOne({ identity: normalizedIdentity });

        if (!user) return res.status(404).json({ success: false, message: "User not found!" });

        if (name) user.name = name.trim();

        await user.save();
        res.json({ success: true, message: "Profile updated successfully!" });
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

async function sendBroadcastEmail(subject, message) {
    const users = await User.find({});
    const recipients = users.filter(u => u.email && u.email.includes('@'));
    if (recipients.length === 0) return;

    for (const user of recipients) {
        try {
            const personalizedHTML = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="background: #0070f3; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0; font-size: 1.3rem; letter-spacing: 0.5px;">Print From Home</h2>
                        <p style="margin: 5px 0 0 0; font-size: 0.85rem; opacity: 0.9;">Professional Printing & Delivery Services</p>
                    </div>
                    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; color: #1e293b;">
                        <p style="font-size: 1rem; color: #0f172a; margin-top: 0;">Hello <strong>${user.name || 'Valued Customer'}</strong>,</p>
                        <p style="font-size: 0.95rem; line-height: 1.6; color: #475569; white-space: pre-line;">${message}</p>
                        <div style="margin: 25px 0; text-align: center;">
                            <a href="https://printfromhomes.com" style="background-color: #0070f3; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: inline-block;">Visit Store & Order Now</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-bottom: 0;">Print From Home, Varanasi | You are receiving this update as a registered user.</p>
                    </div>
                </div>
            `;

            // 🔥 Brevo HTTP API (Port 443 - Render par kabhi block nahi hoti)
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.SMTP_PASS,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: "Print From Home Support", email: "support@printfromhomes.com" },
                    to: [{ email: user.email, name: user.name || 'Customer' }],
                    subject: subject,
                    htmlContent: personalizedHTML
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                console.error(`❌ Failed for ${user.email}:`, JSON.stringify(errData));
            } else {
                console.log(`✅ Successfully sent via Brevo HTTP API to: ${user.email}`);
            }
        } catch (innerErr) {
            console.error(`❌ Error sending to ${user.email}:`, innerErr.message);
        }
    }
}

app.post('/api/admin/send-notification', async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: "Subject and Message are required!" });
        }

        const users = await User.find({});
        const recipients = users.filter(u => u.email && u.email.includes('@'));

        if (recipients.length === 0) {
            return res.status(400).json({ success: false, message: "No users with email found!" });
        }

        res.json({ success: true, message: `✅ Personalized broadcasting to ${recipients.length} users started in background!` });
        sendBroadcastEmail(subject, message);
    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Email send failed: " + err.message });
        }
    }
});

const festivalCalendar = {
    "2026-01-14_2026-01-14": { key: "sankranti", name: "Makar Sankranti / Pongal", subject: "Happy Makar Sankranti! Festive Sweet Offers!", message: "Wishing you a joyful harvest season filled with warmth and sweet moments! Enjoy flat 15% off on all prints today." },
    "2026-01-26_2026-01-26": { key: "republic_day", name: "Republic Day", subject: "Happy Republic Day: Celebrate with Pride!", message: "Honor the spirit of our nation with special patriotic prints and exclusive flat deals!" },
    "2026-01-23_2026-01-23": { key: "vasant_panchami", name: "Vasant Panchami", subject: "Happy Vasant Panchami: Wisdom & Creativity!", message: "May Goddess Saraswati bring wisdom and creativity into your life. Celebrate with exclusive study prints!" },
    "2026-02-14_2026-02-14": { key: "valentine", name: "Valentine's Day", subject: "Happy Valentine's Day: Create Special Memories!", message: "Celebrate love and bonds with personalized photo prints, custom frames, and heartfelt gifts!" },
    "2026-02-15_2026-02-15": { key: "shivaratri", name: "Maha Shivaratri", subject: "Blessed Maha Shivaratri: Special Blessings!", message: "Wishing you a blessed Maha Shivaratri! May Lord Shiva fulfill all your wishes and bring inner peace." },
    "2026-03-19_2026-03-27": { key: "navratri", name: "Chaitra Navratri Start", subject: "Happy Chaitra Navratri: Auspicious Beginnings!", message: "May Maa Durga fill your home with strength, joy, and prosperity. Enjoy 9 days of special festive offers!" },
    "2026-03-27_2026-03-27": { key: "ram_navami", name: "Ram Navami", subject: "Happy Ram Navami: Divine Blessings!", message: "Happy Ram Navami! May Lord Rama shower his divine blessings of peace and righteousness upon you." },
    "2026-03-30_2026-03-30": { key: "gudi_padwa", name: "Gudi Padwa / Ugadi", subject: "Happy New Year Greetings & Prosperity!", message: "Wishing you a prosperous and bright New Year! May this year bring immense joy and success." },
    "2026-04-14_2026-04-14": { key: "baisakhi", name: "Baisakhi & Ambedkar Jayanti", subject: "Joyous Baisakhi & Ambedkar Jayanti Greetings!", message: "Warmest greetings on the joyous occasion of Baisakhi! Celebrate with our fast delivery services." },
    "2026-05-10_2026-05-10": { key: "akshaya_tritiya", name: "Akshaya Tritiya", subject: "Happy Akshaya Tritiya: Endless Prosperity!", message: "May this auspicious day bring endless prosperity and good fortune to your home and business." },
    "2026-06-07_2026-06-07": { key: "eid", name: "Eid-ul-Adha", subject: "Blessed Eid-ul-Adha Greetings!", message: "Wishing you and your loved ones a blessed Eid filled with peace, happiness, and sweet gatherings." },
    "2026-08-14_2026-08-15": { key: "independence_day", name: "Independence Day", subject: "Happy Independence Day: Special Freedom Deals!", message: "Celebrate the spirit of freedom with special patriotic prints and flat delivery discounts." },
    "2026-08-27_2026-08-27": { key: "ganesh_chaturthi", name: "Ganesh Chaturthi", subject: "Happy Ganesh Chaturthi: Blessings of Bappa!", message: "May Lord Ganesha remove all obstacles and shower your home with wisdom and luck!" },
    "2026-09-05_2026-09-05": { key: "teachers_day", name: "Teachers' Day", subject: "Happy Teachers' Day: Honor Your Mentors!", message: "Show gratitude to your teachers with custom-printed greeting cards, photo frames, and certificates." },
    "2026-10-05_2026-10-05": { key: "dussehra", name: "Dussehra (Vijayadashami)", subject: "Happy Dussehra: Triumph of Good over Evil!", message: "Wishing you a victorious and joyful Dussehra! May righteousness always prevail in your life." },
    "2026-10-11_2026-10-22": { key: "diwali_season", name: "Navratri to Diwali Festive Season", subject: "Exclusive Festive Printing & Gift Deals!", message: "Light up your celebrations! Enjoy exclusive discounts on custom photo calendars and gifts this festive season." },
    "2026-10-22_2026-10-22": { key: "bhai_dooj", name: "Bhai Dooj", subject: "Happy Bhai Dooj: Celebrate Sibling Bonds!", message: "Celebrate the sacred bond of love and protection with special personalized gifts delivered in 15 minutes!" },
    "2026-10-27_2026-10-27": { key: "chhath", name: "Chhath Puja", subject: "Blessed Chhath Puja Greetings!", message: "Wishing you and your family a blessed Chhath Puja filled with purity, devotion, and divine grace." },
    "2026-12-24_2026-12-25": { key: "christmas", name: "Christmas & Year-End", subject: "Merry Christmas & Happy Holidays!", message: "Merry Christmas from Print From Home! Enjoy special year-end discounts on all custom printing services." },
    "2026-12-31_2027-01-01": { key: "new_year", name: "New Year Celebration", subject: "Happy New Year: Exclusive Calendar Offers!", message: "Happy New Year! Start your year right with our brand new custom calendars and planners." }
};
app.get('/api/admin/festival-templates', (req, res) => {
    try {
        res.json({ success: true, templates: festivalCalendar });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/inventory/add', uploadCloudinary.single('productImage'), async (req, res) => {
    try {
        const { sku, name, purchasePrice, sellingPrice, quantity, barcode, externalImageUrl } = req.body;
        let product = await Product.findOne({ $or: [{ sku }, ...(barcode ? [{ barcode }] : [])] });
        
        let imageUrl = product ? product.imageUrl : '';
        if (req.file && req.file.path) {
            imageUrl = req.file.path; 
        } else if (externalImageUrl) {
            imageUrl = externalImageUrl;
        }

        let wasOutOfStock = product ? product.stockQuantity <= 0 : false;
        let addedQty = Number(quantity);

        if (product) {
            product.stockQuantity += addedQty;
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
                stockQuantity: addedQty,
                barcode: barcode || '',
                imageUrl: imageUrl || ''
            });
            await product.save();
            wasOutOfStock = true;
        }

        if (wasOutOfStock && product.stockQuantity > 0) {
            autoTriggerStockNotification(product.name);
        }

        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔥 1. Add New Product API Route (Advanced Modal Support)
app.post('/api/admin/product/add', async (req, res) => {
    try {
        const { sku, name, sellingPrice, stockQuantity, category, description, imageUrl, images } = req.body;
        
        const newProduct = new Product({
            sku: sku || `SKU_${Date.now()}`,
            barcode: sku || `SKU_${Date.now()}`,
            name,
            sellingPrice: parseFloat(sellingPrice) || 0,
            stockQuantity: parseInt(stockQuantity) || 0,
            category: category || 'munchies',
            description: description || '',
            imageUrl: imageUrl || '',
            images: images || []
        });

        await newProduct.save();
        res.json({ success: true, message: "Product added successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/product/update', async (req, res) => {
    try {
        const { id, name, sellingPrice, stockQuantity, category, description, imageUrl, images } = req.body;
        
        if (!id) {
            return res.status(400).json({ success: false, message: "Product ID is missing for update." });
        }

        let query = { _id: id };
        if (!mongoose.Types.ObjectId.isValid(id)) {
            query = { sku: id };
        }

        await Product.findOneAndUpdate(query, {
            name,
            sellingPrice: parseFloat(sellingPrice) || 0,
            stockQuantity: parseInt(stockQuantity) || 0,
            category: category || 'munchies',
            description: description || '',
            imageUrl: imageUrl || '',
            images: images || []
        }, { new: true });

        res.json({ success: true, message: "Product updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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

// 🔥 CART CHECKOUT INVENTORY DECREMENT ENDPOINT
app.post('/api/admin/inventory/decrement', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: "Invalid items payload!" });
        }

        for (const item of items) {
            if (item.printType === 'snack' || item.printType === 'product' || (item.fileName && String(item.fileName).startsWith('Product:'))) {
                let prodName = String(item.fileName || item.name || '').replace('Product: ', '').split(' (Qty:')[0].trim();
                let prodSku = item.sku;
                let qty = Number(item.copies || item.qty || 1);
                
                let matchedProd = null;
                if (prodSku) {
                    matchedProd = await Product.findOne({ sku: prodSku });
                }
                if (!matchedProd && prodName) {
                    matchedProd = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });
                }

                if (matchedProd) {
                    matchedProd.stockQuantity = Math.max(0, matchedProd.stockQuantity - qty);
                    matchedProd.totalSold += qty;
                    await matchedProd.save();
                }
            }
        }
        res.json({ success: true, message: "Inventory updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔥 RESTOCK SCANNED ITEM AFTER CANCELLATION ENDPOINT
app.post('/api/admin/inventory/restock-scanned', async (req, res) => {
    try {
        const { orderId, barcodeOrName } = req.body;
        const order = await Order.findOne({ orderId });
        if (!order) return res.json({ success: false, message: "Order not found." });

        const product = await Product.findOne({ 
            $or: [{ sku: barcodeOrName }, { barcode: barcodeOrName }, { name: new RegExp(barcodeOrName, 'i') }] 
        });

        if (!product) {
            return res.json({ success: false, message: "Product not registered in store inventory!" });
        }

        product.stockQuantity += 1;
        product.totalSold = Math.max(0, product.totalSold - 1);
        await product.save();

        order.needsStockRestockScan = false;
        order.status = "Cancelled & Shelved";
        await order.save();

        res.json({ success: true, message: `✅ Success! "${product.name}" returned to shelf and inventory recovered (+1).` });
    } catch (e) {
        res.json({ success: false, message: "Restock scan failed." });
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

        let totalSales = 0;
        let totalDeliveryFeesCollected = 0;
        let totalPurchaseCost = 0;

        for (let o of filteredOrders) {
            if (!o.status.includes('Cancelled')) {
                let orderTotal = parseFloat(o.totalAmount || o.amount || 0);
                let deliveryFee = parseFloat(o.deliveryFeeCharged || 0);
                
                totalSales += orderTotal;
                totalDeliveryFeesCollected += deliveryFee;

                let configDetails = [];
                try { 
                    configDetails = typeof o.configDetails === 'string' ? JSON.parse(o.configDetails) : o.configDetails; 
                } catch(e) {}

                if (Array.isArray(configDetails)) {
                    for (let item of configDetails) {
                        if (item.printType === 'snack' || item.printType === 'product' || (item.fileName && String(item.fileName).startsWith('Product:'))) {
                            let prodName = String(item.fileName || item.name || '').replace('Product: ', '').split(' (Qty:')[0].trim();
                            let prodSku = item.sku;
                            let qty = Number(item.copies || item.qty || 1);

                            let matchedProd = null;
                            if (prodSku) matchedProd = products.find(p => p.sku === prodSku);
                            if (!matchedProd && prodName) matchedProd = products.find(p => p.name.toLowerCase() === prodName.toLowerCase());

                            if (matchedProd) {
                                totalPurchaseCost += (matchedProd.purchasePrice || 0) * qty;
                            }
                        } else {
                            let pages = Number(item.pages || 1);
                            let copies = Number(item.copies || 1);
                            totalPurchaseCost += pages * 1 * copies;
                        }
                    }
                }
            }
        }

        let netProfit = (totalSales - totalDeliveryFeesCollected) - totalPurchaseCost;

        res.json({
            success: true,
            totalOrders: filteredOrders.length,
            totalSales: totalSales.toFixed(2),
            totalProfit: netProfit.toFixed(2),
            totalDeliveryFees: totalDeliveryFeesCollected.toFixed(2),
            variety: products.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/inventory/predictive-restock', async (req, res) => {
    try {
        const products = await Product.find({ stockQuantity: { $lte: 5 } }).sort({ stockQuantity: 1 });
        res.json({ success: true, suggestions: products });
    } catch (e) { 
        res.status(500).json({ success: false, message: "Error fetching restock data" }); 
    }
});

app.get('/api/picker/active-orders', async (req, res) => { 
    try {
        const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const orders = await Order.find({ status: { $ne: 'Pending Payment' } }).sort({ timestamp: -1 });
        
        const activePickerOrders = orders.filter(o => {
            let dObj = o.timestamp ? new Date(o.timestamp) : new Date();
            let orderDateIso = dObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            
            let isToday = (orderDateIso === todayIso);
            let status = o.status || '';
            let notFinished = !status.includes('Delivered') && !status.includes('Out for Delivery') && !status.includes('Cancelled');

            return isToday && notFinished;
        });

        res.json(activePickerOrders); 
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
            if (item.printType === 'snack' || item.printType === 'product' || (item.fileName && String(item.fileName).startsWith('Product:'))) {
                let prodName = String(item.fileName || item.name || '').replace('Product: ', '').split(' (Qty:')[0].trim();
                let prodSku = item.sku;
                let qty = Number(item.copies || item.qty || 1);
                
                let matchedProd = null;
                if (prodSku) matchedProd = await Product.findOne({ sku: prodSku });
                if (!matchedProd && prodName) matchedProd = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });

                if (matchedProd) {
                    matchedProd.stockQuantity = Math.max(0, matchedProd.stockQuantity - qty);
                    matchedProd.totalSold += qty;
                    await matchedProd.save();
                }
            }
        }
    }
}

app.post('/api/create-order', uploadLocal.any(), async (req, res) => {
    try {
        let config = await StoreConfig.findOne();
        
        // 🔥 DIWALI LAUNCH HOLD CHECK (Sabse upar)
        if (config && config.diwaliLaunchMode) {
            return res.status(403).json({ 
                success: false, 
                isDiwaliHold: true,
                message: config.diwaliMessage || "🚀 Launching on Diwali! Service starts from Diwali. Thanks for downloading Print From Home! 🙏" 
            });
        }

        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;
        const isTimeWithinOperatingHours = istHours >= 7 && istHours < 24;
        
        const isOpen = config ? (isTimeWithinOperatingHours && config.isOpen) : isTimeWithinOperatingHours;
        if (!isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        // 🔥 deliveryMode ko bhi req.body se destructure karein ('doorstep' ya 'pickup')
        const { totalAmount, configDetails, address, customerName, phone, paymentMode, deliveryMode } = req.body;
        
        let finalAmountNumeric = parseFloat(String(totalAmount || '42').replace(/[₹,]/g, ''));
        if (isNaN(finalAmountNumeric) || finalAmountNumeric <= 0) finalAmountNumeric = 42;

        let parsedConfig = [];
        try { 
            parsedConfig = typeof configDetails === 'string' ? JSON.parse(configDetails) : (configDetails || []); 
        } catch(e) {
            parsedConfig = [];
        }

        // 🔥 Print Service Toggle Check:
        const hasPrintJobs = Array.isArray(parsedConfig) && parsedConfig.some(item => item.printType !== 'snack' && item.printType !== 'product' && (!item.fileName || !item.fileName.startsWith('Product:')));
        const isPrintAllowed = config ? config.printEnabled !== false : true;

        if (hasPrintJobs && !isPrintAllowed) {
            return res.status(403).json({ 
                success: false, 
                message: "⚠️ Printing service is currently temporarily OFF due to technical maintenance. Please try again later." 
            });
        }

        const selectedPaymentMode = paymentMode || "online";

        // 🚨 RULE 1: Print Orders ke liye Online Payment Mandatory Check
        if (hasPrintJobs && selectedPaymentMode !== 'online') {
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ Print orders ke liye sirf Online Payment mandatory hai taaki false orders aur paper waste ka risk na ho!" 
            });
        }

        if (Array.isArray(parsedConfig)) {
            for (const item of parsedConfig) {
                if (item.printType === 'snack' || item.printType === 'product' || (item.fileName && String(item.fileName).startsWith('Product:'))) {
                    let prodName = String(item.fileName || item.name || '').replace('Product: ', '').split(' (Qty:')[0].trim();
                    let prodSku = item.sku;
                    let qtyRequested = Number(item.copies || item.qty || 1);
                    
                    let product = null;
                    if (prodSku) product = await Product.findOne({ sku: prodSku });
                    if (!product && prodName) product = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });

                    if (product && product.stockQuantity < qtyRequested) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `⚠️ Sorry! "${prodName || product.name}" has only ${product.stockQuantity} units left in stock.` 
                        });
                    }
                }
            }
        }

        const numericId = String(Math.floor(100000 + Math.random() * 900000));

        // 📋 RULE 2: Print Jobs ke sath Summary / Advertising Cover Slip attach karna
        if (hasPrintJobs) {
            parsedConfig.push({
                fileName: `📋 SUMMARY COVER SLIP [Order ID: #${numericId}]`,
                pages: 1,
                copies: 1,
                printType: 'bw',
                isCoverSlip: true,
                customerName: customerName || 'Customer',
                phone: phone || 'N/A',
                tagline: "Print From Home - India's Last Minute Printing App | www.printfromhomes.com"
            });
        }

        const host = req.get('host');
        const docFiles = req.files ? req.files.filter(f => f.fieldname === 'document') : [];
        const filesMappedList = docFiles.map(f => ({ 
            name: f.originalname || 'Document.pdf', 
            filename: f.filename, 
            url: `https://${host}/uploads/${f.filename}` 
        }));

        const primaryUrl = filesMappedList.length > 0 ? filesMappedList[0].url : '';
        const primaryName = filesMappedList.length > 0 ? filesMappedList[0].name : (parsedConfig[0]?.fileName || 'Document.pdf');

        const initialOrderStatus = hasPrintJobs ? 'Ready for Print' : 'Processing';

        // 🏪 RULE 3: Store Pickup hone par Delivery Fee strictly ₹0 (FREE) karna
        let calculatedDeliveryFee = (deliveryMode === 'pickup') ? 0 : (finalAmountNumeric >= 99 ? 0 : 25);

        if (selectedPaymentMode === 'cod' || selectedPaymentMode === 'wallet') {
            const newOrder = new Order({
                orderId: numericId,
                customerName: customerName || 'Customer',
                phone: phone || 'N/A',
                deliveryMode: deliveryMode || 'doorstep', // 🔥 Yeh save hoga
                files: filesMappedList,
                fileUrl: primaryUrl,
                fileName: primaryName,
                configDetails: parsedConfig,
                pages: parsedConfig.length > 0 ? (parsedConfig[0].pages || 1) : 1,
                copies: parsedConfig.length > 0 ? (parsedConfig[0].copies || 1) : 1,
                printType: parsedConfig.length > 0 ? (parsedConfig[0].isColor ? 'Color' : 'Black & White') : 'Black & White',
                binding: parsedConfig.length > 0 ? (parsedConfig[0].binding || 'None') : 'None',
                address: (deliveryMode === 'pickup') ? '🏪 Store Pickup (Self-Service)' : (address || 'N/A'),
                amount: finalAmountNumeric.toFixed(2),
                totalAmount: finalAmountNumeric.toFixed(2),
                status: initialOrderStatus,
                date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                timestamp: new Date().toISOString(),
                paymentId: selectedPaymentMode === 'wallet' ? 'PAID VIA WALLET' : 'CASH ON DELIVERY',
                deliveryFeeCharged: calculatedDeliveryFee
            });

            await newOrder.save();
            return res.status(201).json({ success: true, isWallet: selectedPaymentMode === 'wallet', isCod: selectedPaymentMode === 'cod', order_id: numericId });
        }

        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create({ 
                amount: Math.round(finalAmountNumeric * 100), 
                currency: "INR", 
                receipt: `rcpt_${numericId}` 
            });
        } catch (rzpErr) {
            return res.status(500).json({ success: false, message: "Payment gateway error: " + rzpErr.message });
        }
        
        const newOrder = new Order({
            orderId: numericId,
            customerName: customerName || 'Customer',
            phone: phone || 'N/A',
            files: filesMappedList,
            fileUrl: primaryUrl,
            fileName: primaryName,
            configDetails: parsedConfig,
            pages: parsedConfig.length > 0 ? (parsedConfig[0].pages || 1) : 1,
            copies: parsedConfig.length > 0 ? (parsedConfig[0].copies || 1) : 1,
            printType: parsedConfig.length > 0 ? (parsedConfig[0].isColor ? 'Color' : 'Black & White') : 'Black & White',
            binding: parsedConfig.length > 0 ? (parsedConfig[0].binding || 'None') : 'None',
            address: (deliveryMode === 'pickup') ? '🏪 Store Pickup (Self-Service)' : (address || 'N/A'),
            amount: finalAmountNumeric.toFixed(2),
            totalAmount: finalAmountNumeric.toFixed(2),
            status: 'Pending Payment',
            date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            timestamp: new Date().toISOString(),
            deliveryFeeCharged: calculatedDeliveryFee
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
        res.status(500).json({ success: false, message: error.message || "Order creation failed" });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = await Order.findOne({ orderId });
        if (order) {
            let parsedConfig = order.configDetails || [];
            if (typeof parsedConfig === 'string') {
                try { parsedConfig = JSON.parse(parsedConfig); } catch(e){}
            }

            const hasPrintJobs = parsedConfig.some(item => item.printType !== 'snack' && item.printType !== 'product' && (!item.fileName || !item.fileName.startsWith('Product:')));
            order.status = hasPrintJobs ? 'Ready for Print' : 'Processing';
            order.paymentId = paymentId; 
            await order.save();

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

        let orderTotal = parseFloat(order.totalAmount || order.amount || 0);
        let deliveryFee = parseFloat(order.deliveryFeeCharged || 25);
        let refundableAmount = Math.max(0, orderTotal - deliveryFee);

        if (order.paymentId && order.paymentId !== 'CASH ON DELIVERY' && order.paymentId !== 'PAID VIA WALLET') {
            try {
                if (refundableAmount > 0) {
                    await razorpay.payments.refund(order.paymentId, {
                        amount: Math.round(refundableAmount * 100),
                        speed: 'optimum',
                        notes: { reason: 'Order cancelled', orderId: order.orderId }
                    });
                }
            } catch (rzpErr) {
                order.manualNeftRefundRequired = true;
            }
        } 

        const pickerAlreadyPicked = order.status.includes('Processing') || order.status.includes('Printing') || order.verifiedItems?.length > 0;

        if (pickerAlreadyPicked) {
            order.status = "Cancelled (Needs Restock Scan)";
            order.needsStockRestockScan = true;
        } else {
            let configItems = order.configDetails || [];
            if (typeof configItems === 'string') {
                try { configItems = JSON.parse(configItems); } catch(e){ configItems = []; }
            }

            for (const item of configItems) {
                if (item.printType === 'snack' || item.printType === 'product' || (item.fileName && String(item.fileName).startsWith('Product:'))) {
                    let prodName = String(item.fileName || item.name || '').replace('Product: ', '').split(' (Qty:')[0].trim();
                    let prodSku = item.sku;
                    let qty = Number(item.copies || item.qty || 1);

                    let matchedProd = null;
                    if (prodSku) matchedProd = await Product.findOne({ sku: prodSku });
                    if (!matchedProd && prodName) matchedProd = await Product.findOne({ name: { $regex: new RegExp(prodName, 'i') } });

                    if (matchedProd) {
                        matchedProd.stockQuantity += qty;
                        matchedProd.totalSold = Math.max(0, matchedProd.totalSold - qty);
                        await matchedProd.save();
                    }
                }
            }
            order.status = 'Cancelled by Customer';
        }

        order.isRefundableAmount = refundableAmount;
        await order.save();

        res.json({ 
            success: true, 
            message: pickerAlreadyPicked 
                ? `Order cancelled! ₹${refundableAmount} refund initiated. Admin must scan picked items to restore shelf stock.` 
                : `✅ Order cancelled successfully! ₹${refundableAmount} refunded to source (Delivery fee of ₹${deliveryFee} retained).` 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const handleStatusUpdate = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        const { status, assignedDeliveryBoy } = req.body;
        const order = await Order.findOne({ orderId });
        if (order) {
            if (order.status && order.status.includes('Delivered')) {
                return res.status(400).json({ success: false, message: "Cannot modify delivered order." });
            }
            if (status) {
                order.status = status; 
                if (status.includes('Delivered') && order.assignedDeliveryBoy) {
                    await DeliveryBoy.findOneAndUpdate(
                        { phone: order.assignedDeliveryBoy }, 
                        { currentOrderId: null, isOnline: false }
                    );
                }
            }
            if (assignedDeliveryBoy !== undefined) order.assignedDeliveryBoy = assignedDeliveryBoy;
            await order.save();
            return res.json({ success: true, order });
        }
        res.status(404).json({ success: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

app.post('/api/admin/orders/update-status', handleStatusUpdate);
app.post('/api/admin/orders/:orderId/status', handleStatusUpdate);

// 🔥 Admin Route to View All Registered Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); // Exclude passwords for security
        res.json({ success: true, count: users.length, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔥 Persistent Database-Backed Admin Store Settings & Fees Schema
const storeSettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, default: 'global_settings' },
    deliveryFee: { type: Number, default: 25.00 },
    handlingFee: { type: Number, default: 5.00 },
    rainFee: { type: Number, default: 15.00 },
    coupons: { type: Array, default: [
        { code: 'FREEDEL', desc: 'Free delivery on orders above ₹99', discount: 25 },
        { code: 'PRINT20', desc: 'Flat ₹20 off on print orders', discount: 20 }
    ]}
});
const StoreSetting = mongoose.model('StoreSetting', storeSettingsSchema);

app.get('/api/admin/settings', async (req, res) => {
    try {
        let settings = await StoreSetting.findOne({ key: 'global_settings' });
        if (!settings) {
            settings = await StoreSetting.create({ key: 'global_settings' });
        }
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/settings/update', async (req, res) => {
    try {
        const { deliveryFee, handlingFee, rainFee, coupons, openTime, closeTime } = req.body;
        
        let settings = await StoreSetting.findOne({ key: 'global_settings' });
        if (!settings) {
            settings = new StoreSetting({ key: 'global_settings' });
        }

        if (deliveryFee !== undefined && deliveryFee !== null && deliveryFee !== '') {
            settings.deliveryFee = parseFloat(deliveryFee);
        }
        if (handlingFee !== undefined && handlingFee !== null && handlingFee !== '') {
            settings.handlingFee = parseFloat(handlingFee);
        }
        if (rainFee !== undefined && rainFee !== null && rainFee !== '') {
            settings.rainFee = parseFloat(rainFee);
        }
        if (coupons !== undefined && Array.isArray(coupons)) settings.coupons = coupons;
        await settings.save();

        // 🔥 Admin dwara set kiye gaye store timings ko StoreConfig mein permanent save karne ke liye
        if (openTime !== undefined || closeTime !== undefined) {
            let config = await StoreConfig.findOne();
            if (!config) config = new StoreConfig();
            if (openTime !== undefined) config.openTime = openTime;
            if (closeTime !== undefined) config.closeTime = closeTime;
            config.updatedAt = new Date().toISOString();
            await config.save();
        }

        res.json({ success: true, message: "Settings and timings saved permanently to database!", settings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 📍 ADMIN LIVE GPS LOCATION TRACKING ENDPOINTS
// ==========================================
let activeAdminLocations = {};

// 1. Admin device updates its current GPS location
app.post('/api/admin/update-location', (req, res) => {
    try {
        const { orderId, lat, lng } = req.body;
        if (lat && lng) {
            const targetOrderId = orderId || 'default';
            activeAdminLocations[targetOrderId] = { 
                lat: Number(lat), 
                lng: Number(lng), 
                timestamp: Date.now() 
            };
            return res.json({ success: true, message: "Admin location updated successfully" });
        }
        res.status(400).json({ success: false, message: "Latitude and Longitude are required" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. User tracking page fetches admin live GPS location
app.get('/api/admin/live-location', (req, res) => {
    try {
        const { orderId } = req.query;
        let locationData = (orderId && activeAdminLocations[orderId]) ? activeAdminLocations[orderId] : null;

        // Fallback to latest active admin location if specific orderId not found
        if (!locationData) {
            const keys = Object.keys(activeAdminLocations);
            if (keys.length > 0) {
                locationData = activeAdminLocations[keys[keys.length - 1]];
            }
        }

        if (locationData) {
            return res.json({
                success: true,
                lat: locationData.lat,
                lng: locationData.lng
            });
        }

        // Default to store location (Varanasi Store) if no GPS broadcasted yet
        res.json({
            success: true,
            lat: 25.3451,
            lng: 83.0012
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// ==========================================
// 🛵 RIDER / DELIVERY PARTNER ADVANCED SCHEMA & APIS
// ==========================================
const deliveryPartnerSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, unique: true },
    email: String,
    password: String,
    licenseNumber: { type: String, default: '' },
    bankDetails: {
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        holderName: { type: String, default: '' }
    },
    isOnline: { type: Boolean, default: false },
    currentOrderId: { type: String, default: null },
    earningsToday: { type: Number, default: 0 },
    earningsWeekly: { type: Number, default: 0 },
    completedDeliveriesToday: { type: Number, default: 0 },
    deliveryHistory: { type: Array, default: [] }, // [{orderId, amount, date, timestamp}]
    dateCreated: String
});
const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

// 1. Save / Update Bank Account Details
app.post('/api/rider/bank-details', async (req, res) => {
    try {
        const { phone, accountNumber, ifscCode, holderName } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        rider.bankDetails = { accountNumber, ifscCode, holderName };
        await rider.save();
        res.json({ success: true, message: "Bank details saved successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Complete Delivery & Record Earning (Per order earning e.g. ₹25)
app.post('/api/rider/complete-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        const order = await Order.findOne({ orderId });
        let orderFee = 25; // Fixed delivery commission per order
        if (order) {
            order.status = 'Delivered 🟢';
            await order.save();
        }

        rider.currentOrderId = null;
        rider.earningsToday += orderFee;
        rider.earningsWeekly += orderFee;
        rider.completedDeliveriesToday += 1;
        
        rider.deliveryHistory.unshift({
            orderId: orderId,
            amount: orderFee,
            date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
            timestamp: new Date().toISOString()
        });

        await rider.save();
        res.json({ success: true, message: `🎉 Delivery completed! Earned ₹${orderFee}.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Admin Route: View All Riders Earnings & Bank Details for NEFT Payout
app.get('/api/admin/riders-payouts', async (req, res) => {
    try {
        const riders = await DeliveryPartner.find({}).select('-password');
        res.json({ success: true, riders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 1. Rider Login Auth
app.post('/api/rider/auth-login', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "Valid 10-digit mobile number required!" });
        }
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            rider = new DeliveryPartner({ phone, name: "Partner " + phone.slice(-4), isOnline: false });
            await rider.save();
        }
        res.json({ success: true, message: "Login successful", rider });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Toggle Rider Duty (Online / Offline)
app.post('/api/rider/toggle-duty', async (req, res) => {
    try {
        const { phone, isOnline } = req.body;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider not found" });
        }
        rider.isOnline = Boolean(isOnline);
        await rider.save();
        res.json({ success: true, isOnline: rider.isOnline });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1. Rider Accept Order Route (Single active order enforcement)
app.post('/api/rider/accept-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        // Check agar rider ke paas pehle se active order hai, toh naya order khud se accept nahi karne dega
        if (rider.currentOrderId) {
            return res.status(400).json({ success: false, message: "⚠️ You already have an active order! Deliver it first before accepting a new one." });
        }

        let order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.assignedDeliveryBoy = phone;
        order.status = 'Out for Delivery';
        await order.save();

        rider.currentOrderId = orderId;
        await rider.save();

        res.json({ success: true, message: `✅ Order #${orderId} accepted successfully!` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Rider Dashboard Data Feed Route (Primary Active Order + Admin Queued Secondary Orders)
app.get('/api/rider/dashboard/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            rider = new DeliveryPartner({ phone, name: "Partner " + phone.slice(-4), isOnline: false });
            await rider.save();
        }

        // Sabhi orders nikalein jo is delivery boy ko assigned hain aur deliver nahi hue hain
        let assignedOrders = await Order.find({ 
            assignedDeliveryBoy: phone, 
            status: { $regex: /out for delivery|ready|processing/i },$and: [{ status: { $not: /delivered|cancelled/i } }]
        }).sort({ timestamp: 1 });

        let activeOrder = null;
        let secondaryOrders = [];

        if (assignedOrders.length > 0) {
            activeOrder = assignedOrders[0]; // Pehla order primary active hoga
            secondaryOrders = assignedOrders.slice(1); // Baaki orders queued rahenge
            
            // Sync rider currentOrderId with the true primary active order
            if (rider.currentOrderId !== activeOrder.orderId) {
                rider.currentOrderId = activeOrder.orderId;
                await rider.save();
            }
        } else if (rider.currentOrderId) {
            rider.currentOrderId = null;
            await rider.save();
        }

        let newOrders = [];
        // Agar rider ke paas koi active order nahi hai, tabhi use naye open orders dikhein
        if (rider.isOnline && assignedOrders.length === 0) {
            newOrders = await Order.find({ 
                $and: [
                    {
                        $or: [
                            { status: { $regex: /ready|print|pending|new|paid|success/i } },
                            { status: { $exists: false } },
                            { status: "" }
                        ]
                    },
                    {
                        $or: [
                            { assignedDeliveryBoy: { $exists: false } }, 
                            { assignedDeliveryBoy: null }, 
                            { assignedDeliveryBoy: "" }
                        ]
                    }
                ]
            }).limit(5);
        }

        res.json({ success: true, rider, activeOrder, secondaryOrders, newOrders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Complete Delivery Route (Automatic Next Order Activation)
app.post('/api/rider/complete-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        const order = await Order.findOne({ orderId });
        let orderFee = 25;
        if (order) {
            order.status = 'Delivered 🟢';
            await order.save();
        }

        rider.earningsToday += orderFee;
        rider.earningsWeekly += orderFee;
        rider.completedDeliveriesToday += 1;
        
        rider.deliveryHistory.unshift({
            orderId: orderId,
            amount: orderFee,
            date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
            timestamp: new Date().toISOString()
        });

        // Check karo ki kya koi aur order admin ne assign kiya hua hai queue mein
        let nextAssignedOrder = await Order.findOne({ 
            assignedDeliveryBoy: phone, 
            orderId: { $ne: orderId },$and: [{ status: { $not: /delivered|cancelled/i } }]
        }).sort({ timestamp: 1 });

        if (nextAssignedOrder) {
            rider.currentOrderId = nextAssignedOrder.orderId;
        } else {
            rider.currentOrderId = null;
        }

        await rider.save();
        res.json({ success: true, message: `🎉 Delivery completed! Earned ₹25.${nextAssignedOrder ? ' Next queued order is now active!' : ''}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================
// 🛵 RIDER AUTH & USER MULTI-ADDRESS APIS
// ==========================================

app.post('/api/rider/signup', async (req, res) => {
    try {
        const { name, phone, email, password, licenseNumber } = req.body;
        const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
        const existing = await DeliveryPartner.findOne({ phone: normalizedPhone });
        if (existing) return res.status(400).json({ success: false, message: "Already registered!" });

        const newRider = new DeliveryPartner({ name: name.trim(), phone: normalizedPhone, email: email ? email.trim().toLowerCase() : '', password, licenseNumber: licenseNumber || '', dateCreated: new Date().toLocaleString() });
        await newRider.save();
        res.status(201).json({ success: true, message: "Account created successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/rider/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
        const rider = await DeliveryPartner.findOne({ phone: normalizedPhone, password });
        if (!rider) return res.status(401).json({ success: false, message: "Invalid credentials!" });
        res.json({ success: true, name: rider.name, phone: rider.phone });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/user/addresses/:identity', async (req, res) => {
    try {
        const user = await User.findOne({ identity: req.params.identity });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, addresses: user.addresses || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/addresses/save', async (req, res) => {
    try {
        const { identity, address } = req.body;
        const user = await User.findOne({ identity });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (!user.addresses.includes(address)) {
            user.addresses.push(address);
            await user.save();
        }
        res.json({ success: true, addresses: user.addresses });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/addresses/delete', async (req, res) => {
    try {
        const { identity, address } = req.body;
        const user = await User.findOne({ identity });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        user.addresses = user.addresses.filter(a => a !== address);
        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 🔥 Rider Dashboard Data Feed API Route
app.get('/api/rider/dashboard/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            // Agar rider database mein nahi mila toh auto-create kar dein
            rider = new DeliveryPartner({ phone, name: "Partner " + phone.slice(-4), isOnline: false });
            await rider.save();
        }

        let activeOrder = null;
        if (rider.currentOrderId) {
            activeOrder = await Order.findOne({ orderId: rider.currentOrderId });
        }

        let newOrders = [];
        if (rider.isOnline && !rider.currentOrderId) {
            newOrders = await Order.find({ 
                status: 'Ready for Print', 
                $or: [{ assignedDeliveryBoy: { $exists: false } }, { assignedDeliveryBoy: null }, { assignedDeliveryBoy: "" }] 
            }).limit(5);
        }

        res.json({ success: true, rider, activeOrder, newOrders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================
// 🛵 RIDER PAYOUT & BANK DETAILS BACKEND APIS
// ==========================================

// Delivery Partner Schema Update (agar pehle se hai toh fields match kar lein)
// Isme bankDetails aur deliveryHistory fields honi chahiye:
/*
  bankDetails: { accountNumber: String, ifscCode: String, holderName: String },
  earningsToday: { type: Number, default: 0 },
  earningsWeekly: { type: Number, default: 0 },
  deliveryHistory: { type: Array, default: [] }
*/

// 1. Save / Update Bank Account Details
app.post('/api/rider/bank-details', async (req, res) => {
    try {
        const { phone, accountNumber, ifscCode, holderName } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        rider.bankDetails = { accountNumber, ifscCode, holderName };
        await rider.save();
        res.json({ success: true, message: "Bank details saved successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Admin Route: View All Riders Earnings & Bank Details for NEFT Payout
app.get('/api/admin/riders-payouts', async (req, res) => {
    try {
        const riders = await DeliveryPartner.find({}).select('-password');
        res.json({ success: true, riders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================
// 🛵 RIDER ASSIGNMENT, ACCEPT & DASHBOARD APIS (VERIFIED)
// ==========================================

// 1. Admin Manual Order Assign / Status Update Route
app.post('/api/admin/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedDeliveryBoy } = req.body;
        
        let order = await Order.findOne({ $or: [{ orderId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.status = status || order.status;
        if (assignedDeliveryBoy) {
            order.assignedDeliveryBoy = assignedDeliveryBoy;
            
            // Rider ke paas bhi currentOrderId set karein taaki uske app par active order turant dikhe
            let rider = await DeliveryPartner.findOne({ phone: assignedDeliveryBoy });
            if (rider) {
                rider.currentOrderId = order.orderId;
                await rider.save();
            }
        }
        await order.save();
        res.json({ success: true, message: "Order status updated & assigned successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Rider Accept Order Route
app.post('/api/rider/accept-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        let order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.assignedDeliveryBoy = phone;
        order.status = 'Out for Delivery';
        await order.save();

        rider.currentOrderId = orderId;
        await rider.save();

        res.json({ success: true, message: `✅ Order #${orderId} accepted successfully!` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Rider Dashboard Data Feed Route
app.get('/api/rider/dashboard/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            rider = new DeliveryPartner({ phone, name: "Partner " + phone.slice(-4), isOnline: false });
            await rider.save();
        }

        let activeOrder = null;
        if (rider.currentOrderId) {
            activeOrder = await Order.findOne({ orderId: rider.currentOrderId });
        }

        let newOrders = [];
        if (rider.isOnline && !rider.currentOrderId) {
            newOrders = await Order.find({ 
                $and: [
                    {
                        $or: [
                            { status: { $regex: /ready|print|pending|new|paid|success/i } },
                            { status: { $exists: false } },
                            { status: "" }
                        ]
                    },
                    {
                        $or: [
                            { assignedDeliveryBoy: { $exists: false } }, 
                            { assignedDeliveryBoy: null }, 
                            { assignedDeliveryBoy: "" }
                        ]
                    }
                ]
            }).limit(5);
        }

        res.json({ success: true, rider, activeOrder, newOrders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================
// 📍 RIDER LIVE GPS LOCATION TRACKING
// ==========================================
let activeRiderLocations = {}; // { phone: { lat, lng, timestamp } }

app.post('/api/rider/update-location', async (req, res) => {
    try {
        const { phone, lat, lng } = req.body;
        if (phone && lat && lng) {
            activeRiderLocations[phone] = { lat: Number(lat), lng: Number(lng), timestamp: Date.now() };
            return res.json({ success: true });
        }
        res.status(400).json({ success: false, message: "Missing data" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/rider/live-location/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const loc = activeRiderLocations[phone];
        if (loc) {
            return res.json({ success: true, lat: loc.lat, lng: loc.lng });
        }
        res.json({ success: false, message: "Location not available" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
