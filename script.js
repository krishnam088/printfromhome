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
            alert("🎉