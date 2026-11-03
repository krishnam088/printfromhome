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

// 🔥 Yeh rahi body parser ki size limit (50mb)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors());
app.use(express.static(__dirname)); 

// ==========================================
// 🛡️ 1. Pehle Local Uploads Folder Setup Karein
// ==========================================
const localUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
}

// ==========================================
// ☁️ 1.5 Cloudinary & Multer Storage Setup
// ==========================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'print_from_home_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const uploadCloudinary = multer({ storage: storage });
const uploadLocal = multer({ dest: localUploadsDir });

// ==========================================
// 📋 2. MONGOOSE SCHEMAS & MODELS (MUST BE BEFORE MIDDLEWARES)
// ==========================================
const accountUserSchema = new mongoose.Schema({
    name: String,
    identity: { type: String, unique: true }, 
    email: { type: String, unique: true, required: true }, 
    emailOtp: String,                            
    otpExpires: Date,                            
    isEmailVerified: { type: Boolean, default: false }, 
    addresses: { type: Array, default: [] },   
    dateCreated: String
});
const User = mongoose.models.User || mongoose.model('User', accountUserSchema);

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    customerName: String,
    phone: String,
    deliveryMode: { type: String, default: 'doorstep' }, 
    files: Array,
    fileUrl: String,
    fileName: String,
    fileBase64Data: String, 
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
orderSchema.index({ status: 1, timestamp: -1 });
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
// ==========================================
// 📋 STORE CONFIG & PRODUCT MODELS (MOVE HERE)
// ==========================================
const storeConfigSchema = new mongoose.Schema({
    isOpen: { type: Boolean, default: true },
    printEnabled: { type: Boolean, default: true }, 
    rainSurgeActive: { type: Boolean, default: false },
    diwaliLaunchMode: { type: Boolean, default: false },
    glossySystemEnabled: { type: Boolean, default: false },
    diwaliMessage: { type: String, default: "🚀 Launching on Diwali!..." },
    openTime: { type: String, default: "07:00" },
    closeTime: { type: String, default: "22:00" },
    updatedAt: String
});
const StoreConfig = mongoose.models.StoreConfig || mongoose.model('StoreConfig', storeConfigSchema);

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
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const storeSettingsSchema = mongoose.models.StoreSettingSchema || new mongoose.Schema({
    key: { type: String, unique: true, default: 'global_settings' },
    deliveryFee: { type: Number, default: 25.00 },
    handlingFee: { type: Number, default: 5.00 },
    rainFee: { type: Number, default: 15.00 },
    codForPrintEnabled: { type: Boolean, default: true }, 
    singlePrinterMode: { type: Boolean, default: true }, 
    coupons: { type: Array, default: [
        { code: 'FREEDEL', desc: 'Free delivery on orders above ₹99', discount: 25 },
        { code: 'PRINT20', desc: 'Flat ₹20 off on print orders', discount: 20 }
    ]}
});
const StoreSetting = mongoose.models.StoreSetting || mongoose.model('StoreSetting', storeSettingsSchema);

// ==========================================
// 🛡️ 3. Phir Self-Healing Middleware Lagayein (Ab Order model defined hai!)
// ==========================================
app.get('/uploads/:filename', async (req, res, next) => {
    try {
        let filename = req.params.filename;
        let filePath = path.join(localUploadsDir, filename);

        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }

        // 🔥 Updated Query: filename ko fileName, fileUrl, ya configDetails ke andar dhoondhein
        let matchedOrder = await Order.findOne({ 
            $or: [
                { fileUrl: { $regex: filename } },
                { fileName: filename },
                { "files.filename": filename },
                { "configDetails.fileUrl": { $regex: filename } },
                { "configDetails.fileName": filename },
                { "configDetails.fileBase64": { $exists: true, $ne: "" } }
            ]
        });

        // 🔍 Check karein ki base64 data top-level par hai ya configDetails mein
        let base64String = matchedOrder ? (matchedOrder.fileBase64Data || (matchedOrder.configDetails && matchedOrder.configDetails[0] ? matchedOrder.configDetails[0].fileBase64 : '')) : '';

        if (matchedOrder && base64String) {
            let matches = base64String.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
                console.log(`🛡️ [Self-Healing] Missing file ${filename} successfully restored from MongoDB!`);
                return res.sendFile(filePath);
            }
        }

        res.status(404).send("File not found and could not be recovered.");
    } catch (err) {
        res.status(500).send("File retrieval error: " + err.message);
    }
});

app.use('/uploads', express.static(localUploadsDir));

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

// Reuse the StoreConfig/Product models already defined above. Duplicate declarations removed to avoid redeclaration errors.


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
// 🔥 Cache memory for orders to prevent 502 Gateway Overload
let cachedOrdersResponse = null;
let lastOrdersFetchTime = 0;

// 🔥 Fast Real-Time Orders Fetch (Direct from DB without caching delay)
app.get('/api/admin/orders', async (req, res) => {
    try {
        // 🔥 .select() aur .limit(50) lagane se memory kabhi 50MB bhi cross nahi karegi!
        const orders = await Order.find({ status: { $ne: 'Pending Payment' } })
                                   .select('orderId customerName phone amount totalAmount status date timestamp deliveryMode assignedDeliveryBoy configDetails files')
                                   .sort({ timestamp: -1 })
                                   .limit(50)
                                   .lean();
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

// 🔥 Fully completed /api/store-status route with dynamic database timings
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

        // 🔥 Ab yeh database ke open aur close time ke mutabiq 100% accurate check karega
        const isTimeWithinOperatingHours = currentMinutesOfDay >= openMinutesOfDay && currentMinutesOfDay < closeMinutesOfDay;
        const finalIsOpen = isTimeWithinOperatingHours && config.isOpen;

      res.json({ 
    success: true, 
    isOpen: finalIsOpen, 
    printEnabled: config.printEnabled !== false,
    glossySystemEnabled: config.glossySystemEnabled !== false, // 🔥 Yahan add karein
    manualOverride: config.isOpen, 
    rainSurgeActive: config.rainSurgeActive, 
    openTime: openTimeStr,   
    closeTime: closeTimeStr, 
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

app.post('/api/admin/toggle-glossy', async (req, res) => {
    try {
        const { glossySystemEnabled } = req.body;
        let config = await StoreConfig.findOne();
        if (!config) { config = new StoreConfig(); }
        config.glossySystemEnabled = Boolean(glossySystemEnabled);
        config.updatedAt = new Date().toISOString();
        await config.save();
        res.json({ success: true, glossySystemEnabled: config.glossySystemEnabled });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
            url: "https://printfromhomes.com"
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
            url: "https://printfromhomes.com"
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
        const { identity, otpInput } = req.body;
        if (!identity || !otpInput) {
            return res.status(400).json({ success: false, message: "Mobile number and OTP are required." });
        }

        const normalizedIdentity = identity.replace(/\D/g, '').slice(-10);
        const tempData = await TempSignup.findOne({ identity: normalizedIdentity });
        
        if (!tempData || new Date() > new Date(tempData.otpExpires) || String(tempData.emailOtp).trim() !== String(otpInput).trim()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        const newUser = new User({
            name: tempData.name,
            identity: tempData.identity,
            email: tempData.email,
            isEmailVerified: true,
            dateCreated: new Date().toLocaleString()
        });
        
        await newUser.save();
        await TempSignup.deleteOne({ identity: normalizedIdentity });

        res.status(201).json({ 
            success: true, 
            message: "Gmail verified and account successfully created!", 
            userId: newUser.identity, 
            name: newUser.name, 
            email: newUser.email 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification failed: " + err.message });
    }
});

// --- 3. SEND LOGIN OTP VIA GMAIL ---
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
        if (!user || new Date() > new Date(user.otpExpires) || String(user.emailOtp).trim() !== String(otpInput).trim()) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
        }

        user.emailOtp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, name: user.name, identity: user.identity, email: user.email });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- UPDATE PROFILE ---
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

// --- BROADCAST EMAIL ENGINE ---
async function sendBroadcastEmail(subject, message) {
    const users = await User.find({});
    const recipients = users.filter(u => u.email && u.email.includes('@'));
    if (recipients.length === 0) return;

    for (const user of recipients) {
        try {
            const personalizedHTML = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="background: #065f46; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0; font-size: 1.3rem; letter-spacing: 0.5px;">Print From Home</h2>
                        <p style="margin: 5px 0 0 0; font-size: 0.85rem; opacity: 0.9;">Professional Printing & Delivery Services</p>
                    </div>
                    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; color: #1e293b;">
                        <p style="font-size: 1rem; color: #0f172a; margin-top: 0;">Hello <strong>${user.name || 'Valued Customer'}</strong>,</p>
                        <p style="font-size: 0.95rem; line-height: 1.6; color: #475569; white-space: pre-line;">${message}</p>
                        <div style="margin: 25px 0; text-align: center;">
                            <a href="https://printfromhomes.com" style="background-color: #065f46; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: inline-block;">Visit Store & Order Now</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-bottom: 0;">Print From Home, Varanasi | You are receiving this update as a registered user.</p>
                    </div>
                </div>
            `;

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
            }
        } catch (innerErr) {
            console.error(`❌ Error sending to ${user.email}:`, innerErr.message);
        }
    }
}

// ==========================================
// 📦 ADVANCED AUTOMATED GMAIL NOTIFICATION ENGINE
// ==========================================
async function sendOrderEmailNotification(userEmail, userName, orderId, orderStatus, amount, itemsList, paymentMode, deliveryFee) {
    if (!userEmail || !userEmail.includes('@')) return;

    let statusColor = '#065f46';
    let statusTitle = orderStatus;
    let isCancelled = orderStatus.toLowerCase().includes('cancel');
    let isDelivered = orderStatus.toLowerCase().includes('delivered');
    
    if (isCancelled) {
        statusColor = '#991b1b';
        statusTitle = 'Order Cancelled ❌';
    } else if (isDelivered) {
        statusColor = '#059669';
        statusTitle = 'Order Delivered Successfully 🟢';
    }

    const trackingUrl = `https://printfromhomes.com/?track_order=${orderId}`;

    // 🔥 Refund timeline text for cancelled orders
    let refundDetailsHtml = '';
    if (isCancelled) {
        let isOnlinePay = paymentMode && paymentMode !== 'CASH ON DELIVERY' && paymentMode !== 'PAID VIA WALLET' && paymentMode !== 'cod';
        let refundableAmt = Math.max(0, Number(amount) - Number(deliveryFee || 25));

        refundDetailsHtml = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; margin-top: 15px;">
                <p style="margin: 0; font-size: 0.8rem; font-weight: 800; color: #991b1b;">🔄 Refund & Cancellation Details:</p>
                <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: #7f1d1d; line-height: 1.4;">
                    ${isOnlinePay 
                        ? `Your online payment refund of <strong>₹${refundableAmt.toFixed(2)}</strong> (excluding delivery fee of ₹${deliveryFee || 25}) has been initiated and will reflect in your original payment source within <strong>3 to 4 working days</strong>.` 
                        : `Since this was a Cash on Delivery / Wallet order, no online debit was made. Any applicable wallet deductions have been reversed instantly.`}
                </p>
            </div>
        `;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.SMTP_PASS,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Print From Home", email: "support@printfromhomes.com" },
                to: [{ email: userEmail, name: userName || "Customer" }],
                subject: `📦 Update on Order #${orderId} - ${statusTitle}`,
                htmlContent: `
                    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: #065f46; margin: 0; font-size: 1.5rem;">print<span style="color: #16a34a;">from</span>home</h2>
                            <p style="font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0;">India's Last Minute Printing App</p>
                        </div>
                        
                        <div style="background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
                            <h3 style="margin-top: 0; color: #0f172a; font-size: 1.1rem;">Hello ${userName || 'Customer'},</h3>
                            <p style="font-size: 0.85rem; color: #334155; line-height: 1.5;">
                                Here is the latest update regarding your order <strong>#${orderId}</strong>.
                            </p>
                            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 0; font-size: 0.85rem; color: #0f172a;"><strong>Current Status:</strong> <span style="color: ${statusColor}; font-weight: 800;">${statusTitle}</span></p>
                                <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #0f172a;"><strong>Total Amount:</strong> ₹${amount}</p>
                            </div>
                            ${refundDetailsHtml}
                        </div>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${trackingUrl}" style="background: #065f46; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 800; text-decoration: none; font-size: 0.95rem; display: inline-block; box-shadow: 0 4px 12px rgba(6,95,70,0.3);">
                                Track Order Live 🚀
                            </a>
                        </div>

                        <!-- 🎧 Help & Support Hub Section -->
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center; margin-top: 20px;">
                            <p style="margin: 0 0 6px 0; font-size: 0.8rem; font-weight: 800; color: #065f46;">Need Help With Your Print Order?</p>
                            <p style="margin: 0 0 10px 0; font-size: 0.72rem; color: #047857;">Our support team is available 24/7 to assist you.</p>
                            <a href="mailto:support@printfromhomes.com?subject=Support%20For%20Order%20%23${orderId}" style="color: #ffffff; background: #065f46; padding: 6px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-decoration: none; display: inline-block;">Contact Support Hub 📧</a>
                        </div>

                        <p style="font-size: 0.7rem; color: #94a3b8; text-align: center; margin-top: 30px;">
                            &copy; 2026 Print From Home, Varanasi. All rights reserved.
                        </p>
                    </div>
                `
            })
        });

        if (response.ok) {
            console.log(`📧 Notification email sent successfully to ${userEmail} for order #${orderId}`);
        }
    } catch (e) {
        console.error("❌ Email notification error:", e.message);
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
    // --- NOVEMBER 2026 ---
    "2026-11-06": {
        name: "Dhanteras",
        subject: "✨ Wishing You Golden Prosperity this Dhanteras! | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay this auspicious day of Dhanteras shower you with wealth, success, and endless happiness. Just like a perfectly detailed golden foil print, may your future shine bright with prosperity. Wishing you and your family a wonderful year ahead!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-08": {
        name: "Diwali / Deepavali",
        subject: "🪔 Happy Diwali! Let's Print Beautiful Memories This Festive Season",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the divine light of Diwali illuminate your life with joy, good health, and vibrant colors. As you celebrate the victory of light, let us help you frame and print the beautiful moments you capture today. Have a safe, sparkling, and joyous Deepavali!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-09": {
        name: "Govardhan Puja",
        subject: "🌱 Blessed Govardhan Puja to You and Your Family | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay Lord Krishna lift all your worries and bless you with abundance, protection, and boundless joy. Wishing you a very happy and blessed Govardhan Puja from all of us!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-11": {
        name: "Bhai Dooj",
        subject: "💫 Celebrating Sibling Bonds this Bhai Dooj | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a beautiful day celebrating love, protection, and lifelong sibling ties. Don't let your favorite childhood memories fade away—keep them printed forever. Happy Bhai Dooj to you and your family!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-13": {
        name: "Chhath Puja Begins",
        subject: "☀️ Warm Wishes on Chhath Puja from Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the Sun God (Surya Dev) and Chhathi Maiya bless you with good health, ultimate purity, and the strength to fulfill your dreams. Sending you warm, bright, and peaceful festive greetings!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-15": {
        name: "Chhath Puja (Arghya)",
        subject: "☀️ Warm Wishes on Chhath Puja from Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the Sun God (Surya Dev) and Chhathi Maiya bless you with good health, ultimate purity, and the strength to fulfill your dreams. Sending you warm, bright, and peaceful festive greetings!\n\nWarm regards,\nTeam Print From Home"
    },
    "2026-11-24": {
        name: "Guru Nanak Jayanti",
        subject: "🕊️ Happy Guru Nanak Jayanti | Warm Festive Greetings",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the holy teachings of Guru Nanak Dev Ji inspire you to walk the path of truth, compassion, and peace. Wishing you a spiritually fulfilling and joyful Gurpurab!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- DECEMBER 2026 ---
    "2026-12-25": {
        name: "Christmas",
        subject: "🌲 Merry Christmas! Wishing You Joy & Warmth | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay your holiday season be wrapped in joy, filled with laughter, and brightened by love. Sending you our warmest wishes for a wonderful Christmas and a fantastic season ahead!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- JANUARY 2027 ---
    "2027-01-01": {
        name: "New Year's Day",
        subject: "🎉 Cheers to a Brilliant 2027! Happy New Year from Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nThank you for letting us print your memories and be a part of your journey. May the year 2027 unlock fresh pages of growth, success, and wonderful moments for you. Happy New Year!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-01-15": {
        name: "Makar Sankranti / Pongal",
        subject: "🪁 Wishing You a Harvest of Joy! | Makar Sankranti & Pongal",
        message: "Hello ${user.name || 'Valued Customer'},\n\nAs the sun transitions into new beginnings, may your life be filled with sweet moments and high-flying success. Wishing you a colorful and joyful harvest festival!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-01-26": {
        name: "Republic Day",
        subject: "🇮🇳 Proudly Celebrating India's 78th Republic Day | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nLet us salute the spirit of unity, freedom, and our rich heritage on this Republic Day. Wishing you a proud, inspiring, and patriotic day!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- FEBRUARY 2027 ---
    "2027-02-11": {
        name: "Vasant Panchami",
        subject: "💛 Happy Vasant Panchami! May Knowledge & Art Guide You",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay Goddess Saraswati bless you with wisdom, intellect, and creativity to reach new heights. Wishing you a beautiful, vibrant, and artistic Vasant Panchami!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-02-19": {
        name: "Shivaji Jayanti",
        subject: "⚔️ Remembering the Great Chhatrapati Shivaji Maharaj | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nOn this Shivaji Jayanti, let's honor the legacy of courage, righteousness, and visionary leadership. Warm greetings to you on this proud day.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-02-20": {
        name: "Guru Ravidas Jayanti",
        subject: "🙏 Happy Guru Ravidas Jayanti | Peace & Equality",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the universal teachings of dignity, love, and equality by Guru Ravidas Ji bring harmony and deep peace into your life.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- MARCH 2027 ---
    "2027-03-06": {
        name: "Maha Shivaratri",
        subject: "🔱 Har Har Mahadev! Blessed Maha Shivaratri | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the divine energy of Lord Shiva protect you, eliminate all obstacles, and lead you to ultimate inner peace and strength. Have a blessed Maha Shivaratri!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-03-10": {
        name: "Eid-ul-Fitr",
        subject: "🌙 Eid Mubarak from Print From Home! Wishing You Peace & Joy",
        message: "Hello ${user.name || 'Valued Customer'},\n\nOn this joyous day of Eid, may you be blessed with absolute kindness, prosperity, and endless joy. Eid Mubarak to you and your loved ones!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-03-22": {
        name: "Holi / Holika Dahan",
        subject: "🎨 Wishing You a Vibrant & Colorful Happy Holi! | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the colors of Holi fill your life with love, success, and positive energy. Just like a high-definition, premium color print, may your days ahead be bright and cheerful! Happy Holi!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-03-26": {
        name: "Good Friday",
        subject: "🕊️ Blessed Good Friday | A Day of Grace & Reflection",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a peaceful Good Friday filled with solemn reflection, divine grace, and the comforting blessings of love and sacrifice.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- APRIL 2027 ---
    "2027-04-07": {
        name: "Ugadi / Gudi Padwa",
        subject: "🌾 Happy New Year! Blessed Ugadi & Gudi Padwa | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay this auspicious start of the traditional New Year bring fresh hope, new milestones, and vibrant health into your life. Have a wonderful celebration!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-04-14": {
        name: "Ambedkar Jayanti / Baisakhi",
        subject: "✨ Celebrating Ambedkar Jayanti & Baisakhi Greetings",
        message: "Hello ${user.name || 'Valued Customer'},\n\nHonoring the legacy of Dr. B.R. Ambedkar and celebrating the joyous harvest spirit of Baisakhi. May this day bring equality, growth, and success to you.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-04-15": {
        name: "Ram Navami",
        subject: "🏹 Happy Ram Navami | May Virtue & Prosperity Prevail",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a divine Ram Navami. May the virtues and wisdom of Lord Rama guide your steps and bring eternal peace to your household.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-04-19": {
        name: "Mahavir Jayanti",
        subject: "🕊️ Peaceful Wishes on Mahavir Jayanti | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the profound path of Ahimsa (non-violence), truth, and peace shown by Lord Mahavira bring deep contentment and joy to your life.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- MAY 2027 ---
    "2027-05-17": {
        name: "Eid-ul-Zuha / Bakrid",
        subject: "🌙 Eid-ul-Zuha Mubarak! | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a blessed Bakrid. May the spirit of absolute devotion, sacrifice, and kindness bring unity and joy to your family.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-05-20": {
        name: "Buddha Purnima",
        subject: "🌸 Happy Buddha Purnima | May Peace Prevail",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the timeless wisdom and enlightened teachings of Lord Buddha fill your heart with inner peace, harmony, and joy.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- JUNE 2027 ---
    "2027-06-15": {
        name: "Muharram",
        subject: "🕊️ Observance of Muharram | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nAs we observe the holy month of Muharram, sending you warm wishes for a peaceful, reflective, and safe year ahead.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- JULY 2027 ---
    "2027-07-05": {
        name: "Jagannath Rathyatra",
        subject: "🎪 Jai Jagannath! Blessed Rathyatra to You | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the majestic chariot of Lord Jagannath pull away all your troubles and guide your life toward ultimate success and divine happiness!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- AUGUST 2027 ---
    "2027-08-15": {
        name: "Independence Day / Eid-e-Milad",
        subject: "🇮🇳 Celebrating Freedom & Progress | Happy Independence Day!",
        message: "Hello ${user.name || 'Valued Customer'},\n\nLet’s salute the heroes and pledge to carry our great nation forward with pride and integrity. Wishing you a happy 81st Independence Day!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-08-17": {
        name: "Raksha Bandhan",
        subject: "💝 Happy Raksha Bandhan! Frame Your Bonds | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a beautiful Raksha Bandhan filled with sweet memories, laughter, and the unmatched love of family. Don't forget to capture and print these memories today!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-08-25": {
        name: "Krishna Janmashtami",
        subject: "🍼 Jai Shree Krishna! Happy Janmashtami | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the playful charms of Bal Gopal bring love, spiritual peace, and delicious moments of joy to your home today. Happy Janmashtami!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- SEPTEMBER 2027 ---
    "2027-09-04": {
        name: "Ganesh Chaturthi",
        subject: "🐘 Ganpati Bappa Morya! Happy Ganesh Chaturthi ✨ | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the Lord of Wisdom, Vignaharta Lord Ganesha, remove all your roadblocks and bless your new ventures with grand success!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-09-12": {
        name: "Onam",
        subject: "🌾 Wishing You a Harvest of Prosperity this Onam!",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the festive spirit of King Mahabali fill your life with vibrant colors, sweet feasts, and endless harmony. Happy Onam!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- OCTOBER 2027 ---
    "2027-10-02": {
        name: "Mahatma Gandhi Jayanti",
        subject: "🕊️ Remembering the Mahatma | Gandhi Jayanti Greetings",
        message: "Hello ${user.name || 'Valued Customer'},\n\nLet us embrace the ideals of peace, truth, and simplicity on the birth anniversary of the Father of the Nation.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-10-09": {
        name: "Dussehra / Vijayadashami",
        subject: "🏹 Happy Dussehra! Celebrating the Triumph of Good | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay all your challenges burn down like the effigy of Ravana, leaving you with paths of righteousness, victory, and success. Happy Vijayadashami!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-10-18": {
        name: "Karwa Chauth",
        subject: "✨ Wishing You a Blessed & Beautiful Karwa Chauth | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nCelebrating the enduring strength of love and devotion. May this beautiful day bring lifelong happiness and strong marital bonds to your life.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-10-29": {
        name: "Diwali / Deepavali",
        subject: "🪔 Happy Diwali! Let's Print Beautiful Memories This Festive Season",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the divine light of Diwali illuminate your life with joy, good health, and vibrant colors. As you celebrate the victory of light, let us help you frame and print the beautiful moments you capture today. Have a safe, sparkling, and joyous Deepavali!\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-10-31": {
        name: "Bhai Dooj",
        subject: "💫 Celebrating Sibling Bonds this Bhai Dooj | Print From Home",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a beautiful day celebrating love, protection, and lifelong sibling ties. Don't forget to keep your favorite memories printed forever. Happy Bhai Dooj!\n\nWarm regards,\nTeam Print From Home"
    },

    // --- NOVEMBER 2027 ---
    "2027-11-04": {
        name: "Chhath Puja",
        subject: "Blessed Chhath Puja 2027! ☀️",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay Chhath Maiya and Surya Dev bless your family with purity, devotion, and good health.\n\nWarm regards,\nTeam Print From Home"
    },
    "2027-11-14": {
        name: "Guru Nanak Jayanti",
        subject: "Happy Guru Nanak Jayanti Greetings! 🥻",
        message: "Hello ${user.name || 'Valued Customer'},\n\nMay the holy words of Guru Nanak Dev Ji guide you towards universal brotherhood and peace.\n\nWarm regards,\nTeam Print From Home"
    },

    // --- DECEMBER 2027 ---
    "2027-12-25": {
        name: "Christmas",
        subject: "Merry Christmas 2027! 🎄",
        message: "Hello ${user.name || 'Valued Customer'},\n\nWishing you a warm and cheerful Christmas as we wrap up the year with love and gratitude.\n\nWarm regards,\nTeam Print From Home"
    }
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
        const products = await Product.find().lean();
        res.json({ success: true, products: products || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, products: [] });
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

let cachedStatsResponse = null;
let lastStatsFetchTime = 0;

app.get('/api/admin/stats', async (req, res) => {
    try {
        const requestedDate = req.query.date;
        const now = Date.now();
        
        // Agar date nahi hai aur pichle 5 seconds mein stats maange gaye hain, toh cache return karo
        if (!requestedDate && cachedStatsResponse && (now - lastStatsFetchTime < 5000)) {
            return res.json(cachedStatsResponse);
        }

        const allOrders = await Order.find({ status: { $ne: 'Pending Payment' } }).lean();
        const products = await Product.find().lean();
        
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

        const statsResult = {
            success: true,
            totalOrders: filteredOrders.length,
            totalSales: totalSales.toFixed(2),
            totalProfit: netProfit.toFixed(2),
            totalDeliveryFees: totalDeliveryFeesCollected.toFixed(2),
            variety: products.length
        };

        if (!requestedDate) {
            cachedStatsResponse = statsResult;
            lastStatsFetchTime = now;
        }

        res.json(statsResult);
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
        console.log("📥 [DEBUG CREATE-ORDER] Files received:", req.files ? req.files.length : 0);
        if (req.files && req.files.length > 0) {
            console.log("📄 [DEBUG FILE FIELDNAME]:", req.files[0].fieldname, "Filename:", req.files[0].filename);
        }
        
        let config = await StoreConfig.findOne();
        
        if (config && config.diwaliLaunchMode) {
            return res.status(403).json({ 
                success: false, 
                isDiwaliHold: true,
                message: config.diwaliMessage || "🚀 Launching on Diwali! Service starts from Diwali. Thanks for downloading Print From Home! 🙏" 
            });
        }

        // 🔥 Destructure fileBase64 along with standard fields from req.body
        const { totalAmount, configDetails, address, customerName, phone, paymentMode, deliveryMode, fileBase64 } = req.body;
        
        let finalAmountNumeric = parseFloat(String(totalAmount || '42').replace(/[₹,]/g, ''));
        if (isNaN(finalAmountNumeric) || finalAmountNumeric <= 0) finalAmountNumeric = 42;

        let parsedConfig = [];
        try { 
            parsedConfig = typeof configDetails === 'string' ? JSON.parse(configDetails) : (configDetails || []); 
        } catch(e) {
            parsedConfig = [];
        }

        const numericId = String(Math.floor(100000 + Math.random() * 900000));
        const host = req.get('host');
        const docFiles = req.files ? req.files.filter(f => f.fieldname === 'document') : [];
        
        // 🔥 Ensure uploads directory exists
        if (!fs.existsSync(localUploadsDir)) {
            fs.mkdirSync(localUploadsDir, { recursive: true });
        }

        const filesMappedList = docFiles.map((f, idx) => {
            const fullPath = path.join(localUploadsDir, f.filename);
            if (fs.existsSync(fullPath)) {
                console.log(`✅ [File Write Success] ${f.filename} (${fs.statSync(fullPath).size} bytes) written to disk.`);
            } else {
                console.error(`❌ [File Write Error] File missing from disk: ${f.filename}`);
            }

            return { 
                name: f.originalname || `Document_${idx}.pdf`, 
                filename: f.filename, 
                url: `https://${host}/uploads/${f.filename}` 
            };
        });

        // 🔥 Bulletproof Multi-Source Base64 Backup Capture Engine (Updated Right Here)
        let rawBase64Backup = fileBase64 || '';

        // Check indexed body keys (e.g. fileBase64_0) if direct fileBase64 wasn't picked up
        if (!rawBase64Backup) {
            for (let key in req.body) {
                if (key.startsWith('fileBase64_') && req.body[key] && typeof req.body[key] === 'string' && req.body[key].startsWith('data:')) {
                    rawBase64Backup = req.body[key];
                    console.log("✅ [Server Base64 Captured From indexed key]:", key, "Length:", rawBase64Backup.length);
                    break;
                }
            }
        }

        // Check parsedConfig items for base64
        if (!rawBase64Backup && Array.isArray(parsedConfig)) {
            for (let item of parsedConfig) {
                if (item.fileBase64 && typeof item.fileBase64 === 'string' && item.fileBase64.startsWith('data:')) {
                    rawBase64Backup = item.fileBase64;
                    break;
                }
            }
        }

        // Fallback to physical disk file if base64 is still empty
        if (!rawBase64Backup && docFiles.length > 0) {
            try {
                let targetFilePath = path.join(localUploadsDir, docFiles[0].filename);
                if (fs.existsSync(targetFilePath)) {
                    let fileBuffer = fs.readFileSync(targetFilePath);
                    let originalName = docFiles[0].originalname || 'Document.pdf';
                    let ext = originalName.split('.').pop().toLowerCase();
                    let mimeType = ext === 'pdf' ? 'application/pdf' : (ext === 'png' ? 'image/png' : 'image/jpeg');
                    rawBase64Backup = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
                    console.log("✅ [Server Base64 Generated Successfully From Disk] Length:", rawBase64Backup.length);
                }
            } catch(e) {
                console.error("❌ [Server Base64 Generation From Disk Error]:", e.message);
            }
        }

        // Inject base64 back into configDetails for complete self-healing safety
        if (rawBase64Backup && Array.isArray(parsedConfig)) {
            parsedConfig.forEach(item => {
                if (!item.fileBase64 || item.fileBase64 === '') {
                    item.fileBase64 = rawBase64Backup;
                }
            });
        }

// Source 4: Check Multer physical uploaded files on disk as final fallback
if (!rawBase64Backup) {
    const allUploadedFiles = req.files || [];
    if (allUploadedFiles.length > 0) {
        try {
            let targetFilePath = path.join(localUploadsDir, allUploadedFiles[0].filename);
            if (fs.existsSync(targetFilePath)) {
                let fileBuffer = fs.readFileSync(targetFilePath);
                let originalName = allUploadedFiles[0].originalname || 'Document.pdf';
                let ext = originalName.split('.').pop().toLowerCase();
                let mimeType = ext === 'pdf' ? 'application/pdf' : (ext === 'png' ? 'image/png' : 'image/jpeg');
                rawBase64Backup = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
                console.log("✅ [Server Base64 Generated Successfully From Disk] Length:", rawBase64Backup.length);
            }
        } catch(e) {
            console.error("❌ [Server Base64 Generation From Disk Error]:", e.message);
        }
    }
}

// Ensure every configDetails item carries the base64 backup for self-healing
if (rawBase64Backup && Array.isArray(parsedConfig)) {
    parsedConfig.forEach(item => {
        if (!item.fileBase64 || item.fileBase64 === '') {
            item.fileBase64 = rawBase64Backup;
        }
    });
}

        const primaryUrl = filesMappedList.length > 0 ? filesMappedList[0].url : (parsedConfig[0]?.fileUrl || '');
        const primaryName = filesMappedList.length > 0 ? filesMappedList[0].name : (parsedConfig[0]?.fileName || 'Document.pdf');
        
        parsedConfig.forEach((item, index) => {
            if (!item.fileUrl || item.fileUrl.startsWith('blob:') || item.fileUrl.startsWith('data:')) {
                let matched = filesMappedList[index] || filesMappedList[0];
                if (matched) {
                    item.fileUrl = matched.url;
                }
            }
        });

        let calculatedDeliveryFee = (deliveryMode === 'pickup') ? 0 : (finalAmountNumeric >= 99 ? 0 : 25);
        let selectedPaymentMode = paymentMode || "online";

if (selectedPaymentMode === 'cod' || selectedPaymentMode === 'wallet' || selectedPaymentMode === 'cash') {
            const newOrder = new Order({
                orderId: numericId,
                customerName: customerName || 'Customer',
                phone: phone || 'N/A',
                deliveryMode: deliveryMode || 'doorstep',
                files: filesMappedList,
                fileUrl: primaryUrl,
                fileName: primaryName,
                fileBase64Data: rawBase64Backup, // 🔥 1st Block: COD / Wallet / Cash ke liye yahan add karein
                configDetails: parsedConfig,
                amount: finalAmountNumeric.toFixed(2),
                totalAmount: finalAmountNumeric.toFixed(2),
                status: 'Ready for Print',
                date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                timestamp: new Date().toISOString(),
                paymentId: selectedPaymentMode === 'wallet' ? 'PAID VIA WALLET' : 'CASH ON DELIVERY',
                deliveryFeeCharged: calculatedDeliveryFee
            });

            await newOrder.save();
            return res.status(201).json({ success: true, order_id: numericId });
        }

        let razorpayOrder = await razorpay.orders.create({ 
            amount: Math.round(finalAmountNumeric * 100), 
            currency: "INR", 
            receipt: `rcpt_${numericId}` 
        });

        const newOrder = new Order({
            orderId: numericId,
            customerName: customerName || 'Customer',
            phone: phone || 'N/A',
            deliveryMode: deliveryMode || 'doorstep',
            files: filesMappedList,
            fileUrl: primaryUrl,
            fileName: primaryName,
            fileBase64Data: rawBase64Backup, // 🔥 2nd Block: Online Razorpay orders ke liye yahan add karein
            configDetails: parsedConfig,
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

            // 🔥 Send Advanced Email Notification on Payment Verification & Order Placement
            try {
                const userObj = await User.findOne({ identity: order.phone });
                if (userObj && userObj.email) {
                    sendOrderEmailNotification(
                        userObj.email, 
                        userObj.name || order.customerName, 
                        order.orderId, 
                        order.status, 
                        order.totalAmount, 
                        order.configDetails, 
                        order.paymentId, 
                        order.deliveryFeeCharged
                    );
                }
            } catch (mailErr) {
                console.error("Email trigger error:", mailErr.message);
            }

            return res.json({ success: true });
        }
        res.status(404).json({ success: false, message: "Order not found" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔥 Order Delivered hone par database aur disk se heavy file data auto-wipe karne ka logic
async function cleanupOrderFilesAfterDelivery(orderId) {
    try {
        let order = await Order.findOne({ orderId });
        if (!order) return;

        if (Array.isArray(order.files)) {
            order.files.forEach(f => {
                if (f.filename) {
                    let filePath = path.join(localUploadsDir, f.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🧹 [Auto-Wipe] Deleted local file: ${f.filename}`);
                    }
                }
            });
        }

        order.fileBase64Data = undefined;
        order.fileUrl = "Archived / Wiped after delivery";
        await order.save();
        
        console.log(`✅ [Auto-Wipe] Order #${orderId} storage successfully cleaned up!`);
    } catch (e) {
        console.error("❌ Cleanup error:", e.message);
    }
}

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

        // 🔥 Send Advanced Email Notification on Cancellation with Refund Policy Details
        try {
            const userObj = await User.findOne({ identity: order.phone });
            if (userObj && userObj.email) {
                sendOrderEmailNotification(
                    userObj.email, 
                    userObj.name || order.customerName, 
                    order.orderId, 
                    order.status, 
                    order.totalAmount, 
                    order.configDetails, 
                    order.paymentId, 
                    order.deliveryFeeCharged
                );
            }
        } catch (mailErr) {
            console.error("Email trigger error:", mailErr.message);
        }

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

            // 🔥 Yahan order save hone ke theek baad auto-wipe call kar dein:
            if (order.status && order.status.includes('Delivered')) {
                await cleanupOrderFilesAfterDelivery(order.orderId);
            }

            // 🔥 Send Advanced Email Notification on Admin Status Update
            try {
                const userObj = await User.findOne({ identity: order.phone });
                if (userObj && userObj.email) {
                    sendOrderEmailNotification(
                        userObj.email, 
                        userObj.name || order.customerName, 
                        order.orderId, 
                        order.status, 
                        order.totalAmount, 
                        order.configDetails, 
                        order.paymentId, 
                        order.deliveryFeeCharged
                    );
                }
            } catch (mailErr) {
                console.error("Email trigger error:", mailErr.message);
            }

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
        // 🔥 Yahan req.body se codForPrintEnabled aur singlePrinterMode ko destructure karein
        const { deliveryFee, handlingFee, rainFee, coupons, openTime, closeTime, codForPrintEnabled, singlePrinterMode } = req.body;
        
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
        // 🔥 Yahan database settings mein save karein
        if (codForPrintEnabled !== undefined) {
            settings.codForPrintEnabled = Boolean(codForPrintEnabled);
        }
        if (singlePrinterMode !== undefined) {
            settings.singlePrinterMode = Boolean(singlePrinterMode);
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

// 🔥 MongoDB Connection (Clean & Modern)
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://...')
.then(() => console.log('📦 Connected to MongoDB Atlas successfully!'))
.catch(err => console.error('❌ MongoDB Connection Error:', err.message));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});




// 🔥 AI Guardian System Alert Schema
const systemAlertSchema = new mongoose.Schema({
    errorId: { type: String, unique: true },
    errorType: String, // 'Database', 'API_Crash', '502_Gateway', etc.
    message: String,
    stackTrace: String,
    route: String,
    timestamp: { type: Date, default: Date.now },
    isResolved: { type: Boolean, default: false }
});
const SystemAlert = mongoose.model('SystemAlert', systemAlertSchema);
// ==========================================
// 🤖 REAL AI GUARDIAN WATCHDOG & SELF-HEALING ENGINE
// ==========================================
async function triggerAiErrorAlert(err, reqPath = 'General Server') {
    try {
        const errorId = 'ERR-' + Math.floor(1000 + Math.random() * 9000);
        const newAlert = new SystemAlert({
            errorId,
            errorType: err.name || 'ServerException',
            message: err.message || 'Unknown server fault detected',
            stackTrace: err.stack || '',
            route: reqPath
        });
        await newAlert.save();
        console.error(`🚨 [AI GUARDIAN ALERT] ${errorId}: ${err.message} on route [${reqPath}]`);
    } catch (e) {
        console.error("❌ AI Watchdog Failed to Log:", e.message);
    }
}

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    triggerAiErrorAlert(err, 'UncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    triggerAiErrorAlert(new Error(String(reason)), 'UnhandledRejection');
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
        // 🔥 Rider dwara deliver hone par bhi auto-wipe trigger ho jayega
            await cleanupOrderFilesAfterDelivery(order.orderId);
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

// Admin fetch active system alerts
app.get('/api/admin/system-alerts', async (req, res) => {
    try {
        const alerts = await SystemAlert.find({ isResolved: false }).sort({ timestamp: -1 }).limit(10).lean();
        res.json({ success: true, alerts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin mark alert as resolved
app.post('/api/admin/resolve-alert', async (req, res) => {
    try {
        const { errorId } = req.body;
        await SystemAlert.findOneAndUpdate({ errorId }, { isResolved: true });
        res.json({ success: true, message: "Alert resolved successfully!" });
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

// ==========================================
// 📍 RIDER & ADMIN LIVE GPS LOCATION TRACKING
// ==========================================
// Reuse activeRiderLocations declared above for rider location updates.

// 1. Rider ya Admin apni current GPS location update karega
app.post('/api/admin/update-location', async (req, res) => {
    try {
        const { orderId, lat, lng } = req.body;
        if (lat && lng) {
            const targetKey = orderId || 'default';
            activeRiderLocations[targetKey] = { 
                lat: Number(lat), 
                lng: Number(lng), 
                timestamp: Date.now() 
            };
            return res.json({ success: true, message: "Location updated successfully" });
        }
        res.status(400).json({ success: false, message: "Latitude and Longitude are required" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. User tracking page rider ki latest live coordinates fetch karega
app.get('/api/admin/live-location', async (req, res) => {
    try {
        const { orderId } = req.query;
        let locationData = (orderId && activeRiderLocations[orderId]) ? activeRiderLocations[orderId] : null;

        if (!locationData) {
            const keys = Object.keys(activeRiderLocations);
            if (keys.length > 0) {
                locationData = activeRiderLocations[keys[keys.length - 1]];
            }
        }

        if (locationData) {
            return res.json({
                success: true,
                lat: locationData.lat,
                lng: locationData.lng
            });
        }

        // Fallback: Default Varanasi Store coordinates
        res.json({
            success: true,
            lat: 25.3451,
            lng: 83.0012
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});