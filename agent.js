const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pt = require('pdf-to-printer');
const readline = require('readline');

const app = express();
const PRINTER_NAME = "Microsoft Print to PDF";

const BASE_URL = "https://printfromhomes.com"; 
const HISTORY_FILE = path.join(__dirname, 'printed_history.json');

if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

// Terminal prompt helper for single printer paper swap pause
const promptUser = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
};

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

async function fetchAndPrintLiveJobs() {
    try {
        console.log("🔍 Scanning LIVE Cloud Queue... (ADVANCED COLOR MATRIX MODE)");
        const response = await axios.get(`${BASE_URL}/api/admin/orders`, { timeout: 10000 });
        const orders = response.data;

        if (!orders || !Array.isArray(orders)) return;

        let settings = { singlePrinterMode: true, printerName: PRINTER_NAME };
        try {
            const settingsRes = await axios.get(`${BASE_URL}/api/admin/settings`, { timeout: 5000 });
            if (settingsRes.data) settings = settingsRes.data;
        } catch (e) {
            // Fallback to default single printer mode if offline
        }

        const isSingleMode = settings.singlePrinterMode !== false;
        const primaryPrinter = settings.printerName || PRINTER_NAME;

        const paidOrders = orders.filter(o => o.status === 'Ready for Print' || o.status === 'Paid / Ready for Print');
        const printedHistory = getPrintedHistory();

        for (let order of paidOrders) {
            if (printedHistory.has(order.orderId)) {
                continue;
            }

            console.log(`\n==================================================`);
            console.log(`📥 PROCESSING ORDER ID: #${order.orderId}`);
            console.log(`👤 Customer: ${order.customerName || 'Valued Customer'} | Phone: ${order.phone || 'N/A'}`);
            console.log(`==================================================`);

            const items = order.configDetails || [];
            const hasPhotoJobs = items.some(item => item.jobType === 'photo_print' || item.paperType === 'photo');

            if (isSingleMode && hasPhotoJobs) {
                console.log(`\n==================================================`);
                console.log(`🛑 PAPER SWAP REQUIRED FOR ORDER #${order.orderId}!`);
                console.log(`👉 PLEASE LOAD GLOSSY PHOTO PAPER INTO ${primaryPrinter}!`);
                console.log(`==================================================\n`);

                await promptUser('👉 Press [ENTER] in this terminal AFTER loading Glossy Photo Paper...');
            }

          if (order.configDetails && Array.isArray(order.configDetails)) {
                // 🔥 STRICT FILTER: Snacks, Cover Slips, Products, aur UI Icons/PNGs ko turant bahar karo
                const validPrintJobs = order.configDetails.filter(item => {
                    if (!item) return false;
                    let fName = (item.fileName || item.name || '').toLowerCase();
                    
                    if (item.printType === 'snack' || item.isCoverSlip) return false;
                    if (fName.startsWith('product:')) return false;
                    
                    // 🛑 Fuzul UI Icons aur App Assets ko yahan block kar do
                    if (fName.includes('admin_icon') || fName.includes('app_icon') || fName.includes('favicon')) {
                        return false;
                    }
                    
                    return true;
                });

                for (let i = 0; i < validPrintJobs.length; i++) {
                    const fileMeta = validPrintJobs[i];
                    
                    let fileUrl = fileMeta.fileUrl || fileMeta.url;
                    
                    // 🛑 Safety Check: Agar URL 'blob:' ya 'data:' se shuru ho raha hai, toh use ignore karo
                    if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:'))) {
                        fileUrl = null; 
                    }
                    
                    if (!fileUrl && order.files && Array.isArray(order.files) && order.files.length > 0) {
                        const targetFile = order.files.find(f => f.name === fileMeta.fileName || f.originalName === fileMeta.fileName) || order.files[i] || order.files[0];
                        if (targetFile) {
                            fileUrl = targetFile.url || `${BASE_URL}/uploads/${targetFile.filename || targetFile.savedName || targetFile.name}`;
                        }
                    }

                    if (!fileUrl && order.fileUrl && !order.fileUrl.startsWith('blob:')) {
                        fileUrl = order.fileUrl;
                    }

                    if (!fileUrl && order.file) {
                        fileUrl = `${BASE_URL}/uploads/${order.file}`;
                    }

                    if (fileUrl && fileUrl !== '#') {
                        const localPath = path.join(__dirname, `temp_print_${i}.pdf`);

                        try {
                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

                            await downloadFilePromise(fileUrl, localPath);
                            
                            const isPhoto = fileMeta.jobType === 'photo_print' || fileMeta.paperType === 'photo';
                            
                            if (isPhoto) {
                                console.log(`[ROUTE CHECK] 🖼️ Target: GLOSSY PHOTO PRINTER (${primaryPrinter})`);
                                console.log(`[ACTION] Sending Photo Layout (${fileMeta.photoLayout || 'Photo'}) to Photo Printer`);
                            } else {
                                console.log(`[ROUTE CHECK] 📄 Target: DOCUMENT PRINTER (70 GSM) (${primaryPrinter})`);
                                console.log(`[ACTION] Sending Document (${fileMeta.fileName || 'Document'}) to Document Printer`);
                            }

                            const targetPrintDevice = isSingleMode ? primaryPrinter : (isPhoto ? (settings.photoPrinterName || primaryPrinter) : (settings.documentPrinterName || primaryPrinter));

                            const printOptions = {
                                printer: targetPrintDevice,
                                copies: parseInt(fileMeta.copies) || 1,
                                side: fileMeta.sides === 'double' ? 'duplex' : 'simplex',
                                orientation: fileMeta.orientation === 'landscape' ? 'landscape' : 'portrait',
                                monochrome: !isPhoto && (fileMeta.printType === 'bw' || fileMeta.colorMode === 'bw')
                            };

                            if (fileMeta.pdfPassword || order.pdfPassword) {
                                printOptions.password = fileMeta.pdfPassword || order.pdfPassword;
                            }

                            await pt.print(localPath, printOptions);
                            console.log(`✓ Print signal released for file node.`);

                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                            await new Promise(res => setTimeout(res, 3000));

                        } catch (fileErr) {
                            console.error(`❌ Failed printing individual node file (${fileUrl}):`, fileErr.message);
                        }
                    } else {
                        console.warn(`⚠️ Warning: No valid downloadable file URL found for print item ${fileMeta.fileName || i}`);
                    }
                }
            } else {
                const fileUrl = order.fileUrl || `${BASE_URL}/uploads/${order.file}`;
                const localPath = path.join(__dirname, 'temp_print_job.pdf');
                try {
                    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                    await downloadFilePromise(fileUrl, localPath);

                    console.log(`[ROUTE CHECK] 📄 Target: DOCUMENT PRINTER (Fallback)`);
                    await pt.print(localPath, {
                        printer: primaryPrinter,
                        copies: 1,
                        monochrome: order.printType === 'bw'
                    });
                    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                } catch (err) {
                    console.error("❌ Fallback Print Blocked:", err.message);
                }
            }

            if (isSingleMode && hasPhotoJobs) {
                console.log(`\n==================================================`);
                console.log(`✅ Photos printed successfully!`);
                console.log(`👉 PLEASE LOAD 70 GSM PAPER BACK INTO THE PRINTER!`);
                console.log(`==================================================\n`);
                await promptUser('👉 Press [ENTER] after putting normal 70 GSM paper back...');
            }

            saveToHistory(order.orderId);
            console.log(`✅ Order #${order.orderId} processing completed successfully!\n`);
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