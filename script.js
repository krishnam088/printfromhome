document.addEventListener('DOMContentLoaded', () => {
    // Stage Containers Mapping
    const splashScreen = document.getElementById('splashScreen');
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');

    // Access control variables inputs & controls
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
    
    let isSignupMode = false;

    // --- ⏳ STAGE 1: DYNAMIC SPLASH CONTROLLER ---
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            splashScreen.style.visibility = 'hidden';
        }

        // Persistent Session Identifier verification loop
        const sessionActiveUser = localStorage.getItem('printAppUser');
        if (sessionActiveUser) {
            const userData = JSON.parse(localStorage.getItem(`user_${sessionActiveUser}`));
            userGreeting.textContent = `Hi, ${userData ? userData.name : 'Customer'}`;
            mainApp.classList.remove('app-hidden');
            mainApp.classList.add('app-visible');
        } else {
            authScreen.classList.remove('app-hidden');
        }
    }, 2500); // 2.5 Sec Splash View transition time

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
            
            // Checking availability constraint match
            if(localStorage.getItem(`user_${identityKey}`)) {
                alert("❌ This Gmail or Phone number already exists! Please Log In.");
                return;
            }

            // Save structured payload to local persistent dictionary
            const userPayload = { name: inputName, id: identityKey, password: inputPassword };
            localStorage.setItem(`user_${identityKey}`, JSON.stringify(userPayload));
            localStorage.setItem('printAppUser', identityKey);
            userGreeting.textContent = `Hi, ${inputName}`;
            alert("🎉 Account created successfully! Logging you in...");
        } else {
            // Authentication retrieval validation cycle
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
            userGreeting.textContent = `Hi, ${verifiedObject.name}`;
        }

        // Transition Screen Viewports
        authScreen.classList.add('app-hidden');
        mainApp.classList.remove('app-hidden');
        mainApp.classList.add('app-visible');
        authForm.reset();
    });

    // --- 🚪 PERSISTENT DESTRUCTION (LOGOUT MECHANISM) ---
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('printAppUser'); // Removes active token pointer but retains credentials mapping
        mainApp.classList.remove('app-visible');
        mainApp.classList.add('app-hidden');
        authScreen.classList.remove('app-hidden');
    });

    fileUpload.addEventListener('change', () => {
        fileNameDisplay.textContent = fileUpload.files[0] ? `✓ ${fileUpload.files[0].name}` : "No file selected yet";
    });

    // --- 🖨️ PRICING COMPILATION & ORDER SUBMISSION ---
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
                        fileNameDisplay.textContent = "No file selected yet";
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