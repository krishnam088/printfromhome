const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); 

let orders = [];

// Configure File Storage with Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create uploads folder programmatically if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

// Initialize Razorpay Instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'YOUR_TEST_KEY_ID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_TEST_KEY_SECRET'
});

// Endpoint to create a Payment Order and save customer data
app.post('/api/create-order', upload.single('document'), async (req, res) => {
    try {
        const { pages, printType, sides, binding, address, totalAmount } = req.body;
        const amountInPaise = Math.round(parseFloat(totalAmount) * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        const newOrder = {
            orderId: razorpayOrder.id,
            file: req.file ? req.file.filename : 'No file uploaded',
            originalName: req.file ? req.file.originalname : '',
            pages,
            printType,
            sides,
            binding,
            address,
            amount: totalAmount,
            status: 'Pending Payment',
            date: new Date().toLocaleString()
        };

        orders.push(newOrder);

        res.status(201).json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            key_id: razorpay.key_id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Order creation failed." });
    }
});

// Callback endpoint to confirm payment success
app.post('/api/verify-payment', (req, res) => {
    const { orderId, paymentId } = req.body;
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        order.status = 'Paid / Ready for Print';
        return res.json({ success: true, message: "Payment verified successfully!" });
    }
    res.status(404).json({ success: false, message: "Order not found" });
});

// Secure API endpoint to view incoming printing jobs
app.get('/api/admin/orders', (req, res) => {
    res.json(orders);
});

// Endpoint allowing download of uploaded files
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});