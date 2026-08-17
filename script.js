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
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]'); 
    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');    
    window.savedUserAddresses = JSON.parse(localStorage.getItem('saved_addresses') || '[]');  
    let selectedActiveAddress = localStorage.getItem('selected_active_address') || "";  
    window.storeInventoryProducts = []; 

    // 🔥 LIVE RE-ROUTE CONFIGS
    const LIVE_SERVER_URL = window.location.origin;

    // 🔥 CRITICAL LIVE INTERCEPTOR CACHE ARRAY CORES
    window.globalRawOrdersCache = [];

    // ==========================================
    // 🔔 PUSH NOTIFICATION PERMISSION REQUEST
    // ==========================================
    async function requestUserPushNotificationPermission() {
        try {
            if (!("Notification" in window)) {
                console.log("This browser does not support notifications.");
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted.');
            } else {
                console.log('❌ Notification permission denied.');
            }
        } catch (err) {
            console.error('Push permission error:', err);
        }
    }

    // App load hone ke thodi der baad popup permission trigger karein
    setTimeout(requestUserPushNotificationPermission, 4000);

    // ==========================================
    // 🕒 REAL-TIME STORE STATUS AUTO-CHECKER & DISMISS HANDLER
    // ==========================================
    async function checkStoreStatusRealtime() {
        try {
            const res = await fetch('/api/store-status');
            const data = await res.json();
            
            const storeClosedNotice = document.getElementById('storeClosedNoticeBox');
            const storeClosedModal = document.getElementById('storeClosedPopupModal');
            const submitOrderBtn = document.getElementById('submitOrderBtn');
            const userShopStatus = document.getElementById('userShopStatus');
            
            if (data.success) {
                if (!data.isOpen) {
                    if (storeClosedNotice) storeClosedNotice.classList.remove('hidden');
                    if (storeClosedModal && sessionStorage.getItem('storeModalDismissed') !== 'true') {
                        storeClosedModal.style.display = 'flex';
                    }
                    if (userShopStatus) {
                        userShopStatus.textContent = 'CLOSED 🔴';
                        userShopStatus.className = 'shop-status-text-badge closed';
                    }
                    if (submitOrderBtn) {
                        submitOrderBtn.disabled = true;
                        submitOrderBtn.style.background = '#94a3b8';
                        submitOrderBtn.textContent = 'Store is Closed 🚫';
                    }
                } else {
                    if (storeClosedNotice) storeClosedNotice.classList.add('hidden');
                    if (storeClosedModal) storeClosedModal.style.display = 'none';
                    sessionStorage.removeItem('storeModalDismissed');
                    if (userShopStatus) {
                        userShopStatus.textContent = 'OPEN 🟢';
                        userShopStatus.className = 'shop-status-text-badge open';
                    }
                    if (submitOrderBtn) {
                        submitOrderBtn.disabled = false;
                        submitOrderBtn.style.background = 'var(--blinkit-green)';
                        submitOrderBtn.textContent = 'Add Print Job to Cart';
                    }
                }
            }
        } catch (e) {
            console.error("Store status sync error:", e);
        }
    }

    setInterval(checkStoreStatusRealtime, 3000);

    window.dismissStoreClosedNotice = function() {
        const storeClosedNotice = document.getElementById('storeClosedNoticeBox');
        const storeClosedModal = document.getElementById('storeClosedPopupModal');
        
        if (storeClosedNotice) storeClosedNotice.classList.add('hidden');
        if (storeClosedModal) storeClosedModal.style.display = 'none';
        sessionStorage.setItem('storeModalDismissed', 'true');
    };

    // ==========================================
    // 🛵 LIVE STATUS & DELIVERY EXECUTIVE STEPPER
    // ==========================================
    window.executeLiveTimelineStateStepper = function(statusText) {
        const statusBadge = document.getElementById('liveOrderStatusBadge');
        const execName = document.getElementById('deliveryExecutiveName');
        const execPhone = document.getElementById('deliveryExecutivePhone');
        const callBtn = document.getElementById('callExecutiveBtn');

        if (statusBadge) statusBadge.textContent = statusText || "Processing Order...";

        if (statusText && (statusText.includes('Out for Delivery') || statusText.includes('Ready'))) {
            if (execName) execName.textContent = "Rajesh Kumar (Delivery Partner)";
            if (execPhone) execPhone.textContent = "+91 98765 43210";
            if (callBtn) callBtn.href = "tel:9876543210";
        } else {
            if (execName) execName.textContent = "Assigning Delivery Executive...";
            if (execPhone) execPhone.textContent = "Will be assigned shortly";
            if (callBtn) callBtn.href = "tel:7007626731";
        }
    }

    // ==========================================
    // 🛒 FETCH LIVE ADMIN PRODUCTS & INVENTORY
    // ==========================================
    async function loadDynamicStoreProducts() {
        try {
            const res = await fetch('/api/store/products');
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                window.storeInventoryProducts = data.products;
                renderStoreProductsUI();
            }
        } catch (e) {
            console.error("Failed to load store inventory:", e);
        }
    }

    function renderStoreProductsUI() {
        const gridContainers = document.querySelectorAll('.snacks-horizontal-slider');
        if (gridContainers.length === 0) return;

        gridContainers.forEach(container => {
            if (!container.style.display || container.style.display === "") {
                container.style.display = 'flex';
                container.style.gap = '12px';
                container.style.overflowX = 'auto';
                container.style.padding = '10px 4px';
                container.style.width = '100%';
                container.style.scrollbarWidth = 'none';
            }

            container.innerHTML = '';
            if (window.storeInventoryProducts.length === 0) {
                container.innerHTML = `<p style="font-size:0.75rem; color:#64748b; padding:10px;">No store products available currently.</p>`;
                return;
            }

            window.storeInventoryProducts.forEach((prod, index) => {
                const isOutOfStock = (prod.stockQuantity <= 0);
                const finalImgUrl = prod.imageUrl || prod.image || '';

                const card = document.createElement('div');
                card.className = 'blinkit-cat-card';
                card.style.cssText = `
                    min-width: 110px;
                    width: 110px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 10px;
                    position: relative; 
                    opacity: ${isOutOfStock ? '0.7' : '1'}; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
                    flex-shrink: 0;
                `;
                
                card.onclick = (e) => {
                    if (e.target.tagName === 'BUTTON') return;
                    if (typeof openProductDetailModal === 'function') {
                        openProductDetailModal(window.storeInventoryProducts[index]);
                    }
                };

                const imageHtml = finalImgUrl 
                    ? `<img src="${finalImgUrl}" style="width:65px; height:65px; object-fit:cover; border-radius:10px; margin-bottom:6px; display:block;" />` 
                    : `<div style="font-size:2rem; margin-bottom:6px; height:65px; display:flex; align-items:center; justify-content:center;">📦</div>`;

                card.innerHTML = `
                    ${imageHtml}
                    <div title="${prod.name}" style="font-weight:700; font-size:0.78rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#0f172a;">${prod.name}</div>
                    <div style="font-weight:800; font-size:0.78rem; color:#0f172a; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                    ${isOutOfStock 
                        ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); notifyWhenAvailable('${prod.name}')">Out of Stock</button>`
                        : `<button type="button" style="background:var(--blinkit-green, #10b981); color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); addDynamicProductToCart('${prod.sku}', '${prod.name}', ${prod.sellingPrice || 0}, ${prod.stockQuantity})">+ Add</button>`
                    }
                    ${isOutOfStock ? `<span style="position:absolute; top:4px; right:4px; background:#ef4444; color:white; font-size:0.55rem; padding:2px 4px; border-radius:4px; font-weight:800;">OUT</span>` : ''}
                `;
                container.appendChild(card);
            });
        });
    }

    window.notifyWhenAvailable = function(prodName) {
        alert(`🔔 We have noted your request! You will be notified when "${prodName}" is back in stock.`);
    }

    // 🔒 STRICT INVENTORY ADD TO CART LOGIC (Updated to check stock limit)
    window.addDynamicProductToCart = function(sku, name, price, currentStock) {
        if (currentStock <= 0) {
            alert(`⚠️ Sorry! "${name}" is currently out of stock.`);
            return;
        }

        const existing = window.cartSnacksArray.find(item => item.name === name);
        const currentCartQty = existing ? existing.qty : 0;

        if (currentCartQty + 1 > currentStock) {
            alert(`⚠️ Sorry! Only ${currentStock} units of "${name}" are available in stock.`);
            return;
        }

        if (existing) {
            existing.qty += 1;
        } else {
            window.cartSnacksArray.push({ name, price, qty: 1 });
        }
        persistCartStateData();
        updateFloatingCartBar();
        calculateTotal();
        alert(`✅ Added "${name}" to cart!`);
    }

    // ==========================================
    // 🔙 PHONE BACK BUTTON / HISTORY HANDLER
    // ==========================================
    window.addEventListener('popstate', (event) => {
        const cartOverlay = document.getElementById('cartDrawerOverlay');
        const walletModal = document.getElementById('walletDepositModal');
        const sideDrawer = document.getElementById('userSideDrawer');
        const addressModal = document.getElementById('addressManagerModal');
        const configScreen = document.getElementById('configurationScreenState');
        const productModal = document.getElementById('productDetailModal');
        
        if (productModal && productModal.style.display === 'flex') {
            productModal.style.display = 'none';
            return;
        }
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
        if (configScreen && !configScreen.classList.contains('hidden')) {
            forceReturnToUploadView();
            return;
        }
        
        if (typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('store');
        }
    });

    window.persistCartStateData = function() {
        localStorage.setItem('cart_print_jobs', JSON.stringify(window.cartPrintJobsArray));
        localStorage.setItem('cart_snacks', JSON.stringify(window.cartSnacksArray));
        updateFloatingCartBar();
    }

    // ==========================================
    // 📍 DETAILED ADDRESS MANAGEMENT CORE
    // ==========================================
    window.loadUserAddressesFromStorage = function() {
        const raw = localStorage.getItem('saved_addresses');
        if (raw) {
            try { window.savedUserAddresses = JSON.parse(raw); } catch(e) { window.savedUserAddresses = []; }
        }
        if (window.savedUserAddresses.length > 0 && !selectedActiveAddress) {
            selectedActiveAddress = localStorage.getItem('selected_active_address') || window.savedUserAddresses[0];
        }
        renderSavedAddressesUI();
    }

    window.saveFullAddressFormToStorage = function() {
        const flat = document.getElementById('addrFlatBuilding').value.trim();
        const floor = document.getElementById('addrFloor').value.trim();
        const landmark = document.getElementById('addrLandmark').value.trim();
        const name = document.getElementById('addrContactName').value.trim();
        const mobile = document.getElementById('addrContactMobile').value.trim();
        const fullGeo = document.getElementById('mapSelectedAddressInput').value.trim();

        if (!flat || !name || !mobile) {
            alert("⚠️ Please enter Building/Flat number, Contact Name, and Mobile Number!");
            return;
        }

        const formattedAddress = `${flat}${floor ? ', Floor: ' + floor : ''}${landmark ? ', Landmark: ' + landmark : ''} | Area: ${fullGeo || 'Varanasi'} | Contact: ${name} (${mobile})`;
        
        if (!window.savedUserAddresses.includes(formattedAddress)) {
            window.savedUserAddresses.push(formattedAddress);
        }
        selectedActiveAddress = formattedAddress;
        localStorage.setItem('saved_addresses', JSON.stringify(window.savedUserAddresses));
        localStorage.setItem('selected_active_address', selectedActiveAddress);
        
        closeAddressManagerModal();
        renderSavedAddressesUI();
        if (document.getElementById('cartDrawerOverlay').style.display === 'flex') {
            renderCartDrawerContents();
        }
        alert("✅ Address saved successfully!");
    }

    function renderSavedAddressesUI() {
        const listContainer = document.getElementById('cartSavedAddressesList');
        const summaryNode = document.getElementById('cartDrawerAddressSummary');
        if (summaryNode) summaryNode.textContent = selectedActiveAddress || "No delivery address added yet.";
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (window.savedUserAddresses.length === 0) {
            listContainer.innerHTML = `<p style="font-size:0.75rem; color:#ef4444; font-weight:600;">⚠️ No address saved. Tap '+ Add New Address' to add one.</p>`;
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
            localStorage.setItem('selected_active_address', selectedActiveAddress);
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

    // --- NEW: Profile Gmail Update Function for Existing Users ---
    window.updateUserGmailProfile = async function() {
        const emailInput = document.getElementById('userProfileEmailField');
        if (!emailInput || !emailInput.value.trim()) { alert("⚠️ Please enter a valid Gmail address!"); return; }
        
        const activeUserToken = localStorage.getItem('printAppUser');
        try {
            const res = await fetch('/api/auth/update-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: activeUserToken, email: emailInput.value.trim() })
            });
            const data = await res.json();
            if (data.success) alert("✅ Gmail updated successfully!");
            else alert("❌ " + data.message);
        } catch (e) {
            alert("❌ Failed to update Gmail.");
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

    async function silentlySyncOrdersArrayCache() {
        try {
            const res = await fetch(`${LIVE_SERVER_URL}/api/admin/orders`);
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data)) {
                window.globalRawOrdersCache = data;
                loadDynamicStoreProducts();
                
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
        } catch (err) {}
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
                "key": data.key_id, "amount": data.amount, "currency": "INR", "name": "Wallet Topup", "order_id": data.rzp_order_id || data.order_id,
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
            if(configWorkspaceScreen) {
                configWorkspaceScreen.classList.remove('hidden');
                history.pushState({ configOpen: true }, '', '');
            }
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
            loadDynamicStoreProducts();
            renderOrderHistoryUI(sessionActiveUser);
            synchronizeWalletInterfaceBalance();
            checkStoreStatusRealtime();
        } else {
            if(authScreen) { authScreen.classList.remove('app-hidden'); authScreen.style.display = 'flex'; }
        }
        calculateTotal();
        updateFloatingCartBar();
    }, 2500);

    // --- UPDATED AUTH FORM (Handles Signup with Mandatory Gmail) ---
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isSignUpModeActive = !signupOnlyFields[0].classList.contains('hidden');
            const targetApiUrl = isSignUpModeActive ? '/api/auth/signup' : '/api/auth/login';
            const payloadData = {
                identity: authIdentity.value.trim(),
                password: authPassword.value
            };

            if (isSignUpModeActive) {
                payloadData.name = authName.value.trim();
                const emailField = document.getElementById('authEmailInput');
                payloadData.email = emailField ? emailField.value.trim() : '';
                if (!payloadData.email) {
                    alert("⚠️ Gmail address is required for registration!");
                    return;
                }
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
                    loadDynamicStoreProducts();
                    renderOrderHistoryUI(activeUserName);
                    synchronizeWalletInterfaceBalance();
                    checkStoreStatusRealtime();
                } else {
                    alert(`⚠️ Error: ${data.message}`);
                }
            } catch (err) {
                alert("❌ Connection Breakdown!");
            } finally {
                authBtn.innerText = isSignUpModeActive ? "Register & Sign Up" : "Log In";
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
        
        let snacksTotal = window.cartSnacksArray.reduce((acc, item) => acc + (item.price * item.qty), 0);
        let printJobsTotal = window.cartPrintJobsArray.reduce((acc, job) => acc + (job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0);

        if (masterFilesArray.length === 0 && snacksTotal === 0 && printJobsTotal === 0) { 
            summaryPrint.textContent = `₹0.00`; summaryBinding.textContent = `₹0.00`; summaryDelivery.textContent = `₹0.00`; summaryTotal.textContent = `₹0.00`; return; 
        }

        masterFilesArray.forEach((item) => {
            const pages = parseInt(item.config.pages) || 1; 
            totalPrintCost += (pages * ((item.config.printType === 'bw') ? 3.00 : 10.00)) * item.config.copies;
            if (item.config.binding === 'spiral') totalBindingCost += 30.00 * item.config.copies;
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
        if(typeof navigateDrawerSection === 'function') navigateDrawerSection('order_tracking'); 

        document.getElementById('trackOrderIdLabel').textContent = `ID Reference: ${order.orderId || 'PFH-' + Date.now()}`;
        document.getElementById('trackGrandTotalBadge').textContent = `₹${order.amount}`;
        document.getElementById('trackShippingAddressLabel').textContent = order.address || 'N/A';

        const listContainer = document.getElementById('trackFilesManifestList');
        listContainer.innerHTML = '';
        if(order.details) {
            order.details.forEach(file => {
                const row = document.createElement('div');
                row.style = 'display:flex; justify-content:space-between; font-size:0.8rem; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; font-weight:600;';
                if (file.printType === 'snack') {
                    row.innerHTML = `<span>📦 ${file.fileName}</span><span style="color:#d97706;">Product / Snack</span>`;
                } else {
                    row.innerHTML = `<span>📄 ${file.fileName} (${file.copies} copies)</span><span style="color:var(--blinkit-green);">${file.printType === 'bw' ? 'B&W' : 'Color'} Print</span>`;
                }
                listContainer.appendChild(row);
            });
        }
        window.executeLiveTimelineStateStepper(order.status);

        let cancelSectionNode = document.getElementById('dynamicCancelOrderSection');
        if (!cancelSectionNode) {
            cancelSectionNode = document.createElement('div');
            cancelSectionNode.id = 'dynamicCancelOrderSection';
            cancelSectionNode.style.marginTop = '20px';
            const parentTrackingBox = document.querySelector('#user_section_order_tracking > div');
            if (parentTrackingBox) parentTrackingBox.appendChild(cancelSectionNode);
        }

        const isLocked = order.status && (order.status.includes('Out for Delivery') || order.status.includes('Delivered') || order.status.includes('Cancelled'));
        
        if (isLocked) {
            cancelSectionNode.innerHTML = `
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:12px; text-align:center;">
                    <p style="font-size:0.78rem; font-weight:700; color:#991b1b;">🔒 Cancellation Not Available</p>
                    <p style="font-size:0.72rem; color:#b91c1c; margin-top:2px;">Order is ${order.status}. Please contact customer care for assistance.</p>
                </div>
            `;
        } else {
            cancelSectionNode.innerHTML = `
                <button type="button" onclick="executeUserCancelOrder('${order.orderId}')" style="width:100%; padding:12px; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">
                    ❌ Cancel Order
                </button>
            `;
        }
    }

    window.executeUserCancelOrder = async function(orderId) {
        if (!confirm("⚠️ Are you sure you want to cancel this order?")) return;
        try {
            const res = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Order cancelled successfully!");
                const activeUserToken = localStorage.getItem('printAppUser');
                const localHistory = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                localHistory.forEach(item => {
                    if (item.orderId === orderId) item.status = "Cancelled by Customer";
                });
                localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(localHistory));
                renderOrderHistoryUI(activeUserToken);
                navigateDrawerSection('history');
            } else {
                alert(`⚠️ ${data.message}`);
            }
        } catch (e) {
            alert("❌ Failed to cancel order. Please contact customer care.");
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
        ordersHistoryContainer.innerHTML = '';

        parsedHistory.forEach(order => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-card-item';
            const stringifiedPayload = encodeURIComponent(JSON.stringify(order));
            itemDiv.setAttribute('onclick', `openOrderDeepTrackingWorkspacePage('${stringifiedPayload}')`);

            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1a202c; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px; font-size:0.85rem;">
                    <span>📅 ${order.date}</span> <span style="color:#0C8346;">₹${order.amount}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <span style="color:var(--blinkit-green); font-weight:700;">👁️ Tap to View Details &rarr;</span>
                    <span style="background:${order.status && order.status.includes('Cancelled') ? '#fee2e2' : '#fff3e0'}; padding:2px 6px; border-radius:4px; color:${order.status && order.status.includes('Cancelled') ? '#dc2626' : '#e67e22'}; font-weight:600;">${order.status || 'Active'}</span>
                </div>
            `;
            ordersHistoryContainer.appendChild(itemDiv);
        });
    }

    const printForm = document.getElementById('printForm');
    if(printForm) {
        printForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (masterFilesArray.length === 0) {
                alert("⚠️ Please upload at least one valid document to add to cart.");
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

            persistCartStateData();
            alert("🎉 Print job(s) successfully added to Cart!");
            masterFilesArray = [];
            sessionStorage.removeItem('savedPrintFiles');
            printForm.reset();
            if(multiFilesContainer) multiFilesContainer.innerHTML = '';
            refreshInvoiceTabState();
            calculateTotal();
            toggleCartDrawer(true);
        });
    }

    window.executeFinalCartOrderPlacement = async function() {
        if (!selectedActiveAddress || selectedActiveAddress.trim() === "") {
            alert("⚠️ Please add and select a delivery address first!");
            openAddressManagerModal();
            return;
        }

        let totalPrintVal = 0;
        let totalSnacksVal = 0;
        const finalMetaConfig = [];

        window.cartPrintJobsArray.forEach(job => {
            const cost = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
            totalPrintVal += cost;
            finalMetaConfig.push({ fileName: job.fileName, pages: job.pages, printType: job.printType, binding: job.binding, copies: job.copies });
        });

        window.cartSnacksArray.forEach(snack => {
            totalSnacksVal += snack.price * snack.qty;
            finalMetaConfig.push({ fileName: `Product: ${snack.name} (Qty: ${snack.qty}, Price: ₹${snack.price} each)`, copies: snack.qty, printType: 'snack', pages: 1 });
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
        formData.append('paymentMode', paymentMode);

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
                    orderId: data.order_id,
                    date: new Date().toLocaleString(), 
                    amount: grandTotal.toFixed(2), 
                    status: "Ready for Print", 
                    details: finalMetaConfig,
                    address: selectedActiveAddress 
                };
                currentHistoryArray.push(newOrderPayload);
                localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                
                window.cartPrintJobsArray = [];
                window.cartSnacksArray = [];
                persistCartStateData();
                toggleCartDrawer(false);
                renderOrderHistoryUI(activeUserToken);
                openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                return;
            }

            const options = {
                "key": data.key_id, "amount": data.amount, "currency": "INR", "name": "Print From Home", "order_id": data.rzp_order_id,
                "handler": async function (response){
                    const verifyRes = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.order_id, paymentId: response.razorpay_payment_id }) });
                    const verifyData = await verifyRes.json();
                    if(verifyData.success) {
                        alert('🎉 Payment Successful!');
                        const activeUserToken = localStorage.getItem('printAppUser');
                        const currentHistoryArray = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                        const newOrderPayload = { 
                            orderId: data.order_id,
                            date: new Date().toLocaleString(), 
                            amount: grandTotal.toFixed(2), 
                            status: "Ready for Print", 
                            details: finalMetaConfig,
                            address: selectedActiveAddress 
                        };
                        currentHistoryArray.push(newOrderPayload);
                        localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                        
                        window.cartPrintJobsArray = [];
                        window.cartSnacksArray = [];
                        persistCartStateData();
                        toggleCartDrawer(false);
                        renderOrderHistoryUI(activeUserToken);
                        openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                    }
                }, "theme": { "color": "#F4C430" }
            };
            const rzp1 = new Razorpay(options); rzp1.open();
        } catch (error) {
            alert("❌ Connection Breakdown during order placement.");
        }
    };
});