const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const readline = require('readline');
const PDFDocument = require('pdfkit');

const app = express();
const PRINTER_NAME = "HPFB5346 (HP Smart Tank 580-590 series)";

const BASE_URL = "https://printfromhomes.com"; 
const HISTORY_FILE = path.join(__dirname, 'printed_history.json');
const sumatraPath = path.join(__dirname, 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe');

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
        console.log("🔍 Scanning LIVE Cloud Queue... (DIRECT SUMATRA COLOR MATRIX MODE)");
        
        let response;
        let retries = 3;
        
        while (retries > 0) {
            try {
                response = await axios.get(`${BASE_URL}/api/admin/orders`, { timeout: 45000 });
                break; 
            } catch (netErr) {
                retries--;
                if (retries === 0) throw netErr;
                console.log(`⚠️ Server waking up... retrying cloud scan (${retries} attempts left)...`);
                await new Promise(res => setTimeout(res, 5000));
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
        } catch (e) {}

        const isSingleMode = settings.singlePrinterMode !== false;
        
        // 🔥 FORCE FIX: Ensure printer is never Microsoft PDF and defaults strictly to physical HP printer
        let primaryPrinter = settings.printerName || PRINTER_NAME;
        if (!primaryPrinter || primaryPrinter.toLowerCase().includes('pdf') || primaryPrinter.trim() === '') {
            primaryPrinter = "HPFB5346 (HP Smart Tank 580-590 series)";
        }

        const paidOrders = orders.filter(o => {
            const st = (o.status || '').toLowerCase();
            return st.includes('ready for print') || st.includes('paid') || st.includes('processing');
        });

        const printedHistory = getPrintedHistory();

        for (let order of paidOrders) {
            if (printedHistory.has(order.orderId)) {
                continue;
            }
            
            saveToHistory(order.orderId);

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
                    return true;
                });

                for (let i = 0; i < validPrintJobs.length; i++) {
                    const fileMeta = validPrintJobs[i];
                    let fileUrl = fileMeta.fileUrl || fileMeta.url || order.fileUrl;

                    if (fileUrl && fileUrl !== '#' && !fileUrl.startsWith('blob:')) {
                        const ext = fileUrl.includes('.png') ? '.png' : (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg') ? '.jpg' : '.pdf');
                        let localPath = path.join(__dirname, `temp_print_${order.orderId}_${i}_${Date.now()}${ext}`);

                        try {
                            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

                            console.log(`📥 Downloading file for item ${i + 1} from: ${fileUrl}`);
                            await downloadFilePromise(fileUrl, localPath);

                            const fileStats = fs.statSync(localPath);
                            if (fileStats.size < 200) {
                                throw new Error("File size too small (< 200 bytes), likely a 404 response.");
                            }

                            const isPhoto = fileMeta.jobType === 'photo_print' || fileMeta.paperType === 'photo' || fileMeta.printType === 'photo';
                            
                            let targetPrintDevice = isSingleMode ? primaryPrinter : (isPhoto ? (settings.photoPrinterName || primaryPrinter) : (settings.documentPrinterName || primaryPrinter));
                            if (!targetPrintDevice || targetPrintDevice.toLowerCase().includes('pdf') || targetPrintDevice.trim() === '') {
                                targetPrintDevice = "HPFB5346 (HP Smart Tank 580-590 series)";
                            }

                            const totalCopies = parseInt(fileMeta.copies || fileMeta.qty) || 1;
                            const isBw = (fileMeta.printType === 'bw' || fileMeta.colorMode === 'bw');
                            const isLandscape = fileMeta.orientation === 'landscape';

                            // 🔥 BULLETPROOF IMAGE TO PDF CONVERSION WITH SMART LOCK-CHECKER
                            const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png';
                            let finalPrintPath = localPath;

                            if (isImage) {
                                const pdfPath = path.join(__dirname, `temp_conv_${order.orderId}_${i}_${Date.now()}.pdf`);
                                await new Promise((resolve, reject) => {
                                    try {
                                        const doc = new PDFDocument({ margin: 0, size: 'A4' });
                                        const stream = fs.createWriteStream(pdfPath);
                                        doc.pipe(stream);

                                        doc.image(localPath, 0, 0, { fit: [595.28, 841.89], align: 'center', valign: 'center' });
                                        doc.end();

                                        stream.on('finish', () => {
                                            // 🕒 Smart Polling: Keep checking until Windows completely releases the file lock
                                            const interval = setInterval(() => {
                                                try {
                                                    const fd = fs.openSync(pdfPath, 'r+');
                                                    fs.closeSync(fd);
                                                    clearInterval(interval);
                                                    
                                                    // Extra 1 second buffer just to be 100% safe
                                                    setTimeout(() => {
                                                        finalPrintPath = pdfPath;
                                                        resolve();
                                                    }, 1000);
                                                } catch (err) {
                                                    // File is still locked by OS, retry in 200ms
                                                }
                                            }, 200);
                                        });

                                        stream.on('error', reject);
                                    } catch (err) {
                                        reject(err);
                                    }
                                });
                            }

                            // SumatraPDF settings array
                            let settingsArr = ['fit'];
                            if (isBw) settingsArr.push('monochrome');
                            if (isLandscape) settingsArr.push('landscape');
                            else settingsArr.push('portrait');

                            const printSettingsStr = settingsArr.join(',');
                            const printCommand = `"${sumatraPath}" -print-to "${targetPrintDevice}" -silent -print-settings "${printSettingsStr}" "${finalPrintPath}"`;

                            let printAttempts = 3; // 3 retry attempts for ultimate safety
                            while (printAttempts > 0) {
                                try {
                                    for (let c = 0; c < totalCopies; c++) {
                                        await execPromise(printCommand);
                                    }
                                    console.log(`✓ Print signal released successfully for item ${i + 1} (${fileMeta.fileName || 'Document'}) [Copies: ${totalCopies}, BW: ${isBw}, Landscape: ${isLandscape}].`);
                                    break;
                                } catch (printErr) {
                                    printAttempts--;
                                    if (printAttempts === 0) throw printErr;
                                    console.log(`⚠️ Print dispatch glitch, retrying print command... (${printAttempts} left)`);
                                    await new Promise(res => setTimeout(res, 3000));
                                }
                            }
                            
                            // Cleanup temporary files safely
                            try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch(e){}
                            try { if (finalPrintPath !== localPath && fs.existsSync(finalPrintPath)) fs.unlinkSync(finalPrintPath); } catch(e){}
                            
                            await new Promise(res => setTimeout(res, 3000));

                        } catch (fileErr) {
                            console.error(`❌ Failed printing item file (${fileUrl}):`, fileErr.message);
                            if (fs.existsSync(localPath)) {
                                try { fs.unlinkSync(localPath); } catch(e){}
                            }
                        }
                    } else {
                        console.warn(`⚠️ Warning: No valid downloadable file URL found for print item.`);
                    }
                }
            }

            if (isSingleMode && hasPhotoJobs) {
                console.log(`\n==================================================`);
                console.log(`✅ Photos printed successfully!`);
                console.log(`👉 PLEASE LOAD 70 GSM PAPER BACK INTO THE PRINTER!`);
                console.log(`==================================================\n`);
                await promptUser('👉 Press [ENTER] after putting normal 70 GSM paper back...');
            }

            console.log(`✅ Order #${order.orderId} processing completed successfully!\n`);
        }
    } catch (err) {
        console.error("❌ Cloud Pipeline Error:", err.message);
    }
}

setInterval(fetchAndPrintLiveJobs, 3000);

app.listen(4000, () => {
    console.log("====================================================================");
    console.log("🚀 AGENT LIVE: DIRECT SUMATRA HARDWARE DISPATCH SYSTEM");
    console.log("====================================================================");
    fetchAndPrintLiveJobs();
});