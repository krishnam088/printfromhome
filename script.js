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

    let isSignupMode = false;
    let masterFilesArray = []; 
    let isFirstTimeUser = true; 

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
            const userData = JSON.parse(localStorage.getItem(`user_${sessionActiveUser}`));
            if(userGreeting) userGreeting.innerHTML = userData ? `HI, <span style="color:#000000; font-weight:800;">${userData.name}</span>` : `GUEST MODE`;
            if(mainApp) { mainApp.classList.remove('app-hidden'); mainApp.style.display = 'block'; }
            loadSavedFilesFromSession();
            renderOrderHistoryUI(sessionActiveUser);
            synchronizeWalletInterfaceBalance();
        } else {
            if(authScreen) { authScreen.classList.remove('app-hidden'); authScreen.style.display = 'flex'; }
        }
        calculateTotal();
    }, 2500);

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
        if (masterFilesArray === 0) return;

        masterFilesArray.forEach((item, index) => {
            const fileRow = document.createElement('div');
            fileRow.className = 'blinkit-file-card';
            const activeColorBw = item.config.printType === 'bw' ? 'active' : '';
            const activeColorCol = item.config.printType === 'color' ? 'active' : '';
            const activeOriPort = item.config.orientation === 'portrait' ? 'active' : '';
            const activeOriLand = item.config.orientation === 'landscape' ? 'active' : '';

            fileRow.innerHTML = `
                <div class="blinkit-card-row" style="margin-bottom: 8px; padding-bottom: 6px;">
                    <div style="text-align:left; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <h4 style="font-weight:700; font-size:0.82rem; word-break:break-all; color:var(--text-main);">📄 ${item.name}</h4>
                        <button type="button" class="add-more-inline-card-btn" style="padding: 2px 6px; font-size: 0.7rem;" onclick="triggerInlineFileUploadClick()">+ Add More</button>
                    </div>
                    <button type="button" id="removeFile_${index}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:1.2rem; margin-left:auto;">&times;</button>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px; align-items:center;">
                    <div class="input-group" style="margin-bottom:0;">
                        <label style="font-size:0.65rem; font-weight:700; color:var(--text-sub); margin-bottom:2px; display:block;">Pages:</label>
                        <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding:6px; border-radius:6px; border:2px solid var(--border-color); font-weight:700; font-size:0.75rem; height:28px;" required>
                    </div>
                    <div>
                        <label style="font-size:0.65rem; font-weight:700; color:var(--text-sub); margin-bottom:2px; display:block;">Copies:</label>
                        <div class="blinkit-stepper" style="padding:2px 6px; gap:8px; height:28px; border-radius:6px;">
                            <button type="button" id="minusCopy_${index}" class="stepper-btn" style="font-size:0.95rem;">-</button>
                            <span id="copyCountLabel_${index}" style="font-size:0.75rem;">${item.config.copies}</span>
                            <button type="button" id="plusCopy_${index}" class="stepper-btn" style="font-size:0.95rem;">+</button>
                        </div>
                    </div>
                </div>

                <p style="font-size:0.65rem; font-weight:700; color:var(--text-sub); margin-bottom:3px;">Print Color</p>
                <div class="blinkit-grid-options" style="gap: 8px; margin-bottom: 8px;">
                    <div class="blinkit-option-box ${activeColorCol}" id="optColor_${index}" style="padding: 6px 8px; border-radius: 8px;">
                        <div class="option-icon" style="font-size:1rem;">🎨</div>
                        <div class="option-meta-text">
                            <span class="option-title" style="font-size:0.75rem;">Coloured</span>
                            <span class="option-subtitle" style="font-size:0.62rem;">₹10/pg</span>
                        </div>
                    </div>
                    <div class="blinkit-option-box ${activeColorBw}" id="optBw_${index}" style="padding: 6px 8px; border-radius: 8px;">
                        <div class="option-icon" style="font-size:1rem;">🌑</div>
                        <div class="option-meta-text">
                            <span class="option-title" style="font-size:0.75rem;">B & W</span>
                            <span class="option-subtitle" style="font-size:0.62rem;">₹3/pg</span>
                        </div>
                    </div>
                </div>

                <p style="font-size:0.65rem; font-weight:700; color:var(--text-sub); margin-bottom:3px;">Orientation</p>
                <div class="blinkit-grid-options" style="gap: 8px; margin-bottom: 8px;">
                    <div class="blinkit-option-box ${activeOriPort}" id="optPort_${index}" style="padding: 6px 8px; border-radius: 8px;">
                        <div class="option-icon" style="font-size:1rem;">📱</div>
                        <div class="option-meta-text">
                            <span class="option-title" style="font-size:0.75rem;">Portrait</span>
                            <span class="option-subtitle" style="font-size:0.62rem;">A4 Vertical</span>
                        </div>
                    </div>
                    <div class="blinkit-option-box ${activeOriLand}" id="optLand_${index}" style="padding: 6px 8px; border-radius: 8px;">
                        <div class="option-icon" style="font-size:1rem;">💻</div>
                        <div class="option-meta-text">
                            <span class="option-title" style="font-size:0.75rem;">Landscape</span>
                            <span class="option-subtitle" style="font-size:0.62rem;">A4 Horiz</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color);"><label style="font-size:0.68rem; font-weight:700;">Binding:</label><select id="binding_${index}" style="padding:2px 4px; font-size:0.68rem; font-weight:700; outline:none; border-radius:4px; border:1px solid var(--border-color); height:24px;"><option value="none" ${item.config.binding === 'none' ? 'selected' : ''}>No Binding</option><option value="staple" ${item.config.binding === 'staple' ? 'selected' : ''}>Stapled (Free)</option><option value="spiral" ${item.config.binding === 'spiral' ? 'selected' : ''}>Spiral (+₹30)</option></select></div>
            `;
            multiFilesContainer.appendChild(fileRow);

            document.getElementById(`optColor_${index}`).addEventListener('click', () => { item.config.printType = 'color'; renderFilesUI(); });
            document.getElementById(`optBw_${index}`).addEventListener('click', () => { item.config.printType = 'bw'; renderFilesUI(); });
            document.getElementById(`optPort_${index}`).addEventListener('click', () => { item.config.orientation = 'portrait'; renderFilesUI(); });
            document.getElementById(`optLand_${index}`).addEventListener('click', () => { item.config.orientation = 'landscape'; renderFilesUI(); });
            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => { item.config.copies++; saveCurrentFilesToSession(); calculateTotal(); document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies; });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => { if (item.config.copies > 1) { item.config.copies--; saveCurrentFilesToSession(); calculateTotal(); document.getElementById(`copyCountLabel_${index}`).textContent = item.config.copies; } });
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
            let filesDetailsHtml = order.details.map(f => `• ${f.fileName} (${f.copies} copies, ${f.printType === 'bw' ? 'B&W' : 'Color'})`).join('<br>');
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
                            alert('🎉 Payment Successful!');
                            const activeUserToken = localStorage.getItem('printAppUser');
                            const currentHistoryArray = JSON.parse(localStorage.getItem(`history_${activeUserToken}`) || '[]');
                            currentHistoryArray.push({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), amount: totalAmountText, status: "Paid / Ready for Print", details: finalMetaConfig });
                            localStorage.setItem(`history_${activeUserToken}`, JSON.stringify(currentHistoryArray));
                            
                            // 🚀 FIXED: Dynamic redirect to live history block inside dashboard bounds
                            isFirstTimeUser = false; 
                            sessionStorage.removeItem('savedPrintFiles'); 
                            printForm.reset(); 
                            multiFilesContainer.innerHTML = ''; 
                            masterFilesArray = [];
                            
                            // Re-triggers data arrays updates instantly and loads native section panels
                            renderOrderHistoryUI(activeUserToken); 
                            calculateTotal();
                            if(typeof window.navigateDrawerSection === 'function') {
                                window.navigateDrawerSection('history');
                            }
                        }
                    }, "theme": { "color": "#F4C430" }
                };
                const rzp1 = new Razorpay(options); rzp1.open();
            } catch (error) {}
        });
    }
});