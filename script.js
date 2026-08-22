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

    // 🔥 REAL GOOGLE MAPS INTEGRATION STATE WITH AUTO-FILL & EDIT
    let googleDeliveryMap = null;
    let deliveryMarker = null;

    window.initRealGoogleMap = function() {
        const mapContainer = document.getElementById('userDeliveryMap');
        const addressInput = document.getElementById('mapSelectedAddressInput');
        if (!mapContainer) return;

        const varanasiCoords = { lat: 25.3176, lng: 82.9739 };

        googleDeliveryMap = new google.maps.Map(mapContainer, {
            center: varanasiCoords,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true
        });

        deliveryMarker = new google.maps.Marker({
            position: varanasiCoords,
            map: googleDeliveryMap,
            draggable: true,
            animation: google.maps.Animation.DROP,
            title: 'Drag pin to your exact delivery spot'
        });

        const geocoder = new google.maps.Geocoder();

        google.maps.event.addListener(deliveryMarker, 'dragend', function() {
            const position = deliveryMarker.getPosition();
            updateAddressFromLatLng(geocoder, position, addressInput);
        });

        googleDeliveryMap.addListener('click', function(event) {
            deliveryMarker.setPosition(event.latLng);
            googleDeliveryMap.panTo(event.latLng);
            updateAddressFromLatLng(geocoder, event.latLng, addressInput);
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    googleDeliveryMap.setCenter(userPos);
                    deliveryMarker.setPosition(userPos);
                    updateAddressFromLatLng(geocoder, userPos, addressInput);
                },
                () => {
                    updateAddressFromLatLng(geocoder, varanasiCoords, addressInput);
                }
            );
        } else {
            updateAddressFromLatLng(geocoder, varanasiCoords, addressInput);
        }
    };

    function updateAddressFromLatLng(geocoder, latLng, inputElement) {
        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                if (inputElement) {
                    inputElement.value = results[0].formatted_address;
                    inputElement.removeAttribute('readonly'); // Allow user editing
                }
            } else {
                if (inputElement) {
                    inputElement.value = `Location: ${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
                    inputElement.removeAttribute('readonly'); // Allow user editing
                }
            }
        });
    }

    // 🔥 SAFE FALLBACK HELPER FOR ORDER HISTORY UI TO PREVENT CRASH
    if (typeof window.renderOrderHistoryUI !== 'function') {
        window.renderOrderHistoryUI = function(username, showRecent = true) {
            const container = document.getElementById('ordersHistoryContainer');
            if (!container) return;
            const history = JSON.parse(localStorage.getItem(`history_${username}`) || '[]');
            if (history.length === 0) {
                container.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">No print jobs recorded yet.</p>`;
                return;
            }
            container.innerHTML = history.map(order => `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem;">
                        <span>Order #${order.orderId || 'N/A'}</span>
                        <span style="color:#065f46;">₹${order.amount}</span>
                    </div>
                    <p style="font-size:0.75rem; color:#64748b; margin:4px 0;">Status: <b style="color:#2563eb;">${order.status}</b></p>
                    <p style="font-size:0.7rem; color:#94a3b8;">${order.date}</p>
                </div>
            `).join('');
        };
    }

    // 🔥 1. DELIVERY PARTNER TIP STATE & SELECTOR HANDLER
    window.currentDeliveryTip = 0;

    window.setDeliveryTip = function(tipAmount) {
        if (window.currentDeliveryTip === tipAmount) {
            window.currentDeliveryTip = 0; 
        } else {
            window.currentDeliveryTip = tipAmount;
        }

        document.querySelectorAll('.tip-chip-btn').forEach(btn => {
            btn.style.background = '#ffffff';
            btn.style.borderColor = '#cbd5e1';
            btn.style.color = '#0f172a';
        });

        if (window.currentDeliveryTip > 0 && event && event.target) {
            event.target.style.background = '#065f46';
            event.target.style.borderColor = '#065f46';
            event.target.style.color = '#ffffff';
        }

        if (typeof calculateTotal === 'function') {
            calculateTotal();
        }
    };

    // 🔥 LIVE RE-ROUTE CONFIGS
    const LIVE_SERVER_URL = window.location.origin;
    window.globalRawOrdersCache = [];

    // ==========================================
    // 🧮 BULLETPROOF GRAND TOTAL CALCULATOR ENGINE
    // ==========================================
    window.calculateTotal = function() {
        try {
            let totalPrintCost = 0; 
            let totalBindingCost = 0;
            
            let snacksTotal = window.cartSnacksArray ? window.cartSnacksArray.reduce((acc, item) => acc + (parseFloat(item.price || 0) * parseInt(item.qty || 1)), 0) : 0;
            let printJobsTotal = window.cartPrintJobsArray ? window.cartPrintJobsArray.reduce((acc, job) => acc + (parseInt(job.pages || 1) * (job.printType === 'bw' ? 3 : 10) * parseInt(job.copies || 1) + (job.binding === 'spiral' ? 30 * parseInt(job.copies || 1) : 0)), 0) : 0;

            if (typeof masterFilesArray !== 'undefined' && masterFilesArray.length > 0) {
                masterFilesArray.forEach((item) => {
                    const pages = parseInt(item.config.pages) || 1; 
                    totalPrintCost += (pages * ((item.config.printType === 'bw') ? 3.00 : 10.00)) * item.config.copies;
                    if (item.config.binding === 'spiral') totalBindingCost += 30.00 * item.config.copies;
                });
            }

            let finalDocumentCost = totalPrintCost + totalBindingCost + snacksTotal + printJobsTotal;
            const freeDeliveryThreshold = 99.00;
            let accurateDeliveryCharge = (finalDocumentCost >= freeDeliveryThreshold || finalDocumentCost === 0) ? 0.00 : 25.00;
            
            const progressBarBox = document.getElementById('freeDeliveryProgressBarBox');
            const messageText = document.getElementById('freeDeliveryMessageText');
            const fillBar = document.getElementById('freeDeliveryFillBar');

            if (progressBarBox && messageText && fillBar) {
                if (finalDocumentCost >= freeDeliveryThreshold) {
                    messageText.innerHTML = "🎉 Yay! You have unlocked <b>FREE Delivery</b>!";
                    fillBar.style.width = "100%";
                } else {
                    let neededMore = freeDeliveryThreshold - finalDocumentCost;
                    let progressPercent = Math.min(100, (finalDocumentCost / freeDeliveryThreshold) * 100);
                    messageText.innerHTML = `🎉 Add items worth <b>₹${neededMore.toFixed(2)}</b> more for FREE delivery!`;
                    fillBar.style.width = `${progressPercent}%`;
                }
            }

            let rainFee = window.isRainSurgeActive ? 15 : 0;
            let grandTotalCombined = finalDocumentCost + accurateDeliveryCharge + rainFee + (window.currentDeliveryTip || 0);

            const updateUI = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            updateUI('summaryPrint', `₹${(totalPrintCost + printJobsTotal).toFixed(2)}`);
            updateUI('summaryBinding', `₹${(totalBindingCost + snacksTotal).toFixed(2)}`);
            updateUI('summaryDelivery', accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`);
            updateUI('summaryTotal', `₹${grandTotalCombined.toFixed(2)}`);

            updateUI('cartItemSubtotal', `₹${finalDocumentCost.toFixed(2)}`);
            updateUI('cartDeliveryFee', accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`);
            updateUI('cartGrandTotalSummary', `₹${grandTotalCombined.toFixed(2)}`);
            updateUI('cartDrawerGrandTotal', `₹${grandTotalCombined.toFixed(2)}`);
            
            let totalQtyCount = (window.cartSnacksArray ? window.cartSnacksArray.reduce((a, b) => a + b.qty, 0) : 0) + (window.cartPrintJobsArray ? window.cartPrintJobsArray.length : 0);
            updateUI('shipmentItemsCountText', `Shipment of ${totalQtyCount} item${totalQtyCount > 1 ? 's' : ''}`);

            if (typeof updateFloatingCartBar === 'function') {
                updateFloatingCartBar();
            }
        } catch (err) {
            console.error("Calculate Total Error:", err);
        }
    };

    window.redeemPoints = async function() {
        let currentPoints = parseInt(localStorage.getItem('user_loyalty_points') || 0);
        if (currentPoints < 50) { alert("⚠️ Minimum 50 points needed to redeem!"); return; }
        
        window.currentDeliveryTip -= 20; 
        localStorage.setItem('user_loyalty_points', currentPoints - 50);
        calculateTotal();
        alert("✅ 50 points redeemed for ₹20 discount!");
    };

    window.calculateETA = function() {
        const queueLength = window.globalRawOrdersCache.length;
        return Math.max(15, queueLength * 5);
    };

    let renderedPagesList = [];
    let isLandscapeMode = false;
    let currentStudioActiveFile = null;
    let currentStudioFileName = 'Document.pdf';

    window.openDocumentInA4Studio = async function(fileBlobOrUrl, originalFileName = 'Document') {
        const container = document.getElementById('a4PagesContainer');
        const modal = document.getElementById('printStudioModal');
        const passwordBox = document.getElementById('studioPasswordValidationBox');
        const passwordInput = document.getElementById('studioRequiredPdfPassword');
        
        if (!container || !modal) return;

        currentStudioActiveFile = fileBlobOrUrl;
        currentStudioFileName = originalFileName || 'Document.pdf';
        if (passwordInput) passwordInput.value = '';
        if (passwordBox) passwordBox.classList.add('hidden');
        isCurrentFileLocked = false;

        container.innerHTML = '<div style="color: #38bdf8; font-weight: 700; font-size: 1rem; padding: 40px; text-align:center;">⏳ Generating pixel-perfect A4 Sheets...</div>';
        modal.style.display = 'flex';
        renderedPagesList = [];

        try {
            const isPdf = (typeof fileBlobOrUrl === 'string' && fileBlobOrUrl.toLowerCase().includes('.pdf')) || 
                        (fileBlobOrUrl.type === 'application/pdf') || 
                        (fileBlobOrUrl.name && fileBlobOrUrl.name.toLowerCase().endsWith('.pdf'));

            if (isPdf) {
                const fileSource = typeof fileBlobOrUrl === 'string' ? fileBlobOrUrl : URL.createObjectURL(fileBlobOrUrl);
                try {
                    await loadPdfIntoStudio(fileSource, undefined);
                } catch (passErr) {
                    isCurrentFileLocked = true;
                    if (passwordBox) passwordBox.classList.remove('hidden');
                    container.innerHTML = `<div style="color: #f87171; font-weight: 700; padding: 30px; text-align: center;">🔒 This PDF is password protected!<br><span style="font-size:0.75rem; color:#94a3b8;">Please enter the password in the top red bar above to unlock and preview.</span></div>`;
                }
            } else {
                const imgSourceUrl = typeof fileBlobOrUrl === 'string' ? fileBlobOrUrl : URL.createObjectURL(fileBlobOrUrl);
                container.innerHTML = '';

                const pageWrapper = document.createElement('div');
                pageWrapper.className = `a4-page-wrapper ${isLandscapeMode ? 'landscape' : ''}`;
                pageWrapper.id = `a4_sheet_element_1`;

                pageWrapper.innerHTML = `
                    <div class="page-badge-toolbar">
                        <span style="color: #38bdf8; font-size: 0.75rem; font-weight: 800;">Page 1 of 1</span>
                    </div>
                    <img src="${imgSourceUrl}" class="a4-page-canvas" style="width: 100%; height: 100%; object-fit: contain;" />
                `;
                container.appendChild(pageWrapper);
                renderedPagesList.push({ pageNum: 1, elementId: `a4_sheet_element_1` });
                updateStudioPageCountBadge();
            }
        } catch (err) {
            console.error("A4 Studio Error:", err);
            container.innerHTML = `<div style="color: #ef4444; font-weight: 700; padding: 30px; text-align: center;">❌ Failed to render document: ${err.message}</div>`;
        }
    };

    window.updateStudioPageCountBadge = function() {
        const badge = document.getElementById('totalActivePagesCount');
        if (badge) badge.textContent = renderedPagesList.length;
    };

    window.removeA4StudioPage = function(pageNum) {
        const index = renderedPagesList.findIndex(p => p.pageNum === pageNum);
        if (index !== -1) {
            const item = renderedPagesList[index];
            const el = document.getElementById(item.elementId);
            if (el) el.remove();
            renderedPagesList.splice(index, 1);
            window.updateStudioPageCountBadge();
            calculateTotal();
        }
    };

    window.toggleGlobalOrientation = function() {
        isLandscapeMode = !isLandscapeMode;
        document.querySelectorAll('.a4-page-wrapper').forEach(sheet => {
            sheet.classList.toggle('landscape', isLandscapeMode);
        });
    };

    window.closePrintStudio = function() {
        const modal = document.getElementById('printStudioModal');
        if (modal) modal.style.display = 'none';
    };

    window.addStudioDocumentToCartAndRedirect = function() {
        const totalPages = renderedPagesList.length > 0 ? renderedPagesList.length : 1;

        window.cartPrintJobsArray.push({
            fileName: currentStudioFileName,
            pages: totalPages,
            printType: 'bw',
            sides: isLandscapeMode ? 'landscape' : 'single',
            binding: 'none',
            copies: 1,
            orientation: isLandscapeMode ? 'landscape' : 'portrait',
            fileData: currentStudioActiveFile
        });

        if (typeof persistCartStateData === 'function') persistCartStateData();
        if (typeof calculateTotal === 'function') calculateTotal();
        
        closePrintStudio();
        toggleCartDrawer(true);
    };

    window.executeNativeA4Print = function() {
        const container = document.getElementById('a4PagesContainer');
        if (!container) {
            window.print();
            return;
        }

        let printFrame = document.getElementById('printIframeHidden');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'printIframeHidden';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            document.body.appendChild(printFrame);
        }

        const canvasElements = container.querySelectorAll('canvas, img');
        let printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Document</title>
                <style>
                    @page { size: A4 portrait; margin: 0; }
                    body { margin: 0; padding: 0; background: #ffffff; }
                    .print-sheet {
                        width: 210mm;
                        height: 297mm;
                        page-break-after: always;
                        break-after: page;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        overflow: hidden;
                    }
                    .print-sheet img, .print-sheet canvas {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: contain !important;
                    }
                </style>
            </head>
            <body>
        `;

        canvasElements.forEach(el => {
            let imgSrc = '';
            if (el.tagName === 'CANVAS') {
                imgSrc = el.toDataURL('image/png');
            } else if (el.tagName === 'IMG') {
                imgSrc = el.src;
            }
            if (imgSrc) {
                printHtml += `<div class="print-sheet"><img src="${imgSrc}" /></div>`;
            }
        });

        printHtml += `</body></html>`;

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(printHtml);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 500);
    };

    async function requestUserPushNotificationPermission() {
        try {
            if (!("Notification" in window)) return;
            await Notification.requestPermission();
        } catch (err) {}
    }

    setTimeout(requestUserPushNotificationPermission, 4000);

    window.subscribeUserToPushNotifications = async function(productName) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert("⚠️ Push notifications are not supported on this browser.");
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const permissionResult = await Notification.requestPermission();
            if (permissionResult !== 'granted') {
                alert("⚠️ Please allow notifications to get stock alerts.");
                return;
            }

            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: 'BGjNyVdaWFa5xpUhvhCObYnuDWwqEVwcgL_yVKnQH75lF80qNPf-WK5Wa8NM7XV8bRNlN5Vu8Darx98-AkGZ9uA'
            };

            const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
            const sessionUser = localStorage.getItem('printAppUserIdentity') || 'guest';
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identity: sessionUser,
                    productName: productName,
                    subscription: pushSubscription,
                    type: 'stock_alert'
                })
            });

            alert(`✅ Success! We will notify you on this device when "${productName}" is back in stock.`);
        } catch (err) {
            alert("⚠️ Failed to enable notifications.");
        }
    };

    let isStoreCurrentlyOpen = true;

    async function checkStoreStatusRealtime() {
        try {
            const res = await fetch('/api/store-status');
            const data = await res.json();
            
            const storeClosedNotice = document.getElementById('storeClosedNoticeBox');
            const storeClosedModal = document.getElementById('storeClosedPopupModal');
            const submitOrderBtn = document.getElementById('submitOrderBtn');
            const userShopStatus = document.getElementById('userShopStatus');
            
            if (data.success) {
                isStoreCurrentlyOpen = data.isOpen === true;

                if (!isStoreCurrentlyOpen) {
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
        } catch (e) {}
    }

    setInterval(checkStoreStatusRealtime, 3000);
    checkStoreStatusRealtime();

    window.dismissStoreClosedNotice = function() {
        const storeClosedNotice = document.getElementById('storeClosedNoticeBox');
        const storeClosedModal = document.getElementById('storeClosedPopupModal');
        if (storeClosedNotice) storeClosedNotice.classList.add('hidden');
        if (storeClosedModal) storeClosedModal.style.display = 'none';
        sessionStorage.setItem('storeModalDismissed', 'true');
    };

    window.executeLiveTimelineStateStepper = function(statusText, assignedDeliveryBoyPhone) {
        const statusBadge = document.getElementById('liveOrderStatusBadge');
        const execName = document.getElementById('deliveryExecutiveName');
        const execPhone = document.getElementById('deliveryExecutivePhone');
        const callBtn = document.getElementById('callExecutiveBtn');

        if (statusBadge) statusBadge.textContent = statusText || "Processing Order...";
        document.querySelectorAll('.timeline-step').forEach(step => step.classList.remove('active'));
        if (statusText) {
            const lower = statusText.toLowerCase();
            if (lower.includes('ready') || lower.includes('received') || lower.includes('placed')) {
                document.getElementById('step_pending')?.classList.add('active');
            } else if (lower.includes('paid') || lower.includes('confirmed')) {
                document.getElementById('step_paid')?.classList.add('active');
            } else if (lower.includes('print') || lower.includes('picking') || lower.includes('processing')) {
                document.getElementById('step_printing')?.classList.add('active');
            } else if (lower.includes('out') || lower.includes('delivery')) {
                document.getElementById('step_delivery')?.classList.add('active');
            }
        }

        if (assignedDeliveryBoyPhone && assignedDeliveryBoyPhone.trim() !== '') {
            if (execName) execName.textContent = `Delivery Partner (${assignedDeliveryBoyPhone})`;
            if (execPhone) execPhone.textContent = `📞 ${assignedDeliveryBoyPhone}`;
            if (callBtn) callBtn.href = `tel:${assignedDeliveryBoyPhone}`;
        } else {
            if (execName) execName.textContent = "Assigning Delivery Executive...";
            if (execPhone) execPhone.textContent = "Will be assigned shortly";
            if (callBtn) callBtn.href = "tel:7007626731";
        }
    }

    async function loadDynamicStoreProducts() {
        try {
            const res = await fetch('/api/store/products');
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return;
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                window.storeInventoryProducts = data.products;
                renderStoreProductsUI();
            }
        } catch (e) {}
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
                const isLowStock = !isOutOfStock && prod.stockQuantity <= 5;
                const finalImgUrl = prod.imageUrl || prod.image || '';

                const card = document.createElement('div');
                card.className = 'blinkit-cat-card';
                card.style.cssText = `
                    min-width: 110px; width: 110px; background: #ffffff; border: 1px solid ${isLowStock ? '#ef4444' : '#e2e8f0'};
                    border-radius: 14px; padding: 10px; position: relative; opacity: ${isOutOfStock ? '0.7' : '1'}; 
                    display: flex; flex-direction: column; align-items: center; cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.03); flex-shrink: 0;
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

                let badgeHtml = '';
                if (isOutOfStock) {
                    badgeHtml = `<span style="position:absolute; top:4px; right:4px; background:#ef4444; color:white; font-size:0.55rem; padding:2px 4px; border-radius:4px; font-weight:800; z-index:5;">OUT</span>`;
                } else if (isLowStock) {
                    badgeHtml = `<span class="low-stock-badge">Only ${prod.stockQuantity} left</span>`;
                }

                card.innerHTML = `
                    ${badgeHtml}
                    ${imageHtml}
                    <div title="${prod.name}" style="font-weight:700; font-size:0.78rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#0f172a;">${prod.name}</div>
                    <div style="font-weight:800; font-size:0.78rem; color:#0f172a; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                    ${isOutOfStock 
                        ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); notifyWhenAvailable('${prod.name}')">Notify Me</button>`
                        : `<button type="button" style="background:var(--blinkit-green, #10b981); color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); addDynamicProductToCart('${prod.sku || prod.barcode || prod.name}', '${prod.name}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${finalImgUrl}')">+ Add</button>`
                    }
                `;
                container.appendChild(card);
            });
        });
    }

    window.notifyWhenAvailable = function(prodName) {
        if (typeof subscribeUserToPushNotifications === 'function') {
            subscribeUserToPushNotifications(prodName);
        } else {
            alert(`🔔 We have noted your request! You will be notified when "${prodName}" is back in stock.`);
        }
    }

    window.openProductDetailModal = function(prod) {
        const modal = document.getElementById('productDetailModal');
        const imgContainer = document.getElementById('modalProductImgContainer');
        const nameEl = document.getElementById('modalProductName');
        const priceEl = document.getElementById('modalProductPrice');
        const stockEl = document.getElementById('modalProductStock');
        const addBtn = document.getElementById('modalAddToCartBtn');
        if (!modal) return;

        const finalImgUrl = prod.imageUrl || prod.image || '';
        if (nameEl) nameEl.textContent = prod.name;
        if (priceEl) priceEl.textContent = `₹${prod.sellingPrice || 0}`;
        if (stockEl) stockEl.textContent = prod.stockQuantity > 0 ? `Stock Left: ${prod.stockQuantity} units` : `Status: Out of Stock`;
        
        if (imgContainer) imgContainer.innerHTML = finalImgUrl ? `<img src="${finalImgUrl}" style="width:120px; height:120px; object-fit:contain;" />` : `<span style="font-size:4rem;">📦</span>`;

        let existing = window.cartSnacksArray ? window.cartSnacksArray.find(item => item.sku === prod.sku || item.name === prod.name) : null;
        let currentQty = existing ? existing.qty : 0;

        if (prod.stockQuantity <= 0) {
            if (addBtn) addBtn.outerHTML = `<button type="button" style="width:100%; padding:14px; background:#ef4444; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:not-allowed;" disabled>Out of Stock</button>`;
        } else {
            if (addBtn) {
                addBtn.outerHTML = `
                    <div id="modalActionArea" style="display:flex; align-items:center; justify-content:space-between; width:100%; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:6px 12px;">
                        <span style="font-weight:700; font-size:0.85rem; color:#0f172a;">Quantity:</span>
                        <div style="display:flex; align-items:center; gap:14px;">
                            <button type="button" onclick="adjustModalItemQty('${prod.sku || prod.name}', -1, ${prod.stockQuantity}, ${prod.sellingPrice || 0}, '${prod.name}', '${finalImgUrl}')" style="width:34px; height:34px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">-</button>
                            <span id="modalItemQtyVal" style="font-weight:800; font-size:1rem; color:#065f46;">${currentQty}</span>
                            <button type="button" onclick="adjustModalItemQty('${prod.sku || prod.name}', 1, ${prod.stockQuantity}, ${prod.sellingPrice || 0}, '${prod.name}', '${finalImgUrl}')" style="width:34px; height:34px; background:#065f46; color:white; border:none; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">+</button>
                        </div>
                    </div>
                `;
            }
        }
        modal.style.display = 'flex';
    };

    window.closeProductDetailModal = function(event) {
        const modal = document.getElementById('productDetailModal');
        if (modal && (!event || event.target === modal || event.target.tagName === 'SPAN')) {
            modal.style.display = 'none';
            const actionArea = document.getElementById('modalActionArea');
            if (actionArea) {
                actionArea.outerHTML = `<button type="button" id="modalAddToCartBtn" style="width:100%; padding:14px; background:#065f46; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(6,95,70,0.3);">+ Add to Cart</button>`;
            }
        }
    };

    window.adjustModalItemQty = function(skuOrName, delta, maxStock, price, name, imageUrl) {
        if (!window.cartSnacksArray) window.cartSnacksArray = [];
        let existing = window.cartSnacksArray.find(item => item.sku === skuOrName || item.name === name);

        if (delta > 0) {
            let current = existing ? existing.qty : 0;
            if (current + 1 > maxStock) {
                alert(`⚠️ Max stock limit reached! Only ${maxStock} units available.`);
                return;
            }
            if (existing) {
                existing.qty += 1;
                if (imageUrl) existing.imageUrl = imageUrl;
            } else {
                window.cartSnacksArray.push({ sku: skuOrName, name: name, price: price, qty: 1, printType: 'snack', fileName: `Product: ${name}`, imageUrl: imageUrl || '' });
            }
        } else if (delta < 0 && existing) {
            existing.qty -= 1;
            if (existing.qty <= 0) {
                window.cartSnacksArray = window.cartSnacksArray.filter(item => item.sku !== skuOrName && item.name !== name);
            }
        }

        let updatedExisting = window.cartSnacksArray.find(item => item.sku === skuOrName || item.name === name);
        let qtyLabel = document.getElementById('modalItemQtyVal');
        if (qtyLabel) qtyLabel.textContent = updatedExisting ? updatedExisting.qty : 0;

        persistCartStateData();
        if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof renderCartDrawerContents === 'function') renderCartDrawerContents();
    };

    window.addDynamicProductToCart = function(sku, name, price, currentStock, imageUrl = '') {
        const matchedProd = window.storeInventoryProducts ? window.storeInventoryProducts.find(p => (p.sku === sku || p.barcode === sku || p.name === name)) : null;
        const availableStock = matchedProd ? matchedProd.stockQuantity : currentStock;
        const finalImg = imageUrl || (matchedProd ? (matchedProd.imageUrl || matchedProd.image || '') : '');

        if (availableStock <= 0) {
            alert(`⚠️ Sorry! "${name}" is currently out of stock.`);
            return;
        }

        if (!window.cartSnacksArray) {
            window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        }

        const existing = window.cartSnacksArray.find(item => item.sku === sku || item.name === name);
        const currentCartQty = existing ? existing.qty : 0;

        if (currentCartQty + 1 > availableStock) {
            alert(`⚠️ Max stock limit reached! Only ${availableStock} units available.`);
            return;
        }

        if (existing) {
            existing.qty += 1;
            if (finalImg) existing.imageUrl = finalImg;
        } else {
            window.cartSnacksArray.push({ 
                sku: sku, 
                name: name, 
                price: price, 
                qty: 1, 
                printType: 'snack',
                fileName: `Product: ${name}`,
                imageUrl: finalImg 
            });
        }

        persistCartStateData();
        if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof renderCartDrawerContents === 'function') renderCartDrawerContents();

        const clickedBtn = event ? event.target : null;
        if (clickedBtn) {
            const originalText = clickedBtn.textContent;
            clickedBtn.textContent = "Added ✓";
            clickedBtn.style.background = "#065f46";
            setTimeout(() => {
                clickedBtn.textContent = originalText;
                clickedBtn.style.background = "#065f46";
            }, 800);
        }
    }
    
    window.adjustSnackQty = function(index, delta) {
        const snack = window.cartSnacksArray[index];
        const matchedProd = window.storeInventoryProducts.find(p => p.sku === snack.sku || p.barcode === snack.sku || p.name === snack.name);
        const availableStock = matchedProd ? matchedProd.stockQuantity : 999;

        if (delta > 0 && (snack.qty + 1 > availableStock)) {
            alert(`⚠️ Max stock limit reached! Only ${availableStock} units of "${snack.name}" are available in stock.`);
            return;
        }

        snack.qty += delta;

        if (snack.qty <= 0) {
            window.cartSnacksArray.splice(index, 1);
        }
        
        persistCartStateData();
        if (typeof renderCartDrawerContents === 'function') renderCartDrawerContents();
        updateFloatingCartBar();
        calculateTotal();
    };

    window.toggleCartDrawer = function(open = true) {
        const drawerOverlay = document.getElementById('cartDrawerOverlay');
        const floatingBar = document.getElementById('floatingCartFooterBar');
        if (!drawerOverlay) return;

        if (open) {
            drawerOverlay.style.display = 'flex';
            if (floatingBar) {
                floatingBar.classList.add('hidden');
                floatingBar.style.display = 'none';
            }
            if (typeof renderCartDrawerContents === 'function') {
                renderCartDrawerContents();
            }
        } else {
            drawerOverlay.style.display = 'none';
            if (typeof updateFloatingCartBar === 'function') {
                updateFloatingCartBar();
            }
        }
    };

    window.updateFloatingCartBar = function() {
        const bar = document.getElementById('floatingCartFooterBar');
        const countText = document.getElementById('floatingCartCountText');
        const priceText = document.getElementById('floatingCartTotalPriceText');
        const stackContainer = document.getElementById('floatingCartImagesStack');
        const drawerOverlay = document.getElementById('cartDrawerOverlay');
        
        if (!bar) return;

        const sessionActiveUser = localStorage.getItem('printAppUser');
        const isAuthVisible = document.getElementById('authScreen') && !document.getElementById('authScreen').classList.contains('app-hidden') && document.getElementById('authScreen').style.display !== 'none';
        
        // 🔥 Check if user is actively on the Store / Home page section
        const storeSection = document.getElementById('user_section_store');
        const isStoreActive = storeSection && storeSection.classList.contains('active');

        if (!sessionActiveUser || isAuthVisible || !isStoreActive || (drawerOverlay && drawerOverlay.style.display === 'flex')) {
            bar.classList.add('hidden');
            bar.style.display = 'none';
            return;
        }

        let totalSnacksCount = window.cartSnacksArray ? window.cartSnacksArray.reduce((acc, item) => acc + item.qty, 0) : 0;
        let totalPrintCount = window.cartPrintJobsArray ? window.cartPrintJobsArray.length : 0;
        let totalCount = totalSnacksCount + totalPrintCount;

        let totalSnacksPrice = window.cartSnacksArray ? window.cartSnacksArray.reduce((acc, item) => acc + (item.price * item.qty), 0) : 0;
        let totalPrintPrice = window.cartPrintJobsArray ? window.cartPrintJobsArray.reduce((acc, job) => acc + (job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0) : 0;
        
        let subtotalCalc = totalSnacksPrice + totalPrintPrice;
        let delFee = (subtotalCalc >= 99.00 || subtotalCalc === 0) ? 0.00 : 25.00;
        let rainFee = window.isRainSurgeActive ? 15 : 0;
        let totalPrice = subtotalCalc + delFee + rainFee + (window.currentDeliveryTip || 0);

        if (totalCount > 0) {
            bar.classList.remove('hidden');
            bar.style.display = 'flex';
            if (countText) countText.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
            if (priceText) priceText.textContent = `₹${totalPrice.toFixed(2)}`;

            if (stackContainer) {
                stackContainer.innerHTML = '';
                stackContainer.style.cssText = "position:relative; width:45px; height:34px; display:flex; align-items:center;";

                let allVisualItems = [];
                if (window.cartSnacksArray) {
                    window.cartSnacksArray.forEach(s => {
                        for(let i=0; i<s.qty; i++) {
                            allVisualItems.push({ type: 'snack', img: s.imageUrl || '', name: s.name });
                        }
                    });
                }
                if (window.cartPrintJobsArray) {
                    window.cartPrintJobsArray.forEach(p => allVisualItems.push({ type: 'print', img: '', name: p.fileName }));
                }

                let displayItems = allVisualItems.slice(0, 3);
                displayItems.forEach((item, sIdx) => {
                    const iconBox = document.createElement('div');
                    iconBox.style.cssText = `
                        position: absolute;
                        left: ${sIdx * 12}px;
                        width: 30px;
                        height: 30px;
                        border-radius: 8px;
                        background: #ffffff;
                        border: 2px solid #f59e0b;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.85rem;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                        overflow: hidden;
                        z-index: ${10 - sIdx};
                    `;
                    if (item.type === 'snack' && item.img) {
                        iconBox.innerHTML = `<img src="${item.img}" style="width:100%; height:100%; object-fit:cover;" />`;
                    } else {
                        iconBox.innerHTML = item.type === 'print' ? '📄' : '📦';
                    }
                    stackContainer.appendChild(iconBox);
                });
            }
        } else {
            bar.classList.add('hidden');
            bar.style.display = 'none';
        }
    };

    window.renderCartDrawerContents = function() {
        const container = document.getElementById('cartDrawerItemsList');
        if (!container) return;

        container.innerHTML = '';
        
        let hasItems = (window.cartSnacksArray && window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray && window.cartPrintJobsArray.length > 0);
        
        if (!hasItems) {
            container.innerHTML = `<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:15px;">Your cart is empty.</p>`;
            calculateTotal();
            return;
        }

        const sliderWrapper = document.createElement('div');
        sliderWrapper.style.cssText = "display:flex; gap:12px; overflow-x:auto; padding:4px 2px 10px 2px; width:100%; scrollbar-width:thin;";

        if (window.cartSnacksArray && window.cartSnacksArray.length > 0) {
            window.cartSnacksArray.forEach((snack, idx) => {
                const card = document.createElement('div');
                card.style.cssText = "min-width: 150px; width: 150px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";
                
                const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:55px; height:55px; object-fit:cover; border-radius:10px; margin:0 auto 6px auto; display:block;" />` : `<div style="font-size:2rem; text-align:center; margin-bottom:6px;">📦</div>`;

                card.innerHTML = `
                    <div>
                        ${thumbImg}
                        <div title="${snack.name}" style="font-weight:700; font-size:0.78rem; color:#0f172a; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${snack.name}</div>
                        <div style="font-size:0.68rem; color:#64748b; text-align:center; font-weight:600; margin-top:2px;">₹${snack.price} each</div>
                    </div>
                    <div style="margin-top:10px;">
                        <div style="font-weight:800; font-size:0.8rem; color:#065f46; text-align:center; margin-bottom:6px;">₹${snack.price * snack.qty}</div>
                        <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:2px 8px;">
                            <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#0f172a;">-</button>
                            <span style="font-weight:800; font-size:0.8rem; color:#0f172a;">${snack.qty}</span>
                            <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#065f46;">+</button>
                        </div>
                    </div>
                `;
                sliderWrapper.appendChild(card);
            });
        }

        if (window.cartPrintJobsArray && window.cartPrintJobsArray.length > 0) {
            window.cartPrintJobsArray.forEach((job, idx) => {
                const card = document.createElement('div');
                card.style.cssText = "min-width: 150px; width: 150px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";
                
                let jobTotal = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);

                card.innerHTML = `
                    <div>
                        <div style="font-size:2rem; text-align:center; margin-bottom:6px;">📄</div>
                        <div title="${job.fileName}" style="font-weight:700; font-size:0.78rem; color:#0f172a; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${job.fileName}</div>
                        <div style="font-size:0.68rem; color:#059669; text-align:center; font-weight:600; margin-top:2px;">${job.pages} pgs (${job.printType.toUpperCase()})</div>
                    </div>
                    <div style="margin-top:10px;">
                        <div style="font-weight:800; font-size:0.8rem; color:#065f46; text-align:center; margin-bottom:6px;">₹${jobTotal}</div>
                        <button type="button" onclick="removePrintJobFromCart(${idx})" style="width:100%; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:8px; font-weight:700; font-size:0.72rem; padding:4px; cursor:pointer;">Remove</button>
                    </div>
                `;
                sliderWrapper.appendChild(card);
            });
        }

        container.appendChild(sliderWrapper);
        
        if (typeof calculateTotal === 'function') {
            calculateTotal();
        }
    };

    window.removePrintJobFromCart = function(index) {
        if (window.cartPrintJobsArray) {
            window.cartPrintJobsArray.splice(index, 1);
            persistCartStateData();
            renderCartDrawerContents();
            updateFloatingCartBar();
            calculateTotal();
        }
    };

    window.clearEntireCartData = function() {
        if (!confirm("⚠️ Are you sure you want to clear your cart?")) return;
        window.cartPrintJobsArray = [];
        window.cartSnacksArray = [];
        window.currentDeliveryTip = 0;
        persistCartStateData();
        renderCartDrawerContents();
        calculateTotal();
        updateFloatingCartBar();
        alert("✅ Cart cleared successfully!");
    };

    window.persistCartStateData = function() {
        localStorage.setItem('cart_print_jobs', JSON.stringify(window.cartPrintJobsArray));
        localStorage.setItem('cart_snacks', JSON.stringify(window.cartSnacksArray));
        updateFloatingCartBar();
    }

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

    // 🔥 ADDRESS DELETE & MANAGEMENT UI
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
            const card = document.createElement('div');
            card.style = `display:flex; align-items:center; justify-content:space-between; background:${isChecked ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${isChecked ? '#16a34a' : '#cbd5e1'}; padding:8px 12px; border-radius:10px; font-size:0.78rem; font-weight:600; color:#0f172a; margin-bottom:6px;`;
            
            card.innerHTML = `
                <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; flex:1;">
                    <input type="radio" name="selectedDeliveryAddressRadio" value="${idx}" ${isChecked} onchange="selectActiveAddressByIndex(${idx})" style="margin-top:2px;">
                    <span style="word-break:break-word;">📍 ${addr}</span>
                </label>
                <button type="button" onclick="deleteSavedAddress(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:700; cursor:pointer; margin-left:6px;" title="Delete Address">Delete</button>
            `;
            listContainer.appendChild(card);
        });
    }

    window.deleteSavedAddress = function(idx) {
        if (confirm("⚠️ Are you sure you want to delete this address?")) {
            const removedAddr = window.savedUserAddresses[idx];
            window.savedUserAddresses.splice(idx, 1);
            localStorage.setItem('saved_addresses', JSON.stringify(window.savedUserAddresses));
            
            if (selectedActiveAddress === removedAddr) {
                selectedActiveAddress = window.savedUserAddresses.length > 0 ? window.savedUserAddresses[0] : "";
                localStorage.setItem('selected_active_address', selectedActiveAddress);
            }
            renderSavedAddressesUI();
            alert("✅ Address deleted successfully!");
        }
    };

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
            setTimeout(() => { 
                if (typeof initRealGoogleMap === 'function') {
                    initRealGoogleMap(); 
                } else if (googleDeliveryMap) {
                    google.maps.event.trigger(googleDeliveryMap, 'resize');
                }
            }, 300);
        }
    }

    window.closeAddressManagerModal = function() {
        const modal = document.getElementById('addressManagerModal');
        if (modal) modal.style.display = 'none';
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
            if(authScreen) { authScreen.classList.add('app-hidden'); authScreen.style.display = 'flex'; }
        }
        calculateTotal();
        updateFloatingCartBar();
    }, 2500);

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
                    localStorage.setItem('printAppUserIdentity', data.identity || authIdentity.value.trim());
                    
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
            localStorage.removeItem('printAppUserIdentity');
            window.location.reload();
        });
    }

    // Navigation and tab helpers
    window.navigateDrawerSection = function(targetId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const targetNode = document.getElementById(`user_section_${targetId}`);
        if (targetNode) {
            targetNode.classList.add('active');
        }
        if (typeof toggleUserDrawer === 'function') toggleUserDrawer(false);
        updateFloatingCartBar();
    };
});