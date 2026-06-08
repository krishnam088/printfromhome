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

    // 🔥 AUTOMATED SCREEN DIVERTOR & PAGE ISOLATION MATRIX (IMAGE 1000283099.jpg COMPATIBLE)
    window.refreshInvoiceTabState = function() {
        const sideInvoicePanel = document.getElementById('sidebarPricingPanel');
        const layoutContainer = document.getElementById('mainLayoutAppContainer');
        const activeTabStoreNode = document.getElementById('user_section_store');
        
        const uploadInitialScreen = document.getElementById('uploadScreenInitialState');
        const configWorkspaceScreen = document.getElementById('configurationScreenState');
        const storeOffersTopBanner = document.getElementById('storeOffersTopBanner');

        const activeTabIsStore = activeTabStoreNode && activeTabStoreNode.classList.contains('active');

        // If user navigates out of store tab, don't execute visibility shifts
        if (!activeTabIsStore) return;

        // Force ensure store banners are only active inside store sections boundaries
        if(storeOffersTopBanner) storeOffersTopBanner.classList.remove('hidden');

        if (masterFilesArray && masterFilesArray.length > 0) {
            // Divert step sequence mapping instantly
            if(uploadInitialScreen) uploadInitialScreen.classList.add('hidden');
            if(configWorkspaceScreen) configWorkspaceScreen.classList.remove('hidden');

            if(sideInvoicePanel) sideInvoicePanel.classList.remove('hidden');
            if (window.innerWidth > 992) {
                if(layoutContainer) {
                    layoutContainer.classList.add('has-invoice');
                    layoutContainer.style.gridTemplateColumns = '2.5fr 1.2fr';
                }
            } else {
                if(layoutContainer) layoutContainer.style.gridTemplateColumns = '1fr';
            }
        } else {
            // Restore upload triggers layout boundary state if arrays flush
            if(uploadInitialScreen) uploadInitialScreen.classList.remove('hidden');
            if(configWorkspaceScreen) configWorkspaceScreen.classList.add('hidden');

            if(sideInvoicePanel) sideInvoicePanel.classList.add('hidden');
            if(layoutContainer) {
                layoutContainer.classList.remove('has-invoice');
                layoutContainer.style.gridTemplateColumns = '1fr';
            }
        }
    }

    window.forceReturnToUploadView = function() {
        masterFilesArray = [];
        sessionStorage.removeItem('savedPrintFiles');
        if(multiFilesContainer) multiFilesContainer.innerHTML = '';
        refreshInvoiceTabState();
        calculateTotal();
    }

    // --- ⏳ STAGE 1: SPLASH LOADER ---
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
            splashScreen.classList.add('hidden'); 
        }
        
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if (sessionActiveUser) {
            const userData = JSON.parse(localStorage.getItem(`user_${sessionActiveUser}`));
            if(userGreeting) userGreeting.textContent = `Hi, ${userData ? userData.name : 'Customer'}`;
            
            const savedHistory = localStorage.getItem(`history_${sessionActiveUser}`);
            isFirstTimeUser = !(savedHistory && JSON.parse(savedHistory).length > 0);

            if(mainApp) {
                mainApp.classList.remove('app-hidden');
                mainApp.style.display = 'block';
            }
            
            loadSavedFilesFromSession();
            renderOrderHistoryUI(sessionActiveUser); 
        } else {
            if(authScreen) {
                authScreen.classList.remove('app-hidden');
                authScreen.style.display = 'flex';
            }
        }
        calculateTotal();
    }, 2500);

    // --- 🔐 STAGE 2: PREMIUM AUTH ACTION MATRIX ---
    if(toggleAuthLink) {
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
    }

    if(authForm) {
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
                if(userGreeting) userGreeting.textContent = `Hi, ${inputName}`;
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
                if(userGreeting) userGreeting.textContent = `Hi, ${verifiedObject.name}`;
            }
            if(authScreen) authScreen.style.display = 'none';
            if(mainApp) {
                mainApp.classList.remove('app-hidden');
                mainApp.style.display = 'block';
            }
            authForm.reset();
            
            const currentUser = localStorage.getItem('printAppUser');
            loadSavedFilesFromSession();
            renderOrderHistoryUI(currentUser);
            calculateTotal();
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('printAppUser');
            sessionStorage.removeItem('savedPrintFiles'); 
            masterFilesArray = [];
            if(multiFilesContainer) multiFilesContainer.innerHTML = '';
            if(mainApp) mainApp.style.display = 'none';
            if(authScreen) authScreen.style.display = 'flex';
            calculateTotal();
        });
    }

    if(fileUpload) {
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
                        config: { pages: 1, printType: 'bw', orientation: 'portrait', binding: 'none', copies: 1 }
                    });
                }
            });

            fileUpload.value = ''; 
            saveCurrentFilesToSession(); 
            renderFilesUI();
        });
    }

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
            renderFilesUI();
        }
    }

    function renderFilesUI() {
        if(!multiFilesContainer) return;
        multiFilesContainer.innerHTML = ''; 

        refreshInvoiceTabState();

        if (masterFilesArray.length === 0) return;

        masterFilesArray.forEach((item, index) => {
            const fileRow = document.createElement('div');
            fileRow.className = 'blinkit-file-card';

            const activeColorBw = item.config.printType === 'bw' ? 'active' : '';
            const activeColorCol = item.config.printType === 'color' ? 'active' : '';
            const activeOriPort = item.config.orientation === 'portrait' ? 'active' : '';
            const activeOriLand = item.config.orientation === 'landscape' ? 'active' : '';

            fileRow.innerHTML = `
                <div class="blinkit-card-row">
                    <div style="text-align:left;">
                        <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-main); word-break:break-all;">📄 ${item.name}</h4>
                        <span style="font-size:0.75rem; color:var(--text-sub); font-weight:500;">File ${index+1} (Pages Custom Parameters)</span>
                    </div>
                    <button type="button" id="removeFile_${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1.4rem;">&times;</button>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:15px; align-items:center;">
                    <div class="input-group" style="margin-bottom:0;">
                        <label style="font-size:0.75rem; font-weight:700; color:var(--text-sub); margin-bottom:4px; display:block;">Number of pages:</label>
                        <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding:10px; border-radius:10px; border:2px solid var(--border-color); font-size:0.85rem; width:100%; font-weight:700;" required>
                    </div>
                    <div>
                        <label style="font-size:0.75rem; font-weight:700; color:var(--text-sub); margin-bottom:4px; display:block;">Number of copies:</label>
                        <div class="blinkit-stepper" style="justify-content:space-between; max-width:140px; margin-top:4px;">
                            <button type="button" id="minusCopy_${index}" class="stepper-btn">-</button>
                            <span id="copyCountLabel_${index}" style="font-size:0.9rem;">${item.config.copies}</span>
                            <button type="button" id="plusCopy_${index}" class="stepper-btn">+</button>
                        </div>
                    </div>
                </div>

                <p style="font-size:0.75rem; font-weight:700; color:var(--text-sub); margin-bottom:6px; text-align:left;">Choose print color</p>
                <div class="blinkit-grid-options">
                    <div class="blinkit-option-box ${activeColorCol}" id="optColor_${index}">
                        <div class="option-icon">🎨</div>
                        <div class="option-meta-text">
                            <span class="option-title">Coloured</span>
                            <span class="option-subtitle">₹10/page</span>
                        </div>
                    </div>
                    <div class="blinkit-option-box ${activeColorBw}" id="optBw_${index}">
                        <div class="option-icon">🌑</div>
                        <div class="option-meta-text">
                            <span class="option-title">B & W</span>
                            <span class="option-subtitle">₹3/page</span>
                        </div>
                    </div>
                </div>

                <p style="font-size:0.75rem; font-weight:700; color:var(--text-sub); margin-bottom:6px; text-align:left;">Choose print orientation</p>
                <div class="blinkit-grid-options">
                    <div class="blinkit-option-box ${activeOriPort}" id="optPort_${index}">
                        <div class="option-icon">📱</div>
                        <div class="option-meta-text">
                            <span class="option-title">Portrait</span>
                            <span class="option-subtitle">8.3 × 11.7 in</span>
                        </div>
                    </div>
                    <div class="blinkit-option-box ${activeOriLand}" id="optLand_${index}">
                        <div class="option-icon">💻</div>
                        <div class="option-meta-text">
                            <span class="option-title">Landscape</span>
                            <span class="option-subtitle">11.7 × 8.3 in</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:10px; border-radius:10px; border:1px solid var(--border-color);">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-main);">Binding Options:</label>
                    <select id="binding_${index}" style="padding:6px; border-radius:8px; border:1px solid var(--border-color); font-size:0.8rem; font-weight:600; outline:none; cursor:pointer;">
                        <option value="none" ${item.config.binding === 'none' ? 'selected' : ''}>No Binding</option>
                        <option value="staple" ${item.config.binding === 'staple' ? 'selected' : ''}>Stapled (Free)</option>
                        <option value="spiral" ${item.config.binding === 'spiral' ? 'selected' : ''}>Spiral Binding (+₹30)</option>
                        <option value="soft" ${item.config.binding === 'soft' ? 'selected' : ''}>Soft Book Binding (+₹50)</option>
                    </select>
                </div>
            `;

            multiFilesContainer.appendChild(fileRow);

            document.getElementById(`optColor_${index}`).addEventListener('click', () => { item.config.printType = 'color'; renderFilesUI(); });
            document.getElementById(`optBw_${index}`).addEventListener('click', () => { item.config.printType = 'bw'; renderFilesUI(); });
            document.getElementById(`optPort_${index}`).addEventListener('click', () => { item.config.orientation = 'portrait'; renderFilesUI(); });
            document.getElementById(`optLand_${index}`).addEventListener('click', () => { item.config.orientation = 'landscape'; renderFilesUI(); });

            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => {
                item.config.copies++; saveCurrentFilesToSession(); calculateTotal();
            });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => {
                if (item.config.copies > 1) { item.config.copies--; saveCurrentFilesToSession(); calculateTotal(); }
            });
            document.getElementById(`removeFile_${index}`).addEventListener('click', () => {
                masterFilesArray.splice(index, 1); saveCurrentFilesToSession(); renderFilesUI();
            });
            document.getElementById(`pages_${index}`).addEventListener('input', (e) => {
                item.config.pages = parseInt(e.target.value) || 1; saveCurrentFilesToSession(); calculateTotal();
            });
            document.getElementById(`binding_${index}`).addEventListener('change', (e) => {
                item.config.binding = e.target.value; saveCurrentFilesToSession(); calculateTotal();
            });
        });

        calculateTotal();
    }

    function calculateTotal() {
        let totalPrintCost = 0; let totalBindingCost = 0;
        const summaryPrint = document.getElementById('summaryPrint');
        const summaryBinding = document.getElementById('summaryBinding');
        const summaryDelivery = document.getElementById('summaryDelivery');
        const summaryTotal = document.getElementById('summaryTotal');

        refreshInvoiceTabState();

        if (!summaryPrint || !summaryBinding || !summaryDelivery || !summaryTotal) return;

        if (masterFilesArray.length === 0) {
            summaryPrint.textContent = `₹0.00`; summaryBinding.textContent = `₹0.00`; summaryDelivery.textContent = `₹0.00`; summaryTotal.textContent = `₹0.00`;
            return;
        }

        masterFilesArray.forEach((item) => {
            const pages = parseInt(item.config.pages) || 1;
            const printType = item.config.printType;
            const binding = item.config.binding;
            const copies = parseInt(item.config.copies) || 1;

            let perPageRate = (printType === 'bw') ? 3.00 : 10.00;
            let filePrintCost = (pages * perPageRate) * copies;
            let fileBindingCost = 0;
            
            if (binding === 'spiral') fileBindingCost = 30.00 * copies;
            if (binding === 'soft') fileBindingCost = 50.00 * copies;

            totalPrintCost += filePrintCost; totalBindingCost += fileBindingCost;
        });

        let finalDocumentCost = totalPrintCost + totalBindingCost;
        let accurateDeliveryCharge = 25.00; 

        if (isFirstTimeUser && finalDocumentCost >= 49.00) accurateDeliveryCharge = 0.00; 
        else if (!isFirstTimeUser && finalDocumentCost >= 99.00) accurateDeliveryCharge = 0.00;

        let grandTotal = finalDocumentCost + accurateDeliveryCharge;
        summaryPrint.textContent = `₹${totalPrintCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${totalBindingCost.toFixed(2)}`;
        summaryDelivery.textContent = accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`;
        summaryTotal.textContent = `₹${grandTotal.toFixed(2)}`;
    }

    function renderOrderHistoryUI(userId) {
        if(!ordersHistoryContainer) return;
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
            let filesDetailsHtml = order.details.map(f => `• ${f.fileName} (${f.copies} copies)`).join('<br>');
            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1a202c; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
                    <span>📅 ${order.date}</span> <span style="color:#0C8346;">₹${order.amount}</span>
                </div>
                <div style="color:#4a5568; line-height:1.4; font-size:0.8rem; margin-bottom:4px;">${filesDetailsHtml}</div>
                <div style="font-size:0.75rem; color:#e67e22; font-weight:600; text-align:right;">Status: <span style="background:#fff3e0; padding:2px 6px; border-radius:4px;">${order.status}</span></div>
            `;
            ordersHistoryContainer.appendChild(itemDiv);
        });
    }

    const printForm = document.getElementById('printForm');
    if(printForm) {
        printForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const summaryTotal = document.getElementById('summaryTotal');
            const totalAmountText = summaryTotal ? summaryTotal.textContent.replace('₹', '') : "0";
            const formData = new FormData();
            masterFilesArray.forEach((item) => { if(item.fileData) formData.append('document', item.fileData); });

            const finalMetaConfig = masterFilesArray.map((item) => {
                return { fileName: item.name, pages: item.config.pages, printType: item.config.printType, sides: item.config.orientation === 'portrait' ? 'single' : 'landscape', binding: item.config.binding, copies: item.config.copies };
            });

            formData.append('totalAmount', totalAmountText);
            formData.append('configDetails', JSON.stringify(finalMetaConfig));
            formData.append('address', document.getElementById('address').value);

            try {
                const response = await fetch('/api/create-order', { method: 'POST', body: formData });
                const data = await response.json();
                if (!data.success) return;

                const options = {
                    "key": data.key_id, "amount": data.amount, "currency": "INR", "name": "Print From Home", "order_id": data.order_id,
                    "handler": async function (response){
                        const verifyRes = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.order_id, paymentId: response.razorpay_payment_id }) });
                        const verifyData = await verifyRes.json();
                        if(verifyData.success) {
                            alert('🎉 Payment Successful! Order locked.');
                            const activeUserToken = localStorage.getItem('printAppUser');
                            const currentHistoryArray = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                            currentHistoryArray.push({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), amount: totalAmountText, status: "Paid / Ready for Print", details: finalMetaConfig });
                            localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                            isFirstTimeUser = false; sessionStorage.removeItem('savedPrintFiles'); printForm.reset(); multiFilesContainer.innerHTML = ''; masterFilesArray = [];
                            renderOrderHistoryUI(activeUserToken); calculateTotal();
                        }
                    }, "theme": { "color": "#F4C430" }
                };
                const rzp1 = new Razorpay(options); rzp1.open();
            } catch (error) {}
        });
    }
});