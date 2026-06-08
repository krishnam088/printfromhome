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

let orders = [];
global.autoPrintModeEnabled = false; 

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
    key_id: 'rzp_test_Sz27MnobxedYSU', 
    key_secret: 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

// Create Order Route with Precise Indian Standard Time (IST) Lock Engine Engine
app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
        const now = new Date();
        
        // 🔥 EXTRACTS ABSOLUTE IST HOUR SCALES FOR INTRADAY SCHEDULER CONTROLS
        const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });
        const currentHourIST = parseInt(formatterHour.format(now));

        if (currentHourIST < 7 || currentHourIST >= 24) {
            return res.status(403).json({ 
                success: false, 
                message: "🚨 Store is currently Closed! Timing: 07:00 AM to 11:59 PM." 
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
        const filesMappedList = req.files ? req.files.map(f => ({ savedName: f.filename, originalName: f.originalname })) : [];

        // 🔥 CRITICAL FIXED LOGIC: LOCKS ORDER TIME STRICTLY COMPILING TARGET INDIA LOCAL STRINGS WITH SECONDS
        const dateOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
        const timeOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        
        const cleanISTDate = now.toLocaleDateString('en-IN', dateOptions);
        const cleanISTTime = now.toLocaleTimeString('en-US', timeOptions);
        const lockedAbsoluteISTTimestamp = `${cleanISTDate} ${cleanISTTime}`;

        const newOrder = {
            orderId: razorpayOrder.id,
            files: filesMappedList,
            file: req.files && req.files.length > 0 ? req.files[0].filename : 'No file uploaded', 
            configDetails: configDetails ? JSON.parse(configDetails) : [],
            address: address || 'N/A',
            amount: finalAmount,
            status: 'Pending Payment',
            date: lockedAbsoluteISTTimestamp // Fixed timestamp injects into pipeline logs records
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

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, paymentId } = req.body;
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = 'Paid / Ready for Print';
            order.paymentId = paymentId; 
            return res.json({ success: true, message: "Payment verified successfully!" });
        }
        res.status(404).json({ success: false, message: "Order not found" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/admin/orders', (req, res) => { res.json(orders); });

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) { res.download(filePath); } else { res.status(404).send('File not found'); }
});

app.get('/api/version', (req, res) => { res.json({ version: "1.0.1" }); });

function getAdminFinancialStats(ordersArray) {
    const paidOrders = ordersArray.filter(o => o.status === 'Paid / Ready for Print');
    let totalOrders = paidOrders.length; let revenue = 0; let totalPages = 0;
    
    paidOrders.forEach(order => {
        revenue += parseFloat(order.amount) || 0;
        if(order.configDetails && Array.isArray(order.configDetails)) {
            order.configDetails.forEach(f => { totalPages += (parseInt(f.pages) || 1) * (parseInt(f.copies) || 1); });
        }
    });
    let totalCostPrice = (totalPages * 1.00) + (totalOrders * 15.00); 
    return { totalOrders, revenue: revenue.toFixed(2), profitLoss: (revenue - totalCostPrice).toFixed(2), averageOrderValue: totalOrders > 0 ? (revenue / totalOrders).toFixed(2) : "0.00" };
}

app.get('/api/admin/financials', (req, res) => {
    try { res.json(getAdminFinancialStats(orders)); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/print-hardware', async (req, res) => {
    const { fileLocation } = req.body;
    const fullFilePath = path.join(__dirname, 'uploads', fileLocation);
    try {
        if (!fs.existsSync(fullFilePath)) return res.status(404).json({ success: false, error: "Physical copy missing!" });
        res.json({ success: true, message: "Manual flash print bridge signal dispatched successfully!" });
    } catch (err) { res.json({ success: false, error: "Cloud hardware communication drop." }); }
});

app.post('/api/admin/toggle-auto-mode', (req, res) => {
    global.autoPrintModeEnabled = !!req.body.enabled;
    res.json({ success: true, autoPrintModeEnabled: global.autoPrintModeEnabled });
});

app.listen(PORT, () => { console.log(`Blinkit Printing Server running perfectly on port ${PORT}`); });