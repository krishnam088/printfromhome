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
        axios({ url: url, method: 'GET', responseType: 'stream', timeout: 45000 })
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
        
        let response;
        let retries = 3;
        
        // 🔥 Robust Retry Loop: Handles Render Free Tier Cold Starts smoothly
        while (retries > 0) {
            try {
                response = await axios.get(`${BASE_URL}/api/admin/orders`, { timeout: 45000 });
                break; 
            } catch (netErr) {
                retries--;
                if (retries === 0) throw netErr;
                console.log(`⚠️ Server waking up... retrying cloud scan (${retries} attempts left)...`);
                await new Promise(res => setTimeout(res, 5000)); // Wait 5 seconds before retrying
            }
        }

        const orders = response.data;

        if (!orders || !Array.isArray(orders)) return;

        let settings = { singlePrinterMode: true, printerName: PRINTER_NAME };
        try {
            const settingsRes = await axios.get(`${BASE_URL}/api/admin/settings`, { timeout: 45000 });
            if (settingsRes.data && settingsRes.data.settings) {
                settings = settingsRes.data.settings;
            } else if (settingsRes.data) {
                settings = settingsRes.data;
            }
        } catch (e) {
            // Fallback to default single printer mode if offline
        }

        const isSingleMode = settings.singlePrinterMode !== false;
        const primaryPrinter = settings.printerName || PRINTER_NAME;

        // 🔥 Flexible filtering for active print-ready orders
        const paidOrders = orders.filter(o => {
            const st = (o.status || '').toLowerCase();
            return st.includes('ready for print') || st.includes('paid') || st.includes('processing');
        });

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
            const hasPhotoJobs = items.some(item => item.jobType === 'photo_print' || item.paperType === 'photo' || item.printType === 'photo');

            if (isSingleMode && hasPhotoJobs) {
                console.log(`\n==================================================`);
                console.log(`🛑 PAPER SWAP REQUIRED FOR ORDER #${order.orderId}!`);
                console.log(`👉 PLEASE LOAD GLOSSY PHOTO PAPER INTO ${primaryPrinter}!`);
                console.log(`==================================================\n`);

                await promptUser('👉 Press [ENTER] in this terminal AFTER loading Glossy Photo Paper...');
            }

            if (order.configDetails && Array.isArray(order.configDetails) && order.configDetails.length > 0) {
                const validPrintJobs = order.configDetails.filter(item => {
                    if (!item) return false;
                    let fName = (item.fileName || item.name || '').toLowerCase();
                    
                    if (item.printType === 'snack' || item.isCoverSlip) return false;
                    if (fName.startsWith('product:')) return false;
                    if (fName.includes('admin_icon') || fName.includes('app_icon') || fName.includes('favicon')) {
                        return false;
                    }
                    return true;
                });

                for (let i = 0; i < validPrintJobs.length; i++) {
                    const fileMeta = validPrintJobs[i];
                    let fileUrl = fileMeta.fileUrl || fileMeta.url;
                    
                    // Ignore local blob or data URLs for desktop print agent
                    if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:'))) {
                        fileUrl = null; 
                    }
                    
                    // 🔥 Smart Fallback: Check order.files array matching filename or index
                    if (!fileUrl && order.files && Array.isArray(order.files) && order.files.length > 0) {
                        const cleanMetaName = (fileMeta.fileName || fileMeta.name || '').replace(/\.[^/.]+$/, "").toLowerCase();
                        const targetFile = order.files.find(f => {
                            const fName = (f.name || f.originalName || f.filename || '').toLowerCase();
                            return fName.includes(cleanMetaName) || cleanMetaName.includes(fName);
                        }) || order.files[i] || order.files[0]; 

                        if (targetFile) {
                            fileUrl = targetFile.url || `${BASE_URL}/uploads/${targetFile.filename || targetFile.savedName || targetFile.name}`;
                        }
                    }

                    // Fallback to order.fileUrl if item level url is missing
                    if (!fileUrl && order.fileUrl) {
                        fileUrl = order.fileUrl;
                    }

                    // Fallback to fileMeta.fileName direct uploads path
                    if (!fileUrl && fileMeta.fileName) {
                        const cleanFileName = fileMeta.fileName.replace(/^Product:\s*/i, '').trim();
                        fileUrl = `${BASE_URL}/uploads/${cleanFileName}`;
                    }

                    if (fileUrl && fileUrl !== '#' && !fileUrl.startsWith('blob:')) {
                        const localPath = path.join(__dirname, `temp_print_${order.orderId}_${i}.pdf`);

                        try {
                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

                            console.log(`📥 Downloading file for item ${i + 1} from: ${fileUrl}`);
                            await downloadFilePromise(fileUrl, localPath);
                            
                            const fileStats = fs.statSync(localPath);
                            if (fileStats.size < 200) {
                                throw new Error("Downloaded file is empty or invalid (Size < 200 bytes). Check server upload path.");
                            }
                            
                            const isPhoto = fileMeta.jobType === 'photo_print' || fileMeta.paperType === 'photo' || fileMeta.printType === 'photo';
                            const targetPrintDevice = isSingleMode ? primaryPrinter : (isPhoto ? (settings.photoPrinterName || primaryPrinter) : (settings.documentPrinterName || primaryPrinter));

                            const printOptions = {
                                printer: targetPrintDevice,
                                copies: parseInt(fileMeta.copies || fileMeta.qty) || 1,
                                side: fileMeta.sides === 'double' ? 'duplex' : 'simplex',
                                orientation: fileMeta.orientation === 'landscape' ? 'landscape' : 'portrait',
                                monochrome: isPhoto ? false : (fileMeta.printType === 'bw' || fileMeta.colorMode === 'bw')
                            };

                            if (fileMeta.pdfPassword || order.pdfPassword) {
                                printOptions.password = fileMeta.pdfPassword || order.pdfPassword;
                            }

                            await pt.print(localPath, printOptions);
                            console.log(`✓ Print signal released successfully for item ${i + 1} (${fileMeta.fileName || 'Document'}).`);

                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                            await new Promise(res => setTimeout(res, 3000));

                        } catch (fileErr) {
                            console.error(`❌ Failed printing item file (${fileUrl}):`, fileErr.message);
                        }
                    } else {
                        console.warn(`⚠️ Warning: No valid downloadable file URL found for print item ${fileMeta.fileName || i}`);
                    }
                }
            } else {
                // Fallback for simple orders lacking configDetails array
                const fileUrl = order.fileUrl || `${BASE_URL}/uploads/${order.file || (order.files && order.files[0] ? order.files[0].filename : '')}`;
                const localPath = path.join(__dirname, `temp_print_${order.orderId}_fallback.pdf`);
                try {
                    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                    await downloadFilePromise(fileUrl, localPath);

                    console.log(`[ROUTE CHECK] 📄 Target: DOCUMENT PRINTER (Fallback)`);
                    const isFallbackPhoto = order.paperType === 'photo' || order.jobType === 'photo_print';
                    
                    await pt.print(localPath, {
                        printer: primaryPrinter,
                        copies: 1,
                        monochrome: isFallbackPhoto ? false : (order.printType === 'bw')
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
        }
    } catch (err) {
        console.error("❌ Cloud Pipeline Error:", err.message);
    }
}

setInterval(fetchAndPrintLiveJobs, 3000);

app.listen(4000, () => {
    console.log("====================================================================");
    console.log("🚀 AGENT LIVE: REAL-TIME HARDWARE COLOR/MONOCHROME DISPATCH SYSTEM");
    console.log("====================================================================");
    fetchAndPrintLiveJobs();
});