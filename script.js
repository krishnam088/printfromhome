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
    window.cartPrintJobsArray = []; // Cart print jobs storage
    window.cartSnacksArray = [];     // Cart snacks storage
    window.savedUserAddresses = [];  // User saved addresses list
    let selectedActiveAddress = "";  // Currently selected delivery address

    // 🔥 LIVE RE-ROUTE CONFIGS
    const LIVE_SERVER_URL = window.location.origin;

    // 🔥 CRITICAL LIVE INTERCEPTOR CACHE ARRAY CORES
    window.globalRawOrdersCache = [];

    // ==========================================
    // 🔙 PHONE BACK BUTTON / HISTORY HANDLER
    // ==========================================
    window.addEventListener('popstate', (event) => {
        const cartOverlay = document.getElementById('cartDrawerOverlay');
        const walletModal = document.getElementById('walletDepositModal');
        const sideDrawer = document.getElementById('userSideDrawer');
        const addressModal = document.getElementById('addressManagerModal');
        
        if (cartOverlay && cartOverlay.style.display === 'flex') {
            cartOverlay.style.display = 'none';
            return;
        }
        if (addressModal && addressModal.style.display === 'flex') {
            addressModal.style.display = 'none';
            return;
        }
        if (walletModal && walletModal.style.display === 'flex') {
            walletModal.style.display = 'none';
            return;
        }
        if (sideDrawer && sideDrawer.classList.contains('active')) {
            sideDrawer.classList.remove('active');
            document.getElementById('drawerOverlay').classList.remove('active');
            return;
        }
        
        if (typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('store');
        }
    });

    // ==========================================
    // 📍 ADDRESS MANAGEMENT CORE
    // ==========================================
    window.loadUserAddressesFromStorage = function() {
        const activeUser = localStorage.getItem('printAppUser') || 'default_user';
        const raw = localStorage.getItem(`addresses_${activeUser}`);
        if (raw) {
            try { window.savedUserAddresses = JSON.parse(raw); } catch(e) { window.savedUserAddresses = []; }
        } else {
            window.savedUserAddresses = [];
        }
        if (window.savedUserAddresses.length > 0 && !selectedActiveAddress) {
            selectedActiveAddress = window.savedUserAddresses[0];
        }
        renderSavedAddressesUI();
    }

    window.saveAddressToStorage = function(newAddressText) {
        if (!newAddressText || newAddressText.trim() === "") return;
        const activeUser = localStorage.getItem('printAppUser') || 'default_user';
        if (!window.savedUserAddresses.includes(newAddressText)) {
            window.savedUserAddresses.push(newAddressText);
        }
        selectedActiveAddress = newAddressText;
        localStorage.setItem(`addresses_${activeUser}`, JSON.stringify(window.savedUserAddresses));
        renderSavedAddressesUI();
    }

    function renderSavedAddressesUI() {
        const listContainer = document.getElementById('cartSavedAddressesList');
        const summaryNode = document.getElementById('cartDrawerAddressSummary');
        if (summaryNode) summaryNode.textContent = selectedActiveAddress || "No address selected. Please add one.";
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (window.savedUserAddresses.length === 0) {
            listContainer.innerHTML = `<p style="font-size:0.75rem; color:#ef4444; font-weight:600;">⚠️ No saved address found. Please add a delivery address.</p>`;
            return;
        }

        window.savedUserAddresses.forEach((addr, idx) => {
            const isChecked = addr === selectedActiveAddress ? 'checked' : '';
            const card = document.createElement('label');
            card.style = `display:flex; align-items:flex-start; gap:10px; background:${isChecked ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${isChecked ? '#16a34a' : '#cbd5e1'}; padding:10px 12px; border-radius:10px; cursor:pointer; font-size:0.78rem; font-weight:600; color:#0f172a; margin-bottom:6px;`;
            card.innerHTML = `
                <input type="radio" name="selectedDeliveryAddressRadio" value="${idx}" ${isChecked} onchange="selectActiveAddressByIndex(${idx})" style="margin-top:2px;">
                <span style="flex:1; word-break:break-word;">📍 ${addr}</span>
            `;
            listContainer.appendChild(card);
        });
    }

    window.selectActiveAddressByIndex = function(idx) {
        if (window.savedUserAddresses[idx]) {
            selectedActiveAddress = window.savedUserAddresses[idx];
            renderSavedAddressesUI();
        }
    }

    window.openAddressManagerModal = function() {
        const modal = document.getElementById('addressManagerModal');
        if (modal) {
            modal.style.display = 'flex';
            history.pushState({ addressModalOpen: true }, '', '');
            setTimeout(() => { if (typeof initBlinkitStyleMap === 'function') initBlinkitStyleMap(); }, 200);
        }
    }

    window.closeAddressManagerModal = function() {
        const modal = document.getElementById('addressManagerModal');
        if (modal) modal.style.display = 'none';
    }

    window.confirmNewAddressFromMap = function() {
        const addressInput = document.getElementById('mapSelectedAddressInput');
        if (addressInput && addressInput.value.trim() !== "") {
            saveAddressToStorage(addressInput.value.trim());
            closeAddressManagerModal();
            renderCartDrawerContents();
        } else {
            alert("⚠️ Please select a valid location on the map.");
        }
    }

    // ==========================================
    // 📱 PERMANENT USER APP INSTALL HANDLER
    // ==========================================
    let deferredUserPrompt = null;
    const userInstallBanner = document.getElementById('userInstallBanner');
    const userInstallTriggerBtn = document.getElementById('userInstallTriggerBtn');

    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!isRunningStandalone) {
        const checkBrowserInstallState = localStorage.getItem('user_pwa_installed');
        if (checkBrowserInstallState === 'true' && !window.matchMedia('(display-mode: standalone)').matches) {
            localStorage.removeItem('user_pwa_installed');
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredUserPrompt = e;
        
        if (userInstallBanner && localStorage.getItem('user_pwa_installed') !== 'true') {
            userInstallBanner.classList.remove('hidden');
            userInstallBanner.style.display = 'flex';
        }
    });

    if (userInstallTriggerBtn) {
        userInstallTriggerBtn.addEventListener('click', async () => {
            if (!deferredUserPrompt) {
                alert("💡 To install, tap your browser's menu (3 dots at top right) and select 'Install app' or 'Add to Home screen'.");
                return;
            }
            deferredUserPrompt.prompt();
            const { outcome } = await deferredUserPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('user_pwa_installed', 'true');
                if (userInstallBanner) userInstallBanner.style.display = 'none';
            }
            deferredUserPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('user_pwa_installed', 'true');
        if (userInstallBanner) userInstallBanner.style.display = 'none';
    });

    // Background engine to update global orders array cache every 4 seconds for instant real-time sync
    async function silentlySyncOrdersArrayCache() {
        try {
            const res = await fetch(`${LIVE_SERVER_URL}/api/admin/orders`);
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data)) {
                window.globalRawOrdersCache = data;
                
                const currentActiveTrackingId = document.getElementById('trackOrderIdLabel')?.textContent?.replace('ID Reference: ', '')?.replace('ID: ', '')?.trim();
                if (currentActiveTrackingId && typeof window.executeLiveTimelineStateStepper === 'function') {
                    const match = data.find(o => o.orderId === currentActiveTrackingId);
                    if (match) {
                        window.executeLiveTimelineStateStepper(match.status);
                        
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
                            renderOrderHistoryUI(activeUserToken, false);
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
        updateFloatingCartBar();
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
            loadUserAddressesFromStorage();
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
                const email = authIdentity.value.trim();
                if (!email.includes('@')) {
                    alert('⚠️ Please enter a valid Gmail address to receive the OTP.');
                    return;
                }
                
                try {
                    authBtn.innerText = "Sending OTP...";
                    authBtn.disabled = true;

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    const res = await fetch(`${LIVE_SERVER_URL}/api/auth/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    const data = await res.json();
                    if (res.ok && data.success) {
                        alert('📩 OTP sent to your Gmail inbox! Please check.');
                        otpGroup.classList.remove('app-hidden');
                        authBtn.innerText = "Verify & Complete Signup";
                    } else {
                        alert(`❌ Error: ${data.message || 'Failed to send OTP'}`);
                        authBtn.innerText = "Get OTP & Sign Up";
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        alert('⏳ Request timed out!');
                    } else {
                        alert('❌ Network error while sending OTP.');
                    }
                    authBtn.innerText = "Get OTP & Sign Up";
                } finally {
                    authBtn.disabled = false;
                }
                return;
            }

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
                    
                    loadUserAddressesFromStorage();
                    renderOrderHistoryUI(activeUserName);
                    synchronizeWalletInterfaceBalance();
                } else {
                    alert(`⚠️ Oye Bhai: ${data.message}`);
                }
            } catch (err) {
                alert("❌ Connection Breakdown!");
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
            if (isLoginViewNow) {
                signupOnlyFields.forEach(el => el.classList.remove('hidden'));
                authTitle.textContent = "Create Account";
                authBtn.textContent = "Register & Sign Up";
                toggleAuthLink.textContent = "Already have an account? Log In";
            } else {
                signupOnlyFields.forEach(el => el.classList.add('hidden'));
                authTitle.textContent = "Welcome Back!";
                authBtn.textContent = "Log In";
                toggleAuthLink.textContent = "New user? Create Account";
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
            fileUpload.value = ''; 
            saveCurrentFilesToSession(); 
            renderFilesUI();
        });
    }

    window.triggerInlineFileUploadClick = function() {
        if(fileUpload) fileUpload.click();
    };

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
        if(!multiFilesContainer) return; 
        multiFilesContainer.innerHTML = ''; 
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
        updateFloatingCartBar();
    }

    function calculateTotal() {
        let totalPrintCost = 0; let totalBindingCost = 0;
        const summaryPrint = document.getElementById('summaryPrint');
        const summaryBinding = document.getElementById('summaryBinding');
        const summaryDelivery = document.getElementById('summaryDelivery');
        const summaryTotal = document.getElementById('summaryTotal');
        if (!summaryPrint || !summaryBinding || !summaryDelivery || !summaryTotal) return;
        
        let snacksTotal = 0;
        if (window.cartSnacksArray) {
            snacksTotal = window.cartSnacksArray.reduce((acc, item) => acc + (item.price * item.qty), 0);
        }
        let printJobsTotal = 0;
        if (window.cartPrintJobsArray) {
            window.cartPrintJobsArray.forEach(job => {
                const cost = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
                printJobsTotal += cost;
            });
        }

        if (masterFilesArray.length === 0 && snacksTotal === 0 && printJobsTotal === 0) { 
            summaryPrint.textContent = `₹0.00`; summaryBinding.textContent = `₹0.00`; summaryDelivery.textContent = `₹0.00`; summaryTotal.textContent = `₹0.00`; return; 
        }

        masterFilesArray.forEach((item) => {
            const pages = parseInt(item.config.pages) || 1; const printType = item.config.printType; const binding = item.config.binding; const copies = parseInt(item.config.copies) || 1;
            totalPrintCost += (pages * ((printType === 'bw') ? 3.00 : 10.00)) * copies;
            if (binding === 'spiral') totalBindingCost += 30.00 * copies;
        });

        let finalDocumentCost = totalPrintCost + totalBindingCost + snacksTotal + printJobsTotal;
        let accurateDeliveryCharge = (finalDocumentCost >= 99.00 || finalDocumentCost === 0) ? 0.00 : 25.00;

        summaryPrint.textContent = `₹${(totalPrintCost + printJobsTotal).toFixed(2)}`;
        summaryBinding.textContent = `₹${(totalBindingCost + snacksTotal).toFixed(2)}`;
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

    // Print Form submission now adds to cart instead of ordering directly
    const printForm = document.getElementById('printForm');
    if(printForm) {
        printForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (masterFilesArray.length === 0) {
                alert("⚠️ Please upload at least one document to add to cart.");
                return;
            }

            masterFilesArray.forEach(item => {
                window.cartPrintJobsArray.push({
                    fileName: item.name,
                    pages: parseInt(item.config.pages) || 1,
                    printType: item.config.printType,
                    sides: item.config.orientation === 'portrait' ? 'single' : 'landscape',
                    binding: item.config.binding,
                    copies: parseInt(item.config.copies) || 1,
                    orientation: item.config.orientation,
                    fileData: item.fileData
                });
            });

            alert("🎉 Print job(s) successfully added to Cart!");
            masterFilesArray = [];
            sessionStorage.removeItem('savedPrintFiles');
            printForm.reset();
            if(multiFilesContainer) multiFilesContainer.innerHTML = '';
            refreshInvoiceTabState();
            calculateTotal();
            updateFloatingCartBar();
            toggleCartDrawer(true);
        });
    }

    // Final Order Placement from Cart Drawer
    window.executeFinalCartOrderPlacement = async function() {
        if (!selectedActiveAddress || selectedActiveAddress.trim() === "") {
            alert("⚠️ Please select or add a delivery address first!");
            openAddressManagerModal();
            return;
        }

        let totalPrintVal = 0;
        let totalSnacksVal = 0;
        const finalMetaConfig = [];

        window.cartPrintJobsArray.forEach(job => {
            const cost = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
            totalPrintVal += cost;
            finalMetaConfig.push({
                fileName: job.fileName,
                pages: job.pages,
                printType: job.printType,
                sides: job.sides,
                binding: job.binding,
                copies: job.copies,
                orientation: job.orientation,
                colorMode: job.printType
            });
        });

        window.cartSnacksArray.forEach(snack => {
            totalSnacksVal += snack.price * snack.qty;
            finalMetaConfig.push({
                fileName: `Snack: ${snack.name}`,
                copies: snack.qty,
                printType: 'snack',
                pages: 1
            });
        });

        if (finalMetaConfig.length === 0) {
            alert("⚠️ Your cart is empty!");
            return;
        }

        let subtotal = totalPrintVal + totalSnacksVal;
        let delivery = (subtotal >= 99 || subtotal === 0) ? 0 : 25;
        let grandTotal = subtotal + delivery;

        const selectedPaymentRadio = document.querySelector('input[name="cartPaymentMode"]:checked');
        const paymentMode = selectedPaymentRadio ? selectedPaymentRadio.value : 'online';

        const formData = new FormData();
        window.cartPrintJobsArray.forEach(job => {
            if (job.fileData) formData.append('document', job.fileData);
        });

        formData.append('totalAmount', grandTotal.toFixed(2));
        formData.append('configDetails', JSON.stringify(finalMetaConfig));
        formData.append('address', selectedActiveAddress);

        try {
            const response = await fetch('/api/create-order', { method: 'POST', body: formData });
            const data = await response.json();
            if (!data.success) {
                alert(`⚠️ Error: ${data.message || 'Failed to create order'}`);
                return;
            }

            if (paymentMode === 'cod') {
                alert('🎉 Order Placed Successfully via Cash on Delivery!');
                const activeUserToken = localStorage.getItem('printAppUser');
                const currentHistoryArray = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                
                const newOrderPayload = { 
                    orderId: data.order_id || 'COD-' + Date.now(),
                    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
                    amount: grandTotal.toFixed(2), 
                    status: "COD / Ready for Print", 
                    details: finalMetaConfig,
                    address: selectedActiveAddress 
                };
                
                currentHistoryArray.push(newOrderPayload);
                localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                
                window.cartPrintJobsArray = [];
                window.cartSnacksArray = [];
                toggleCartDrawer(false);
                renderOrderHistoryUI(activeUserToken);
                calculateTotal();
                updateFloatingCartBar();
                
                openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                return;
            }

            // Online Razorpay Flow
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
                            amount: grandTotal.toFixed(2), 
                            status: "Paid / Ready for Print", 
                            details: finalMetaConfig,
                            address: selectedActiveAddress 
                        };
                        
                        currentHistoryArray.push(newOrderPayload);
                        localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                        
                        window.cartPrintJobsArray = [];
                        window.cartSnacksArray = [];
                        toggleCartDrawer(false);
                        renderOrderHistoryUI(activeUserToken);
                        calculateTotal();
                        updateFloatingCartBar();
                        
                        openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                    }
                }, "theme": { "color": "#F4C430" }
            };
            const rzp1 = new Razorpay(options); rzp1.open();
        } catch (error) {
            console.error(error);
            alert("❌ Connection Breakdown during order placement.");
        }
    };
});