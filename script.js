document.addEventListener('DOMContentLoaded', () => {
    // UI Screens
    const splashScreen = document.getElementById('splashScreen');
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    // Auth Form Interaction Components
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    const toggleMsg = document.getElementById('toggleMsg');
    const signupOnlyFields = document.querySelectorAll('.signup-only');

    // Input fields inside Auth Form
    const authName = document.getElementById('authName');
    const authIdentity = document.getElementById('authIdentity');
    const authPassword = document.getElementById('authPassword');

    // Business Logic Elements
    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    
    let isSignupMode = false;

    // --- ⏳ PHASE 1: SPLASH SCREEN HANDLER ---
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
        }

        // Check if user is already authenticated inside local storage session
        const currentSessionUser = localStorage.getItem('printAppUser');
        if (currentSessionUser) {
            mainApp.classList.remove('app-hidden');
            mainApp.classList.add('app-visible');
        } else {
            authScreen.classList.remove('app-hidden');
        }
    }, 2500);

    // --- 🔐 PHASE 2: AUTH MODE TOGGLE (Login <-> Signup) ---
    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;

        if (isSignupMode) {
            authTitle.textContent = "Create Your Account";
            authSubtitle.textContent = "Sign up using Email/Phone to start printing";
            authBtn.textContent = "Sign Up";
            toggleMsg.textContent = "Already have an account?";
            toggleAuthLink.textContent = "Log In";
            signupOnlyFields.forEach(f => f.classList.remove('hidden'));
        } else {
            authTitle.textContent = "Welcome to Print From Home";
            authSubtitle.textContent = "Log in or Sign up to view the print store";
            authBtn.textContent = "Log In";
            toggleMsg.textContent = "New to Print From Home?";
            toggleAuthLink.textContent = "Sign Up";
            signupOnlyFields.forEach(f => f.classList.add('hidden'));
        }
    });

    // --- 💾 AUTH SUBMISSION HANDLER ---
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const identityValue = authIdentity.value.trim();
        const passwordValue = authPassword.value;

        if (isSignupMode) {
            // New account credentials configuration
            const nameValue = authName.value.trim();
            localStorage.setItem(`user_${identityValue}`, JSON.stringify({
                name: nameValue,
                id: identityValue,
                password: passwordValue
            }));
            alert("🎉 Account created successfully! Logging you in...");
        } else {
            // Validation mechanism
            const savedUserStr = localStorage.getItem(`user_${identityValue}`);
            if (!savedUserStr) {
                alert("❌ No account found with this Email/Phone Number. Please Sign Up first!");
                return;
            }
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser.password !== passwordValue) {
                alert("❌ Incorrect password! Please try again.");
                return;
            }
        }

        // Set persistent active storage key session
        localStorage.setItem('printAppUser', identityValue);
        
        // View transition sequence
        authScreen.classList.add('app-hidden');
        mainApp.classList.remove('app-hidden');
        mainApp.classList.add('app-visible');
        authForm.reset();
    });

    // --- 🚪 LOGOUT SYSTEM ---
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('printAppUser'); // Destroys active persistent token
        mainApp.classList.remove('app-visible');
        mainApp.classList.add('app-hidden');
        authScreen.classList.remove('app-hidden');
    });

    // UI tracking when document selection triggers
    fileUpload.addEventListener('change', () => {
        fileNameDisplay.textContent = fileUpload.files[0] ? fileUpload.files[0].name : "No file selected";
    });

    // --- 🖨️ PRINT CALCULATOR & RAZORPAY CONFIGURATION ---
    const pagesInput = document.getElementById('pages');
    const printTypeInput = document.getElementById('printType');
    const bindingInput = document.getElementById('binding');
    const printForm = document.getElementById('printForm');

    const summaryPrint = document.getElementById('summaryPrint');
    const summaryBinding = document.getElementById('summaryBinding');
    const summaryDelivery = document.getElementById('summaryDelivery');
    const summaryTotal = document.getElementById('summaryTotal');

    const DELIVERY_CHARGE = 40.00;

    function calculateTotal() {
        const pages = parseInt(pagesInput.value) || 1;
        const printType = printTypeInput.value;
        const binding = bindingInput.value;

        let perPageRate = (printType === 'bw') ? 2.00 : 10.00;
        let printCost = pages * perPageRate;

        let bindingCost = 0;
        if (binding === 'spiral') bindingCost = 30.00;
        if (binding === 'soft') bindingCost = 50.00;

        let total = printCost + bindingCost + DELIVERY_CHARGE;

        summaryPrint.textContent = `₹${printCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${bindingCost.toFixed(2)}`;
        summaryDelivery.textContent = `₹${DELIVERY_CHARGE.toFixed(2)}`;
        summaryTotal.textContent = `₹${total.toFixed(2)}`;
    }

    pagesInput.addEventListener('input', calculateTotal);
    printTypeInput.addEventListener('change', calculateTotal);
    bindingInput.addEventListener('change', calculateTotal);

    printForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const totalAmountText = summaryTotal.textContent.replace('₹', '');
        const formData = new FormData(printForm);
        formData.append('totalAmount', totalAmountText);

        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!data.success) {
                alert('Order create karne mein dikkat aayi bhai!');
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
                        alert('🎉 Payment Successful! Aapka order receive ho gaya hai.');
                        printForm.reset();
                        fileNameDisplay.textContent = "No file selected";
                        calculateTotal();
                    }
                },
                "theme": { "color": "#F4C430" }
            };

            const rzp1 = new Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Server se connect nahi ho paa raha hai bhai!");
        }
    });
});