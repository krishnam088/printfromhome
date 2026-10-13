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
const cron = require('node-cron');
const webpush = require('web-push');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
const userSchema = new mongoose.Schema({
    name: String,
    identity: { type: String, unique: true }, // Mobile Number
    email: { type: String, default: '' },      // Gmail Address
    password: String,
    addresses: { type: Array, default: [] },   // 👈 Yahan add karein (Multi-address support)
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
    userLat: { type: Number, default: 25.3451 }, // 👈 Yahan add karein
    userLng: { type: Number, default: 83.0012 }, // 👈 Yahan add karein
    amount: String,
    totalAmount: String,
    status: String,
    date: String,
    timestamp: String,
    paymentId: String,
    verifiedItems: { type: Array, default: [] },
    assignedDeliveryBoy: { type: String, default: '' }, // Delivery Executive Mobile Number
    needsStockRestockScan: { type: Boolean, default: false }, // 🔥 Picker cancellation restock flag
    netProfitRecorded: { type: Number, default: 0 },
    deliveryFeeCharged: { type: Number, default: 0 },
    isRefundableAmount: { type: Number, default: 0 },
    manualNeftRefundRequired: { type: Boolean, default: false }
});
const Order = mongoose.model('Order', orderSchema);

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
    printEnabled: { type: Boolean, default: true }, // 🔥 New Print Switch Flag
    rainSurgeActive: { type: Boolean, default: false },
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
    port: 465,
    secure: true,
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
            config = await StoreConfig.create({ isOpen: true, rainSurgeActive: false, updatedAt: new Date().toISOString() });
        }

        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;

        const isTimeWithinOperatingHours = istHours >= 7 && istHours < 22;
        const finalIsOpen = isTimeWithinOperatingHours && config.isOpen;

        res.json({ 
            success: true, 
            isOpen: finalIsOpen, 
            printEnabled: config.printEnabled !== false, // Send print status to frontend
            manualOverride: config.isOpen, 
            rainSurgeActive: config.rainSurgeActive, 
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
                            <a href="https://printfromhome.onrender.com" style="background-color: #0070f3; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 0.95rem; display: inline-block;">Visit Store & Order Now</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-bottom: 0;">Print From Home, Varanasi | You are receiving this update as a registered user.</p>
                    </div>
                </div>
            `;

            await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.SMTP_PASS,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: "Print From Home", email: "printfromhomesupport@gmail.com" },
                    to: [{ email: user.email, name: user.name || 'Customer' }],
                    subject: subject,
                    htmlContent: personalizedHTML
                })
            });
        } catch (innerErr) {}
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
        
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
        const istHours = Math.floor(istTotalMinutes / 60) % 24;
        const isTimeWithinOperatingHours = istHours >= 7 && istHours < 24;
        
        const isOpen = config ? (isTimeWithinOperatingHours && config.isOpen) : isTimeWithinOperatingHours;
        if (!isOpen) return res.status(403).json({ success: false, message: "Store is closed" });

        const { totalAmount, configDetails, address, customerName, phone, paymentMode } = req.body;
        
        let finalAmountNumeric = parseFloat(String(totalAmount || '42').replace(/[₹,]/g, ''));
        if (isNaN(finalAmountNumeric) || finalAmountNumeric <= 0) finalAmountNumeric = 42;

        let parsedConfig = [];
        try { 
            parsedConfig = typeof configDetails === 'string' ? JSON.parse(configDetails) : (configDetails || []); 
        } catch(e) {
            parsedConfig = [];
        }

        // 🔥 YAHAN PAR PRINT SERVICE TOGGLE CHECK ADD KAREIN:
        const hasPrintJobs = Array.isArray(parsedConfig) && parsedConfig.some(item => item.printType !== 'snack' && item.printType !== 'product' && (!item.fileName || !item.fileName.startsWith('Product:')));
        const isPrintAllowed = config ? config.printEnabled !== false : true;

        if (hasPrintJobs && !isPrintAllowed) {
            return res.status(403).json({ 
                success: false, 
                message: "⚠️ Printing service is currently temporarily OFF due to technical maintenance. Please try again later." 
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

        const selectedPaymentMode = paymentMode || "online";
        const numericId = String(Math.floor(100000 + Math.random() * 900000));

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

        let calculatedDeliveryFee = finalAmountNumeric >= 99 ? 0 : 25;

        if (selectedPaymentMode === 'cod' || selectedPaymentMode === 'wallet') {
            // Stock deduction is handled by the frontend decrement call or explicit confirmation
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
                address: address || 'N/A',
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
            address: address || 'N/A',
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
        const { deliveryFee, handlingFee, rainFee, coupons } = req.body;
        
        let settings = await StoreSetting.findOne({ key: 'global_settings' });
        if (!settings) {
            settings = new StoreSetting({ key: 'global_settings' });
        }

        if (deliveryFee !== undefined) settings.deliveryFee = parseFloat(deliveryFee) || 25;
        if (handlingFee !== undefined) settings.handlingFee = parseFloat(handlingFee) || 5;
        if (rainFee !== undefined) settings.rainFee = parseFloat(rainFee) || 15;
        if (coupons !== undefined && Array.isArray(coupons)) settings.coupons = coupons;
        
        await settings.save();
        res.json({ success: true, message: "Settings saved permanently to database!", settings });
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
// 🛵 RIDER / DELIVERY PARTNER BACKEND APIS
// ==========================================

const deliveryPartnerSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    licenseNumber: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    currentOrderId: { type: String, default: null },
    earningsToday: { type: Number, default: 0 },
    completedDeliveriesToday: { type: Number, default: 0 },
    dateCreated: { type: String, default: '' }
});
const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

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

// 3. Rider Dashboard Data Feed
app.get('/api/rider/dashboard/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        let rider = await DeliveryPartner.findOne({ phone });
        if (!rider) {
            return res.status(404).json({ success: false, message: "Rider not found" });
        }

        let activeOrder = null;
        if (rider.currentOrderId) {
            activeOrder = await Order.findOne({ orderId: rider.currentOrderId });
        }

        let newOrders = [];
        if (rider.isOnline && !rider.currentOrderId) {
            newOrders = await Order.find({ 
                status: 'Ready for Print', 
                $or: [{ assignedDeliveryBoy: {$exists: false } }, { assignedDeliveryBoy: null }, { assignedDeliveryBoy: "" }] 
            }).limit(5);
        }

        res.json({ success: true, rider, activeOrder, newOrders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Accept Delivery Order
app.post('/api/rider/accept-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        const order = await Order.findOne({ orderId });
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

// 5. Complete Delivery
app.post('/api/rider/complete-order', async (req, res) => {
    try {
        const { phone, orderId } = req.body;
        const rider = await DeliveryPartner.findOne({ phone });
        if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

        const order = await Order.findOne({ orderId });
        if (order) {
            order.status = 'Delivered 🟢';
            await order.save();
        }

        rider.currentOrderId = null;
        rider.earningsToday += 25; // ₹25 fixed delivery earning
        rider.completedDeliveriesToday += 1;
        await rider.save();

        res.json({ success: true, message: `🎉 Delivery completed! Earned ₹25.` });
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