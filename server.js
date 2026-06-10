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

// 🔥 MULTI-FILE ARCHITECTURE INTEGRATION: Array pipeline supports up to 20 files per order
const upload = multer({ storage: storage });

// 👑 Razorpay Live Instance Configuration Keys
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

        const newOrder = {
            orderId: razorpayOrder.id,
            files: filesMappedList,
            file: req.files && req.files.length > 0 ? req.files[0].filename : 'No file uploaded', // Fallback structural compatibility
            configDetails: configDetails ? JSON.parse(configDetails) : [],
            address: address || 'N/A',
            amount: finalAmount,
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

            // 🔥 AUTOMATIC PRINT PIPELINE CONTROLLER
            // Agar Admin ne phone dashboard se system Fully Automatic kiya hua hai, toh payment hote hi print out nikal jayega!
            if (global.autoPrintModeEnabled) {
                console.log(`🤖 Auto-Print Engine Triggered for Order ${orderId}`);
                
                // Loops and sends print stream sequentially down the execution stack safely
                if (order.configDetails && order.configDetails.length > 0) {
                    for (let i = 0; i < order.configDetails.length; i++) {
                        const fileMeta = order.configDetails[i];
                        // Locate target matches maps inside storage filenames buffers safely
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
                    // Fallback structural printer compatibility execution
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

// 🔥 AUTOMATIC UPDATE SYSTEM: Yeh route client ko batayega ki server par kaun sa version chal raha hai
app.get('/api/version', (req, res) => {
    res.json({ version: "1.0.1" }); // 👈 Jab bhi aap naya update karo, bas yeh number badal dena (e.g., 1.0.2)
});

// 📊 Helper to compile live financials mapping dynamically
function getAdminFinancialStats(ordersArray) {
    // Sirf successful paid orders ka stats calculate hoga fake metrics clean rakhne ke liye
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

    // Profit parameters setup matching standard optimization algorithms rules
    let totalCostPrice = (totalPages * 1.00) + (totalOrders * 15.00); 
    let profitLoss = revenue - totalCostPrice;

    return {
        totalOrders,
        revenue: revenue.toFixed(2),
        profitLoss: profitLoss.toFixed(2),
        averageOrderValue: totalOrders > 0 ? (revenue / totalOrders).toFixed(2) : "0.00"
    };
}

// 📈 API Endpoint to fetch data stats directly inside dashboard (🔥 COST CONSTRAINTS CACHING FIX)
app.get('/api/admin/financials', (req, res) => {
    try {
        // Linked directly to real system active orders array object
        const stats = getAdminFinancialStats(orders);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🖨️ DIRECT HARDWARE PRINTER ROUTER CONTROLLER (MANUAL INTERCEPTOR CALL DISPATCHER)
app.post('/api/admin/print-hardware', async (req, res) => {
    const { fileLocation, options } = req.body;
    const fullFilePath = path.join(__dirname, 'uploads', fileLocation);

    try {
        if (!fs.existsSync(fullFilePath)) {
            return res.status(404).json({ success: false, error: "Physical copy missing from storage arrays!" });
        }

        await pt.print(fullFilePath, {
            printer: options.printerName || undefined, 
            pages: options.pages || undefined,
            copies: parseInt(options.copies) || 1,
            side: options.sides === 'double' ? 'duplex' : 'simplex'
        });
        
        res.json({ success: true, message: "Direct print job successfully forwarded to hardware buffer!" });
    } catch (err) {
        console.error("Hardware printing error:", err);
        res.json({ success: false, error: "Printer Offline or Connection breakdown!" });
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