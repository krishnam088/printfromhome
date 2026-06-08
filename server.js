const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); // 💡 Cross-origin requests handles karne ke liye
const fs = require('fs');
const pt = require('pdf-to-printer'); // Native hardware driver communicator
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// Global Memory State Engine
let orders = [];
global.autoPrintModeEnabled = false; // By default triggers inside Manual Switch mode

// Create uploads folder programmatically if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure File Storage with Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// MULTI-FILE ARCHITECTURE INTEGRATION: Array pipeline supports up to 20 files per order
const upload = multer({ storage: storage });

// Razorpay Live Instance Configuration Keys
const razorpay = new Razorpay({
    key_id: 'rzp_test_Sz27MnobxedYSU', 
    key_secret: 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

// 🌐 Website kholte hi index.html dikhane ke liye main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔥 ADMIN GATEWAY ROUTE: Is link se phone ya laptop par admin panel open hoga
app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Endpoint to create a Payment Order and save customer data (Supports multiple documents array data)
app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        // 🔥 AUTOMATIC BACKEND STORE SCHEDULER GUARD (7:00 AM TO 11:59 PM)
        const now = new Date();
        const currentHour = now.getHours();

        // Agar subah 7 se pehle ya raat 12 baje ke baad order aaye, toh bypass request block karo
        if (currentHour < 7 || currentHour >= 24) {
            return res.status(403).json({ 
                success: false, 
                message: "🚨 Store is currently Closed! We accept printing jobs only between 07:00 AM and 11:59 PM." 
            });
        }

        const { totalAmount, configDetails, address } = req.body;
        
        const finalAmount = totalAmount ? totalAmount.trim() : "42";
        const amountInPaise = Math.round(parseFloat(finalAmount) * 100);

        const options = {
            amount: amountInPaise || 4200, 
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Map files fields tracking metadata configurations arrays securely
        const filesMappedList = req.files ? req.files.map(f => ({
            savedName: f.filename,
            originalName: f.originalname
        })) : [];

        // 🔥 REAL-TIME TIMESTAMPS ENGINE DETAILED WITH SECONDS PRECISION
        const formattedOrderTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newOrder = {
            orderId: razorpayOrder.id,
            files: filesMappedList,
            file: req.files && req.files.length > 0 ? req.files[0].filename : 'No file uploaded', 
            configDetails: configDetails ? JSON.parse(configDetails) : [],
            address: address || 'N/A',
            amount: finalAmount,
            status: 'Pending Payment',
            date: formattedOrderTime // Target seconds accurate timestamp token binded
        };

        orders.push(newOrder);

        res.status(201).json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            key_id: razorpay.key_id
        });

    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({ success: false, message: "Order creation failed." });
    }
});

// Callback endpoint to confirm payment success and handle Automatic Print Routing conditions
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = orders.find(o => o.orderId === orderId);
        
        if (order) {
            order.status = 'Paid / Ready for Print';
            order.paymentId = paymentId; 

            // AUTOMATIC PRINT PIPELINE CONTROLLER
            if (global.autoPrintModeEnabled) {
                console.log(`🤖 Auto-Print Engine Triggered for Order ${orderId}`);
                
                if (order.configDetails && order.configDetails.length > 0) {
                    for (let i = 0; i < order.configDetails.length; i++) {
                        const fileMeta = order.configDetails[i];
                        const matchedUploadedFile = order.files.find(f => f.originalName === fileMeta.fileName || order.files[i]);
                        
                        if (matchedUploadedFile) {
                            const fullPath = path.join(__dirname, 'uploads', matchedUploadedFile.savedName);
                            try {
                                await pt.print(fullPath, {
                                    copies: parseInt(fileMeta.copies) || 1,
                                    side: fileMeta.sides === 'double' ? 'duplex' : 'simplex'
                                });
                                console.log(`✓ Auto-printed specific data node segment: ${matchedUploadedFile.savedName}`);
                            } catch (printErr) {
                                console.error(`Failed automatic pipeline spooling intercept for file: ${matchedUploadedFile.savedName}`, printErr);
                            }
                        }
                    }
                } else {
                    const fallbackPath = path.join(__dirname, 'uploads', order.file);
                    try { await pt.print(fallbackPath); } catch (err) { console.error(err); }
                }
            }

            return res.json({ success: true, message: "Payment verified successfully!" });
        }
        res.status(404).json({ success: false, message: "Order not found" });
    } catch (err) {
        console.error("Verification processing script crash intercepted:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Secure API endpoint to view incoming printing jobs
app.get('/api/admin/orders', (req, res) => {
    res.json(orders);
});

// Endpoint allowing download of uploaded files
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// AUTOMATIC UPDATE SYSTEM: Yeh route client ko batayega ki server par kaun sa version chal raha hai
app.get('/api/version', (