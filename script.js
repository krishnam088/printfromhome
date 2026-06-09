document.addEventListener('DOMContentLoaded', () => {
    // Stage Containers
    const splashScreen = document.getElementById('splashScreen');
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    // Auth Form Elements
    const authForm = document.getElementById('authForm');
    const authName = document.getElementById('authName');
    const authIdentity = document.getElementById('authIdentity');
    const authPassword = document.getElementById('authPassword');
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    const authTitle = document.getElementById('authTitle');
    const signupOnlyFields = document.querySelectorAll('.signup-only');

    // UI Elements
    const fileUpload = document.getElementById('fileUpload');
    const multiFilesContainer = document.getElementById('multiFilesContainer');
    const ordersHistoryContainer = document.getElementById('ordersHistoryContainer');

    let isSignupMode = false;
    let masterFilesArray = []; 

    // --- 🔐 AUTHENTICATION ENGINE ---
    window.loginUser = function(identity, name) {
        localStorage.setItem('printAppUser', identity);
        window.location.reload();
    };

    if(authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = authIdentity.value.trim().toLowerCase();
            const pass = authPassword.value;
            const name = authName.value.trim() || 'Customer';

            if (isSignupMode) {
                if(localStorage.getItem(`user_${id}`)) {
                    alert("❌ Yeh ID already registered hai. Login karein.");
                } else {
                    localStorage.setItem(`user_${id}`, JSON.stringify({ name, password: pass, wallet: 0 }));
                    loginUser(id, name);
                }
            } else {
                const userData = JSON.parse(localStorage.getItem(`user_${id}`));
                if(userData && userData.password === pass) {
                    loginUser(id, userData.name);
                } else {
                    alert("❌ Galat ID ya Password!");
                }
            }
        });
    }

    if(toggleAuthLink) {
        toggleAuthLink.addEventListener('click', (e) => {
            e.preventDefault();
            isSignupMode = !isSignupMode;
            authTitle.textContent = isSignupMode ? "Create Account" : "Welcome Back!";
            signupOnlyFields.forEach(f => f.classList.toggle('hidden', !isSignupMode));
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('printAppUser');
            window.location.reload();
        });
    }

    // --- 💰 WALLET & PRINT ENGINE ---
    window.synchronizeWalletInterfaceBalance = function() {
        const user = localStorage.getItem('printAppUser');
        const balanceNode = document.getElementById('headerWalletDisplayBalance');
        if(!balanceNode) return;
        if(!user) { balanceNode.textContent = "₹0.00"; return; }
        let cash = parseFloat(localStorage.getItem(`wallet_${user}`)) || 0.00;
        balanceNode.textContent = `₹${cash.toFixed(2)}`;
    }

    window.executeWalletRazorpayDeposit = async function() {
        const user = localStorage.getItem('printAppUser');
        if(!user) { alert("❌ Pehle login kijiye!"); return; }
        const amount = parseFloat(document.getElementById('walletCustomAmountInput').value) || 100;
        let oldCash = parseFloat(localStorage.getItem(`wallet_${user}`)) || 0.00;
        localStorage.setItem(`wallet_${user}`, (oldCash + amount).toFixed(2));
        synchronizeWalletInterfaceBalance();
        document.getElementById('walletDepositModal').style.display = 'none';
        alert("✅ Wallet Recharge Successful!");
    }

    // --- 🏁 INITIALIZER ---
    setTimeout(() => {
        if (splashScreen) splashScreen.classList.add('hidden');
        const user = localStorage.getItem('printAppUser');
        if (user) {
            const data = JSON.parse(localStorage.getItem(`user_${user}`));
            if(userGreeting) userGreeting.innerHTML = `HI, <span style="color:#000000; font-weight:800;">${data.name}</span>`;
            if(mainApp) mainApp.classList.remove('app-hidden');
            synchronizeWalletInterfaceBalance();
        } else {
            if(authScreen) authScreen.classList.remove('app-hidden');
        }
        runSilentIntradaySchedulerGuard();
    }, 1000);

    // --- 🖨️ FILE PROCESSING LOGIC ---
    if(fileUpload) {
        fileUpload.addEventListener('change', () => {
            if(fileUpload.files.length === 0) return;
            Array.from(fileUpload.files).forEach(file => {
                masterFilesArray.push({ name: file.name, config: { pages: 1, copies: 1 } });
            });
            renderFilesUI();
        });
    }

    window.renderFilesUI = function() {
        if(!multiFilesContainer) return;
        multiFilesContainer.innerHTML = '';
        masterFilesArray.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'blinkit-file-card';
            card.innerHTML = `
                <div class="blinkit-card-row">
                    <h4 style="font-size:0.85rem;">📄 ${item.name}</h4>
                    <button onclick="masterFilesArray.splice(${index}, 1); renderFilesUI();" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>
                </div>
            `;
            multiFilesContainer.appendChild(card);
        });
        document.getElementById('configurationScreenState').classList.remove('hidden');
        document.getElementById('uploadScreenInitialState').classList.add('hidden');
    }

    // --- 🛡️ STORE STATUS CONTROL ---
    window.toggleStoreStatus = function() {
        const isClosed = localStorage.getItem('manual_store_close') === 'true';
        localStorage.setItem('manual_store_close', (!isClosed).toString());
        alert(!isClosed ? "🛑 Store Band kar diya gaya!" : "✅ Store Khul gaya!");
        window.location.reload();
    };

    function runSilentIntradaySchedulerGuard() {
        const isManuallyClosed = localStorage.getItem('manual_store_close') === 'true';
        const now = new Date();
        const hoursIST = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now));
        const isOpen = (hoursIST >= 7 && hoursIST < 24) && !isManuallyClosed;

        const badge = document.getElementById('userShopStatus');
        const btn = document.getElementById('submitOrderBtn');
        
        if(badge) {
            badge.textContent = isOpen ? "OPEN 🟢" : "CLOSED 🔴";
            badge.className = isOpen ? "shop-status-text-badge open" : "shop-status-text-badge closed";
        }
        if(btn) {
            btn.disabled = !isOpen;
            btn.style.opacity = isOpen ? "1" : "0.5";
            btn.textContent = isOpen ? "Proceed to Payment" : "❌ Store is Closed";
        }
    }

    // Admin Panel Visibility
    const adminPanel = document.getElementById('adminControls');
    if(adminPanel) {
        const adminId = "bhavishya@artist.com";
        adminPanel.style.display = (localStorage.getItem('printAppUser') === adminId) ? 'block' : 'none';
    }

    setInterval(runSilentIntradaySchedulerGuard, 5000);
});