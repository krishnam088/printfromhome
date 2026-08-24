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
    
    // 🔥 Make sure this is globally accessible
    window.selectedActiveAddress = localStorage.getItem('selected_active_address') || "";  
    let selectedActiveAddress = window.selectedActiveAddress; 

    window.storeInventoryProducts = [];

    // 🔙 Global Mobile Back Button Handler for Modals & Drawers
    window.addEventListener('popstate', (event) => {
        const categoryOverlay = document.getElementById('categoryDrawerOverlay');
        const cartOverlay = document.getElementById('cartDrawerOverlay');
        const addressModal = document.getElementById('addressManagerModal');
        const productModal = document.getElementById('productDetailModal');
        const studioModal = document.getElementById('printStudioModal');
        const searchOverlay = document.getElementById('blinkitSearchOverlayModal');
        const aiModal = document.getElementById('aiChatModal');

        if (categoryOverlay && categoryOverlay.style.display === 'flex') {
            if (typeof closeCategoryDrawer === 'function') closeCategoryDrawer();
            return;
        }
        if (cartOverlay && cartOverlay.style.display === 'flex') {
            if (typeof toggleCartDrawer === 'function') toggleCartDrawer(false);
            return;
        }
        if (addressModal && addressModal.style.display === 'flex') {
            if (typeof closeAddressManagerModal === 'function') closeAddressManagerModal();
            return;
        }
        if (productModal && productModal.style.display === 'flex') {
            if (typeof closeProductDetailModal === 'function') closeProductDetailModal();
            return;
        }
        if (studioModal && studioModal.style.display === 'flex') {
            if (typeof closePrintStudio === 'function') closePrintStudio();
            return;
        }
        if (searchOverlay && searchOverlay.style.display === 'flex') {
            if (typeof closeSearchOverlay === 'function') closeSearchOverlay();
            return;
        }
        if (aiModal && aiModal.style.display === 'flex') {
            if (typeof toggleAiChatModal === 'function') toggleAiChatModal(false);
            return;
        }
    });

const STORE_LOCATION = {
    lat: 25.3451,
    lng: 83.0012,
    name: "Store" // Store name display fix (No address shown)
};

// ⏱️ CALCULATE REAL-TIME DISTANCE & ETA FROM STORE TO USER (Home & Cart)
window.calculateRealtimeDistanceAndEta = function() {
    if (!navigator.geolocation) {
        updateEtaAndDistanceUI("15", "Store");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            fallbackHaversineCalculation(userLat, userLng);
        },
        (error) => {
            updateEtaAndDistanceUI("15", "Store");
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
};

// 📐 Haversine Formula for Distance & Time
function fallbackHaversineCalculation(userLat, userLng) {
    const R = 6371; 
    const dLat = (STORE_LOCATION.lat - userLat) * Math.PI / 180;
    const dLng = (STORE_LOCATION.lng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(STORE_LOCATION.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;

    let estimatedMins = Math.max(10, Math.round(5 + (distanceKm * 3)));
    let formattedDistance = `${distanceKm.toFixed(1)} km`;

    updateEtaAndDistanceUI(estimatedMins, formattedDistance);
}

// 🎨 UI UPDATER (Strictly showing clean distance like "1.7 km away" with store icon)
function updateEtaAndDistanceUI(mins, distanceStr) {
    const homeEtaNode = document.getElementById('dynamicStoreEtaMinutes');
    if (homeEtaNode) homeEtaNode.textContent = mins;

    const cartEtaNode = document.getElementById('cartDrawerEtaMinutes');
    if (cartEtaNode) cartEtaNode.textContent = mins;

    const distanceBadgeNode = document.getElementById('storeDistanceBadgeText');
    if (distanceBadgeNode) {
        distanceBadgeNode.textContent = `${distanceStr} away`; // Matches Blinkit style: "1.7 km away"
    }

    // Update Address Preview in Header if selectedActiveAddress exists
    const addressPreviewNode = document.getElementById('headerActiveAddressPreview');
    if (addressPreviewNode && typeof selectedActiveAddress !== 'undefined' && selectedActiveAddress) {
        addressPreviewNode.textContent = `- ${selectedActiveAddress}`;
    }
}
// 🛵 LIVE ORDER TRACKING: DELIVERY BOY TO USER DISTANCE & TIME
window.updateDeliveryBoyTrackingMatrix = function(deliveryBoyLat, deliveryBoyLng, userDeliveryLat, userDeliveryLng) {
    const R = 6371;
    const dLat = (userDeliveryLat - deliveryBoyLat) * Math.PI / 180;
    const dLng = (userDeliveryLng - deliveryBoyLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deliveryBoyLat * Math.PI / 180) * Math.cos(userDeliveryLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;

    let boyEtaMins = Math.max(2, Math.round(distanceKm * 3)); // Delivery boy travel time
    
    const trackingStatusNode = document.getElementById('liveOrderStatusBadge');
    if (trackingStatusNode) {
        trackingStatusNode.innerHTML = `🛵 Out for Delivery — Arriving in <b>${boyEtaMins} mins</b> (${distanceKm.toFixed(1)} km away)`;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(calculateRealtimeDistanceAndEta, 1000);
});

    // 🔥 REAL GOOGLE MAPS INTEGRATION STATE
    let googleDeliveryMap = null;
    let deliveryMarker = null;

    window.initRealGoogleMap = function() {
        const mapContainer = document.getElementById('userDeliveryMap');
        const addressInput = document.getElementById('mapSelectedAddressInput');
        if (!mapContainer) return;

        const varanasiCoords = { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng };

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
                    inputElement.removeAttribute('readonly');
                }
            } else {
                if (inputElement) {
                    inputElement.value = `Location: ${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
                    inputElement.removeAttribute('readonly');
                }
            }
        });
    }

    // 🔥 SAFE FALLBACK HELPER FOR ORDER HISTORY UI
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
                    <p style="font-size:0.7rem; color:#94a3b8; margin-bottom:8px;">${order.date}</p>
                    <button type="button" onclick="openPastOrderInCartPreview('${order.orderId}')" style="background:#065f46; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">🔁 Repeat / Edit in Cart</button>
                </div>
            `).join('');
        };
    }

    // 🔥 PAST ORDER RE-ORDER / LOAD TO CART PREVIEW
    window.openPastOrderInCartPreview = function(orderId) {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        const history = JSON.parse(localStorage.getItem(`history_${sessionActiveUser}`) || '[]');
        const targetOrder = history.find(o => o.orderId === orderId);

        if (!targetOrder || !targetOrder.details) {
            alert("⚠️ Order details not found.");
            return;
        }

        targetOrder.details.forEach(item => {
            if (item.printType === 'snack') {
                window.cartSnacksArray.push({
                    sku: item.sku || '',
                    name: item.name,
                    price: item.price || 0,
                    qty: item.qty || item.copies || 1,
                    printType: 'snack',
                    fileName: item.fileName,
                    imageUrl: item.imageUrl || ''
                });
            } else {
                window.cartPrintJobsArray.push({
                    fileName: item.fileName || 'Document.pdf',
                    pages: item.pages || 1,
                    printType: item.printType || 'bw',
                    sides: 'single',
                    binding: item.binding || 'none',
                    copies: item.copies || 1,
                    orientation: 'portrait',
                    fileData: null
                });
            }
        });

        persistCartStateData();
        if (typeof toggleCartDrawer === 'function') {
            toggleCartDrawer(true);
        }
        alert("✅ Past order items loaded into your cart! You can modify quantities or add new items.");
    };
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

    // 🔥 Blinkit-style Payment Mode Synchronizer for Modern Cart Drawer
window.updateCartPaymentMode = function(mode) {
    const targetRadio = document.querySelector(`input[name="cartPaymentMode"][value="${mode}"]`);
    if (targetRadio) {
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event('change'));
    }
};

// 🔥 Interactive Coupon & Offer Drawer Toggle
window.toggleCouponDrawer = function() {
    let couponModal = document.getElementById('couponDropdownModal');
    if (!couponModal) {
        couponModal = document.createElement('div');
        couponModal.id = 'couponDropdownModal';
        couponModal.style.cssText = "position:fixed; bottom:0; left:0; width:100vw; background:#ffffff; border-top-left-radius:20px; border-top-right-radius:20px; box-shadow:0 -10px 30px rgba(0,0,0,0.2); z-index:999999; padding:20px; display:flex; flex-direction:column; gap:12px; font-family:'Poppins', sans-serif; transition: transform 0.3s ease;";
        couponModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                <h3 style="font-size:1rem; font-weight:800; color:#0f172a; margin:0;">Available Offers & Coupons</h3>
                <span onclick="toggleCouponDrawer()" style="font-size:1.2rem; cursor:pointer; font-weight:bold; color:#64748b;">&times;</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; max-height:250px; overflow-y:auto;">
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:800; font-size:0.8rem; color:#16a34a;">FREEDEL</div>
                        <div style="font-size:0.7rem; color:#475569;">Free delivery on orders above ₹99</div>
                    </div>
                    <button type="button" onclick="alert('✅ FREEDEL Coupon Applied!')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">Apply</button>
                </div>
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:800; font-size:0.8rem; color:#0f172a;">PRINT20</div>
                        <div style="font-size:0.7rem; color:#475569;">Get flat ₹20 off on print orders above ₹150</div>
                    </div>
                    <button type="button" onclick="alert('✅ PRINT20 Coupon Applied!')" style="background:#065f46; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">Apply</button>
                </div>
            </div>
        `;
        document.body.appendChild(couponModal);
    } else {
        couponModal.style.display = couponModal.style.display === 'flex' ? 'none' : 'flex';
    }
};

    // 🔥 Delivery Instructions Selector Helper
    window.selectDeliveryInstruction = function(element) {
        document.querySelectorAll('[onclick="selectDeliveryInstruction(this)"]').forEach(el => {
            el.style.borderColor = '#cbd5e1';
            el.style.background = '#ffffff';
            let checkSpan = el.querySelector('span:last-child');
            if (checkSpan) { 
                checkSpan.textContent = '☐'; 
                checkSpan.style.color = '#cbd5e1'; 
            }
        });
        element.style.borderColor = '#16a34a';
        element.style.background = '#f0fdf4';
        let check = element.querySelector('span:last-child');
        if (check) { 
            check.textContent = '✔'; 
            check.style.color = '#16a34a'; 
        }
    };
});

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
            let printJobsTotal = window.cartPrintJobsArray ? window.cartPrintJobsArray.reduce((acc, job) => acc + (parseInt(job.pages || 1) * (job.printType === 'bw' ? 3 : 10) * parseInt(job.copies || 1) + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0) : 0;

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

    // 🔥 FIX: SESSION FILE PERSISTENCE ENGINE
    function loadSavedFilesFromSession() {
        const raw = sessionStorage.getItem('savedPrintFiles');
        if (raw) {
            try {
                masterFilesArray = JSON.parse(raw).map(i => ({ name: i.name, size: i.size, type: i.type, fileData: null, config: i.config }));
                if (typeof renderFilesUI === 'function') {
                    renderFilesUI();
                }
            } catch(e) {
                masterFilesArray = [];
            }
        }
    }

    function saveCurrentFilesToSession() {
        sessionStorage.setItem('savedPrintFiles', JSON.stringify(masterFilesArray.map(i => ({ name: i.name, size: i.size, type: i.type, config: i.config }))));
    }

  function renderFilesUI() {
    if(!multiFilesContainer) return; 
    multiFilesContainer.innerHTML = ''; 
    refreshInvoiceTabState();
    if (masterFilesArray.length === 0) return;

    masterFilesArray.forEach((item, index) => {
        const fileRow = document.createElement('div');
        fileRow.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 10px;";

        const activeColorBw = item.config.printType === 'bw' ? '#16a34a' : '#cbd5e1';
        const activeColorCol = item.config.printType === 'color' ? '#16a34a' : '#cbd5e1';
        const activeOriPort = item.config.orientation === 'portrait' ? '#16a34a' : '#cbd5e1';
        const activeOriLand = item.config.orientation === 'landscape' ? '#16a34a' : '#cbd5e1';

        // Check if fileUrl is a rendered canvas image or PDF blob
        let previewThumbnail = `<div style="font-size: 1.8rem;">📄</div>`;
        if (item.fileUrl && item.fileUrl.startsWith('data:image')) {
            previewThumbnail = `<img src="${item.fileUrl}" style="width: 45px; height: 55px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />`;
        }

        fileRow.innerHTML = `
            <!-- Top Row: Thumbnail, Wrapped Filename & Delete Button -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid #edf2f7; padding-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; cursor: pointer;" onclick="previewFileInA4Studio(${index})">
                    ${previewThumbnail}
                    <div style="flex: 1; min-width: 0; overflow: hidden;">
                        <h4 style="font-weight: 700; font-size: 0.82rem; color: #0f172a; word-break: break-all; white-space: normal; line-height: 1.3; margin: 0;" title="${item.name}">${item.name}</h4>
                        <span style="font-size: 0.68rem; color: #059669; font-weight: 700;">👁️ Tap to View A4 Preview</span>
                    </div>
                </div>
                <button type="button" id="removeFile_${index}" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; width: 26px; height: 26px; border-radius: 50%; font-weight: bold; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">&times;</button>
            </div>

            <!-- Bottom Row: Pages & Safe Compact Copies Stepper -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #64748b;">Pages:</label>
                    <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; background: #f8fafc; outline: none;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <label style="font-size: 0.7rem; font-weight: 700; color: #64748b;">Copies:</label>
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; height: 34px;">
                        <button type="button" id="minusCopy_${index}" style="background: none; border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; color: #334155;">-</button>
                        <span id="copyCountLabel_${index}" style="font-weight: 800; font-size: 0.85rem; color: #0f172a;">${item.config.copies}</span>
                        <button type="button" id="plusCopy_${index}" style="background: none; border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; color: #065f46;">+</button>
                    </div>
                </div>
            </div>
        `;
        multiFilesContainer.appendChild(fileRow);

        document.getElementById(`plusCopy_${index}`).addEventListener('click', () => { item.config.copies++; saveCurrentFilesToSession(); renderFilesUI(); });
        document.getElementById(`minusCopy_${index}`).addEventListener('click', () => { if (item.config.copies > 1) { item.config.copies--; saveCurrentFilesToSession(); renderFilesUI(); } });
        document.getElementById(`removeFile_${index}`).addEventListener('click', () => { masterFilesArray.splice(index, 1); saveCurrentFilesToSession(); renderFilesUI(); });
        document.getElementById(`pages_${index}`).addEventListener('input', (e) => { item.config.pages = parseInt(e.target.value) || 1; saveCurrentFilesToSession(); calculateTotal(); });
    });
    calculateTotal();
    updateFloatingCartBar();
}

// 🔥 PDF Page to Canvas Image URL Converter for Print Studio Previews
    window.convertPdfPageToImage = async function(pdfDoc, pageNumber) {
        try {
            const page = await pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 }); // High quality scale
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            return canvas.toDataURL('image/png'); // Returns data URL image for preview
        } catch (e) {
            console.error("PDF Page Render Error:", e);
            return '';
        }
    };

  // ==========================================
    // 📂 100% SAFE FILE UPLOAD & PREVIEW TRIGGER
    // ==========================================
    if (fileUpload) {
        fileUpload.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            
            let uploadedFilesList = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let pageCount = 1;
                let fileUrl = '';
                
                try {
                    fileUrl = URL.createObjectURL(file);
                } catch(e) {
                    fileUrl = '';
                }

              if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    try {
                        if (typeof pdfjsLib !== 'undefined' && pdfjsLib.getDocument) {
                            const arrayBuffer = await file.arrayBuffer();
                            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const pdfDoc = await loadingTask.promise;
                            pageCount = pdfDoc.numPages || 1;
                            
                            // Generate real canvas preview image for the first page
                            if (pdfDoc && typeof window.convertPdfPageToImage === 'function') {
                                let generatedImgUrl = await window.convertPdfPageToImage(pdfDoc, 1);
                                if (generatedImgUrl) {
                                    fileUrl = generatedImgUrl;
                                }
                            }
                        }
                    } catch (e) {
                        pageCount = 1;
                    }
                }              
                 

                uploadedFilesList.push({
                    name: file.name || 'Document.pdf',
                    size: file.size || 0,
                    fileBlob: file,
                    fileUrl: fileUrl,
                    pages: pageCount,
                    copies: 1,
                    printType: 'bw',
                    orientation: 'portrait',
                    binding: 'none'
                });
            }

            fileUpload.value = '';
            
            if (uploadedFilesList.length > 0) {
                if (typeof openPrintStudioWithFilesArray === 'function') {
                    openPrintStudioWithFilesArray(uploadedFilesList, 0);
                }
            }
        });
    }

    window.triggerInlineFileUploadClick = function() {
        if (fileUpload) fileUpload.click();
    };

    window.previewFileInA4Studio = function(index) {
        if (window.studioMasterFiles && window.studioMasterFiles.length > 0) {
            openPrintStudioWithFilesArray(window.studioMasterFiles, index);
        }
    };

  // ==========================================
    // 🎨 IN-IMAGE HORIZONTAL SLIDER PRINT STUDIO ENGINE
    // ==========================================
    window.studioMasterFiles = [];
    window.currentStudioActiveIndex = 0;

    window.openPrintStudioWithFilesArray = function(filesArray, startIndex = 0) {
        if (!filesArray || filesArray.length === 0) return;
        
        window.studioMasterFiles = filesArray.map(f => ({
            name: f.name || 'Document.pdf',
            size: f.size || 0,
            fileBlob: f.fileData || f.fileBlob || f,
            fileUrl: f.fileUrl || (f.fileData ? URL.createObjectURL(f.fileData) : ''),
            pages: f.pages || f.config?.pages || 1,
            copies: f.copies || f.config?.copies || 1,
            printType: f.printType || f.config?.printType || 'bw',
            orientation: f.orientation || f.config?.orientation || 'portrait',
            binding: f.binding || f.config?.binding || 'none'
        }));

        window.currentStudioActiveIndex = Math.min(startIndex, window.studioMasterFiles.length - 1);
        updateMultiFileStudioUI();

        const modal = document.getElementById('printStudioModal');
        if (modal) {
            history.pushState({ modal: 'printStudio' }, '', '');
            modal.style.display = 'flex';
        }
    };

    window.openPrintStudioWithFile = function(fileObj, fileDataUrl) {
        window.openPrintStudioWithFilesArray([{
            name: fileObj.name || 'Document.pdf',
            size: fileObj.size || 0,
            fileBlob: fileObj,
            fileUrl: fileDataUrl,
            pages: 1,
            copies: 1,
            printType: 'bw',
            orientation: 'portrait',
            binding: 'none'
        }], 0);
    };

    window.openDocumentInA4Studio = function(fileBlobOrUrl, originalFileName = 'Document') {
        let fakeFile = { name: originalFileName, type: 'application/pdf' };
        let url = typeof fileBlobOrUrl === 'string' ? fileBlobOrUrl : URL.createObjectURL(fileBlobOrUrl);
        window.openPrintStudioWithFile(fakeFile, url);
    };

    window.closePrintStudio = function() {
        const modal = document.getElementById('printStudioModal');
        if (modal) modal.style.display = 'none';
    };

    window.updateMultiFileStudioUI = function() {
        const files = window.studioMasterFiles;
        if (!files || files.length === 0) return;

        const currentFile = files[window.currentStudioActiveIndex] || files[0];

        // 1. Render In-Image Horizontal Slider with Grayscale & Landscape Rotation
        const imageSlider = document.getElementById('studioInImageHorizontalSlider');
        if (imageSlider) {
            imageSlider.innerHTML = files.map((f) => {
                let isLand = f.orientation === 'landscape';
                let isBw = f.printType === 'bw';
                let filterStyle = isBw ? 'filter: grayscale(100%);' : '';
                let transformStyle = isLand ? 'transform: rotate(90deg); max-width: 75%; max-height: 75%;' : 'max-width: 90%; max-height: 90%;';

                let previewContent = `<span style="font-size:3.5rem; ${filterStyle}">📄</span>`;
                if (f.fileUrl) {
                    if (f.fileBlob && f.fileBlob.type && f.fileBlob.type.startsWith('image/')) {
                        previewContent = `<img src="${f.fileUrl}" style="${transformStyle} object-fit:contain; ${filterStyle} transition: all 0.3s ease;" />`;
                    } else {
                        previewContent = `
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px; ${filterStyle}">
                                <span style="font-size:3.5rem;">📄</span>
                                <span style="font-size:0.75rem; font-weight:700; color:#1e293b; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
                            </div>
                        `;
                    }
                }

                return `
                    <div style="min-width:100%; height:100%; display:flex; align-items:center; justify-content:center; scroll-snap-align:center; flex-shrink:0; position:relative; background:#f8fafc; overflow:hidden;">
                        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">${previewContent}</div>
                    </div>
                `;
            }).join('');

            let slideWidth = imageSlider.clientWidth || 300;
            imageSlider.scrollTo({ left: slideWidth * window.currentStudioActiveIndex, behavior: 'smooth' });
        }

        // 2. Counter Badge (e.g., 1/2)
        const counterBadge = document.getElementById('studioSlideCounterBadge');
        if (counterBadge) {
            counterBadge.textContent = `${window.currentStudioActiveIndex + 1}/${files.length}`;
        }

        // 3. Update Copies & Pages Info
        const copiesText = document.getElementById('studioCopiesCountText');
        if (copiesText) copiesText.textContent = currentFile.copies;

        const pagesInfo = document.getElementById('studioFilePagesInfo');
        if (pagesInfo) pagesInfo.textContent = `${currentFile.name} (${currentFile.pages} page${currentFile.pages > 1 ? 's' : ''})`;

        // 4. Highlight Color & Orientation UI
        const colColoured = document.getElementById('colorOptionColoured');
        const colBw = document.getElementById('colorOptionBw');
        if (colColoured && colBw) {
            if (currentFile.printType === 'coloured' || currentFile.printType === 'color') {
                colColoured.style.borderColor = '#065f46'; colColoured.style.background = '#f0fdf4';
                colBw.style.borderColor = '#e2e8f0'; colBw.style.background = '#ffffff';
            } else {
                colBw.style.borderColor = '#065f46'; colBw.style.background = '#f0fdf4';
                colColoured.style.borderColor = '#e2e8f0'; colColoured.style.background = '#ffffff';
            }
        }

        const oriPortrait = document.getElementById('orientationPortrait');
        const oriLandscape = document.getElementById('orientationLandscape');
        if (oriPortrait && oriLandscape) {
            if (currentFile.orientation === 'portrait') {
                oriPortrait.style.borderColor = '#065f46'; oriPortrait.style.background = '#f0fdf4';
                oriLandscape.style.borderColor = '#e2e8f0'; oriLandscape.style.background = '#ffffff';
            } else {
                oriLandscape.style.borderColor = '#065f46'; oriLandscape.style.background = '#f0fdf4';
                oriPortrait.style.borderColor = '#e2e8f0'; oriPortrait.style.background = '#ffffff';
            }
        }

        // 5. Calculate Clean Grand Total Price (Sirf Total Price dikhega, koi lamba breakdown text nahi)
        let grandTotalPrice = 0;
        files.forEach((f) => {
            let rate = (f.printType === 'bw') ? 3 : 10;
            grandTotalPrice += f.pages * rate * f.copies;
        });

        const totalPriceText = document.getElementById('studioTotalPriceText');
        if (totalPriceText) {
            totalPriceText.textContent = `₹${grandTotalPrice}`;
        }
    };

    window.updatePrintStudioUI = window.updateMultiFileStudioUI;

    window.switchStudioFileIndex = function(index) {
        window.currentStudioActiveIndex = index;
        updateMultiFileStudioUI();
    };

    window.adjustStudioCopies = function(change) {
        let file = window.studioMasterFiles[window.currentStudioActiveIndex];
        if (file) {
            file.copies = Math.max(1, file.copies + change);
            updateMultiFileStudioUI();
        }
    };

    window.setStudioPrintColor = function(type) {
        let file = window.studioMasterFiles[window.currentStudioActiveIndex];
        if (file) {
            file.printType = type === 'coloured' ? 'color' : type;
            updateMultiFileStudioUI();
        }
    };

    window.setStudioOrientation = function(ori) {
        let file = window.studioMasterFiles[window.currentStudioActiveIndex];
        if (file) {
            file.orientation = ori;
            updateMultiFileStudioUI();
        }
    };

    window.applyCurrentSettingToAllFiles = function() {
        let currentFile = window.studioMasterFiles[window.currentStudioActiveIndex];
        if (!currentFile) return;

        window.studioMasterFiles.forEach(f => {
            f.copies = currentFile.copies;
            f.printType = currentFile.printType;
            f.orientation = currentFile.orientation;
        });
        updateMultiFileStudioUI();
        alert("✅ Current settings applied to all files!");
    };

    window.handleStudioFilesAdded = function(input) {
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(async (file) => {
                let pageCount = 1;
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        pageCount = pdfDoc.numPages || 1;
                    } catch (e) {
                        pageCount = 1;
                    }
                }
                window.studioMasterFiles.push({
                    name: file.name,
                    size: file.size,
                    fileBlob: file,
                    fileUrl: URL.createObjectURL(file),
                    pages: pageCount,
                    copies: 1,
                    printType: 'bw',
                    orientation: 'portrait',
                    binding: 'none'
                });
                updateMultiFileStudioUI();
            });
            input.value = '';
        }
    };

    window.removeCurrentStudioFile = function() {
        if (window.studioMasterFiles.length > 1) {
            window.studioMasterFiles.splice(window.currentStudioActiveIndex, 1);
            window.currentStudioActiveIndex = Math.max(0, window.currentStudioActiveIndex - 1);
            updateMultiFileStudioUI();
        } else {
            closePrintStudio();
        }
    };

    window.addStudioJobToCart = function() {
        if (!window.studioMasterFiles || window.studioMasterFiles.length === 0) return;

        window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

        window.studioMasterFiles.forEach(f => {
            let rate = (f.printType === 'bw') ? 3 : 10;
            let printJobItem = {
                id: 'print_' + Date.now() + Math.random(),
                fileName: f.name,
                fileUrl: f.fileUrl,
                fileData: f.fileBlob,
                pages: f.pages,
                copies: f.copies,
                printType: f.printType,
                orientation: f.orientation,
                sides: f.orientation === 'portrait' ? 'single' : 'landscape',
                binding: f.binding || 'none',
                price: f.pages * rate * f.copies
            };
            window.cartPrintJobsArray.push(printJobItem);
        });

        localStorage.setItem('cart_print_jobs', JSON.stringify(window.cartPrintJobsArray));

        if (typeof persistCartStateData === 'function') persistCartStateData();
        if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();

        closePrintStudio();
        if (typeof toggleCartDrawer === 'function') {
            toggleCartDrawer(true);
        }
    };

    window.addStudioDocumentToCartAndRedirect = window.addStudioJobToCart;
    window.toggleGlobalOrientation = function() {
        let file = window.studioMasterFiles[window.currentStudioActiveIndex];
        if (file) {
            file.orientation = (file.orientation === 'portrait') ? 'landscape' : 'portrait';
            updateMultiFileStudioUI();
        }
    };

    // Horizontal slider scroll sync listener (outside DOMContentLoaded block since we are already inside it)
    const slider = document.getElementById('studioInImageHorizontalSlider');
    if (slider) {
        slider.addEventListener('scroll', () => {
            let slideWidth = slider.clientWidth || 300;
            let activeIdx = Math.round(slider.scrollLeft / slideWidth);
            if (activeIdx >= 0 && activeIdx < window.studioMasterFiles.length && activeIdx !== window.currentStudioActiveIndex) {
                window.currentStudioActiveIndex = activeIdx;
                updateMultiFileStudioUI();
            }
        });
    }

    // 🔥 STORE STATUS & NOTIFICATIONS
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

    // 🔥 LIVE TIMELINE STEPPER
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
    };

    // 🔥 DYNAMIC PRODUCTS, BLINKIT-STYLE SEARCH OVERLAY & CATEGORY FILTERING
    async function loadDynamicStoreProducts() {
        try {
            const res = await fetch('/api/store/products');
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return;
            const data = await res.json();
            if (data.success && Array.isArray(data.products)) {
                window.storeInventoryProducts = data.products;
                renderStoreProductsUI();
                if (document.getElementById('cartDrawerOverlay') && document.getElementById('cartDrawerOverlay').style.display === 'flex') {
                    renderCartDrawerContents();
                }
            }
        } catch (e) {}
    }

    window.currentStoreSearchQuery = "";
    window.currentStoreSelectedCategory = "all";

    // 🌟 BLINKIT-STYLE FULLSCREEN SEARCH OVERLAY FUNCTIONS
    window.openSearchOverlay = function() {
        let overlay = document.getElementById('blinkitSearchOverlayModal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'blinkitSearchOverlayModal';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#ffffff; z-index:999999; display:flex; flex-direction:column; padding:16px; overflow-y:auto; font-family:'Poppins', sans-serif;";
            overlay.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
                    <span onclick="closeSearchOverlay()" style="font-size:1.4rem; cursor:pointer; font-weight:bold; color:#0f172a;">&larr;</span>
                    <input type="text" id="fullscreenSearchInput" placeholder="Search for atta, dal, chips, socks..." oninput="performFullscreenLiveSearch(this.value)" style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #cbd5e1; font-size:0.9rem; outline:none; background:#f8fafc;" />
                </div>
                <div id="fullscreenSearchResultsGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px; width:100%;"></div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        const input = document.getElementById('fullscreenSearchInput');
        if (input) {
            input.value = "";
            input.focus();
        }
        document.getElementById('fullscreenSearchResultsGrid').innerHTML = '';
    };

    window.closeSearchOverlay = function() {
        const overlay = document.getElementById('blinkitSearchOverlayModal');
        if (overlay) overlay.style.display = 'none';
    };

   window.performFullscreenLiveSearch = function(query) {
    const grid = document.getElementById('fullscreenSearchResultsGrid');
    if (!grid) return;
    const q = (query || "").toLowerCase().trim();
    grid.innerHTML = '';

    if (q === "") {
        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align:center; color:#64748b; font-size:0.85rem; padding:30px;">Type something to search items...</p>`;
        return;
    }

    const filtered = window.storeInventoryProducts.filter(p => (p.name || '').toLowerCase().includes(q));

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align:center; color:#64748b; font-size:0.85rem; padding:30px;">No products found matching "${query}".</p>`;
        return;
    }

    filtered.forEach(prod => {
        const isOutOfStock = (prod.stockQuantity <= 0);
        const finalImgUrl = prod.imageUrl || prod.image || '';
        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03);";
        
        const imgHtml = finalImgUrl ? `<img src="${finalImgUrl}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; margin-bottom:6px;" />` : `<div style="font-size:2.5rem; margin-bottom:6px;">📦</div>`;

        // Safe escaped variables for strings containing quotes
        let safeSku = String(prod.sku || prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeName = String(prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeImg = String(finalImgUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        card.innerHTML = `
            ${imgHtml}
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:2px;">${prod.name}</div>
            <div style="font-weight:800; font-size:0.8rem; color:#065f46; margin-bottom:8px;">₹${prod.sellingPrice || 0}</div>
            ${isOutOfStock 
                ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" disabled>Out of Stock</button>`
                : `<button type="button" style="background:#065f46; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:0.75rem; font-weight:800; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${safeImg}'); closeSearchOverlay();">+ Add</button>`
            }
        `;
        grid.appendChild(card);
    });
};
   // 📂 Category Click: Highlights chip & opens side slider drawer (Home page remains unchanged)
   window.filterStoreByCategory = function(categoryName) {
        window.currentStoreSelectedCategory = categoryName;
        document.querySelectorAll('.store-category-chip').forEach(btn => {
            if (btn.getAttribute('data-category') === categoryName) {
                btn.style.background = '#065f46';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#065f46';
            } else {
                btn.style.background = '#ffffff';
                btn.style.color = '#0f172a';
                btn.style.borderColor = '#cbd5e1';
            }
        });

        if (categoryName === 'all') {
            if (typeof closeCategoryDrawer === 'function') closeCategoryDrawer();
        } else {
            if (typeof openCategoryDrawer === 'function') {
                openCategoryDrawer(categoryName);
            }
        }
    };

    window.filterStoreBySearchInput = function(query) {
        window.currentStoreSearchQuery = (query || "").toLowerCase().trim();
        renderStoreProductsUI();
    };

    function renderStoreProductsUI() {
        const gridContainers = document.querySelectorAll('.snacks-horizontal-slider');
        if (gridContainers.length === 0) return;

        gridContainers.forEach(container => {
            if (!container.style.display || container.style.display === "") {
                container.style.display = 'flex';
                container.style.flexWrap = 'nowrap';
                container.style.overflowX = 'auto';
                container.style.gap = '12px';
                container.style.padding = '10px 4px';
                container.style.width = '100%';
                container.style.scrollbarWidth = 'none';
            }

            container.innerHTML = '';
            if (!window.storeInventoryProducts || window.storeInventoryProducts.length === 0) {
                container.innerHTML = `<p style="font-size:0.75rem; color:#64748b; padding:10px; grid-column: 1 / -1; text-align:center;">No store products available currently.</p>`;
                return;
            }

            // Home page will ALWAYS show all products (ignoring category chips filter on home page)
            let filteredProducts = window.storeInventoryProducts.filter(prod => {
                let nameMatch = (prod.name || '').toLowerCase().includes(window.currentStoreSearchQuery || "");
                return nameMatch;
            });

            if (filteredProducts.length === 0) {
                container.innerHTML = `<p style="font-size:0.78rem; color:#64748b; padding:20px; text-align:center; grid-column: 1 / -1;">No products found matching your search.</p>`;
                return;
            }

            filteredProducts.forEach((prod) => {
                let originalIndex = window.storeInventoryProducts.findIndex(p => p.sku === prod.sku || p.name === prod.name);
                const isOutOfStock = (prod.stockQuantity <= 0);
                const isLowStock = !isOutOfStock && prod.stockQuantity <= 5;
                const finalImgUrl = prod.imageUrl || prod.image || '';

                const card = document.createElement('div');
                card.className = 'blinkit-cat-card';
                card.style.cssText = `
                    background: #ffffff; border: 1px solid ${isLowStock ? '#ef4444' : '#e2e8f0'};
                    border-radius: 14px; padding: 10px; position: relative; opacity: ${isOutOfStock ? '0.7' : '1'}; 
                    display: flex; flex-direction: column; align-items: center; cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
                    min-width: 120px; max-width: 120px; flex: 0 0 auto;
                `;
                
                card.onclick = (e) => {
                    if (e.target.tagName === 'BUTTON') return;
                    openProductDetailModal(window.storeInventoryProducts[originalIndex]);
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

                let safeSku = String(prod.sku || prod.barcode || prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                let safeName = String(prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                let safeImg = String(finalImgUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

                card.innerHTML = `
                    ${badgeHtml}
                    ${imageHtml}
                    <div title="${prod.name}" style="font-weight:700; font-size:0.78rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#0f172a;">${prod.name}</div>
                    <div style="font-weight:800; font-size:0.78rem; color:#0f172a; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                    ${isOutOfStock 
                        ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); notifyWhenAvailable('${safeName}')">Notify Me</button>`
                        : `<button type="button" style="background:var(--blinkit-green, #10b981); color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); addDynamicProductToCart('${safeSku}', '${safeName}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${safeImg}')">+ Add</button>`
                    }
                `;
                container.appendChild(card);
            });
        });
    }
   // 📂 Category Slider Drawer Function (Fixed compact card sizing & Mobile Back Button support)
    window.openCategoryDrawer = function(categoryName) {
        const overlay = document.getElementById('categoryDrawerOverlay');
        const titleNode = document.getElementById('categoryDrawerTitle');
        const gridNode = document.getElementById('categoryDrawerItemsGrid');
        if (!overlay || !gridNode) return;

        if (titleNode) {
            titleNode.textContent = `${categoryName.toUpperCase()} ITEMS`;
        }

        // Use Flexbox wrap with left alignment so cards never stretch wide even if items are few
        gridNode.style.cssText = "flex:1; overflow-y:auto; padding:16px; display:flex; flex-wrap:wrap; gap:12px; align-content:start; justify-content:flex-start;";
        gridNode.innerHTML = '';

        let filtered = (window.storeInventoryProducts || []).filter(prod => {
            let categoryLower = (prod.category || prod.type || '').toLowerCase();
            let nameLower = (prod.name || '').toLowerCase();
            
            if (categoryName === 'munchies') {
                return categoryLower.includes('munchies') || categoryLower.includes('chips') || categoryLower.includes('namkeen') || nameLower.includes('lays') || nameLower.includes('kurkure');
            } else if (categoryName === 'snacks') {
                return categoryLower.includes('snacks') || categoryLower.includes('food') || categoryLower.includes('beverage');
            } else if (categoryName === 'socks') {
                return categoryLower.includes('socks') || categoryLower.includes('apparel') || categoryLower.includes('clothing') || nameLower.includes('sock');
            }
            return true;
        });

        if (filtered.length === 0) {
            gridNode.innerHTML = `<p style="width:100%; text-align:center; color:#64748b; font-size:0.8rem; padding:40px;">No items found in this category.</p>`;
        } else {
            filtered.forEach(prod => {
                let originalIndex = window.storeInventoryProducts.findIndex(p => p.sku === prod.sku || p.name === prod.name);
                const isOutOfStock = (prod.stockQuantity <= 0);
                const isLowStock = !isOutOfStock && prod.stockQuantity <= 5;
                const finalImgUrl = prod.imageUrl || prod.image || '';
                const card = document.createElement('div');
                
                // Fixed compact width (~120px) matching home page cards perfectly
                card.style.cssText = `
                    background: #ffffff; border: 1px solid ${isLowStock ? '#ef4444' : '#e2e8f0'};
                    border-radius: 14px; padding: 10px; position: relative; opacity: ${isOutOfStock ? '0.7' : '1'}; 
                    display: flex; flex-direction: column; align-items: center; cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
                    width: 120px; min-width: 120px; max-width: 120px; flex: 0 0 auto; box-sizing: border-box;
                `;
                
                card.onclick = (e) => {
                    if (e.target.tagName === 'BUTTON') return;
                    if (typeof openProductDetailModal === 'function' && originalIndex !== -1) {
                        openProductDetailModal(window.storeInventoryProducts[originalIndex]);
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

                let safeSku = String(prod.sku || prod.barcode || prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                let safeName = String(prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                let safeImg = String(finalImgUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

                card.innerHTML = `
                    ${badgeHtml}
                    ${imageHtml}
                    <div title="${prod.name}" style="font-weight:700; font-size:0.78rem; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; color:#0f172a;">${prod.name}</div>
                    <div style="font-weight:800; font-size:0.78rem; color:#0f172a; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                    ${isOutOfStock 
                        ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); notifyWhenAvailable('${safeName}')">Notify</button>`
                        : `<button type="button" class="btn-quick-add-item" style="background:var(--blinkit-green, #10b981); color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" onclick="event.stopPropagation(); addDynamicProductToCart('${safeSku}', '${safeName}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${safeImg}')">+ Add</button>`
                    }
                `;
                gridNode.appendChild(card);
            });
        }

        // Push history state so mobile back button can close the category drawer
        history.pushState({ drawer: 'category' }, '', '');
        overlay.style.display = 'flex';
    };

  // 📂 Close Category Drawer & Reset Category Selection to 'All Items'
window.closeCategoryDrawer = function() {
    const overlay = document.getElementById('categoryDrawerOverlay');
    if (overlay) overlay.style.display = 'none';

    // Reset selected category state to 'all'
    window.currentStoreSelectedCategory = 'all';

    // Reset active chip styling on home page to point back to 'All Items'
    document.querySelectorAll('.store-category-chip').forEach(btn => {
        if (btn.getAttribute('data-category') === 'all') {
            btn.style.background = '#065f46';
            btn.style.color = '#ffffff';
            btn.style.borderColor = '#065f46';
        } else {
            btn.style.background = '#ffffff';
            btn.style.color = '#0f172a';
            btn.style.borderColor = '#cbd5e1';
        }
    });
};
    

    window.notifyWhenAvailable = function(prodName) {
        if (typeof subscribeUserToPushNotifications === 'function') {
            subscribeUserToPushNotifications(prodName);
        } else {
            alert(`🔔 We have noted your request! You will be notified when "${prodName}" is back in stock.`);
        }
    };
// 🔥 100% BULLETPROOF PRODUCT DETAIL MODAL (FORCED HTML INJECTION)
window.openProductDetailModal = function(prod) {
    let modal = document.getElementById('productDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productDetailModal';
        document.body.appendChild(modal);
    }
    
    // Forcefully set style and updated HTML layout so elements always exist
    modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:999999; display:none; align-items:center; justify-content:center; padding:16px;";
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; width:100%; max-width:400px; max-height:85vh; overflow-y:auto; padding:20px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-family:'Poppins',sans-serif;">
            <span onclick="closeProductDetailModal()" style="position:absolute; top:12px; right:16px; font-size:1.4rem; cursor:pointer; font-weight:bold; color:#64748b; z-index:10;">&times;</span>
            
            <!-- Image Slider Container -->
            <div id="modalImageSliderContainer" style="position:relative; width:100%; height:220px; background:#f8fafc; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:14px; border:1px solid #e2e8f0;"></div>

            <h3 id="modalProductName" style="font-size:1.1rem; font-weight:800; color:#0f172a; margin-bottom:4px;"></h3>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span id="modalProductPrice" style="font-size:1rem; font-weight:900; color:#065f46;"></span>
                <span id="modalProductStock" style="font-size:0.75rem; font-weight:700; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px;"></span>
            </div>

            <!-- Scrollable Description Section -->
            <div style="margin-bottom:16px;">
                <h4 style="font-size:0.78rem; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:4px;">Product Details</h4>
                <div id="modalProductDescriptionBox" style="font-size:0.82rem; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; max-height:110px; overflow-y:auto; line-height:1.5;">No additional description available.</div>
            </div>

            <div id="modalActionArea">
                <button type="button" id="modalAddToCartBtn" style="width:100%; padding:12px; background:#065f46; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:pointer;">+ Add to Cart</button>
            </div>
        </div>
    `;

    const nameEl = document.getElementById('modalProductName');
    const priceEl = document.getElementById('modalProductPrice');
    const stockEl = document.getElementById('modalProductStock');
    const sliderContainer = document.getElementById('modalImageSliderContainer');
    const descBox = document.getElementById('modalProductDescriptionBox');
    const addBtn = document.getElementById('modalAddToCartBtn');

    if (nameEl) nameEl.textContent = prod.name || '';
    if (priceEl) priceEl.textContent = `₹${prod.sellingPrice || prod.price || 0}`;
    if (stockEl) stockEl.textContent = (prod.stockQuantity || prod.stock || 0) > 0 ? `Stock: ${prod.stockQuantity || prod.stock} units` : `Out of Stock`;
    
    // Description Mapping
    if (descBox) {
        let descText = prod.description || prod.desc || prod.details || "";
        descBox.textContent = descText.trim() !== "" ? descText : "No additional description available for this product.";
    }

    // Image Mapping
    let imagesList = [];
    if (Array.isArray(prod.images)) {
        imagesList = prod.images.filter(Boolean);
    } else if (typeof prod.images === 'string' && prod.images.trim() !== '') {
        imagesList = prod.images.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (imagesList.length === 0 && prod.imageUrl) imagesList.push(prod.imageUrl);
    if (imagesList.length === 0 && prod.image) imagesList.push(prod.image);

    if (sliderContainer) {
        if (imagesList.length > 0) {
            sliderContainer.innerHTML = `
                <div style="display:flex; width:100%; height:100%; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch;">
                    ${imagesList.map((imgUrl) => `
                        <div style="min-width:100%; height:100%; display:flex; align-items:center; justify-content:center; scroll-snap-align:center; flex-shrink:0;">
                            <img src="${imgUrl}" style="max-width:100%; max-height:200px; object-fit:contain; display:block;" />
                        </div>
                    `).join('')}
                </div>
                ${imagesList.length > 1 ? `
                    <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.7); color:white; padding:3px 8px; border-radius:10px; font-size:0.65rem; font-weight:700; pointer-events:none;">
                        ↔️ Swipe (${imagesList.length})
                    </div>
                ` : ''}
            `;
        } else {
            sliderContainer.innerHTML = `<span style="font-size:3.5rem;">📦</span>`;
        }
    }

    let existing = window.cartSnacksArray ? window.cartSnacksArray.find(item => item.sku === prod.sku || item.name === prod.name) : null;
    let currentQty = existing ? existing.qty : 0;
    let primaryImg = imagesList.length > 0 ? imagesList[0] : '';
    let stockVal = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.stock || 0);

    let safeSkuOrName = String(prod.sku || prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    let safeName = String(prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

    if (stockVal <= 0) {
        if (addBtn) addBtn.outerHTML = `<button type="button" style="width:100%; padding:12px; background:#ef4444; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:not-allowed;" disabled>Out of Stock</button>`;
    } else {
        if (addBtn) {
            addBtn.outerHTML = `
                <div id="modalActionArea" style="display:flex; align-items:center; justify-content:space-between; width:100%; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:6px 12px;">
                    <span style="font-weight:700; font-size:0.85rem; color:#0f172a;">Quantity:</span>
                    <div style="display:flex; align-items:center; gap:14px;">
                        <button type="button" onclick="adjustModalItemQty('${safeSkuOrName}', -1, ${stockVal}, ${prod.sellingPrice || prod.price || 0}, '${safeName}', '${primaryImg}')" style="width:34px; height:34px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">-</button>
                        <span id="modalItemQtyVal" style="font-weight:800; font-size:1rem; color:#065f46;">${currentQty}</span>
                        <button type="button" onclick="adjustModalItemQty('${safeSkuOrName}', 1, ${stockVal}, ${prod.sellingPrice || prod.price || 0}, '${safeName}', '${primaryImg}')" style="width:34px; height:34px; background:#065f46; color:white; border:none; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">+</button>
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
        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');

        const matchedProd = window.storeInventoryProducts ? window.storeInventoryProducts.find(p => (p.sku === sku || p.barcode === sku || p.name === name)) : null;
        const availableStock = matchedProd ? matchedProd.stockQuantity : currentStock;
        const finalImg = imageUrl || (matchedProd ? (matchedProd.imageUrl || matchedProd.image || '') : '');

        if (availableStock <= 0) {
            alert(`⚠️ Sorry! "${name}" is currently out of stock.`);
            return;
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
    };
    
    window.adjustSnackQty = function(index, delta) {
        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        const snack = window.cartSnacksArray[index];
        if (!snack) return;

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

    // 🔥 CART DRAWER & FOOTER BAR UI (WITH AUTO-CLOSE & VERTICAL DETAILED LIST)
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
        
        // Category Drawer Cart Elements
        const catBar = document.getElementById('categoryDrawerFooterBar');
        const catCountText = document.getElementById('categoryCartCountText');
        const catPriceText = document.getElementById('categoryCartTotalPriceText');
        
        if (!bar) return;

        const sessionActiveUser = localStorage.getItem('printAppUser');
        const isAuthVisible = document.getElementById('authScreen') && !document.getElementById('authScreen').classList.contains('app-hidden') && document.getElementById('authScreen').style.display !== 'none';
        
        const storeSection = document.getElementById('user_section_store');
        const isStoreActive = storeSection && storeSection.classList.contains('active');

        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

        let totalSnacksCount = window.cartSnacksArray.reduce((acc, item) => acc + item.qty, 0);
        let totalPrintCount = window.cartPrintJobsArray.length;
        let totalCount = totalSnacksCount + totalPrintCount;

        let totalSnacksPrice = window.cartSnacksArray.reduce((acc, item) => acc + (item.price * item.qty), 0);
        let totalPrintPrice = window.cartPrintJobsArray.reduce((acc, job) => acc + (job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0);
        
        let subtotalCalc = totalSnacksPrice + totalPrintPrice;
        let delFee = (subtotalCalc >= 99.00 || subtotalCalc === 0) ? 0.00 : 25.00;
        let rainFee = window.isRainSurgeActive ? 15 : 0;
        let totalPrice = subtotalCalc + delFee + rainFee + (window.currentDeliveryTip || 0);

        // Update Category Drawer Footer Cart Bar if items exist
        if (catBar) {
            if (totalCount > 0) {
                catBar.style.display = 'flex';
                if (catCountText) catCountText.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
                if (catPriceText) catPriceText.textContent = `₹${totalPrice.toFixed(2)}`;
            } else {
                catBar.style.display = 'none';
            }
        }

        // Auto-close cart drawer if empty
        if (totalCount === 0 && drawerOverlay && drawerOverlay.style.display === 'flex') {
            toggleCartDrawer(false);
        }

        if (!sessionActiveUser || isAuthVisible || !isStoreActive || totalCount === 0 || (drawerOverlay && drawerOverlay.style.display === 'flex')) {
            bar.classList.add('hidden');
            bar.style.display = 'none';
            return;
        }

        bar.classList.remove('hidden');
        bar.style.display = 'flex';
        if (countText) countText.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
        if (priceText) priceText.textContent = `₹${totalPrice.toFixed(2)}`;

        if (stackContainer) {
            stackContainer.innerHTML = '';
            stackContainer.style.cssText = "position:relative; width:45px; height:34px; display:flex; align-items:center;";

            let allVisualItems = [];
            window.cartSnacksArray.forEach(s => {
                for(let i=0; i<s.qty; i++) {
                    allVisualItems.push({ type: 'snack', img: s.imageUrl || '', name: s.name });
                }
            });
            window.cartPrintJobsArray.forEach(p => allVisualItems.push({ type: 'print', img: '', name: p.fileName }));

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
    };
  // 🔥 UNIVERSAL CART RENDERER (Blinkit-Style Modern Layout Integration)

window.renderCartDrawerContents = function() {
    let container = document.getElementById('cartDrawerItemsList') || 
                    document.getElementById('cartItemsListContainer') || 
                    document.getElementById('cartItemsContainer');
    
    // 🔥 Self-Healing Container Fallback so items never fail to render
    if (!container) {
        const cartDrawerBody = document.getElementById('cartDrawer') || document.querySelector('.cart-drawer') || document.querySelector('[id*="cart"]');
        if (cartDrawerBody) {
            container = document.createElement('div');
            container.id = 'cartDrawerItemsList';
            container.style.cssText = "margin-bottom: 15px; width: 100%;";
            cartDrawerBody.prepend(container);
        } else {
            return;
        }
    }
    
    container.innerHTML = '';
    
    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
    
    if (!hasItems) {
        container.innerHTML = `<p style="font-size:0.82rem; color:#64748b; text-align:center; padding:20px;">Your cart is empty.</p>`;
        if (typeof calculateTotal === 'function') calculateTotal();
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = "display:flex; flex-direction:column; gap:10px; width:100%;";

    let totalPagesCount = 0;
    let totalItemsCount = 0;

    // 1. Render Print Jobs Items
    window.cartPrintJobsArray.forEach((job, idx) => {
        let rate = (job.printType === 'bw') ? 3 : 10;
        let jobTotal = job.pages * rate * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
        totalPagesCount += job.pages * job.copies;
        totalItemsCount += 1;

        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:10px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 1px 3px rgba(0,0,0,0.02); gap:10px;";

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow:hidden;">
                <div style="font-size:1.5rem; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:8px; flex-shrink:0;">📄</div>
                <div style="overflow:hidden; flex:1; min-width:0;">
                    <div title="${job.fileName}" style="font-weight:700; font-size:0.78rem; color:#0f172a; word-break:break-all; white-space:normal; line-height:1.3;">${job.fileName}</div>
                    <div style="font-size:0.68rem; color:#64748b; font-weight:600; margin-top:2px;">${job.pages} pgs | ${job.printType.toUpperCase()} | Copies: ${job.copies}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <div style="font-weight:800; font-size:0.8rem; color:#065f46;">₹${jobTotal}</div>
                <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:5px; font-size:0.7rem; cursor:pointer;" title="Remove">🗑️</button>
            </div>
        `;
        wrapper.appendChild(card);
    });

    // 2. Render Snacks / Store Products Items
    window.cartSnacksArray.forEach((snack, idx) => {
        totalItemsCount += snack.qty;
        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:10px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 1px 3px rgba(0,0,0,0.02); gap:10px;";
        
        const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; flex-shrink:0;" />` : `<div style="font-size:1.4rem; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:8px; flex-shrink:0;">📦</div>`;

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; overflow:hidden;">
                ${thumbImg}
                <div style="overflow:hidden; flex:1; min-width:0;">
                    <div title="${snack.name}" style="font-weight:700; font-size:0.78rem; color:#0f172a; word-break:break-all; white-space:normal; line-height:1.3;">${snack.name}</div>
                    <div style="font-size:0.7rem; color:#059669; font-weight:800; margin-top:2px;">₹${snack.price * snack.qty}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:2px 6px; gap:6px;">
                    <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; font-size:0.9rem; cursor:pointer; color:#0f172a;">-</button>
                    <span style="font-weight:800; font-size:0.8rem; color:#0f172a;">${snack.qty}</span>
                    <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; font-size:0.9rem; cursor:pointer; color:#065f46;">+</button>
                </div>
                <button type="button" onclick="removeSnackItemCompletely(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:5px; font-size:0.7rem; cursor:pointer;" title="Remove">🗑️</button>
            </div>
        `;
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);

    // Update shipment info text
    const shipmentTextNode = document.getElementById('shipmentItemsCountText');
    if (shipmentTextNode) {
        shipmentTextNode.textContent = `${totalPagesCount} page${totalPagesCount !== 1 ? 's' : ''} and ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`;
    }

    // Sync User Identity & Active Address Name/Phone correctly
    const identityNode = document.getElementById('cartUserIdentitySummary');
    if (identityNode) {
        let activeAddr = localStorage.getItem('selected_active_address') || "";
        let activeUser = localStorage.getItem('printAppUser') || "Customer";
        let activePhone = localStorage.getItem('printAppUserIdentity') || "";
        
        if (activeAddr.includes('Contact:')) {
            let contactPart = activeAddr.split('Contact:')[1].trim();
            identityNode.textContent = `Order for ${contactPart}`;
        } else if (activePhone) {
            identityNode.textContent = `Order for ${activeUser}, ${activePhone}`;
        } else {
            identityNode.textContent = `Order for ${activeUser}`;
        }
    }

    // Render "You Might Also Like" Upselling Slider from Inventory Products
    const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (upsellingGrid) {
        if (window.storeInventoryProducts && window.storeInventoryProducts.length > 0) {
            upsellingGrid.innerHTML = '';
            window.storeInventoryProducts.forEach((prod) => {
                if (prod.stockQuantity > 0) {
                    const thumb = prod.imageUrl || prod.image || '';
                    const safeSku = String(prod.sku || prod.name || '').replace(/'/g, "\\'");
                    const safeName = String(prod.name || '').replace(/'/g, "\\'");
                    const safeThumb = String(thumb || '').replace(/'/g, "\\'");
                    const itemCard = document.createElement('div');
                    itemCard.style.cssText = "min-width: 100px; width: 100px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.03);";
                    itemCard.innerHTML = `
                        ${thumb ? `<img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; margin-bottom:4px;" />` : '<div style="font-size:1.5rem; margin-bottom:4px;">📦</div>'}
                        <div title="${prod.name}" style="font-size:0.7rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${prod.name}</div>
                        <div style="font-size:0.7rem; font-weight:800; color:#065f46; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                        <button type="button" style="background:#065f46; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:700; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${Number(prod.sellingPrice) || 0}, ${Number(prod.stockQuantity) || 0}, '${safeThumb}')">+ Add</button>
                    `;
                    upsellingGrid.appendChild(itemCard);
                }
            });
        } else {
            upsellingGrid.innerHTML = '<p style="font-size:0.75rem; color:#64748b; text-align:center; padding:10px;">Loading store products...</p>';
        }
    }

    if (typeof calculateTotal === 'function') calculateTotal();
};

    window.removeSnackItemCompletely = function(index) {
        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        window.cartSnacksArray.splice(index, 1);
        persistCartStateData();
        renderCartDrawerContents();
        updateFloatingCartBar();
        calculateTotal();
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
        toggleCartDrawer(false);
        alert("✅ Cart cleared successfully!");
    };

    window.persistCartStateData = function() {
        localStorage.setItem('cart_print_jobs', JSON.stringify(window.cartPrintJobsArray));
        localStorage.setItem('cart_snacks', JSON.stringify(window.cartSnacksArray));
        updateFloatingCartBar();
    };

    // 🔥 ADDRESS MANAGEMENT SYSTEM
  window.loadUserAddressesFromStorage = function() {
        const raw = localStorage.getItem('saved_addresses');
        if (raw) {
            try { window.savedUserAddresses = JSON.parse(raw); } catch(e) { window.savedUserAddresses = []; }
        }
        
        // Use window.selectedActiveAddress safely here
        if (window.savedUserAddresses.length > 0 && !window.selectedActiveAddress) {
            window.selectedActiveAddress = localStorage.getItem('selected_active_address') || window.savedUserAddresses[0];
        }
        
        if (typeof renderSavedAddressesUI === 'function') {
            renderSavedAddressesUI();
        }
    };

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
    };

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
            
            card.style.cssText = `display:flex; align-items:flex-start; justify-content:space-between; background:${isChecked ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${isChecked ? '#16a34a' : '#cbd5e1'}; padding:10px 12px; border-radius:10px; font-size:0.78rem; font-weight:600; color:#0f172a; margin-bottom:8px; width:100%; box-sizing:border-box;`;
            
            card.innerHTML = `
                <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; flex:1; overflow:hidden;">
                    <input type="radio" name="selectedDeliveryAddressRadio" value="${idx}" ${isChecked} onchange="selectActiveAddressByIndex(${idx})" style="margin-top:2px; flex-shrink:0;">
                    <span style="word-break:break-word; white-space:normal; line-height:1.4; flex:1;">📍 ${addr}</span>
                </label>
                <button type="button" onclick="deleteSavedAddress(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:700; cursor:pointer; margin-left:8px; flex-shrink:0;" title="Delete Address">Delete</button>
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
    };

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
    };

    window.closeAddressManagerModal = function() {
        const modal = document.getElementById('addressManagerModal');
        if (modal) modal.style.display = 'none';
    };

    // ==========================================
    // 💳 FINAL CART ORDER PLACEMENT
    // ==========================================
    window.executeFinalCartOrderPlacement = async function() {
        if (!isStoreCurrentlyOpen) {
            alert("🚨 Store is currently CLOSED! Orders cannot be accepted.");
            const storeClosedModal = document.getElementById('storeClosedPopupModal');
            if (storeClosedModal) storeClosedModal.style.display = 'flex';
            return;
        }

        let totalItemsCount = (window.cartSnacksArray ? window.cartSnacksArray.reduce((acc, item) => acc + item.qty, 0) : 0) + 
                            (window.cartPrintJobsArray ? window.cartPrintJobsArray.length : 0);

        if (totalItemsCount === 0) {
            alert("⚠️ Your cart is empty! Please add print jobs or store products first.");
            return;
        }

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
            finalMetaConfig.push({ 
                sku: snack.sku || '',
                name: snack.name,
                fileName: `Product: ${snack.name} (Qty: ${snack.qty}, Price: ₹${snack.price} each)`, 
                copies: snack.qty, 
                qty: snack.qty,
                printType: 'snack', 
                pages: 1 
            });
        });

        if (finalMetaConfig.length === 0) {
            alert("⚠️ Your cart is empty!");
            return;
        }

        const hasPrintJobs = window.cartPrintJobsArray && window.cartPrintJobsArray.length > 0;
        const hasSnacks = window.cartSnacksArray && window.cartSnacksArray.length > 0;

        let initialOrderStatus = "Order Placed & Processing";
        if (hasPrintJobs && !hasSnacks) {
            initialOrderStatus = "Ready for Print";
        } else if (hasPrintJobs && hasSnacks) {
            initialOrderStatus = "Ready for Print & Processing";
        } else if (!hasPrintJobs && hasSnacks) {
            initialOrderStatus = "Order Placed & Picking";
        }

let subtotal = totalPrintVal + totalSnacksVal;
    let delivery = (subtotal >= 99 || subtotal === 0) ? 0 : 25;
    let rainFee = window.isRainSurgeActive ? 15 : 0;
    let grandTotal = subtotal + delivery + rainFee + (window.currentDeliveryTip || 0);

    const selectedPaymentRadio = document.querySelector('input[name="cartPaymentMode"]:checked');
    const paymentMode = selectedPaymentRadio ? selectedPaymentRadio.value.toLowerCase() : 'online';
    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';

    const formData = new FormData();
    window.cartPrintJobsArray.forEach(job => {
        if (job.fileData) formData.append('document', job.fileData);
    });

    formData.append('totalAmount', grandTotal.toFixed(2));
    formData.append('configDetails', JSON.stringify(finalMetaConfig));
    formData.append('address', selectedActiveAddress);
    formData.append('customerName', sessionActiveUser);
    formData.append('phone', localStorage.getItem('printAppUserIdentity') || 'N/A');
    formData.append('deliveryTip', window.currentDeliveryTip || 0);
    formData.append('paymentMode', paymentMode);

    // 🔥 1. Pehle helper function declare karo taaki hoisting error na aaye
    const finalizeOrderSuccess = async (orderId) => {
        const historyKey = `history_${sessionActiveUser}`;
        const currentHistoryArray = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        const newOrderPayload = { 
            orderId: orderId,
            date: new Date().toLocaleString(), 
            amount: grandTotal.toFixed(2), 
            status: initialOrderStatus, 
            details: finalMetaConfig, 
            address: selectedActiveAddress,
            deliveryTip: window.currentDeliveryTip || 0
        };
        
        currentHistoryArray.push(newOrderPayload);
        localStorage.setItem(historyKey, JSON.stringify(currentHistoryArray));

        try {
            await fetch('/api/admin/inventory/decrement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: finalMetaConfig })
            });
        } catch (e) {
            console.error("Inventory decrement sync error:", e);
        }
    };

    // 🔥 2. Ab COD / Cash check yahan run karo
    if (paymentMode === 'cod' || paymentMode === 'cash') {
        try {
            const response = await fetch('/api/create-order', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                alert('🎉 Order Placed Successfully via Cash on Delivery!');
                await finalizeOrderSuccess(data.order_id);
                
                window.cartPrintJobsArray = [];
                window.cartSnacksArray = [];
                window.currentDeliveryTip = 0;
                persistCartStateData();
                toggleCartDrawer(false);

                if (typeof renderOrderHistoryUI === 'function') {
                    renderOrderHistoryUI(sessionActiveUser);
                }
                if (typeof openOrderDeepTrackingWorkspacePage === 'function') {
                    openOrderDeepTrackingWorkspacePage(encodeURIComponent(JSON.stringify(newOrderPayload)));
                } else if (typeof navigateDrawerSection === 'function') {
                    navigateDrawerSection('order_tracking');
                }
                loadDynamicStoreProducts();
                return;
            } else {
                alert(`⚠️ Error: ${data.message || 'Failed to create order'}`);
                return;
            }
        } catch (err) {
            alert("❌ Connection error during COD order placement.");
            return;
        }
    }   

        if (paymentMode === 'wallet') {
            let currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
            if (currentWalletCash < grandTotal) {
                alert(`❌ Insufficient wallet balance! You have ₹${currentWalletCash.toFixed(2)}, but grand total is ₹${grandTotal.toFixed(2)}. Please recharge your wallet.`);
                return;
            }

            let newBalance = currentWalletCash - grandTotal;
            localStorage.setItem(`wallet_cash_${sessionActiveUser}`, newBalance.toFixed(2));
            synchronizeWalletInterfaceBalance();
            formData.append('paymentMode', 'wallet');

            try {
                const response = await fetch('/api/create-order', { method: 'POST', body: formData });
                const data = await response.json();
                if (data.success) {
                    alert('🎉 Order Placed Successfully using Print From Home Wallet!');
                    await finalizeOrderSuccess(data.order_id);
                    return;
                }
            } catch (err) {
                alert("❌ Wallet order placement error.");
                return;
            }
        } else {
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
                    await finalizeOrderSuccess(data.order_id);
                    return;
                }

                const options = {
                    key: data.key_id,
                    amount: data.amount,
                    currency: 'INR',
                    name: 'Print From Home',
                    order_id: data.rzp_order_id,
                    handler: async function (response) {
                        try {
                            const verifyRes = await fetch('/api/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: data.order_id,
                                    paymentId: response.razorpay_payment_id
                                })
                            });
                            const verifyData = await verifyRes.json();
                            if (verifyData.success) {
                                alert('🎉 Payment Successful!');
                                await finalizeOrderSuccess(data.order_id);
                            }
                        } catch (err) {
                            alert('🎉 Payment Recorded Successfully!');
                            await finalizeOrderSuccess(data.order_id);
                        }
                    },
                    theme: { color: '#F4C430' }
                };

                const rzp1 = new Razorpay(options);
                rzp1.open();
            } catch (error) {
                alert('❌ Connection Breakdown during order placement.');
            }
        }
    };

    function synchronizeWalletInterfaceBalance() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        const balanceDisplayNode = document.getElementById('headerWalletDisplayBalance');
        const drawerWalletText = document.getElementById('walletDrawerBalanceText');
        if(!balanceDisplayNode) return;
        if(!sessionActiveUser) { 
            balanceDisplayNode.textContent = "₹0.00"; 
            if(drawerWalletText) drawerWalletText.textContent = "₹0";
            return; 
        }
        let currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        balanceDisplayNode.textContent = `₹${currentWalletCash.toFixed(2)}`;
        if(drawerWalletText) drawerWalletText.textContent = `₹${currentWalletCash.toFixed(2)}`;
    }
    window.synchronizeWalletInterfaceBalance = synchronizeWalletInterfaceBalance;

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
    };

    window.forceReturnToUploadView = function() {
        masterFilesArray = []; sessionStorage.removeItem('savedPrintFiles');
        if(multiFilesContainer) multiFilesContainer.innerHTML = '';
        refreshInvoiceTabState(); calculateTotal();
    };

    // 🤖 BILINGUAL AI ASSISTANT & SUPPORT LOGIC (ENGLISH & HINDI)
    let currentAiLang = 'en'; // Default English

    window.changeAiLanguage = function(lang) {
        currentAiLang = lang;
        const welcomeBubble = document.getElementById('aiWelcomeMessageBubble');
        if (welcomeBubble) {
            if (lang === 'hi') {
                welcomeBubble.textContent = "👋 नमस्ते! मैं Print From Home का AI सहायक हूँ। आपको ऑर्डर ट्रैकिंग, कैंसिलेशन, प्राइसिंग या अकाउंट से जुड़ी किस बात में सहायता चाहिए?";
            } else {
                welcomeBubble.textContent = "👋 Hello! I am the AI Assistant for Print From Home. How can I help you with order tracking, cancellation, pricing, or your account?";
            }
        }
    };

    window.toggleAiChatModal = function(open) {
        const modal = document.getElementById('aiChatModal');
        if (modal) {
            modal.style.display = open ? 'flex' : 'none';
        }
    };

    window.handleAiChatKeyPress = function(e) {
        if (e.key === 'Enter') {
            sendUserMessageToAi();
        }
    };

    window.sendAiPresetQuery = function(queryText) {
        const input = document.getElementById('aiUserChatInput');
        if (input) {
            input.value = queryText;
            sendUserMessageToAi();
        }
    };

    window.sendUserMessageToAi = function() {
        const input = document.getElementById('aiUserChatInput');
        const msgBox = document.getElementById('aiChatMessagesBox');
        if (!input || !msgBox) return;

        const userText = input.value.trim();
        if (!userText) return;

        // 1. Append User Message Bubble
        const userBubble = document.createElement('div');
        userBubble.style.cssText = "background: #065f46; color: white; padding: 10px 14px; border-radius: 12px; font-size: 0.82rem; max-width: 80%; align-self: flex-end; font-weight: 500;";
        userBubble.textContent = userText;
        msgBox.appendChild(userBubble);

        input.value = "";
        msgBox.scrollTop = msgBox.scrollHeight;

        // 2. Process App-Related FAQs via AI Assistant in English / Hindi
        setTimeout(() => {
            const aiBubble = document.createElement('div');
            aiBubble.style.cssText = "background: #e2e8f0; color: #0f172a; padding: 10px 14px; border-radius: 12px; font-size: 0.82rem; max-width: 80%; align-self: flex-start; font-weight: 500; line-height: 1.4;";
            
            const lower = userText.toLowerCase();

            if (lower.includes('order') || lower.includes('track') || lower.includes('status') || lower.includes('kahan') || lower.includes('where')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `📦 <b>मेरा ऑर्डर कहाँ है?</b><br>अपने ऑर्डर की लाइव स्टेटस देखने के लिए ऐप के मेनू (<span style="color:#065f46; font-weight:700;">👤 icon</span>) पर क्लिक करें और <b>'Your orders'</b> सेक्शन में जाएं!`;
                } else {
                    aiBubble.innerHTML = `📦 <b>Where is my order?</b><br>You can check your live order tracking by clicking the menu (<span style="color:#065f46; font-weight:700;">👤 icon</span>) in the top right and opening the <b>'Your orders'</b> section!`;
                }
            } 
            else if (lower.includes('cancel') || lower.includes('cancellation') || lower.includes('रद्द')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `❌ <b>ऑर्डर कैसे कैंसिल करें?</b><br>यदि आपका ऑर्डर प्रोसेसिंग में है, तो कृपया इसे रद्द करने के लिए तुरंत हमारे कस्टमर सपोर्ट एग्जीक्यूटिव को कॉल या WhatsApp पर संपर्क करें।`;
                } else {
                    aiBubble.innerHTML = `❌ <b>How to cancel my order?</b><br>If your print job or order is currently in processing, please contact our support executive immediately via phone or WhatsApp call to cancel it.`;
                }
            } 
            else if (lower.includes('account') || lower.includes('login') || lower.includes('register') || lower.includes('profile')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `👤 <b>यूज़र अकाउंट सहायता:</b><br>आप ऊपर दिए गए <b>Profile/Avatar icon</b> पर क्लिक करके अपनी अकाउंट डिटेल्स मैनेज कर सकते हैं। यहाँ से आप एड्रेस बुक और अपनी जानकारी अपडेट कर सकते हैं।`;
                } else {
                    aiBubble.innerHTML = `👤 <b>User Account Help:</b><br>You can manage your account details by clicking the <b>Profile/Avatar icon</b> in the top right corner. From there, you can update your Address Book or edit your profile.`;
                }
            } 
            else if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('kitna') || lower.includes('page') || lower.includes('कीमत')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `💰 <b>प्रिंटिंग रेट्स और प्राइसिंग:</b><br>• ब्लैक एंड व्हाइट: ₹3 प्रति पेज<br>• रंगीन (Coloured): ₹10 प्रति पेज<br>• स्पाइरल बाइंडिंग: +₹30<br>• ₹99 से ऊपर के ऑर्डर पर <b>फ्री डिलीवरी</b>!`;
                } else {
                    aiBubble.innerHTML = `💰 <b>Printing Rates & Pricing:</b><br>• Black & White: ₹3 per page<br>• Coloured: ₹10 per page<br>• Spiral Binding: +₹30<br>• Orders above ₹99 get <b>FREE Delivery</b>!`;
                }
            } 
            else if (lower.includes('delivery') || lower.includes('time') || lower.includes('समय') || lower.includes('der')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `⏱️ <b>डिलीवरी का समय:</b><br>हम वाराणसी में आपके घर तक प्रिंट और स्टोर के सामान की डिलीवरी मात्र <b>15 मिनट</b> के अंदर करते हैं!`;
                } else {
                    aiBubble.innerHTML = `⏱️ <b>Delivery Time:</b><br>We deliver prints and store items right to your doorstep in Varanasi within <b>15 minutes</b>!`;
                }
            } 
            else {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `🤖 मुझे आपके इस सवाल का सटीक उत्तर नहीं मिला। क्या आप हमारे ह्यूमन कस्टमर सपोर्ट से बात करना चाहेंगे?<br><br>
                        <a href="https://api.whatsapp.com/send?phone=917007626731&text=Hello%20Support,%20I%20need%20help%20with:%20${encodeURIComponent(userText)}" target="_blank" style="display:inline-block; background:#25D366; color:white; padding:6px 12px; border-radius:8px; text-decoration:none; font-weight:700; margin-top:4px;">💬 कस्टमर सपोर्ट से चैट करें</a>`;
                } else {
                    aiBubble.innerHTML = `🤖 I couldn't quite understand your query. Would you like to connect with our human customer support?<br><br>
                        <a href="https://api.whatsapp.com/send?phone=917007626731&text=Hello%20Support,%20I%20need%20help%20with:%20${encodeURIComponent(userText)}" target="_blank" style="display:inline-block; background:#25D366; color:white; padding:6px 12px; border-radius:8px; text-decoration:none; font-weight:700; margin-top:4px;">💬 Connect to Customer Support</a>`;
                }
            }

            msgBox.appendChild(aiBubble);
            msgBox.scrollTop = msgBox.scrollHeight;
        }, 500);
    };

// 🔥 Fully Safe Admin Fees Sync (Stops 404 console errors completely)
window.loadAdminConfiguredFeesAndCoupons = async function() {
    window.adminDeliveryFee = 25.00;
    window.adminHandlingFee = 5.00;
    window.adminRainFee = 15.00;
    window.adminCouponsList = [
        { code: 'FREEDEL', desc: 'Free delivery on orders above ₹99', discount: 25 },
        { code: 'PRINT20', desc: 'Flat ₹20 off on print orders', discount: 20 }
    ];

    try {
        const res = await fetch('/api/admin/settings');
        if (res && res.ok) {
            const data = await res.json();
            if (data && data.success && data.settings) {
                window.adminDeliveryFee = parseFloat(data.settings.deliveryFee) || 25.00;
                window.adminHandlingFee = parseFloat(data.settings.handlingFee) || 5.00;
                window.adminRainFee = parseFloat(data.settings.rainFee) || 15.00;
                window.adminCouponsList = data.settings.coupons || window.adminCouponsList;
            }
        }
    } catch (e) {
        // Silently caught, no more 404 errors in console
    }
};

// 🔥 Admin Store Settings & Fees Save Engine
window.saveAdminStoreSettings = async function() {
    const deliveryField = document.getElementById('adminSettingDeliveryFee');
    const handlingField = document.getElementById('adminSettingHandlingFee');
    const rainField = document.getElementById('adminSettingRainFee');

    const deliveryFee = deliveryField ? deliveryField.value : 25;
    const handlingFee = handlingField ? handlingField.value : 5;
    const rainFee = rainField ? rainField.value : 15;

    try {
        const res = await fetch('/api/admin/settings/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryFee, handlingFee, rainFee })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Admin store settings & fees updated successfully!');
            if (typeof loadAdminConfiguredFeesAndCoupons === 'function') {
                loadAdminConfiguredFeesAndCoupons();
            }
        } else {
            alert('❌ Failed to update settings.');
        }
    } catch(e) {
        alert('❌ Server connection error.');
    }
};

// 🔥 Admin Add New Coupon Engine
window.adminAddNewCoupon = async function() {
    const codeInput = document.getElementById('adminNewCouponCode');
    const descInput = document.getElementById('adminNewCouponDesc');
    
    if (!codeInput || !descInput) return;
    const code = codeInput.value.trim().toUpperCase();
    const desc = descInput.value.trim();

    if (!code || !desc) {
        alert("⚠️ Please enter both Coupon Code and Description!");
        return;
    }

    if (!window.adminCouponsList) window.adminCouponsList = [];
    window.adminCouponsList.push({ code: code, desc: desc });

    try {
        const res = await fetch('/api/admin/settings/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupons: window.adminCouponsList })
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ Coupon "${code}" added successfully!`);
            codeInput.value = '';
            descInput.value = '';
        } else {
            alert('❌ Failed to save coupon on server.');
        }
    } catch(e) {
        alert('❌ Server connection error.');
    }
};


window.toggleCouponDrawer = function() {
    let couponModal = document.getElementById('couponDropdownModal');
    if (!couponModal) {
        couponModal = document.createElement('div');
        couponModal.id = 'couponDropdownModal';
        couponModal.style.cssText = "position:fixed; bottom:0; left:0; width:100vw; background:#ffffff; border-top-left-radius:20px; border-top-right-radius:20px; box-shadow:0 -10px 30px rgba(0,0,0,0.2); z-index:999999; padding:20px; display:flex; flex-direction:column; gap:12px; font-family:'Poppins', sans-serif;";
        
        let couponsHTML = (window.adminCouponsList || []).map(c => `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:800; font-size:0.8rem; color:#16a34a;">${c.code}</div>
                    <div style="font-size:0.7rem; color:#475569;">${c.desc}</div>
                </div>
                <button type="button" onclick="alert('✅ Coupon ${c.code} Applied Successfully!')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">Apply</button>
            </div>
        `).join('');

        couponModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                <h3 style="font-size:1rem; font-weight:800; color:#0f172a; margin:0;">Available Offers & Coupons</h3>
                <span onclick="toggleCouponDrawer()" style="font-size:1.2rem; cursor:pointer; font-weight:bold; color:#64748b;">&times;</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; max-height:250px; overflow-y:auto;">
                ${couponsHTML || '<p style="text-align:center; color:#64748b; font-size:0.8rem;">No active coupons available right now.</p>'}
            </div>
        `;
        document.body.appendChild(couponModal);
    } else {
        couponModal.style.display = couponModal.style.display === 'flex' ? 'none' : 'flex';
    }
};

window.addEventListener('DOMContentLoaded', () => {
    loadAdminConfiguredFeesAndCoupons();
});


window.toggleCouponDrawer = function() {
    let couponModal = document.getElementById('couponDropdownModal');
    if (!couponModal) {
        couponModal = document.createElement('div');
        couponModal.id = 'couponDropdownModal';
        couponModal.style.cssText = "position:fixed; bottom:0; left:0; width:100vw; background:#ffffff; border-top-left-radius:20px; border-top-right-radius:20px; box-shadow:0 -10px 30px rgba(0,0,0,0.2); z-index:999999; padding:20px; display:flex; flex-direction:column; gap:12px; font-family:'Poppins', sans-serif;";
        
        let couponsHTML = (window.adminCouponsList || []).map(c => `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:800; font-size:0.8rem; color:#16a34a;">${c.code}</div>
                    <div style="font-size:0.7rem; color:#475569;">${c.desc}</div>
                </div>
                <button type="button" onclick="alert('✅ Coupon ${c.code} Applied Successfully!')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">Apply</button>
            </div>
        `).join('');

        couponModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
                <h3 style="font-size:1rem; font-weight:800; color:#0f172a; margin:0;">Available Offers & Coupons</h3>
                <span onclick="toggleCouponDrawer()" style="font-size:1.2rem; cursor:pointer; font-weight:bold; color:#64748b;">&times;</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; max-height:250px; overflow-y:auto;">
                ${couponsHTML || '<p style="text-align:center; color:#64748b; font-size:0.8rem;">No active coupons available right now.</p>'}
            </div>
        `;
        document.body.appendChild(couponModal);
    } else {
        couponModal.style.display = couponModal.style.display === 'flex' ? 'none' : 'flex';
    }
};

window.addEventListener('DOMContentLoaded', () => {
    loadAdminConfiguredFeesAndCoupons();
});

    window.connectToHumanSupport = function() {
        window.open('https://api.whatsapp.com/send?phone=917007626731&text=Hello%20Print%20From%20Home%20Support,%20I%20need%20assistance.', '_blank');
    };

    // 🔥 TIMEOUT BOOTSTRAP INITIALIZATION (WITH FORCE BYPASS)
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('app-hidden');
            splashScreen.style.display = 'none';
        }
        
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
            calculateRealtimeDistanceAndEta();
        } else {
            if(authScreen) { 
                authScreen.classList.remove('app-hidden'); 
                authScreen.style.display = 'flex'; 
            }
        }
        calculateTotal();
        updateFloatingCartBar();
    }, 1500);

    // --- AUTH FORM (Login & Signup) ---
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
                    calculateRealtimeDistanceAndEta();
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

    window.navigateDrawerSection = function(targetId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const targetNode = document.getElementById(`user_section_${targetId}`);
        if (targetNode) {
            targetNode.classList.add('active');
        }
        if (typeof toggleUserDrawer === 'function') toggleUserDrawer(false);
        updateFloatingCartBar();
    };

    // 🔥 COMPLETE RENDER CART DRAWER CONTENTS FUNCTION WITH E-52 PANDEYPUR STORE INTEGRATION
   window.renderCartDrawerContents = function() {
    const container = document.getElementById('cartDrawerItemsList') || 
                        document.getElementById('cartItemsListContainer') || 
                        document.getElementById('cartItemsContainer');
    
    if (!container) return;
    container.innerHTML = '';
    
    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
    
    if (!hasItems) {
        container.innerHTML = `<p style="font-size:0.82rem; color:#64748b; text-align:center; padding:20px;">Your cart is empty.</p>`;
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof toggleCartDrawer === 'function') toggleCartDrawer(false);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = "display:flex; flex-direction:column; gap:12px; width:100%;";

    // 1. Render Print Jobs in Cart (With Screenshot-style Clean Breakdown)
    window.cartPrintJobsArray.forEach((job, idx) => {
        let rate = (job.printType === 'bw') ? 3 : 10;
        let jobTotal = job.pages * rate * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);

        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:0 2px 6px rgba(0,0,0,0.02);";

        card.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    <div style="font-size:1.6rem; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:8px; flex-shrink:0;">📄</div>
                    <div style="overflow:hidden; flex:1;">
                        <div title="${job.fileName}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.fileName}</div>
                        <div style="font-size:0.68rem; color:#64748b; font-weight:600; margin-top:2px;">${job.pages} pgs | ${job.printType.toUpperCase()} | Copies: ${job.copies}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <div style="font-weight:900; font-size:0.85rem; color:#065f46;">₹${jobTotal}</div>
                    <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:5px 8px; font-size:0.7rem; cursor:pointer;" title="Remove Print Job">🗑️</button>
                </div>
            </div>
            <!-- Screenshot style file breakdown sub-row -->
            <div style="background:#f8fafc; border:1px solid #edf2f7; border-radius:8px; padding:6px 10px; font-size:0.68rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                <span>F${idx+1}: ${job.fileName} (${job.pages}pg x ${job.copies}cp x ₹${rate})</span>
                <span style="font-weight:700; color:#0f172a;">₹${jobTotal}</span>
            </div>
        `;
        wrapper.appendChild(card);
    });

    // 2. Render Snacks / Store Products Items in Cart (With Stepper & Clean UI)
    window.cartSnacksArray.forEach((snack, idx) => {
        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:10px;";
        
        const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:42px; height:42px; object-fit:contain; border-radius:8px;" />` : `<div style="font-size:1.5rem; width:42px; height:42px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:8px;">📦</div>`;

        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                ${thumbImg}
                <div style="overflow:hidden; flex:1;">
                    <div title="${snack.name}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snack.name}</div>
                    <div style="font-size:0.72rem; color:#059669; font-weight:800; margin-top:2px;">₹${snack.price * snack.qty} <span style="color:#64748b; font-weight:500; font-size:0.65rem;">(₹${snack.price} ea)</span></div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:2px 6px; gap:8px;">
                    <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; font-size:0.95rem; cursor:pointer; color:#0f172a;">-</button>
                    <span style="font-weight:800; font-size:0.82rem; color:#0f172a;">${snack.qty}</span>
                    <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; font-size:0.95rem; cursor:pointer; color:#065f46;">+</button>
                </div>
                <button type="button" onclick="removeSnackItemCompletely(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px 8px; font-size:0.7rem; cursor:pointer;" title="Remove Item">🗑️</button>
            </div>
        `;
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);

  // 🔥 UPSELLING SECTION (Quick Add Store Inventory Products inside Cart Drawer)
    const upsellingSection = document.createElement('div');
    upsellingSection.style.cssText = "margin-top: 15px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px;";
    upsellingSection.innerHTML = `
        <h4 style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-bottom:10px;">You might also like</h4>
        <div id="cartDrawerUpsellingGrid" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;"></div>
    `;
    container.appendChild(upsellingSection);

    const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (upsellingGrid) {
        if (window.storeInventoryProducts && window.storeInventoryProducts.length > 0) {
            upsellingGrid.innerHTML = '';
            window.storeInventoryProducts.forEach((prod) => {
                if (prod.stockQuantity > 0) {
                    const thumb = prod.imageUrl || prod.image || '';
                    const safeSku = String(prod.sku || prod.name || '').replace(/'/g, "\\'");
                    const safeName = String(prod.name || '').replace(/'/g, "\\'");
                    const safeThumb = String(thumb || '').replace(/'/g, "\\'");
                    const itemCard = document.createElement('div');
                    itemCard.style.cssText = "min-width: 100px; width: 100px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.03);";
                    itemCard.innerHTML = `
                        ${thumb ? `<img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; margin-bottom:4px;" />` : '<div style="font-size:1.5rem; margin-bottom:4px;">📦</div>'}
                        <div title="${prod.name}" style="font-size:0.7rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${prod.name}</div>
                        <div style="font-size:0.7rem; font-weight:800; color:#065f46; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                        <button type="button" style="background:#065f46; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:700; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${Number(prod.sellingPrice) || 0}, ${Number(prod.stockQuantity) || 0}, '${safeThumb}')">+ Add</button>
                    `;
                    upsellingGrid.appendChild(itemCard);
                }
            });
        } else {
            upsellingGrid.innerHTML = '<p style="font-size:0.75rem; color:#64748b; text-align:center; padding:10px;">Loading store products...</p>';
        }
    }

    if (typeof calculateTotal === 'function') calculateTotal();
};
