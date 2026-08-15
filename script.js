document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splashScreen');
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    const signupOnlyFields = document.querySelectorAll('.signup-only');

    const authName = document.getElementById('authName');
    const authIdentity = document.getElementById('authIdentity');
    const authPassword = document.getElementById('authPassword');
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');

    const fileUpload = document.getElementById('fileUpload');
    const multiFilesContainer = document.getElementById('multiFilesContainer');
    const ordersHistoryContainer = document.getElementById('ordersHistoryContainer');

    let masterFilesArray = []; 
    let isFirstTimeUser = true; 

    // 🔥 LIVE RE-ROUTE CONFIGS
    const LIVE_SERVER_URL = window.location.origin;

    // 🔥 CRITICAL LIVE INTERCEPTOR CACHE ARRAY CORES
    window.globalRawOrdersCache = [];

    // Background engine to update global orders array cache every 4 seconds for instant real-time sync
    async function silentlySyncOrdersArrayCache() {
        try {
            const res = await fetch(`${LIVE_SERVER_URL}/api/admin/orders`);
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data)) {
                window.globalRawOrdersCache = data;
                
                // Keep active tracking layout reactive to loops mapping changes
                const currentActiveTrackingId = document.getElementById('trackOrderIdLabel')?.textContent?.replace('ID Reference: ', '')?.replace('ID: ', '')?.trim();
                if (currentActiveTrackingId && typeof window.executeLiveTimelineStateStepper === 'function') {
                    const match = data.find(o => o.orderId === currentActiveTrackingId);
                    if (match) {
                        window.executeLiveTimelineStateStepper(match.status);
                        
                        // Dynamically mirror incoming parameters inside historical badge views arrays
                        const activeUserToken = localStorage.getItem('printAppUser');
                        const localHistory = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                        let historyUpdated = false;
                        localHistory.forEach(item => {
                            if(item.orderId === currentActiveTrackingId && item.status !== match.status) {
                                item.status = match.status;
                                historyUpdated = true;
                            }
                        });
                        if(historyUpdated) {
                            localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(localHistory));
                            renderOrderHistoryUI(activeUserToken, false); // Quiet render bypass
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Cache system pooling delay: ", err.message);
        }
    }
    setInterval(silentlySyncOrdersArrayCache, 4000);
    setTimeout(silentlySyncOrdersArrayCache, 500);

    function synchronizeWalletInterfaceBalance() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        const balanceDisplayNode = document.getElementById('headerWalletDisplayBalance');
        if(!balanceDisplayNode) return;
        if(!sessionActiveUser) { balanceDisplayNode.textContent = "₹0.00"; return; }
        let currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        balanceDisplayNode.textContent = `₹${currentWalletCash.toFixed(2)}`;
    }

    window.executeWalletRazorpayDeposit = async function() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if(!sessionActiveUser) { alert("❌ Log in kijiye!"); return; }
        const depositAmount = parseFloat(document.getElementById('walletCustomAmountInput').value) || 100;
        if (depositAmount <= 0) return;
        try {
            const response = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ totalAmount: depositAmount.toString(), address: "Wallet Deposit", configDetails: "[]" }) });
            const data = await response.json();
            if(!data.success) return;
            const options = {
                "key": data.key_id, "amount": data.amount, "currency": "INR", "name": "Wallet Topup", "order_id": data.order_id,
                "handler": async function (response){
                    let oldCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
                    localStorage.setItem(`wallet_cash_${sessionActiveUser}`, (oldCash + depositAmount).toFixed(2));
                    synchronizeWalletInterfaceBalance();
                    document.getElementById('walletDepositModal').style.display = 'none';
                }, "theme": { "color": "#0C8346" }
            };
            const rzpWallet = new Razorpay(options); rzpWallet.open();
        } catch (err) {}
    }

    window.refreshInvoiceTabState = function() {
        const sideInvoicePanel = document.getElementById('sidebarPricingPanel');
        const layoutContainer = document.getElementById('mainLayoutAppContainer');
        const uploadInitialScreen = document.getElementById('uploadScreenInitialState');
        const configWorkspaceScreen = document.getElementById('configurationScreenState');
        const activeTabStoreNode = document.getElementById('user_section_store');

        const activeTabIsStore = activeTabStoreNode && activeTabStoreNode.classList.contains('active');
        if (!activeTabIsStore) return;

        if (masterFilesArray && masterFilesArray.length > 0) {
            if(uploadInitialScreen) uploadInitialScreen.classList.add('hidden');
            if(configWorkspaceScreen) configWorkspaceScreen.classList.remove('hidden');
            if(sideInvoicePanel) sideInvoicePanel.classList.remove('hidden');
            if (window.innerWidth > 992) {
                if(layoutContainer) { layoutContainer.classList.add('has-invoice'); layoutContainer.style.gridTemplateColumns = '2.5fr 1.2fr'; }
            } else { if(layoutContainer) layoutContainer.style.gridTemplateColumns = '1fr'; }
        } else {
            if(uploadInitialScreen) uploadInitialScreen.classList.remove('hidden');
            if(configWorkspaceScreen) configWorkspaceScreen.classList.add('hidden');
            if(sideInvoicePanel) sideInvoicePanel.classList.add('hidden');
            if(layoutContainer) { layoutContainer.classList.remove('has-invoice'); layoutContainer.style.gridTemplateColumns = '1fr'; }
        }
    }

    window.addEventListener('resize', window.refreshInvoiceTabState);

    window.forceReturnToUploadView = function() {
        masterFilesArray = []; sessionStorage.removeItem('savedPrintFiles');
        if(multiFilesContainer) multiFilesContainer.innerHTML = '';
        refreshInvoiceTabState(); calculateTotal();
    }

    setTimeout(() => {
        if (splashScreen) splashScreen.classList.add('hidden');
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if (sessionActiveUser) {
            if(userGreeting) userGreeting.innerHTML = `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${sessionActiveUser}</span>`;
            if(mainApp) { mainApp.classList.remove('app-hidden'); mainApp.style.display = 'block'; }
            loadSavedFilesFromSession();
            renderOrderHistoryUI(sessionActiveUser);
            synchronizeWalletInterfaceBalance();
        } else {
            if(authScreen) { authScreen.classList.remove('app-hidden'); authScreen.style.display = 'flex'; }
        }
        calculateTotal();
    }, 2500);

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isSignUpModeActive = !signupOnlyFields[0].classList.contains('hidden');
            const otpGroup = document.getElementById('otpGroup');
            const authOtpInput = document.getElementById('authOtpInput');

            if (isSignUpModeActive && otpGroup && otpGroup.classList.contains('app-hidden')) {
                // Step 1: Send OTP to Gmail
                const email = authIdentity.value.trim();
                if (!email.includes('@')) {
                    alert('⚠️ Please enter a valid Gmail address to receive the OTP.');
                    return;
                }
                try {
                    authBtn.innerText = "Sending OTP...";
                    authBtn.disabled = true;
                    const res = await fetch(`${LIVE_SERVER_URL}/api/auth/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('📩 OTP sent to your Gmail inbox! Please check.');
                        otpGroup.classList.remove('app-hidden');
                        authBtn.innerText = "Verify & Complete Signup";
                    } else {
                        alert(`❌ Error: ${data.message}`);
                    }
                } catch (err) {
                    alert("❌ Failed to send OTP network error.");
                } finally {
                    authBtn.disabled = false;
                    if (!otpGroup.classList.contains('app-hidden')) {
                        authBtn.innerText = "Verify & Complete Signup";
                    }
                }
                return;
            }

            // Step 2: Final Signup or Login Submit
            const targetApiUrl = isSignUpModeActive ? '/api/auth/signup' : '/api/auth/login';
            const payloadData = {
                identity: authIdentity.value.trim(),
                password: authPassword.value
            };

            if (isSignUpModeActive) {
                payloadData.name = authName.value.trim();
                payloadData.otp = authOtpInput ? authOtpInput.value.trim() : '';
            }

            try {
                authBtn.innerText = "Processing... Please Wait";
                authBtn.disabled = true;

                const response = await fetch(`${LIVE_SERVER_URL}${targetApiUrl}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                });

                const data = await response.json();

                if (data.success) {
                    const activeUserName = data.name || authIdentity.value.trim();
                    localStorage.setItem('printAppUser', activeUserName);
                    
                    if(userGreeting) userGreeting.innerHTML = `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${activeUserName}</span>`;
                    
                    if (authScreen) authScreen.classList.add('app-hidden');
                    if (mainApp) { mainApp.classList.remove('app-hidden'); mainApp.style.display = 'block'; }
                    
                    renderOrderHistoryUI(activeUserName);
                    synchronizeWalletInterfaceBalance();
                } else {
                    alert(`⚠️ Oye Bhai: ${data.message}`);
                }
            } catch (err) {
                console.error(err);
                alert("❌ Connection Breakdown! Backend up nahi hai shayad.");
            } finally {
                authBtn.innerText = isSignUpModeActive ? "Log In" : "Register & Sign Up";
                authBtn.disabled = false;
            }
        });
    }

    if (toggleAuthLink) {
        toggleAuthLink.addEventListener('click', (e) => {
            e.preventDefault();
            const isLoginViewNow = signupOnlyFields[0].classList.contains('hidden');
            const otpGroup = document.getElementById('otpGroup');
            if (isLoginViewNow) {
                signupOnlyFields.forEach(el => el.classList.remove('hidden'));
                authTitle.textContent = "Create Account";
                authBtn.textContent = "Get OTP & Sign Up";
                toggleAuthLink.textContent = "Log In Here";
            } else {
                signupOnlyFields.forEach(el => el.classList.add('hidden'));
                if(otpGroup) otpGroup.classList.add('app-hidden');
                authTitle.textContent = "Welcome Back!";
                authBtn.textContent = "Log In";
                toggleAuthLink.textContent = "Create Account";
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('printAppUser');
            window.location.reload();
        });
    }

    if(fileUpload) {
        fileUpload.addEventListener('change', () => {
            if (fileUpload.files.length === 0) return;
            Array.from(fileUpload.files).forEach(file => {
                if (!masterFilesArray.some(f => f.name === file.name && f.size === file.size)) {
                    masterFilesArray.push({ name: file.name, size: file.size, type: file.type, fileData: file, config: { pages: 1, printType: 'bw', orientation: 'portrait', binding: 'none', copies: 1 } });
                }
            });
            fileUpload.value = ''; saveCurrentFilesToSession(); renderFilesUI();
        });
    }

    function saveCurrentFilesToSession() {
        sessionStorage.setItem('savedPrintFiles', JSON.stringify(masterFilesArray.map(i => ({ name: i.name, size: i.size, type: i.type, config: i.config }))));
    }

    function loadSavedFilesFromSession() {
        const raw = sessionStorage.getItem('savedPrintFiles');
        if (raw) {
            masterFilesArray = JSON.parse(raw).map(i => ({ name: i.name, size: i.size, type: i.type, fileData: null, config: i.config }));
            renderFilesUI();
        }
    }

    function renderFilesUI() {
        if(!multiFilesContainer) return; multiFilesContainer.innerHTML = ''; 
        refreshInvoiceTabState();
        if (masterFilesArray.length === 0) return;

        masterFilesArray.forEach((item, index) => {
            const fileRow = document.createElement('div');
            fileRow.className = 'blinkit-file-card';
            fileRow.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);";

            const activeColorBw = item.config.printType === 'bw' ? 'active' : '';
            const activeColorCol = item.config.printType === 'color' ? 'active' : '';
            const activeOriPort = item.config.orientation === 'portrait' ? 'active' : '';
            const activeOriLand = item.config.orientation === 'landscape' ? 'active' : '';

            fileRow.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 8px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                        <span style="font-size: 1.1rem;">📄</span>
                        <h4 style="font-weight: 700; font-size: 0.85rem; color: #1a202c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${item.name}">${item.name}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="add-more-inline-card-btn" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; cursor: pointer;" onclick="triggerInlineFileUploadClick()">+ Add More</button>
                        <button type="button" id="removeFile_${index}" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; width: 24px; height: 24px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">&times;</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; margin-bottom: 12px; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 0.7rem; font-weight: 700; color: #4a5568;">Total Pages:</label>
                        <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; background: #f8fafc; outline: none;" required>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 0.7rem; font-weight: 700; color: #4a5568;">Copies:</label>
                        <div class="blinkit-stepper" style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2px 8px; height: 32px;">
                            <button type="button" id="minusCopy_${index}" class="stepper-btn" style="background: none; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: #334155;">-</button>
                            <span id="copyCountLabel_${index}" style="font-weight: 700; font-size: 0.8rem; color: #0f172a;">${item.config.copies}</span>
                            <button type="button" id="plusCopy_${index}" class="stepper-btn" style="background: none; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: #334155;">+</button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <p style="font-size: 0.7rem; font-weight: 700; color: #4a5568; margin-bottom: 6px;">Print Color</p>
                    <div class="blinkit-grid-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="blinkit-option-box ${activeColorCol}" id="optColor_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeColorCol ? '#16a34a' : '#cbd5e1'}; background: ${activeColorCol ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">🎨</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Coloured</span><span style="font-size: 0.65rem; color: #64748b;">₹10/pg</span></div>
                        </div>
                        <div class="blinkit-option-box ${activeColorBw}" id="optBw_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeColorBw ? '#16a34a' : '#cbd5e1'}; background: ${activeColorBw ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">🌑</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">B & W</span><span style="font-size: 0.65rem; color: #64748b;">₹3/pg</span></div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <p style="font-size: 0.7rem; font-weight: 700; color: #4a5568; margin-bottom: 6px;">Orientation</p>
                    <div class="blinkit-grid-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="blinkit-option-box ${activeOriPort}" id="optPort_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeOriPort ? '#16a34a' : '#cbd5e1'}; background: ${activeOriPort ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">📱</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Portrait</span></div>
                        </div>
                        <div class="blinkit-option-box ${activeOriLand}" id="optLand_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeOriLand ? '#16a34a' : '#cbd5e1'}; background: ${activeOriLand ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">💻</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Landscape</span></div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #334155;">Binding Option:</label>
                    <select id="binding_${index}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 600; background: #ffffff; outline: none;">
                        <option value="none" ${item.config.binding === 'none' ? 'selected' : ''}>No Binding</option>
                        <option value="staple" ${item.config.binding === 'staple' ? 'selected' : ''}>Stapled (Free)</option>
                        <option value="spiral" ${item.config.binding === 'spiral' ? 'selected' : ''}>Spiral (+₹30)</option>
                    </select>
                </div>
            `;
            multiFilesContainer.appendChild(fileRow);

            document.getElementById(`optColor_${index}`).addEventListener('click', () => { item.config.printType = 'color'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optBw_${index}`).addEventListener('click', () => { item.config.printType = 'bw'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optPort_${index}`).addEventListener('click', () => { item.config.orientation = 'portrait'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optLand_${index}`).addEventListener('click', () => { item.config.orientation = 'landscape'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => { item.config.copies++; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => { if (item.config.copies > 1) { item.config.copies--; saveCurrentFilesToSession(); renderFilesUI(); } });
            document.getElementById(`removeFile_${index}`).addEventListener('click', () => { masterFilesArray.splice(index, 1); saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`pages_${index}`).addEventListener('input', (e) => { item.config.pages = parseInt(e.target.value) || 1; saveCurrentFilesToSession(); calculateTotal(); });
            document.getElementById(`binding_${index}`).addEventListener('change', (e) => { item.config.binding = e.target.value; saveCurrentFilesToSession(); calculateTotal(); });
        });
        calculateTotal();
    }

    function calculateTotal() {
        let totalPrintCost = 0; let totalBindingCost = 0;
        const summaryPrint = document.getElementById('summaryPrint');
        const summaryBinding = document.getElementById('summaryBinding');
        const summaryDelivery = document.getElementById('summaryDelivery');
        const summaryTotal = document.getElementById('summaryTotal');
        if (!summaryPrint || !summaryBinding || !summaryDelivery || !summaryTotal) return;
        if (masterFilesArray.length === 0) { summaryPrint.textContent = `₹0.00`; summaryBinding.textContent = `₹0.00`; summaryDelivery.textContent = `₹0.00`; summaryTotal.textContent = `₹0.00`; return; }
        masterFilesArray.forEach((item) => {
            const pages = parseInt(item.config.pages) || 1; const printType = item.config.printType; const binding = item.config.binding; const copies = parseInt(item.config.copies) || 1;
            totalPrintCost += (pages * ((printType === 'bw') ? 3.00 : 10.00)) * copies;
            if (binding === 'spiral') totalBindingCost += 30.00 * copies;
        });
        let finalDocumentCost = totalPrintCost + totalBindingCost;
        let accurateDeliveryCharge = finalDocumentCost >= 99.00 ? 0.00 : 25.00;
        summaryPrint.textContent = `₹${totalPrintCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${totalBindingCost.toFixed(2)}`;
        summaryDelivery.textContent = accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`;
        summaryTotal.textContent = `₹${(finalDocumentCost + accurateDeliveryCharge).toFixed(2)}`;
    }

    window.openOrderDeepTrackingWorkspacePage = function(orderStringPayload) {
        const order = JSON.parse(decodeURIComponent(orderStringPayload));
        
        let liveCloudStatus = order.status;
        if (window.globalRawOrdersCache && window.globalRawOrdersCache.length > 0) {
            const realTimeMatchNode = window.globalRawOrdersCache.find(o => o.orderId === order.orderId);
            if (realTimeMatchNode) {
                liveCloudStatus = realTimeMatchNode.status;
            }
        }

        if(typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('order_tracking'); 
        }

        document.getElementById('trackOrderIdLabel').textContent = `ID Reference: ${order.orderId || 'PFH-' + Date.now()}`;
        document.getElementById('trackGrandTotalBadge').textContent = `₹${order.amount}`;
        document.getElementById('trackShippingAddressLabel').textContent = order.address || 'N/A';

        const listContainer = document.getElementById('trackFilesManifestList');
        listContainer.innerHTML = '';
        if(order.details) {
            order.details.forEach(file => {
                const row = document.createElement('div');
                row.style = 'display:flex; justify-content:space-between; font-size:0.8rem; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; font-weight:600;';
                row.innerHTML = `<span>📄 ${file.fileName} (${file.copies} copies)</span><span style="color:var(--blinkit-green);">${file.printType === 'bw' ? 'B&W' : 'Color'} Print</span>`;
                listContainer.appendChild(row);
            });
        }

        if(typeof window.executeLiveTimelineStateStepper === 'function') {
            window.executeLiveTimelineStateStepper(liveCloudStatus);
        }
    }

    function renderOrderHistoryUI(userId, renderHistoryContainerClean = true) {
        if(!ordersHistoryContainer) return;
        const rawHistory = localStorage.getItem(`history_${userId}`);
        if (!rawHistory || JSON.parse(rawHistory).length === 0) {
            ordersHistoryContainer.innerHTML = `<p style="font-size:0.85rem; color:#718096; text-align:center; padding:15px;">No orders placed yet.</p>`;
            return;
        }
        const parsedHistory = JSON.parse(rawHistory).reverse(); 
        
        if (renderHistoryContainerClean) {
            ordersHistoryContainer.innerHTML = '';
        } else {
            const activeCardsList = ordersHistoryContainer.querySelectorAll('.history-card-item');
            if (activeCardsList.length === parsedHistory.length) {
                parsedHistory.forEach((order, idx) => {
                    const badge = activeCardsList[idx].querySelector('span[style*="background:#fff3e0"]');
                    if(badge) badge.textContent = order.status || 'Paid / Ready for Print';
                });
                return;
            }
            ordersHistoryContainer.innerHTML = '';
        }

        parsedHistory.forEach(order => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-card-item';
            
            let currentStatus = order.status || 'Paid / Ready for Print';
            if (window.globalRawOrdersCache && window.globalRawOrdersCache.length > 0) {
                const match = window.globalRawOrdersCache.find(o => o.orderId === order.orderId);
                if (match) currentStatus = match.status;
            }

            const stringifiedPayload = encodeURIComponent(JSON.stringify(order));
            itemDiv.setAttribute('onclick', `openOrderDeepTrackingWorkspacePage('${stringifiedPayload}')`);

            let filesDetailsHtml = order.details ? order.details.map(f => `• ${f.fileName} (${f.copies} copies)`).join('<br>') : 'Document Package';
            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1a202c; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px; font-size:0.85rem;">
                    <span>📅 ${order.date}</span> <span style="color:#0C8346;">₹${order.amount}</span>
                </div>
                <div style="color:#4a5568; line-height:1.4; font-size:0.78rem; margin-bottom:6px;">${filesDetailsHtml}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <span style="color:var(--blinkit-green); font-weight:700;">👁️ Tap to View Details &rarr;</span>
                    <span style="background:#fff3e0; padding:2px 6px; border-radius:4px; color:#e67e22; font-weight:600;">${currentStatus}</span>
                </div>
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
                return { 
                    fileName: item.name, 
                    pages: item.config.pages, 
                    printType: item.config.printType, 
                    sides: item.config.orientation === 'portrait' ? 'single' : 'landscape', 
                    binding: item.config.binding, 
                    copies: item.config.copies,
                    orientation: item.config.orientation, 
                    colorMode: item.config.printType      
                };
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
                            alert('🎉 Payment Successful!');
                            const activeUserToken = localStorage.getItem('printAppUser');
                            const currentHistoryArray = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                            
                            const newOrderPayload = { 
                                orderId: data.order_id,
                                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
                                amount: totalAmountText, 
                                status: "Paid / Ready for Print", 
                                details: finalMetaConfig,
                                address: document.getElementById('address').value 
                            };
                            
                            currentHistoryArray.push(newOrderPayload);
                            localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                            
                            isFirstTimeUser = false; sessionStorage.removeItem('savedPrintFiles'); printForm.reset(); multiFilesContainer.innerHTML = ''; masterFilesArray = [];
                            renderOrderHistoryUI(activeUserToken); calculateTotal();
                            
                            openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                        }
                    }, "theme": { "color": "#F4C430" }
                };
                const rzp1 = new Razorpay(options); rzp1.open();
            } catch (error) {}
        });
    }
});