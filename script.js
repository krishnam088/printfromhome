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
    
    // Modal preview selectors
    const previewModal = document.getElementById('previewModal');
    const closePreview = document.getElementById('closePreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewBody = document.getElementById('previewBody');

    let isSignupMode = false;
    let masterFilesArray = []; // Maintains append state when user clicks 'Select Files' multiple times
    let isFirstTimeUser = false; 

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
            isFirstTimeUser = localStorage.getItem(`isFirst_${sessionActiveUser}`) === 'true';
            mainApp.classList.remove('app-hidden');
            mainApp.classList.add('app-visible');
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
            localStorage.setItem(`isFirst_${identityKey}`, 'true'); 
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
            isFirstTimeUser = localStorage.getItem(`isFirst_${identityKey}`) === 'true';
            userGreeting.textContent = `Hi, ${verifiedObject.name}`;
        }
        authScreen.classList.add('app-hidden');
        mainApp.classList.remove('app-hidden');
        mainApp.classList.add('app-visible');
        authForm.reset();
        calculateTotal();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('printAppUser');
        mainApp.classList.remove('app-visible');
        mainApp.classList.add('app-hidden');
        authScreen.classList.remove('app-hidden');
    });

    // --- 🖨️ FILE EXTENSION PERSISTENCE & PREVIEW ENGINE ---
    fileUpload.addEventListener('change', () => {
        if (fileUpload.files.length === 0) return;

        Array.from(fileUpload.files).forEach(file => {
            const isDuplicate = masterFilesArray.some(f => f.fileData.name === file.name && f.fileData.size === file.size);
            if (!isDuplicate) {
                masterFilesArray.push({
                    fileData: file,
                    config: { pages: 1, printType: 'bw', sides: 'single', binding: 'none', copies: 1 }
                });
            }
        });

        fileNameDisplay.textContent = `✓ Total ${masterFilesArray.length} files in queue`;
        fileUpload.value = ''; 
        renderFilesUI();
    });

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

            fileRow.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <strong style="font-size:0.9rem; color:#1a202c; word-break:break-all;">📄 ${item.fileData.name}</strong>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button type="button" id="previewBtn_${index}" style="background:#e2e8f0; border:none; border-radius:6px; color:#2d3748; padding:4px 8px; font-size:0.8rem; cursor:pointer; font-weight:600;">👁️ Preview</button>
                        
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

            // Trigger modal logic for specific indexed file element
            document.getElementById(`previewBtn_${index}`).addEventListener('click', () => {
                openDocumentPreview(item.fileData);
            });

            // Copies Counter Stepper configuration
            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => {
                item.config.copies++;
                document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies;
                calculateTotal(); // 🔥 Live Calculate Trigger
            });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => {
                if (item.config.copies > 1) {
                    item.config.copies--;
                    document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies;
                    calculateTotal(); // 🔥 Live Calculate Trigger
                }
            });

            // Remove/Delete isolated array entity
            document.getElementById(`removeFile_${index}`).addEventListener('click', () => {
                masterFilesArray.splice(index, 1);
                fileNameDisplay.textContent = masterFilesArray.length > 0 ? `✓ Total ${masterFilesArray.length} files in queue` : "No files selected yet";
                renderFilesUI();
            });

            // Input monitors to save configuration changes and trigger live totals
            document.getElementById(`pages_${index}`).addEventListener('input', (e) => {
                item.config.pages = parseInt(e.target.value) || 1;
                calculateTotal();
            });
            document.getElementById(`printType_${index}`).addEventListener('change', (e) => {
                item.config.printType = e.target.value;
                calculateTotal();
            });
            document.getElementById(`sides_${index}`).addEventListener('change', (e) => {
                item.config.sides = e.target.value;
                calculateTotal();
            });
            document.getElementById(`binding_${index}`).addEventListener('change', (e) => {
                item.config.binding = e.target.value;
                calculateTotal();
            });
        });

        calculateTotal();
    }

    // Live Document Preview Render Core Mechanism
    function openDocumentPreview(file) {
        previewTitle.textContent = `Preview: ${file.name}`;
        previewBody.innerHTML = ''; 

        const fileURL = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = fileURL;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '60vh';
            img.style.borderRadius = '8px';
            previewBody.appendChild(img);
        } else if (file.type === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = fileURL;
            iframe.style.width = '100%';
            iframe.style.height = '60vh';
            iframe.style.border = 'none';
            previewBody.appendChild(iframe);
        } else {
            previewBody.innerHTML = `
                <div style="text-align:center; padding:20px; color:#4a5568;">
                    <span style="font-size:3rem;">📄</span>
                    <p style="margin-top:10px; font-weight:600;">Preview not directly supported for this format.</p>
                    <p style="font-size:0.8rem; color:#718096;">Ready to print securely as raw binary.</p>
                </div>`;
        }

        previewModal.style.display = 'flex';
    }

    closePreview.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === previewModal) previewModal.style.display = 'none';
    });

    // 🔥 FIXED REAL-TIME CALCULATOR ENGINE
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
            // Strong Data Type Parsing to ensure math variables work smoothly
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

            // Individual Card Cost Update
            const costLabel = document.getElementById(`fileTotalCost_${index}`);
            if (costLabel) costLabel.textContent = `₹${fileTotal.toFixed(2)}`;

            totalPrintCost += filePrintCost;
            totalBindingCost += fileBindingCost;
        });

        let finalDocumentCost = totalPrintCost + totalBindingCost;
        let accurateDeliveryCharge = 40.00; // Base Delivery Charge

        // Smart schemes check matrix execution
        if (isFirstTimeUser && finalDocumentCost >= 50.00) {
            accurateDeliveryCharge = 0.00; 
        } else if (finalDocumentCost >= 99.00) {
            accurateDeliveryCharge = 0.00; 
        }

        let grandTotal = finalDocumentCost + accurateDeliveryCharge;

        // 🔥 Updating DOM elements directly for instant recalculations
        summaryPrint.textContent = `₹${totalPrintCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${totalBindingCost.toFixed(2)}`;
        summaryDelivery.textContent = accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`;
        summaryTotal.textContent = `₹${grandTotal.toFixed(2)}`;
    }

    // Form submission processor
    const printForm = document.getElementById('printForm');
    printForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(masterFilesArray.length === 0) {
            alert("❌ File upload karna zaroori hai bhai!");
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
                fileName: item.fileData.name,
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
                        if (activeUserToken && isFirstTimeUser) {
                            localStorage.setItem(`isFirst_${activeUserToken}`, 'false');
                            isFirstTimeUser = false;
                        }

                        printForm.reset();
                        multiFilesContainer.innerHTML = '';
                        masterFilesArray = [];
                        fileNameDisplay.textContent = "No files selected yet";
                        calculateTotal();
                    }
                },
                "theme": { "color": "#F4C430" }
            };
            const rzp1 = new Razorpay(options);
            rzp1.open();
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Payment Gateway unstable at the moment!");
        }
    });
});