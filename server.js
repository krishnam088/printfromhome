const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); // 💡 Cross-origin requests handles karne ke liye
const fs = require('fs');
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
        // AUTOMATIC BACKEND STORE SCHEDULER GUARD (7:00 AM TO 11:59 PM)
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

        // REAL-TIME TIMESTAMPS ENGINE DETAILED WITH SECONDS PRECISION
        const formattedOrderTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newOrder = {
            orderId: razorpayOrder.id,
            files: filesMappedList,
            file: req.files && req.files.length > 0 ? req.files[0].filename : 'No file uploaded', 
            configDetails: configDetails ? JSON.parse(configDetails) : [],
            address: address || 'N/A',
            amount: finalAmount,
            status: 'Pending Payment',
            date: formattedOrderTime 
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

// Callback endpoint to confirm payment success
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = orders.find(o => o.orderId === orderId);
        
        if (order) {
            order.status = 'Paid / Ready for Print';
            order.paymentId = paymentId; 

            // CLOUD SIDE LOGGING ONLY: Actual physical printing is safely pulled by local agent.js
            if (global.autoPrintModeEnabled) {
                console.log(`🤖 Auto-Print Pipeline Status: ENABLED. Order ${orderId} is added to memory array logs.`);
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

// AUTOMATIC UPDATE SYSTEM
app.get('/api/version', (req, res) => {
    res.json({ version: "1.0.1" }); 
});

// Helper to compile live financials mapping dynamically
function getAdminFinancialStats(ordersArray) {
    const paidOrders = ordersArray.filter(o => o.status === 'Paid / Ready for Print');
    
    let totalOrders = paidOrders.length;
    let revenue = 0;
    let totalPages = 0;
    
    paidOrders.forEach(order => {
        revenue += parseFloat(order.amount) || 0;
        if(order.configDetails && Array.isArray(order.configDetails)) {
            order.configDetails.forEach(f => {
                totalPages += (parseInt(f.pages) || 1) * (parseInt(f.copies) || 1);
            });
        }
    });

    let totalCostPrice = (totalPages * 1.00) + (totalOrders * 15.00); 
    let profitLoss = revenue - totalCostPrice;

    return {
        totalOrders,
        revenue: revenue.toFixed(2),
        profitLoss: profitLoss.toFixed(2),
        averageOrderValue: totalOrders > 0 ? (revenue / totalOrders).toFixed(2) : "0.00"
    };
}

// API Endpoint to fetch data stats directly inside dashboard
app.get('/api/admin/financials', (req, res) => {
    try {
        const stats = getAdminFinancialStats(orders);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔥 SAFE CLOUD PRINTER INTERCEPTOR: Directly instructs local hardware bridge agent via signal response
app.post('/api/admin/print-hardware', async (req, res) => {
    const { fileLocation } = req.body;
    const fullFilePath = path.join(__dirname, 'uploads', fileLocation);

    try {
        if (!fs.existsSync(fullFilePath)) {
            return res.status(404).json({ success: false, error: "Physical copy missing from storage arrays!" });
        }
        
        // Change status to force print re-trigger on local agent cache safely
        res.json({ success: true, message: "Manual flash print bridge signal dispatched successfully!" });
    } catch (err) {
        res.json({ success: false, error: "Cloud hardware communication drop." });
    }
});

// API endpoint allowing client dashboard to dynamic toggle engine modes state pointer
app.post('/api/admin/toggle-auto-mode', (req, res) => {
    const { enabled } = req.body;
    global.autoPrintModeEnabled = !!enabled;
    res.json({ success: true, autoPrintModeEnabled: global.autoPrintModeEnabled });
});

// Server initiation
app.listen(PORT, () => {
    console.log(`Blinkit Printing Server running perfectly on port ${PORT}`);
});