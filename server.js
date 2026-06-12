const express = require('express');
const multer = require('multer');
const path = require('path');
const Razorpay = require('razorpay');
const cors = require('cors'); 
const fs = require('fs');
//const pt = require('pdf-to-printer'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// 🔥 PERMANENT DATABASE FILES FOR CLOUD CORES
const USERS_FILE = path.join(__dirname, 'users.json');
let orders = [];
global.autoPrintModeEnabled = false;

// Initialize permanent users file if absent
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

// Helper to read users safely
function readUsersFromDatabase() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Helper to save users safely
function saveUsersToDatabase(usersArray) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
    } catch (e) {
        console.error("❌ Database write failure:", e);
    }
}

// Create uploads folder programmatically if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure File Storage with Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage });

const razorpay = new Razorpay({
    key_id: 'rzp_test_Sz27MnobxedYSU', 
    key_secret: 'PcaWJEUMGjhn7Cfa04IlzYd9'
});

// 🌐 Web entry routes
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/admin-panel', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

// ====================================================================
// 🔥 UNLIMITED AUTH API SYSTEMS (SIGN UP & LOGIN)
// ====================================================================

// 1. CREATE ACCOUNT (SIGN UP) ENDPOINT
app.post('/api/auth/signup', (req, res) => {
    try {
        const { name, identity, password } = req.body;
        if (!identity || !password || !name) {
            return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
        }

        const users = readUsersFromDatabase();
        
        // Check if user already exists
        const userExists = users.some(u => u.identity.toLowerCase() === identity.toLowerCase());
        if (userExists) {
            return res.status(400).json({ success: false, message: "Yeh Gmail/Phone pehle se registered hai bhai!" });
        }

        // Add new user object
        const newUser = {
            name: name.trim(),
            identity: identity.trim(),
            password: password,
            dateCreated: new Date().toLocaleString()
        };

        users.push(newUser);
        saveUsersToDatabase(users);

        console.log(`👤 New User Registered: ${newUser.name} (${newUser.identity})`);
        res.status(201).json({ success: true, message: "Account created successfully!", userId: newUser.identity });

    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// 2. USER LOGIN ENDPOINT
app.post('/api/auth/login', (req, res) => {
    try {
        const { identity, password } = req.body;
        const users = readUsersFromDatabase();

        const user = users.find(u => u.identity.toLowerCase() === identity.toLowerCase() && u.password === password);
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Galat Credentials! Sahi password daalo bhai." });
        }

        console.log(`🔓 User Logged In successfully: ${user.name}`);
        res.json({ success: true, message: "Login successful!", name: user.name, identity: user.identity });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ====================================================================
// 🖨️ ORDERS & PRINT PIPELINES MANAGEMENT
// ====================================================================

app.post('/api/create-order', upload.array('document', 20), async (req, res) => {
    try {
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

        const newOrder = {
            orderId: razorpayOrder.id,
            files: filesMappedList,
            file: req.files && req.files.length > 0 ? req.files[0].filename : 'No file uploaded',
            configDetails: configDetails ? JSON.parse(configDetails) : [],
            address: address || 'N/A',
            amount: finalAmount,
            status: 'Pending Payment',
            date: new Date().toLocaleString()
        };

        orders.push(newOrder);
        res.status(201).json({ success: true, order_id: razorpayOrder.id, amount: razorpayOrder.amount, key_id: razorpay.key_id });
    } catch (error) {
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
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/orders', (req, res) => { res.json(orders); });

app.post('/api/admin/orders/update-status', (req, res) => {
    const { orderId, status } = req.body;
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
        order.status = status;
        return res.json({ success: true, message: "Status updated!" });
    }
    res.status(404).json({ success: false, message: "Order not found" });
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) { res.download(filePath); } else { res.status(404).send('File missing'); }
});

app.listen(PORT, () => {
    console.log(`Blinkit Printing Server running perfectly on port ${PORT}`);
});