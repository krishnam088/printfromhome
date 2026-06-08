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

    // --- 💰 AUTOMATED DIGITAL WALLET REAL BALANCE INJECTOR ---
    function synchronizeWalletInterfaceBalance() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        const balanceDisplayNode = document.getElementById('headerWalletDisplayBalance');
        if(!balanceDisplayNode) return;
        
        if(!sessionActiveUser) {
            balanceDisplayNode.textContent = "₹0.00";
            return;
        }
        // Pull wallet keys strings from user specific local records database caches
        let currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        balanceDisplayNode.textContent = `₹${currentWalletCash.toFixed(2)}`;
    }

    // Razorpay Wallet Deposit Trigger Engine Function Mappings
    window.executeWalletRazorpayDeposit = async function() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if(!sessionActiveUser) {
            alert("❌ Add Money ke liye pehle account log in kijiye bhai!");
            document.getElementById('walletDepositModal').style.display = 'none';
            if(authScreen) authScreen.style.display = 'flex';
            return;
        }

        const depositValueInput = document.getElementById('walletCustomAmountInput').value;
        const depositAmount = parseFloat(depositValueInput) || 100;

        if (depositAmount <= 0) { alert("❌ Galat amount hai bhai!"); return; }

        try {
            // Reuses order route parameters mapping safely to lock deposit transaction parameters stream
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalAmount: depositAmount.toString(), address: "Wallet Deposit Token Log", configDetails: "[]" })
            });
            const data = await response.json();
            if(!data.success) return;

            const options = {
                "key": data.key_id, "amount": data.amount, "currency": "INR", "name": "Wallet Topup - PFH", "description": "Add Cash Balance", "order_id": data.order_id,
                "handler": async function (response){
                    // Increment wallet values cache locally upon successful transaction verify hit
                    let oldCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
                    localStorage.setItem(`wallet_cash_${sessionActiveUser}`, (oldCash + depositAmount).toFixed(2));
                    
                    synchronizeWalletInterfaceBalance();
                    alert(`🎉 Success! ₹${depositAmount} aapke Print Wallet me jodh diye gaye hain.`);
                    document.getElementById('walletDepositModal').style.display = 'none';
                }, "theme": { "color": "#0C8346" }
            };
            const rzpWalletInstance = new Razorpay(options);
            rzpWalletInstance.open();
        } catch (err) { alert("❌ Wallet gateway connection drop!"); }
    }

    // --- ⏳ SCREEN STATE INTERFACES STATE TOGGLES ---
    window.refreshInvoiceTabState = function() {
        const sideInvoicePanel = document.getElementById('sidebarPricingPanel');
        const layoutContainer = document.getElementById('mainLayoutAppContainer');
        const activeTabStoreNode = document.getElementById('user_section_store');
        
        const uploadInitialScreen = document.getElementById('uploadScreenInitialState');
        const configWorkspaceScreen = document.getElementById('configurationScreenState');
        const storeOffersTopBanner = document.getElementById('storeOffersTopBanner');

        const activeTabIsStore = activeTabStoreNode && activeTabStoreNode.classList.contains('active');

        if (!activeTabIsStore) return;
        if(storeOffersTopBanner) storeOffersTopBanner.classList.remove('hidden');

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

    window.forceReturnToUploadView = function() {
        masterFilesArray = []; sessionStorage.removeItem('savedPrintFiles');
        if(multiFilesContainer) multiFilesContainer.innerHTML = '';
        refreshInvoiceTabState(); calculateTotal();
    }

    // --- ⏳ STAGE 1: SPLASH UNLOCK SEQUENCE ---
    setTimeout(() => {
        if (splashScreen) { splashScreen.classList.add('hidden'); }
        
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if (sessionActiveUser) {
            const userData = JSON.parse(localStorage.getItem(`user_${sessionActiveUser}`));
            
            // 🔥 GREETING ALIGNMENT FIXED INLINE FOR THE COMPACT TIME BAR
            if(userGreeting) { 
                userGreeting.innerHTML = userData ? `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${userData.name}</span>` : `GUEST MODE`; 
            }
            
            const savedHistory = localStorage.getItem(`history_${sessionActiveUser}`);
            isFirstTimeUser = !(savedHistory && JSON.parse(savedHistory).length > 0);

            if(mainApp) { mainApp.classList.remove('app-hidden'); mainApp.style.display = 'block'; }
            
            loadSavedFilesFromSession();
            renderOrderHistoryUI(sessionActiveUser); 
            synchronizeWalletInterfaceBalance(); // Syncs cache cash values logs
        } else {
            if(userGreeting) userGreeting.textContent = "GUEST MODE";
            if(authScreen) { authScreen.classList.remove('app-hidden'); authScreen.style.display = 'flex'; }
            synchronizeWalletInterfaceBalance();
        }
        calculateTotal();
    }, 2500);

    // --- 🔐 STAGE 2: PREMIUM AUTH ACTION MATRIX ---
    if(toggleAuthLink) {
        toggleAuthLink.addEventListener('click', (e) => {
            e.preventDefault(); isSignupMode = !isSignupMode;
            if (isSignupMode) {
                authTitle.textContent = "Create Account"; authSubtitle.textContent = "Sign up to order prints instantly."; authBtn.textContent = "Sign Up";
                signupOnlyFields.forEach(f => f.classList.remove('hidden'));
            } else {
                authTitle.textContent = "Welcome Back!"; authBtn.textContent = "Log In";
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
                if(localStorage.getItem(`user_${identityKey}`)) { alert("❌ Account already exists!"); return; }
                localStorage.setItem(`user_${identityKey}`, JSON.stringify({ name: inputName, id: identityKey, password: inputPassword }));
                localStorage.setItem('printAppUser', identityKey);
                isFirstTimeUser = true; 
                if(userGreeting) userGreeting.innerHTML = `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${inputName}</span>`;
            } else {
                const registeredRecord = localStorage.getItem(`user_${identityKey}`);
                if (!registeredRecord) { alert("❌ Account missing!"); return; }
                const verifiedObject = JSON.parse(registeredRecord);
                if (verifiedObject.password !== inputPassword) { alert("❌ Password wrong!"); return; }
                localStorage.setItem('printAppUser', identityKey);
                if(userGreeting) userGreeting.innerHTML = `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${verifiedObject.name}</span>`;
            }
            if(authScreen) authScreen.style.display = 'none';
            if(mainApp) { mainApp.classList.remove('app-hidden'); mainApp.style.display = 'block'; }
            authForm.reset();
            loadSavedFilesFromSession();
            renderOrderHistoryUI(identityKey);
            synchronizeWalletInterfaceBalance();
            calculateTotal();
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('printAppUser'); sessionStorage.removeItem('savedPrintFiles'); masterFilesArray = [];
            if(multiFilesContainer) multiFilesContainer.innerHTML = '';
            if(mainApp) mainApp.style.display = 'none';
            if(userGreeting) userGreeting.textContent = "GUEST MODE";
            if(authScreen) authScreen.style.display = 'flex';
            synchronizeWalletInterfaceBalance();
            calculateTotal();
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

    function renderFilesUI() {
        if(!multiFilesContainer) return; multiFilesContainer.innerHTML = ''; 
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
                    <div><h4 style="font-weight:700; font-size:0.95rem; word-break:break-all;">📄 ${item.name}</h4></div>
                    <button type="button" id="removeFile_${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1.4rem;">&times;</button>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:15px; align-items:center;">
                    <div class="input-group" style="margin-bottom:0;"><label style="font-size:0.75rem; font-weight:700;">Number of pages:</label><input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding:10px; border-radius:10px; border:2px solid var(--border-color); font-weight:700;" required></div>
                    <div><label style="font-size:0.75rem; font-weight:700;">Number of copies:</label><div