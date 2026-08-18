const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pt = require('pdf-to-printer');

const app = express();
const PRINTER_NAME = "HP Smart Tank 580-590 series";

const BASE_URL = "https://printfromhome.onrender.com"; 
const HISTORY_FILE = path.join(__dirname, 'printed_history.json');

if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

function getPrintedHistory() {
    try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        return new Set(JSON.parse(data));
    } catch (e) {
        return new Set();
    }
}

function saveToHistory(orderId) {
    try {
        const history = getPrintedHistory();
        history.add(orderId);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(Array.from(history), null, 2));
    } catch (e) {
        console.error("⚠️ History file save error");
    }
}

function downloadFilePromise(url, localPath) {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(localPath);
        axios({ url: url, method: 'GET', responseType: 'stream', timeout: 30000 })
            .then(response => {
                response.data.pipe(writer);
                writer.on('finish', () => { writer.close(); resolve(); });
                writer.on('error', (err) => { fs.unlink(localPath, () => {}); reject(err); });
            })
            .catch(err => { fs.unlink(localPath, () => {}); reject(err); });
    });
}

async function directHardwareSpoolPrint(filePath, options = {}) {
    console.log(`📠 Feeding document bytes directly to printer driver queue...`);
    
    const printOptions = {
        printer: PRINTER_NAME,
        copies: parseInt(options.copies) || 1,
        side: options.sides === 'double' ? 'duplex' : 'simplex',
        orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait'
    };

    if (options.printType === 'bw' || options.colorMode === 'bw') {
        printOptions.monochrome = true;
        console.log(`⚙️ Driver Configuration Map: MONOCHROME (B&W) MODE LOCKED 🎯`);
    } else {
        console.log(`⚙️ Driver Configuration Map: FULL VIBRANT COLOR MODE LOCKED 🌈`);
    }

    await pt.print(filePath, printOptions);
}

async function fetchAndPrintLiveJobs() {
    try {
        console.log("🔍 Scanning LIVE Cloud Queue... (ADVANCED COLOR MATRIX MODE)");
        const response = await axios.get(`${BASE_URL}/api/admin/orders`, { timeout: 10000 });
        const orders = response.data;

        if (!orders || !Array.isArray(orders)) return;

        // 🔥 FIXED: Match server status 'Ready for Print' properly
        const paidOrders = orders.filter(o => o.status === 'Ready for Print' || o.status === 'Paid / Ready for Print');
        const printedHistory = getPrintedHistory();

        for (let order of paidOrders) {
            if (printedHistory.has(order.orderId)) {
                continue; 
            }
            
            console.log(`📥 NEW MULTI-FILE TARGET ACQUIRED! Processing Order ID: ${order.orderId}`);
            let totalFilesPrintedSuccessfully = 0;

            if (order.configDetails && Array.isArray(order.configDetails) && order.files && order.files.length > 0) {
                for (let i = 0; i < order.configDetails.length; i++) {
                    const fileMeta = order.configDetails[i];
                    const targetFile = order.files.find(f => f.name === fileMeta.fileName || f.originalName === fileMeta.fileName) || order.files[i];
                    
                    if (targetFile) {
                        // 🔥 FIXED: Secure direct Cloudinary URL fallback mapping
                        const fileUrl = targetFile.url || `${BASE_URL}/uploads/${targetFile.filename || targetFile.savedName}`;
                        const localPath = path.join(__dirname, 'temp_print_job.pdf');

                        try {
                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

                            await downloadFilePromise(fileUrl, localPath);
                            console.log(`🚀 Downloaded file [${i+1}/${order.configDetails.length}]: ${targetFile.name || targetFile.originalName || 'Document'}`);
                            
                            await directHardwareSpoolPrint(localPath, {
                                copies: fileMeta.copies || 1,
                                sides: fileMeta.sides || 'single',
                                orientation: fileMeta.orientation || 'portrait',
                                printType: fileMeta.printType || 'color',
                                colorMode: fileMeta.colorMode || 'color'
                            });
                            
                            console.log(`✓ Print signal released for file node.`);
                            totalFilesPrintedSuccessfully++;

                            await new Promise(res => setTimeout(res, 3000));

                        } catch (fileErr) {
                            console.error(`❌ Failed printing individual node file:`, fileErr.message);
                        }
                    }
                }
            } else {
                // Fallback architecture for single legacy files rows
                const fileUrl = order.fileUrl || `${BASE_URL}/uploads/${order.file}`;
                const localPath = path.join(__dirname, 'temp_print_job.pdf');
                try {
                    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                    await downloadFilePromise(fileUrl, localPath);
                    
                    await directHardwareSpoolPrint(localPath, { 
                        copies: 1, 
                        printType: order.printType || 'color' 
                    });
                    totalFilesPrintedSuccessfully++;
                } catch (err) {
                    console.error("❌ Fallback Print Blocked:", err.message);
                }
            }

            saveToHistory(order.orderId);
            console.log(`🔒 Local Security Guard Locked: Order ${order.orderId} moved to history to break any potential loops.`);
            
            const localPath = path.join(__dirname, 'temp_print_job.pdf');
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
    } catch (err) {
        console.log("📡 Cloud Pipeline Status: Standing by.");
    }
}

setInterval(fetchAndPrintLiveJobs, 8000);

app.listen(4000, () => {
    console.log("====================================================================");
    console.log("🚀 AGENT LIVE: REAL-TIME HARDWARE COLOR/MONOCHROME DISPATCH SYSTEM");
    console.log("====================================================================");
    fetchAndPrintLiveJobs();
});