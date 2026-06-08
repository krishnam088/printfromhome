document.addEventListener('DOMContentLoaded', () => {
    // Stage Containers Mapping
    const splashScreen = document.getElementById('splashScreen');
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    // Access control variables
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    const toggleMsg = document.getElementById('toggleMsg');
    const signupOnlyFields = document.querySelectorAll('.signup-only');

    const authName = document.getElementById('authName');
    const authIdentity = document.getElementById('authIdentity');
    const authPassword = document.getElementById('authPassword');
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');

    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const multiFilesContainer = document.getElementById('multiFilesContainer');
    const ordersHistoryContainer = document.getElementById('ordersHistoryContainer');
    
    // Modal preview selectors
    const previewModal = document.getElementById('previewModal');
    const closePreview = document.getElementById('closePreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewBody = document.getElementById('previewBody');

    let isSignupMode = false;
    let masterFilesArray = []; 
    let isFirstTimeUser = true; 

    // --- 🕒 REAL TIME CLOCK & AUTOMATIC STORE PROTECTOR ENGINE ---
    function updateLiveSystemClock() {
        const now = new Date();
        
        // 1. Format dynamic digital ticking clock for viewports
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const clockEl = document.getElementById('userLiveClock');
        if (clockEl) clockEl.textContent = timeString;

        // 2. Extract operational limits constraints hours and minutes
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Rule parameters: Opening 07:00 AM, Closing 23:59 PM (Raat 11:59)
        let isStoreOpen = false;
        if (currentHour >= 7 && currentHour < 24) {
            isStoreOpen = true; // Between 7 AM and 11:59 PM
        }

        const statusBadge = document.getElementById('userShopStatus');
        const closedNoticeBox = document.getElementById('storeClosedNoticeBox');
        const submitBtn = document.getElementById('submitOrderBtn');

        if (statusBadge && closedNoticeBox && submitBtn) {
            if (isStoreOpen) {
                statusBadge.textContent = "OPEN 🟢";
                statusBadge.className = "shop-status-badge open";
                closedNoticeBox.classList.add('hidden');
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
                submitBtn.textContent = "Proceed to Payment";
            } else {
                statusBadge.textContent = "CLOSED 🔴";
                statusBadge.className = "shop-status-badge closed";
                closedNoticeBox.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.4";
                submitBtn.style.cursor = "not-allowed";
                submitBtn.textContent = "❌ Store is Closed";
            }
        }
    }
    setInterval(updateLiveSystemClock, 1000);
    updateLiveSystemClock();

    // --- ⏳ STAGE 1: DYNAMIC SPLASH CONTROLLER ---
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
        }
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if (sessionActiveUser) {
            const userData = JSON.parse(localStorage.getItem(`user_${sessionActiveUser}`));
            userGreeting.textContent = `Hi, ${userData ? userData.name : 'Customer'}`;
            
            const savedHistory = localStorage.getItem(`history_${sessionActiveUser}`);
            if (savedHistory && JSON.parse(savedHistory).length > 0) {
                isFirstTimeUser = false;
            } else {
                isFirstTimeUser = true;
            }

            mainApp.classList.remove('app-hidden');
            mainApp.classList.add('app-visible');
            
            loadSavedFilesFromSession();
            renderOrderHistoryUI(sessionActiveUser); 
        } else {
            authScreen.classList.remove('app-hidden');
        }
        calculateTotal();
    }, 2500);

    // --- 🔐 STAGE 2: PREMIUM AUTH ACTION MATRIX ---
    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            authTitle.textContent = "Create Account";
            authSubtitle.textContent = "Join Print From Home today. Sign up using Email/Phone to order prints instantly.";
            authBtn.textContent = "Sign Up";
            toggleMsg.textContent = "Already have an account?";
            toggleAuthLink.textContent = "Login here";
            signupOnlyFields.forEach(f => f.classList.remove('hidden'));
        } else {
            authTitle.textContent = "Welcome Back!";
            authSubtitle.textContent = "Log in to your account to instantly manage and print your documents.";
            authBtn.textContent = "Log In";
            toggleMsg.textContent = "New to Print From Home?";
            toggleAuthLink.textContent = "Create Account";
            signupOnlyFields.forEach(f => f.classList.add('hidden'));
        }
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const identityKey = authIdentity.value.trim();
        const inputPassword = authPassword.value;

        if (isSignupMode) {
            const inputName = authName.value.trim() || 'Customer';
            if(localStorage.getItem(`user_${identityKey}`)) {
                alert("❌ This Gmail or Phone number already exists! Please Log In.");
                return;
            }
            const userPayload = { name: inputName, id: identityKey, password: inputPassword };
            localStorage.setItem(`user_${identityKey}`, JSON.stringify(userPayload));
            localStorage.setItem('printAppUser', identityKey);
            isFirstTimeUser = true; 
            userGreeting.textContent = `Hi, ${inputName}`;
            alert("🎉 Account created successfully! Logging you in...");
        } else {
            const registeredRecord = localStorage.getItem(`user_${identityKey}`);
            if (!registeredRecord) {
                alert("❌ No record found! Please create an account first.");
                return;
            }
            const verifiedObject = JSON.parse(registeredRecord);
            if (verifiedObject.password !== inputPassword) {
                alert("❌ Incorrect password! Please verify and try again.");
                return;
            }
            localStorage.setItem('printAppUser', identityKey);
            
            const savedHistory = localStorage.getItem(`history_${identityKey}`);
            isFirstTimeUser = !(savedHistory && JSON.parse(savedHistory).length > 0);
            userGreeting.textContent = `Hi, ${verifiedObject.name}`;
        }
        authScreen.classList.add('app-hidden');
        mainApp.classList.remove('app-hidden');
        mainApp.classList.add('app-visible');
        authForm.reset();
        
        const currentUser = localStorage.getItem('printAppUser');
        loadSavedFilesFromSession();
        renderOrderHistoryUI(currentUser);
        calculateTotal();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('printAppUser');
        sessionStorage.removeItem('savedPrintFiles'); 
        masterFilesArray = [];
        multiFilesContainer.innerHTML = '';
        fileNameDisplay.textContent = "No files selected yet";
        mainApp.classList.remove('app-visible');
        mainApp.classList.add('app-hidden');
        authScreen.classList.remove('auth-hidden');
        authScreen.classList.remove('app-hidden');
        calculateTotal();
    });

    // --- 🖨️ FILE EXTENCE PERSISTENCE & PREVIEW ENGINE ---
    fileUpload.addEventListener('change', () => {
        if (fileUpload.files.length === 0) return;

        Array.from(fileUpload.files).forEach(file => {
            const isDuplicate = masterFilesArray.some(f => f.name === file.name && f.size === file.size);
            if (!isDuplicate) {
                masterFilesArray.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    fileData: file, 
                    config: { pages: 1, printType: 'bw', sides: 'single', binding: 'none', copies: 1 }
                });
            }
        });

        fileUpload.value = ''; 
        saveCurrentFilesToSession(); 
        renderFilesUI();
    });

    function saveCurrentFilesToSession() {
        const sessionPayload = masterFilesArray.map(item => ({
            name: item.name,
            size: item.size,
            type: item.type,
            config: item.config
        }));
        sessionStorage.setItem('savedPrintFiles', JSON.stringify(sessionPayload));
    }

    function loadSavedFilesFromSession() {
        const rawSessionData = sessionStorage.getItem('savedPrintFiles');
        if (rawSessionData) {
            const parsedSessionData = JSON.parse(rawSessionData);
            masterFilesArray = parsedSessionData.map(item => ({
                name: item.name,
                size: item.size,
                type: item.type,
                fileData: null, 
                config: item.config
            }));
            fileNameDisplay.textContent = `✓ Total ${masterFilesArray.length} files in queue`;
            renderFilesUI();
        }
    }

    function renderFilesUI() {
        multiFilesContainer.innerHTML = ''; 

        if (masterFilesArray.length === 0) {
            fileNameDisplay.textContent = "No files selected yet";
            calculateTotal();
            return;
        }

        masterFilesArray.forEach((item, index) => {
            const fileRow = document.createElement('div');
            fileRow.className = 'document-promo-card';
            fileRow.style.border = '1px solid #cbd5e0';
            fileRow.style.backgroundColor = '#fff';
            fileRow.style.marginTop = '15px';
            fileRow.style.textAlign = 'left';

            const previewBtnText = item.fileData ? "👁️ Preview" : "🔄 Re-upload File";
            const previewBtnBg = item.fileData ? "#e2e8f0" : "#fed7d7";
            const previewBtnColor = item.fileData ? "#2d3748" : "#c53030";

            fileRow.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <strong style="font-size:0.9rem; color:#1a202c; word-break:break-all;">📄 ${item.name}</strong>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button type="button" id="previewBtn_${index}" style="background:${previewBtnBg}; border:none; border-radius:6px; color:${previewBtnColor}; padding:4px 8px; font-size:0.8rem; cursor:pointer; font-weight:600;">${previewBtnText}</button>
                        
                        <div style="display:flex; align-items:center; background:#edf2f7; border-radius:8px; padding:2px 6px; gap:8px;">
                            <button type="button" id="minusCopy_${index}" style="border:none; background:none; font-weight:800; color:#4a5568; cursor:pointer; padding:2px 6px;">-</button>
                            <span id="copyCountLabel_${index}" style="font-weight:700; font-size:0.9rem; min-width:14px; text-align:center;">${item.config.copies}</span>
                            <button type="button" id="plusCopy_${index}" style="border:none; background:none; font-weight:800; color:#0C8346; cursor:pointer; padding:2px 6px;">+</button>
                        </div>
                        <span id="fileTotalCost_${index}" style="font-weight:700; color:#0C8346; font-size:0.95rem;">₹0.00</span>
                        <button type="button" id="removeFile_${index}" style="background:none; border:none; color:#e53e3e; font-weight:bold; cursor:pointer; font-size:0.8rem; margin-left:5px;">❌</button>
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Number of Pages:</label>
                        <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding:8px; border-radius:8px;" required>
                    </div>
                    <div class="form-group">
                        <label>Print Type:</label>
                        <select id="printType_${index}" style="padding:8px; border-radius:8px;">
                            <option value="bw" ${item.config.printType === 'bw' ? 'selected' : ''}>Black & White (₹3 / page)</option>
                            <option value="color" ${item.config.printType === 'color' ? 'selected' : ''}>Full Color (₹10 / page)</option>
                        </select>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Sides:</label>
                        <select id="sides_${index}" style="padding:8px; border-radius:8px;">
                            <option value="single" ${item.config.sides === 'single' ? 'selected' : ''}>Single Sided</option>
                            <option value="double" ${item.config.sides === 'double' ? 'selected' : ''}>Double Sided</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Binding Option:</label>
                        <select id="binding_${index}" style="padding:8px; border-radius:8px;">
                            <option value="none" ${item.config.binding === 'none' ? 'selected' : ''}>No Binding</option>
                            <option value="staple" ${item.config.binding === 'staple' ? 'selected' : ''}>Stapled (Free)</option>
                            <option value="spiral" ${item.config.binding === 'spiral' ? 'selected' : ''}>Spiral Binding (+₹30)</option>
                            <option value="soft" ${item.config.binding === 'soft' ? 'selected' : ''}>Soft Book Binding (+₹50)</option>
                        </select>
                    </div>
                </div>
            `;

            multiFilesContainer.appendChild(fileRow);

            document.getElementById(`previewBtn_${index}`).addEventListener('click', () => {
                if(item.fileData) {
                    openDocumentPreview(item.fileData, item.name, item.type);
                } else {
                    alert(`Bhai, refresh ke kaaran data buffer unbind ho gaya hai. Main button se ek baar dobara click karke files chun lo, options waise hi saved hain!`);
                    fileUpload.click();
                }
            });

            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => {
                item.config.copies++;
                document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies;
                saveCurrentFilesToSession();
                calculateTotal();
            });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => {
                if (item.config.copies > 1) {
                    item.config.copies--;
                    document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies;
                    saveCurrentFilesToSession();
                    calculateTotal();
                }
            });

            document.getElementById(`removeFile_${index}`).addEventListener('click', () => {
                masterFilesArray.splice(index, 1);
                fileNameDisplay.textContent = masterFilesArray.length > 0 ? `✓ Total ${masterFilesArray.length} files in queue` : "No files selected yet";
                saveCurrentFilesToSession();
                renderFilesUI();
            });

            document.getElementById(`pages_${index}`).addEventListener('input', (e) => {
                item.config.pages = parseInt(e.target.value) || 1;
                saveCurrentFilesToSession();
                calculateTotal();
            });
            document.getElementById(`printType_${index}`).addEventListener('change', (e) => {
                item.config.printType = e.target.value;
                saveCurrentFilesToSession();
                calculateTotal();
            });
            document.getElementById(`sides_${index}`).addEventListener('change', (e) => {
                item.config.sides = e.target.value;
                calculateTotal();
            });
            document.getElementById(`binding_${index}`).addEventListener('change', (e) => {
                item.config.binding = e.target.value;
                saveCurrentFilesToSession();
                calculateTotal();
            });
        });

        calculateTotal();
    }

    function openDocumentPreview(file, name, type) {
        previewTitle.textContent = `Preview: ${name}`;
        previewBody.innerHTML = ''; 
        const fileURL = URL.createObjectURL(file);
        if (type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileURL;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '60vh';
            img.style.borderRadius = '8px';
            previewBody.appendChild(img);
        } else if (type === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = fileURL;
            iframe.style.width = '100%';
            iframe.style.height = '60vh';
            iframe.style.border = 'none';
            previewBody.appendChild(iframe);
        } else {
            previewBody.innerHTML = `<div style="text-align:center; padding:20px; color:#4a5568;"><span style="font-size:3rem;">📄</span><p style="margin-top:10px; font-weight:600;">Preview not directly supported for this format.</p></div>`;
        }
        previewModal.style.display = 'flex';
    }

    closePreview.addEventListener('click', () => { previewModal.style.display = 'none'; });

    function calculateTotal() {
        let totalPrintCost = 0;
        let totalBindingCost = 0;

        const summaryPrint = document.getElementById('summaryPrint');
        const summaryBinding = document.getElementById('summaryBinding');
        const summaryDelivery = document.getElementById('summaryDelivery');
        const summaryTotal = document.getElementById('summaryTotal');

        if (masterFilesArray.length === 0) {
            summaryPrint.textContent = `₹0.00`;
            summaryBinding.textContent = `₹0.00`;
            summaryDelivery.textContent = `₹0.00`; 
            summaryTotal.textContent = `₹0.00`;
            return;
        }

        masterFilesArray.forEach((item, index) => {
            const pages = parseInt(item.config.pages) || 1;
            const printType = item.config.printType;
            const binding = item.config.binding;
            const copies = parseInt(item.config.copies) || 1;

            let perPageRate = (printType === 'bw') ? 3.00 : 10.00;
            let filePrintCost = (pages * perPageRate) * copies;
            let fileBindingCost = 0;
            
            if (binding === 'spiral') fileBindingCost = 30.00 * copies;
            if (binding === 'soft') fileBindingCost = 50.00 * copies;

            let fileTotal = filePrintCost + fileBindingCost;
            const costLabel = document.getElementById(`fileTotalCost_${index}`);
            if (costLabel) costLabel.textContent = `₹${fileTotal.toFixed(2)}`;

            totalPrintCost += filePrintCost;
            totalBindingCost += fileBindingCost;
        });

        let finalDocumentCost = totalPrintCost + totalBindingCost;
        let accurateDeliveryCharge = 25.00; 

        if (isFirstTimeUser && finalDocumentCost >= 49.00) {
            accurateDeliveryCharge = 0.00; 
        } else if (!isFirstTimeUser && finalDocumentCost >= 99.00) {
            accurateDeliveryCharge = 0.00; 
        }

        let grandTotal = finalDocumentCost + accurateDeliveryCharge;

        summaryPrint.textContent = `₹${totalPrintCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${totalBindingCost.toFixed(2)}`;
        summaryDelivery.textContent = accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`;
        summaryTotal.textContent = `₹${grandTotal.toFixed(2)}`;
    }

    function renderOrderHistoryUI(userId) {
        const rawHistory = localStorage.getItem(`history_${userId}`);
        if (!rawHistory || JSON.parse(rawHistory).length === 0) {
            ordersHistoryContainer.innerHTML = `<p style="font-size:0.85rem; color:#718096; text-align:center; padding:15px;">No orders placed yet.</p>`;
            return;
        }

        const parsedHistory = JSON.parse(rawHistory).reverse(); 
        ordersHistoryContainer.innerHTML = '';

        parsedHistory.forEach(order => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-card-item';
            
            let filesDetailsHtml = order.details.map(f => `• ${f.fileName} (${f.copies} copies, ${f.pages} pgs, ${f.printType === 'bw' ? 'B&W' : 'Color'})`).join('<br>');

            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1a202c; border-bottom:1px dashed #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
                    <span>📅 ${order.date}</span>
                    <span style="color:#0C8346;">₹${order.amount}</span>
                </div>
                <div style="color:#4a5568; line-height:1.4; font-size:0.8rem; margin-bottom:4px;">
                    ${filesDetailsHtml}
                </div>
                <div style="font-size:0.75rem; color:#e67e22; font-weight:600; text-align:right;">
                    Status: <span style="background:#fff3e0; padding:2px 6px; border-radius:4px;">${order.status}</span>
                </div>
            `;
            ordersHistoryContainer.appendChild(itemDiv);
        });
    }

    const printForm = document.getElementById('printForm');
    printForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(masterFilesArray.length === 0) {
            alert("❌ File upload karna zaroori hai bhai!");
            return;
        }

        const missingBinaries = masterFilesArray.some(f => f.fileData === null);
        if(missingBinaries) {
            alert("⚠️ Refresh ke kaaran browser local stream clear ho gayi hai. Bas 'Select Files' se ek baar files jagah chun lo!");
            return;
        }

        const summaryTotal = document.getElementById('summaryTotal');
        const totalAmountText = summaryTotal.textContent.replace('₹', '');
        const formData = new FormData();

        masterFilesArray.forEach((item) => {
            formData.append('document', item.fileData); 
        });

        const finalMetaConfig = masterFilesArray.map((item) => {
            return {
                fileName: item.name,
                pages: item.config.pages,
                printType: item.config.printType,
                sides: item.config.sides,
                binding: item.config.binding,
                copies: item.config.copies
            };
        });

        formData.append('totalAmount', totalAmountText);
        formData.append('configDetails', JSON.stringify(finalMetaConfig));
        formData.append('address', document.getElementById('address').value);

        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!data.success) {
                alert('Order failure! Server validation failed.');
                return;
            }

            const options = {
                "key": data.key_id, 
                "amount": data.amount, 
                "currency": "INR",
                "name": "Print From Home",
                "description": "Document Printing Charges",
                "order_id": data.order_id, 
                "handler": async function (response){
                    const verifyRes = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: data.order_id,
                            paymentId: response.razorpay_payment_id
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if(verifyData.success) {
                        alert('🎉 Payment Successful! Order lock ho gaya hai.');
                        
                        const activeUserToken = localStorage.getItem('printAppUser');
                        const currentHistoryRaw = localStorage.getItem(`history_${activeUserToken}`) || '[]';
                        const currentHistoryArray = JSON.parse(currentHistoryRaw);
                        
                        // 🔥 TIMESTAMPS TRACKED NATIVELY WITH SECONDS PRECISION IN LOGS
                        const newHistoryObject = {
                            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
                            amount: totalAmountText,
                            status: "Paid / Ready for Print",
                            details: finalMetaConfig
                        };
                        currentHistoryArray.push(newHistoryObject);
                        localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));

                        isFirstTimeUser = false;
                        sessionStorage.removeItem('savedPrintFiles'); 
                        printForm.reset();
                        multiFilesContainer.innerHTML = '';
                        masterFilesArray = [];
                        fileNameDisplay.textContent = "No files selected yet";
                        
                        renderOrderHistoryUI(activeUserToken); 
                        calculateTotal();
                    }
                },
                "theme": { "color": "#F4C430" }
            };
            const rzp1 = new Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error("Payment Error:", error);
        }
    });

    let currentLocalVersion = null;
    async function checkForNewUpdates() {
        try {
            const res = await fetch('/api/version');
            const data = await res.json();
            if (!currentLocalVersion) { currentLocalVersion = data.version; } 
            else if (currentLocalVersion !== data.version) {
                currentLocalVersion = data.version;
                window.location.reload(true); 
            }
        } catch (err) {}
    }
    setInterval(checkForNewUpdates, 20000); 
    checkForNewUpdates();
    // --- 📢 AUTOMATED MARKETING REMINDER & POPUP CONTROLLER ENGINE ---
    function triggerSmartMarketingPopup() {
        const activeUserKey = localStorage.getItem('printAppUser');
        const popupModal = document.getElementById('marketingPopupModal');
        const popupTitle = document.getElementById('popupAlertTitle');
        const popupBody = document.getElementById('popupAlertBody');
        const popupIcon = document.getElementById('popupIconBadge');

        if (!popupModal || !popupTitle || !popupBody || !popupIcon) return;

        // 📝 CODES FOR ATTRACTIVE CONTEXTUAL REMINDER MESSAGES
        const offersList = [
            { title: "🔥 Flash Sale Alert!", body: "Bhai, exam time aa gaya hai! Pure Varanasi ke bacchon ke liye Black & White prints abhi direct live chal rahe hain sirf ₹3.00/page par. Fatafat files select karo aur delivery pao!", icon: "⚡" },
            { title: "🎁 Surprise Bundle Offer!", body: "Dukan par naya system update hua hai! Multi-file upload chalu hai, saari PDFs ek sath select karo aur copies stepper se direct copies badhao makkhan ki tarah!", icon: "📦" }
        ];

        // 1. CONDITION A: Agar koi user logged in NAHI hai (General Guest Popup)
        if (!activeUserKey) {
            // Pick a random hot offer from schema list array
            const randomScheme = offersList[Math.floor(Math.random() * offersList.length)];
            popupTitle.textContent = randomScheme.title;
            popupBody.textContent = randomScheme.body;
            popupIcon.textContent = randomScheme.icon;
            
            // Show popup after 3.5 seconds of website load to capture attention
            setTimeout(() => { popupModal.style.display = 'flex'; }, 3500);
            return;
        }

        // 2. CONDITION B: Agar user log in hai, toh unke order history cache ka gap track karo
        const userData = JSON.parse(localStorage.getItem(`user_${activeUserKey}`)) || {};
        const userName = userData.name || "Bhai";
        const userContact = activeUserKey; // Fetch direct Gmail or Phone number token

        const rawHistory = localStorage.getItem(`history_${activeUserKey}`);
        let lastOrderDate = null;

        if (rawHistory) {
            const parsedHistory = JSON.parse(rawHistory);
            if (parsedHistory.length > 0) {
                // Fetch timestamp details of the last placed job logs
                const latestOrder = parsedHistory[parsedHistory.length - 1];
                if (latestOrder.date) {
                    lastOrderDate = new Date(latestOrder.date.split(' ')[0]);
                }
            }
        }

        const now = new Date();
        let daysSinceLastOrder = 999; // Default infinite scale if never ordered

        if (lastOrderDate) {
            const differenceInTime = now.getTime() - lastOrderDate.getTime();
            daysSinceLastOrder = Math.floor(differenceInTime / (1000 * 3600 * 24));
        }

        // 🔥 DYNAMIC RE-ENGAGEMENT CHECK RULE: If customer is inactive for 3 or more days
        if (daysSinceLastOrder >= 3) {
            popupIcon.textContent = "👋";
            popupTitle.textContent = `We Miss You, ${userName}!`;
            
            // Tailored customized messaging utilizing their contact info dynamically
            popupBody.innerHTML = `Hame pata hai aap <b>(${userContact})</b> se connected hain, par kaafi dino se aapne koi document print nahi kiya bhai! Kal subah <b>7:00 AM</b> dukan khulne se pehle hi apni saari files line up kar lo, <b>First Order Scheme</b> par free delivery abhi bhi active hai!`;
            
            setTimeout(() => { popupModal.style.display = 'flex'; }, 3000);
        } else {
            // If they are active buyers, show them a premium update announcement alert standard banner
            popupIcon.textContent = "🚚";
            popupTitle.textContent = `Hey ${userName}, Fast Delivery Active!`;
            popupBody.textContent = `Aapka system registered account active hai. Hamara 'HP Smart Tank 580' hardware and automatic local bridge pipeline 100% online hai. Place your order now for hyper-fast doorstep drop!`;
            
            setTimeout(() => { popupModal.style.display = 'flex'; }, 4000);
        }

        // Wire click handler to dismiss layout container box manually
        document.getElementById('closeMarketingPopup').onclick = () => { popupModal.style.display = 'none'; };
    }

    // Connect trigger system action inside window loading stream sequence
    window.addEventListener('load', () => {
        setTimeout(triggerSmartMarketingPopup, 1000);
    });

    // Helper visibility mapping handler clear box function
    window.closeMarketingNotificationBox = function() {
        document.getElementById('marketingPopupModal').style.display = 'none';
    };
});