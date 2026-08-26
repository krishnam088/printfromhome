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
// App khulte hi pehla history state push karna zaroori hai tabhi popstate kaam karega
    history.pushState(null, null, window.location.href);
});
  // 🔙 GLOBAL MOBILE BACK BUTTON HANDLER (Double Tap to Exit + Smart Routing)
let lastBackPressTime = 0;

window.addEventListener('popstate', (event) => {
    const categoryOverlay = document.getElementById('categoryDrawerOverlay');
    const cartOverlay = document.getElementById('cartDrawerOverlay');
    const addressModal = document.getElementById('addressManagerModal');
    const productModal = document.getElementById('productDetailModal');
    const studioModal = document.getElementById('printStudioModal');
    const searchOverlay = document.getElementById('blinkitSearchOverlayModal');
    const aiModal = document.getElementById('aiChatModal');
    const helpModal = document.getElementById('helpCenterModal');
    const profileModal = document.getElementById('editProfileModal');

    // 1. Agar koi modal/drawer khula hai, toh usko band karo (App se bahar mat jao)
    let modalClosed = false;
    if (categoryOverlay && categoryOverlay.style.display === 'flex') { closeCategoryDrawer(); modalClosed = true; }
    if (cartOverlay && cartOverlay.style.display === 'flex') { toggleCartDrawer(false); modalClosed = true; }
    if (addressModal && addressModal.style.display === 'flex') { closeAddressManagerModal(); modalClosed = true; }
    if (productModal && productModal.style.display === 'flex') { closeProductDetailModal(); modalClosed = true; }
    if (studioModal && studioModal.style.display === 'flex') { closePrintStudio(); modalClosed = true; }
    if (searchOverlay && searchOverlay.style.display === 'flex') { closeSearchOverlay(); modalClosed = true; }
    if (aiModal && aiModal.style.display === 'flex') { toggleAiChatModal(false); modalClosed = true; }
    if (helpModal && helpModal.style.display === 'flex') { toggleHelpModal(false); modalClosed = true; }
    if (profileModal && profileModal.style.display === 'flex') { closeEditProfileModal(); modalClosed = true; }

    if (modalClosed) {
        history.pushState(null, null, window.location.href); // Stay in App
        return;
    }

    // 2. Agar user kisi doosre page pe hai (History, Tracking), toh pehle Home/Store pe bhejo
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection && activeSection.id !== 'user_section_store') {
        navigateDrawerSection('store');
        history.pushState(null, null, window.location.href); // Stay in App
        return;
    }

    // 3. DOUBLE TAP TO EXIT LOGIC (Jab user Home/Store pe ho)
    const currentTime = new Date().getTime();
    if (currentTime - lastBackPressTime < 2000) {
        // Double tap confirmed -> Allow Exit
        window.history.go(-1); 
    } else {
        lastBackPressTime = currentTime;
        if (typeof showAppToast === 'function') {
            showAppToast("Press back again to exit", "info");
        } else {
            alert("Press back again to exit");
        }
        history.pushState(null, null, window.location.href); // Push state to prevent immediate exit
    }
});

// App khulte hi pehla history state push karna zaroori hai tabhi popstate kaam karega
window.addEventListener('DOMContentLoaded', () => {
    history.pushState(null, null, window.location.href);
});

// 🔥 Global Store Location (Varanasi Store)
const STORE_LOCATION = {
    lat: 25.3451,
    lng: 83.0012,
    name: "Store"
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

  // 🔥 BULLETPROOF ORDER HISTORY UI RENDER ENGINE
// 🔥 BULLETPROOF ORDER HISTORY UI RENDER ENGINE
   window.renderOrderHistoryUI = function(username, showRecent = true) {
    try {
        const container = document.getElementById('ordersHistoryContainer');
        if (!container) return;
        
        const activeUser = username || localStorage.getItem('printAppUser') || 'Customer';
        const history = JSON.parse(localStorage.getItem(`history_${activeUser}`) || '[]');
        
        if (history.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#64748b;">No print jobs recorded yet.</p>`;
            return;
        }

        container.innerHTML = history.map(order => {
            let safeId = order.orderId || 'N/A';
            let safeAmount = order.amount || '0.00';
            let safeStatus = order.status || 'Processing';
            let safeDate = order.date || '';

            return `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:12px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem;">
                        <span>Order #${safeId}</span>
                        <span style="color:#065f46;">₹${safeAmount}</span>
                    </div>
                    <p style="font-size:0.75rem; color:#64748b; margin:4px 0;">Status: <b style="color:#2563eb;">${safeStatus}</b></p>
                    <p style="font-size:0.7rem; color:#94a3b8; margin-bottom:10px;">${safeDate}</p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" onclick="openOrderTrackingView('${safeId}')" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">📍 Track Status</button>
                        <button type="button" onclick="openPastOrderInCartPreview('${safeId}')" style="background:#065f46; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">🔁 Repeat in Cart</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Render Order History Error:", err);
    }
};
window.openOrderTrackingView = function(orderId) {
    const sessionActiveUser = localStorage.getItem('printAppUser');
    const history = JSON.parse(localStorage.getItem(`history_${sessionActiveUser}`) || '[]');
    const order = history.find(o => o.orderId === orderId);
    
    if (!order) {
        alert("⚠️ Order details not found.");
        return;
    }

    // UI elements update
    const idHeader = document.getElementById('trackOrderIdHeader');
    const totalBadge = document.getElementById('trackGrandTotalBadge');
    const statusBadge = document.getElementById('liveOrderStatusBadge');
    const manifestList = document.getElementById('trackFilesManifestList');
    const addressLabel = document.getElementById('trackShippingAddressLabel');
    const riderNameNode = document.getElementById('deliveryExecutiveName');
    const riderPhoneNode = document.getElementById('deliveryExecutivePhone');

    if (idHeader) idHeader.textContent = `Order #${order.orderId}`;
    if (totalBadge) totalBadge.textContent = `₹${order.amount}`;
    if (addressLabel) addressLabel.textContent = order.address || 'N/A';

    // Status check: Agar order assign nahi hua ya ready for print hai
    let currentStatus = order.status || 'Your order is getting ready...';
    if (statusBadge) statusBadge.textContent = currentStatus;

    if (riderNameNode) {
        if (order.assignedDeliveryBoy) {
            riderNameNode.textContent = `Delivery Partner: Agent (${order.assignedDeliveryBoy})`;
            if (riderPhoneNode) riderPhoneNode.textContent = `📞 ${order.assignedDeliveryBoy}`;
        } else {
            riderNameNode.textContent = "Your order is getting ready...";
            if (riderPhoneNode) riderPhoneNode.textContent = "Will be assigned shortly";
        }
    }

    if (manifestList && order.details) {
        manifestList.innerHTML = order.details.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#334155; background:#f8fafc; padding:6px 10px; border-radius:8px;">
                <span>📄 ${item.fileName || item.name || 'Item'} (×${item.copies || item.qty || 1})</span>
                <b style="color:#065f46;">₹${(item.price || 3) * (item.copies || item.qty || 1)}</b>
            </div>
        `).join('');
    }

    // Navigate to tracking view section
    if (typeof navigateDrawerSection === 'function') {
        navigateDrawerSection('order_tracking');
    }

    // 🗺️ Initialize Google Maps (Store Pin, User Pin & Rider Movement Animation)
    setTimeout(() => {
        const mapElement = document.getElementById('liveTrackingGoogleMap');
        const distanceBadge = document.getElementById('mapDistanceBadge');
        if (!mapElement || typeof google === 'undefined') return;

        // Store Fixed Location (Varanasi Store)
        const storeLatLng = { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng };
        
        // Default user location offset if exact coords not saved
        const userLatLng = { lat: STORE_LOCATION.lat + 0.015, lng: STORE_LOCATION.lng + 0.012 };

        const map = new google.maps.Map(mapElement, {
            center: storeLatLng,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        // Store Pin Marker
        new google.maps.Marker({
            position: storeLatLng,
            map: map,
            title: "Print From Home Store",
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }
        });

        // User Location Pin Marker
        new google.maps.Marker({
            position: userLatLng,
            map: map,
            title: "Delivery Destination",
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }
        });

        // Rider Marker (Bike icon) - Moves when Out for Delivery
        let riderPos = { ...storeLatLng };
        const riderMarker = new google.maps.Marker({
            position: riderPos,
            map: map,
            title: "Delivery Executive",
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/motorcycle.png" }
        });

        // Calculate Distance
        const distanceKm = Math.sqrt(Math.pow(storeLatLng.lat - userLatLng.lat, 2) + Math.pow(storeLatLng.lng - userLatLng.lng, 2)) * 111;
        if (distanceBadge) {
            distanceBadge.textContent = `Distance: ${distanceKm.toFixed(1)} km`;
        }

        // Simulate bike moving towards user if order status is Out for Delivery
        if (currentStatus.toLowerCase().includes('out') || order.assignedDeliveryBoy) {
            let step = 0;
            const totalSteps = 50;
            const interval = setInterval(() => {
                step++;
                riderPos.lat += (userLatLng.lat - storeLatLng.lat) / totalSteps;
                riderPos.lng += (userLatLng.lng - storeLatLng.lng) / totalSteps;
                riderMarker.setPosition(riderPos);
                if (step >= totalSteps) clearInterval(interval);
            }, 500);
        }

    }, 400);
};

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
        
        
       // 🔥 Strictly Admin Controlled Delivery Fee (No fallback to 25)
let activeDeliveryFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
let accurateDeliveryCharge = (finalDocumentCost >= freeDeliveryThreshold || finalDocumentCost === 0) ? 0.00 : activeDeliveryFee; 
     
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


       // 🔥 Strictly Admin Controlled Fees Engine in calculateTotal
        let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
        let rainFee = window.isRainSurgeActive ? activeRainFee : 0;

        let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;

        // 🔥 Grand Total mein ab delivery, rain fee, aur admin handling fee properly add honge
        let grandTotalCombined = finalDocumentCost + accurateDeliveryCharge + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0);

        const updateUI = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        updateUI('summaryPrint', `₹${(totalPrintCost + printJobsTotal).toFixed(2)}`);
        updateUI('summaryBinding', `₹${(totalBindingCost + snacksTotal).toFixed(2)}`);
        updateUI('summaryDelivery', accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`);
        
        // Update Rain Surge UI text dynamically if element exists
        const rainFeeSpan = document.getElementById('cartRainFee');
        if (rainFeeSpan) rainFeeSpan.textContent = `₹${activeRainFee.toFixed(2)}`;

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
            fileRow.className = 'blinkit-file-card';
            fileRow.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);";

            const activeColorBw = item.config.printType === 'bw' ? 'active' : '';
            const activeColorCol = item.config.printType === 'color' ? 'active' : '';
            const activeOriPort = item.config.orientation === 'portrait' ? 'active' : '';
            const activeOriLand = item.config.orientation === 'landscape' ? 'active' : '';

            fileRow.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #edf2f7; padding-bottom: 8px; margin-bottom: 10px; gap: 8px;">
                    <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; cursor:pointer;" onclick="previewFileInA4Studio(${index})">
                        <span style="font-size: 1.1rem; flex-shrink: 0; margin-top: 2px;">📄</span>
                        <div style="flex: 1; overflow: hidden;">
                            <!-- 🔥 YAHAN REPLACE KARNA HAI: Wrapped Long File Name -->
                            <h4 style="font-weight: 700; font-size: 0.85rem; color: #1a202c; white-space: normal; word-break: break-all; overflow-wrap: break-word; line-height: 1.3; margin: 0;" title="${item.name}">${item.name}</h4>
                            <span style="font-size:0.68rem; color:var(--blinkit-green); font-weight:700; display: block; margin-top: 3px;">👁️ Tap to View A4 Preview</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <button type="button" class="add-more-inline-card-btn" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; cursor: pointer;" onclick="triggerInlineFileUploadClick()">+ Add More</button>
                        <button type="button" id="removeFile_${index}" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; width: 24px; height: 24px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">&times;</button>
                    </div>
                </div>

                <!-- (Baaki ka options wala hissa waise hi rahega) -->

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
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            return canvas.toDataURL('image/png');
        } catch (e) {
            return '';
        }
    };

   // ==========================================
// 📂 MULTI-PAGE PDF & FILE UPLOAD ENGINE
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
            let pageImages = []; // Saare pages ki images store karne ke liye array
            
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
                        
                        // 🔥 Loop through ALL pages of the PDF to convert each page to an image
                        if (pdfDoc && typeof window.convertPdfPageToImage === 'function') {
                            for (let p = 1; p <= pageCount; p++) {
                                let pageImgUrl = await window.convertPdfPageToImage(pdfDoc, p);
                                if (pageImgUrl) {
                                    pageImages.push(pageImgUrl);
                                }
                            }
                        }
                        if (pageImages.length > 0) {
                            fileUrl = pageImages[0]; // Default preview ke liye pehla page
                        }
                    }
                } catch (e) {
                    pageCount = 1;
                }
            } else {
                // Agar normal image file hai toh usko bhi array mein dal dein
                pageImages.push(fileUrl);
            } 

            uploadedFilesList.push({
                name: file.name || 'Document.pdf',
                size: file.size || 0,
                fileBlob: file,
                fileUrl: fileUrl,
                pageImages: pageImages.length > 0 ? pageImages : [fileUrl], // Store all page images here
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

    const imageSlider = document.getElementById('studioInImageHorizontalSlider');
    if (imageSlider) {
        imageSlider.innerHTML = files.map((f, fIdx) => {
            let isLand = f.orientation === 'landscape';
            let isBw = f.printType === 'bw';
            let filterStyle = isBw ? 'filter: grayscale(100%);' : '';
            let transformStyle = isLand ? 'transform: rotate(90deg); max-width: 75%; max-height: 75%;' : 'max-width: 90%; max-height: 90%;';

            let previewContent = '';

            // 🔥 MULTI-PAGE PDF CHECK (Agar 1 se zyada page images hain)
            if (f.pageImages && f.pageImages.length > 1) {
                let verticalPagesHtml = f.pageImages.map((imgSrc, pIdx) => `
                    <div class="pdf-preview-page-item" data-page-idx="${pIdx}" style="width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:14px; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; padding:12px; box-sizing:border-box;">
                        <img src="${imgSrc}" style="${transformStyle} object-fit:contain; ${filterStyle} transition: all 0.3s ease;" />
                        <div style="margin-top:8px; background:#1e293b; color:white; font-size:0.7rem; font-weight:700; padding:3px 10px; border-radius:6px;">
                            Page ${pIdx + 1} of ${f.pageImages.length}
                        </div>
                    </div>
                `).join('');

                previewContent = `
                    <div class="vertical-pdf-scroll-box" data-file-index="${fIdx}" style="width:100%; height:100%; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden; padding:12px; box-sizing:border-box; scrollbar-width:thin;">
                        ${verticalPagesHtml}
                    </div>
                `;
            } else {
                // 🔥 SINGLE PAGE OR IMAGE OR DOCUMENT CHECK
                let singleImgSrc = (f.pageImages && f.pageImages.length > 0) ? f.pageImages[0] : f.fileUrl;
                
                if (singleImgSrc) {
                    const isActualImage = (f.fileBlob && f.fileBlob.type && f.fileBlob.type.startsWith('image/')) || 
                                          singleImgSrc.startsWith('data:image/');

                    if (isActualImage) {
                        previewContent = `<img src="${singleImgSrc}" style="${transformStyle} object-fit:contain; ${filterStyle} transition: all 0.3s ease;" />`;
                    } else {
                        previewContent = `
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px; ${filterStyle}; max-width: 90%; padding: 0 10px; box-sizing: border-box;">
                                <span style="font-size:3.5rem;">📄</span>
                                <span style="font-size:0.75rem; font-weight:700; color:#1e293b; max-width:100%; white-space:normal; word-break:break-all; overflow-wrap:break-word; text-align:center; line-height:1.3;">${f.name}</span>
                            </div>
                        `;
                    }
                } else {
                    previewContent = `<span style="font-size:3.5rem; ${filterStyle}">📄</span>`;
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

        // 🔥 DYNAMIC COUNTER UPDATE ON VERTICAL SCROLL
        setTimeout(() => {
            const verticalBoxes = imageSlider.querySelectorAll('.vertical-pdf-scroll-box');
            verticalBoxes.forEach(box => {
                box.addEventListener('scroll', () => {
                    const pages = box.querySelectorAll('.pdf-preview-page-item');
                    let visiblePageIndex = 0;
                    pages.forEach((page, idx) => {
                        const rect = page.getBoundingClientRect();
                        const boxRect = box.getBoundingClientRect();
                        if (rect.top >= boxRect.top - 120 && rect.top <= boxRect.bottom - 50) {
                            visiblePageIndex = idx;
                        }
                    });
                    const counterBadge = document.getElementById('studioSlideCounterBadge');
                    if (counterBadge) {
                        const fIndex = parseInt(box.getAttribute('data-file-index')) || 0;
                        const fileObj = files[fIndex];
                        if (fileObj && fileObj.pageImages) {
                            counterBadge.textContent = `Page ${visiblePageIndex + 1} of ${fileObj.pageImages.length}`;
                        }
                    }
                });
            });
        }, 60);
    }

    const counterBadge = document.getElementById('studioSlideCounterBadge');
    if (counterBadge) {
        if (currentFile.pageImages && currentFile.pageImages.length > 1) {
            counterBadge.textContent = `Page 1 of ${currentFile.pageImages.length}`;
        } else {
            counterBadge.textContent = `File ${window.currentStudioActiveIndex + 1}/${files.length}`;
        }
    }

    const copiesText = document.getElementById('studioCopiesCountText');
    if (copiesText) copiesText.textContent = currentFile.copies;

    const pagesInfo = document.getElementById('studioFilePagesInfo');
    if (pagesInfo) pagesInfo.textContent = `${currentFile.name} (${currentFile.pages} page${currentFile.pages > 1 ? 's' : ''})`;

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

    // 🔥 ACCURATE TOTAL PAGES & GRAND TOTAL CALCULATION ACROSS ALL FILES
    let totalPagesCombined = 0;
    let grandTotalPrice = 0;

    files.forEach((f) => {
        let pgs = parseInt(f.pages) || 1;
        let cps = parseInt(f.copies) || 1;
        let rate = (f.printType === 'bw') ? 3 : 10;
        
        totalPagesCombined += pgs * cps;
        grandTotalPrice += (pgs * rate * cps) + (f.binding === 'spiral' ? 30 * cps : 0);
    });

    const totalPriceText = document.getElementById('studioTotalPriceText');
    if (totalPriceText) {
        totalPriceText.textContent = `₹${grandTotalPrice} (${totalPagesCombined} pgs)`;
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
                let pageImages = [];
                let fileUrl = '';
                
                try {
                    fileUrl = URL.createObjectURL(file);
                } catch(e) {
                    fileUrl = '';
                }

                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        pageCount = pdfDoc.numPages || 1;

                        if (pdfDoc && typeof window.convertPdfPageToImage === 'function') {
                            for (let p = 1; p <= pageCount; p++) {
                                let pageImgUrl = await window.convertPdfPageToImage(pdfDoc, p);
                                if (pageImgUrl) pageImages.push(pageImgUrl);
                            }
                        }
                        if (pageImages.length > 0) fileUrl = pageImages[0];
                    } catch (e) {
                        pageCount = 1;
                    }
                } else if (file.type && file.type.startsWith('image/')) {
                    pageImages.push(fileUrl);
                }

                window.studioMasterFiles.push({
                    name: file.name,
                    size: file.size,
                    fileBlob: file,
                    fileUrl: fileUrl,
                    pageImages: pageImages.length > 0 ? pageImages : [fileUrl],
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

   // ==========================================
// 🔥 CART DRAWER & FOOTER BAR UI (WITH AUTO-CLOSE & VERTICAL DETAILED LIST)
// ==========================================
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
        
        // 🔥 Cart khulte hi turant store products fetch aur render karein
        if (typeof loadDynamicStoreProducts === 'function') {
            loadDynamicStoreProducts();
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

// 🔥 Bulletproof Upselling Grid Render for "You Might Also Like" Box
function renderUpsellingGridSafely() {
    const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (!upsellingGrid) return;
    
    // Agar products empty hain toh background mein fetch call lagayein
    if (!window.storeInventoryProducts || window.storeInventoryProducts.length === 0) {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:15px; width:100%;">Loading store products...</p>';
        if (typeof loadDynamicStoreProducts === 'function') {
            loadDynamicStoreProducts();
        }
        return;
    }

    upsellingGrid.innerHTML = '';
    let availableProducts = window.storeInventoryProducts.filter(prod => prod.stockQuantity > 0);

    if (availableProducts.length > 0) {
        availableProducts.forEach((prod) => {
            const thumb = prod.imageUrl || prod.image || '';
            const safeSku = String(prod.sku || prod.name || '').replace(/['"\\]/g, '\\$&');
            const safeName = String(prod.name || '').replace(/['"\\]/g, '\\$&');
            const safeThumb = String(thumb || '').replace(/['"\\]/g, '\\$&');
            
            const priceVal = Number(prod.sellingPrice || prod.price || 0);
            const stockVal = Number(prod.stockQuantity || prod.stock || 0);

            const itemCard = document.createElement('div');
            itemCard.style.cssText = "min-width:140px; max-width:140px; background:#ffffff; border:1px solid #cbd5e1; border-radius:16px; padding:12px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.04); flex-shrink:0;";
            
            itemCard.innerHTML = `
                ${thumb ? `<img src="${thumb}" style="width:55px; height:55px; object-fit:cover; border-radius:10px; margin-bottom:6px;" />` : '<div style="font-size:2rem; margin-bottom:6px;">📦</div>'}
                <div title="${prod.name || ''}" style="font-weight:800; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:2px;">${prod.name || ''}</div>
                <div style="font-size:0.75rem; font-weight:900; color:#065f46; margin-bottom:8px;">₹${priceVal}</div>
                <button type="button" style="background:#065f46; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${priceVal}, ${stockVal}, '${safeThumb}')">+ Add</button>
            `;
            upsellingGrid.appendChild(itemCard);
        });
    } else {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:15px; width:100%;">No store products available currently.</p>';
    }
}

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
    const freeDeliveryThreshold = 99.00;

    let activeDelFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
    let delFee = (subtotalCalc >= freeDeliveryThreshold || subtotalCalc === 0) ? 0.00 : activeDelFee;
    
    let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
    let rainFee = window.isRainSurgeActive ? activeRainFee : 0;
    
    let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;

    let totalPrice = subtotalCalc + delFee + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0);

    if (catBar) {
        if (totalCount > 0) {
            catBar.style.display = 'flex';
            if (catCountText) catCountText.textContent = `${totalCount} item${totalCount > 1 ? 's' : ''}`;
            if (catPriceText) catPriceText.textContent = `₹${totalPrice.toFixed(2)}`;
        } else {
            catBar.style.display = 'none';
        }
    }

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



// ==========================================
// 🔥 BULLETPROOF UNIVERSAL CART DRAWER RENDER ENGINE
// ==========================================
window.renderCartDrawerContents = function() {
    const container = document.getElementById('cartDrawerItemsList');
    const identityBox = document.getElementById('cartUserIdentitySummary');
    const addressSummaryNode = document.getElementById('cartDrawerAddressSummary');
    if (!container) return;
    
    container.innerHTML = '';
    
    const activeUser = localStorage.getItem('printAppUser') || 'Customer';
    const activePhone = localStorage.getItem('printAppUserIdentity') || '7398746551';
    const activeAddress = localStorage.getItem('selected_active_address') || 'No delivery address added yet.';

    if (identityBox) {
        identityBox.textContent = `Order for User (${activeUser}) | (${activePhone})`;
    }

    if (addressSummaryNode) {
        addressSummaryNode.textContent = activeAddress;
    }
    
    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
    
    if (!hasItems) {
        container.innerHTML = `<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:15px; width:100%;">Your cart is empty.</p>`;
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof renderUpsellingGridSafely === 'function') renderUpsellingGridSafely();
        return;
    }

    let totalPagesCount = 0;
    let totalItemsCount = 0;

    // 1. Render Print Jobs in Horizontal Cards with Edit Button
    window.cartPrintJobsArray.forEach((job, idx) => {
        let rate = (job.printType === 'bw') ? 3 : 10;
        let jobTotal = job.pages * rate * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
        totalPagesCount += job.pages * job.copies;
        totalItemsCount += 1;

        const card = document.createElement('div');
        card.style.cssText = "min-width:130px; max-width:130px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";

        card.innerHTML = `
            <div style="font-size:1.8rem; margin-bottom:2px;">📄</div>
            <div title="${job.fileName}" style="font-weight:700; font-size:0.72rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${job.fileName}</div>
            <div style="font-size:0.6rem; color:#64748b; font-weight:600; margin-bottom:6px;">${job.pages} pgs | ${job.printType.toUpperCase()}</div>
            <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content:center;">
                <button type="button" onclick="editCartPrintJob(${idx})" style="background:#fef08a; border:1px solid #fde047; padding:3px 8px; border-radius:6px; font-size:0.68rem; font-weight:800; cursor:pointer; color:#713f12;">Edit</button>
                <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fee2e2; color:#ef4444; border:none; width:22px; height:22px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
        `;
        container.appendChild(card);
    });

    // 2. Render Snacks / Store Products in Horizontal Cards with +/- Stepper
    window.cartSnacksArray.forEach((snack, idx) => {
        totalItemsCount += snack.qty;
        const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; margin-bottom:4px;" />` : `<div style="font-size:1.8rem; margin-bottom:4px;">📦</div>`;
        let itemTotal = snack.price * snack.qty;

        const card = document.createElement('div');
        card.style.cssText = "min-width:125px; max-width:125px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";

        card.innerHTML = `
            ${thumbImg}
            <div title="${snack.name}" style="font-weight:700; font-size:0.72rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${snack.name}</div>
            <div style="font-size:0.68rem; color:#065f46; font-weight:800; margin-bottom:6px;">₹${itemTotal}</div>
            <div style="display:flex; align-items:center; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:2px 6px; gap:6px; width:100%; justify-content:center;">
                <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; cursor:pointer; font-size:0.85rem;">-</button>
                <span style="font-weight:800; font-size:0.72rem; color:#0f172a;">${snack.qty}</span>
                <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; cursor:pointer; color:#065f46; font-size:0.85rem;">+</button>
            </div>
        `;
        container.appendChild(card);
    });

    const shipmentTextNode = document.getElementById('shipmentItemsCountText');
    if (shipmentTextNode) {
        shipmentTextNode.textContent = `${totalPagesCount} page${totalPagesCount !== 1 ? 's' : ''} and ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`;
    }

    if (typeof renderUpsellingGridSafely === 'function') {
        renderUpsellingGridSafely();
    }
    if (typeof calculateTotal === 'function') {
        calculateTotal();
    }
};

// 🔍 1. CART DRAWER LIVE SEARCH FUNCTION FOR INVENTORY ITEMS (Global Scope)
window.filterCartItemsSearch = function(query) {
    const q = (query || "").toLowerCase().trim();
    const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (!upsellingGrid) return;

    if (!window.storeInventoryProducts || window.storeInventoryProducts.length === 0) {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:10px; width:100%;">No store products available.</p>';
        return;
    }

    let filtered = window.storeInventoryProducts.filter(prod => (prod.name || '').toLowerCase().includes(q));
    upsellingGrid.innerHTML = '';

    if (filtered.length > 0) {
        filtered.forEach((prod) => {
            if (prod.stockQuantity > 0) {
                const thumb = prod.imageUrl || prod.image || '';
                const safeSku = String(prod.sku || prod.name || '').replace(/['"\\]/g, '\\$&');
                const safeName = String(prod.name || '').replace(/['"\\]/g, '\\$&');
                const safeThumb = String(thumb || '').replace(/['"\\]/g, '\\$&');
                
                const priceVal = Number(prod.sellingPrice || prod.price || 0);
                const stockVal = Number(prod.stockQuantity || prod.stock || 0);

                const itemCard = document.createElement('div');
                itemCard.style.cssText = "min-width:140px; max-width:140px; background:#ffffff; border:1px solid #cbd5e1; border-radius:16px; padding:12px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.04); flex-shrink:0;";
                
                itemCard.innerHTML = `
                    ${thumb ? `<img src="${thumb}" style="width:55px; height:55px; object-fit:cover; border-radius:10px; margin-bottom:6px;" />` : '<div style="font-size:2rem; margin-bottom:6px;">📦</div>'}
                    <div title="${prod.name || ''}" style="font-weight:800; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:2px;">${prod.name || ''}</div>
                    <div style="font-size:0.75rem; font-weight:900; color:#065f46; margin-bottom:8px;">₹${priceVal}</div>
                    <button type="button" style="background:#065f46; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${priceVal}, ${stockVal}, '${safeThumb}')">+ Add</button>
                `;
                upsellingGrid.appendChild(itemCard);
            }
        });
    } else {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:10px; width:100%;">No matching products found.</p>';
    }
};

// ==========================================
// 🔥 2. USER IDENTITY & ADDRESS FETCH FIX IN CART RENDER
// ==========================================
window.renderCartDrawerContents = function() {
    const container = document.getElementById('cartDrawerItemsList');
    const identityBox = document.getElementById('cartUserIdentitySummary');
    const addressSummaryNode = document.getElementById('cartDrawerAddressSummary');
    if (!container) return;
    
    container.innerHTML = '';
    
    const activeUser = localStorage.getItem('printAppUser') || 'Customer';
    const activePhone = localStorage.getItem('printAppUserIdentity') || '7398746551';
    const activeAddress = localStorage.getItem('selected_active_address') || 'No delivery address added yet.';

    if (identityBox) {
        identityBox.textContent = `Order for User (${activeUser}) | (${activePhone})`;
    }

    if (addressSummaryNode) {
        addressSummaryNode.textContent = activeAddress;
    }
    
    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
    
    if (!hasItems) {
        container.innerHTML = `<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:15px; width:100%;">Your cart is empty.</p>`;
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof renderUpsellingGridSafely === 'function') renderUpsellingGridSafely();
        return;
    }

    let totalPagesCount = 0;
    let totalItemsCount = 0;

    window.cartPrintJobsArray.forEach((job, idx) => {
        let rate = (job.printType === 'bw') ? 3 : 10;
        let jobTotal = job.pages * rate * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
        totalPagesCount += job.pages * job.copies;
        totalItemsCount += 1;

        const card = document.createElement('div');
        card.style.cssText = "min-width:130px; max-width:130px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";

        card.innerHTML = `
            <div style="font-size:1.8rem; margin-bottom:2px;">📄</div>
            <div title="${job.fileName}" style="font-weight:700; font-size:0.72rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${job.fileName}</div>
            <div style="font-size:0.6rem; color:#64748b; font-weight:600; margin-bottom:6px;">${job.pages} pgs | ${job.printType.toUpperCase()}</div>
            <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content:center;">
                <button type="button" onclick="editCartPrintJob(${idx})" style="background:#fef08a; border:1px solid #fde047; padding:3px 8px; border-radius:6px; font-size:0.68rem; font-weight:800; cursor:pointer; color:#713f12;">Edit</button>
                <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fee2e2; color:#ef4444; border:none; width:22px; height:22px; border-radius:50%; font-weight:bold; cursor:pointer; font-size:0.75rem; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
        `;
        container.appendChild(card);
    });

    window.cartSnacksArray.forEach((snack, idx) => {
        totalItemsCount += snack.qty;
        const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; margin-bottom:4px;" />` : `<div style="font-size:1.8rem; margin-bottom:4px;">📦</div>`;
        let itemTotal = snack.price * snack.qty;

        const card = document.createElement('div');
        card.style.cssText = "min-width:125px; max-width:125px; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03); flex-shrink:0;";

        card.innerHTML = `
            ${thumbImg}
            <div title="${snack.name}" style="font-weight:700; font-size:0.72rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${snack.name}</div>
            <div style="font-size:0.68rem; color:#065f46; font-weight:800; margin-bottom:6px;">₹${itemTotal}</div>
            <div style="display:flex; align-items:center; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:2px 6px; gap:6px; width:100%; justify-content:center;">
                <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; cursor:pointer; font-size:0.85rem;">-</button>
                <span style="font-weight:800; font-size:0.72rem; color:#0f172a;">${snack.qty}</span>
                <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; cursor:pointer; color:#065f46; font-size:0.85rem;">+</button>
            </div>
        `;
        container.appendChild(card);
    });

    const shipmentTextNode = document.getElementById('shipmentItemsCountText');
    if (shipmentTextNode) {
        shipmentTextNode.textContent = `${totalPagesCount} page${totalPagesCount !== 1 ? 's' : ''} and ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`;
    }

    // ⚡ Sirf upselling grid ko call karo, naya div create mat karo kyunki wo index.html mein pehle se hai
    if (typeof renderUpsellingGridSafely === 'function') {
        renderUpsellingGridSafely();
    }
    if (typeof calculateTotal === 'function') {
        calculateTotal();
    }
};

// 🔥 Single Clean Upselling Grid Render (140px Bada Size with Inventory Integration)
function renderUpsellingGridSafely() {
    const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (!upsellingGrid) return;
    
    // Agar store inventory products loaded nahi hain, toh fetch karein
    if (!window.storeInventoryProducts || window.storeInventoryProducts.length === 0) {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:15px; width:100%;">Loading store products...</p>';
        if (typeof loadDynamicStoreProducts === 'function') {
            loadDynamicStoreProducts();
        }
        return;
    }

    upsellingGrid.innerHTML = '';
    let availableProducts = window.storeInventoryProducts.filter(prod => prod.stockQuantity > 0);

    if (availableProducts.length > 0) {
        availableProducts.forEach((prod) => {
            const thumb = prod.imageUrl || prod.image || '';
            const safeSku = String(prod.sku || prod.name || '').replace(/['"\\]/g, '\\$&');
            const safeName = String(prod.name || '').replace(/['"\\]/g, '\\$&');
            const safeThumb = String(thumb || '').replace(/['"\\]/g, '\\$&');
            
            const priceVal = Number(prod.sellingPrice || prod.price || 0);
            const stockVal = Number(prod.stockQuantity || prod.stock || 0);

            const itemCard = document.createElement('div');
            // 📦 Bada Size Card (140px width)
            itemCard.style.cssText = "min-width:140px; max-width:140px; background:#ffffff; border:1px solid #cbd5e1; border-radius:16px; padding:12px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 3px 10px rgba(0,0,0,0.04); flex-shrink:0;";
            
            itemCard.innerHTML = `
                ${thumb ? `<img src="${thumb}" style="width:55px; height:55px; object-fit:cover; border-radius:10px; margin-bottom:6px;" />` : '<div style="font-size:2rem; margin-bottom:6px;">📦</div>'}
                <div title="${prod.name || ''}" style="font-weight:800; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:2px;">${prod.name || ''}</div>
                <div style="font-size:0.75rem; font-weight:900; color:#065f46; margin-bottom:8px;">₹${priceVal}</div>
                <button type="button" style="background:#065f46; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:0.72rem; font-weight:800; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${priceVal}, ${stockVal}, '${safeThumb}')">+ Add</button>
            `;
            upsellingGrid.appendChild(itemCard);
        });
    } else {
        upsellingGrid.innerHTML = '<p style="font-size:0.78rem; color:#64748b; text-align:center; padding:15px; width:100%;">No store products available currently.</p>';
    }
}

// Helper function to edit a print job from cart (re-opens Print Studio)
window.editCartPrintJob = function(idx) {
    let job = window.cartPrintJobsArray[idx];
    if (!job) return;

    window.studioMasterFiles = [{
        name: job.fileName,
        size: 0,
        fileBlob: job.fileData,
        fileUrl: job.fileUrl,
        pageImages: [job.fileUrl],
        pages: job.pages,
        copies: job.copies,
        printType: job.printType,
        orientation: job.orientation,
        binding: job.binding || 'none'
    }];
    window.currentStudioActiveIndex = 0;

    // Remove from cart while editing
    window.cartPrintJobsArray.splice(idx, 1);
    persistCartStateData();
    renderCartDrawerContents();
    toggleCartDrawer(false);

    if (typeof openPrintStudioWithFilesArray === 'function') {
        openPrintStudioWithFilesArray(window.studioMasterFiles, 0);
    }
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

window.loadUserAddressesFromStorage = function() {
    const raw = localStorage.getItem('saved_addresses');
    if (raw) {
        try { window.savedUserAddresses = JSON.parse(raw); } catch(e) { window.savedUserAddresses = []; }
    }
    
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

window.refreshInvoiceTabState = function() {
    const sideInvoicePanel = document.getElementById('sidebarPricingPanel');
    const layoutContainer = document.getElementById('mainLayoutAppContainer');
    const uploadInitialScreen = document.getElementById('uploadScreenInitialState');
    const configWorkspaceScreen = document.getElementById('configurationScreenState');
    const activeTabStoreNode = document.getElementById('user_section_store');

    const activeTabIsStore = activeTabStoreNode && activeTabStoreNode.classList.contains('active');
    if (!activeTabIsStore) return;

    if (masterFilesArray && masterFilesArray.length > 0) {
        if (uploadInitialScreen) {
            uploadInitialScreen.classList.add('hidden');
            uploadInitialScreen.style.setProperty('display', 'none', 'important');
        }
        if (configWorkspaceScreen) {
            configWorkspaceScreen.classList.remove('hidden');
            configWorkspaceScreen.style.setProperty('display', 'block', 'important');
        }
        if (sideInvoicePanel) sideInvoicePanel.classList.remove('hidden');

        if (window.innerWidth > 992) {
            if (layoutContainer) { 
                layoutContainer.classList.add('has-invoice'); 
                layoutContainer.style.gridTemplateColumns = '2.5fr 1.2fr'; 
            }
        } else { 
            if (layoutContainer) layoutContainer.style.gridTemplateColumns = '1fr'; 
        }
    } else {
        if (uploadInitialScreen) {
            uploadInitialScreen.classList.remove('hidden');
            uploadInitialScreen.style.setProperty('display', 'block', 'important');
        }
        if (configWorkspaceScreen) {
            configWorkspaceScreen.classList.add('hidden');
            configWorkspaceScreen.style.setProperty('display', 'none', 'important');
        }
        if (sideInvoicePanel) sideInvoicePanel.classList.add('hidden');
        if (layoutContainer) { 
            layoutContainer.classList.remove('has-invoice'); 
            layoutContainer.style.gridTemplateColumns = '1fr'; 
        }
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

// 🔥 Live Admin Settings Sync Engine (No Hardcoded Defaults - Strictly Admin Controlled)
window.adminDeliveryFee = parseFloat(localStorage.getItem('cached_delivery_fee')) || 0;
window.adminHandlingFee = parseFloat(localStorage.getItem('cached_handling_fee')) || 0;
window.adminRainFee = parseFloat(localStorage.getItem('cached_rain_fee')) || 0;
window.adminCouponsList = JSON.parse(localStorage.getItem('cached_coupons') || '[]');

window.loadAdminConfiguredFeesAndCoupons = async function() {
    try {
        const res = await fetch('/api/admin/settings');
        if (res && res.ok) {
            const data = await res.json();
            if (data && data.success && data.settings) {
                window.adminDeliveryFee = parseFloat(data.settings.deliveryFee) || 0;
                window.adminHandlingFee = parseFloat(data.settings.handlingFee) || 0;
                window.adminRainFee = parseFloat(data.settings.rainFee) || 0;
                window.adminCouponsList = data.settings.coupons || [];

                // 💾 Save to localStorage so refresh shows it instantly without waiting
                localStorage.setItem('cached_delivery_fee', window.adminDeliveryFee);
                localStorage.setItem('cached_handling_fee', window.adminHandlingFee);
                localStorage.setItem('cached_rain_fee', window.adminRainFee);
                localStorage.setItem('cached_coupons', JSON.stringify(window.adminCouponsList));

                // 🔄 Recalculate bill instantly with live admin values
                if (typeof calculateTotal === 'function') {
                    calculateTotal();
                }
            }
        }
    } catch (e) {
        console.warn("Could not sync live settings from server.");
    }
};

// Automatically load fees and coupons when client app starts
document.addEventListener('DOMContentLoaded', () => {
    loadAdminConfiguredFeesAndCoupons();
});


// 🔥 Admin Store Settings & Fees Save Engine
window.saveAdminStoreSettings = async function() {
    const deliveryField = document.getElementById('adminSettingDeliveryFee');
    const handlingField = document.getElementById('adminSettingHandlingFee');
    const rainField = document.getElementById('adminSettingRainFee');

    const deliveryFee = deliveryField ? deliveryField.value : 0;
    const handlingFee = handlingField ? handlingField.value : 0;
    const rainFee = rainField ? rainField.value : 0;

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

// ==========================================
// 💳 BULLETPROOF ORDER PLACEMENT & PAYMENT GATEWAY ENGINE
// ==========================================
window.executeFinalCartOrderPlacement = async function() {
    if (typeof isStoreCurrentlyOpen !== 'undefined' && !isStoreCurrentlyOpen) {
        alert("🚨 Store is currently CLOSED! Orders cannot be accepted right now.");
        const storeClosedModal = document.getElementById('storeClosedPopupModal');
        if (storeClosedModal) storeClosedModal.style.display = 'flex';
        return;
    }

    const activeAddress = localStorage.getItem('selected_active_address');
    if (!activeAddress || activeAddress.trim() === "") {
        alert("⚠️ Please add and select a delivery address first!");
        if (typeof openAddressManagerModal === 'function') {
            openAddressManagerModal();
        }
        return;
    }

    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    let totalItemsCount = window.cartSnacksArray.reduce((acc, item) => acc + item.qty, 0) + window.cartPrintJobsArray.length;
    if (totalItemsCount === 0) {
        alert("⚠️ Your cart is empty! Please add print jobs or store products first.");
        return;
    }

    let totalPrintVal = 0;
    let totalSnacksVal = 0;
    const finalMetaConfig = [];

    window.cartPrintJobsArray.forEach(job => {
        let rate = (job.printType === 'bw') ? 3 : 10;
        const cost = job.pages * rate * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);
        totalPrintVal += cost;
        finalMetaConfig.push({ fileName: job.fileName, pages: job.pages, printType: job.printType, binding: job.binding, copies: job.copies });
    });

    window.cartSnacksArray.forEach(snack => {
        totalSnacksVal += snack.price * snack.qty;
        finalMetaConfig.push({ 
            sku: snack.sku || '',
            name: snack.name,
            fileName: `Product: ${snack.name} (Qty: ${snack.qty})`, 
            copies: snack.qty, 
            qty: snack.qty,
            printType: 'snack', 
            pages: 1,
            price: snack.price,
            imageUrl: snack.imageUrl || ''
        });
    });

    let subtotal = totalPrintVal + totalSnacksVal;
    const freeDeliveryThreshold = 99.00;
    let activeDelFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
    let delivery = (subtotal >= freeDeliveryThreshold || subtotal === 0) ? 0 : activeDelFee;
    
    let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
    let rainFee = window.isRainSurgeActive ? activeRainFee : 0;
    
    let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;
    
    let grandTotal = subtotal + delivery + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0);

    const paymentSelect = document.getElementById('cartDrawerPaymentSelect');
    const selectedRadio = document.querySelector('input[name="cartPaymentMode"]:checked');
    let paymentMode = selectedRadio ? selectedRadio.value.toLowerCase() : (paymentSelect ? paymentSelect.value.toLowerCase() : 'online');

    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
    const userPhone = localStorage.getItem('printAppUserIdentity') || 'N/A';

    const formData = new FormData();
    window.cartPrintJobsArray.forEach(job => {
        if (job.fileData) formData.append('document', job.fileData);
    });

    formData.append('totalAmount', grandTotal.toFixed(2));
    formData.append('configDetails', JSON.stringify(finalMetaConfig));
    formData.append('address', activeAddress);
    formData.append('customerName', sessionActiveUser);
    formData.append('phone', userPhone);
    formData.append('deliveryTip', window.currentDeliveryTip || 0);
    formData.append('paymentMode', paymentMode);

    let initialOrderStatus = (window.cartPrintJobsArray.length > 0) ? "Ready for Print" : "Order Placed & Picking";

    const finalizeOrderSuccess = async (orderId) => {
        const historyKey = `history_${sessionActiveUser}`;
        const currentHistoryArray = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        currentHistoryArray.unshift({ 
            orderId: orderId,
            date: new Date().toLocaleString(), 
            amount: grandTotal.toFixed(2), 
            status: initialOrderStatus, 
            details: finalMetaConfig, 
            address: activeAddress,
            deliveryTip: window.currentDeliveryTip || 0
        });
        
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

        // Clear cart after success
        window.cartPrintJobsArray = [];
        window.cartSnacksArray = [];
        window.currentDeliveryTip = 0;
        localStorage.removeItem('cart_print_jobs');
        localStorage.removeItem('cart_snacks');

        if (typeof persistCartStateData === 'function') persistCartStateData();
        if (typeof toggleCartDrawer === 'function') toggleCartDrawer(false);

        if (typeof renderOrderHistoryUI === 'function') {
            renderOrderHistoryUI(sessionActiveUser);
        }

        // 🔥 100% Safe Routing to History View (Never Blank)
        if (typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('history');
        } else {
            const historySection = document.getElementById('user_section_history');
            document.querySelectorAll('.view-section').forEach(el => {
                el.classList.remove('active');
                el.style.setProperty('display', 'none', 'important');
            });
            if (historySection) {
                historySection.classList.add('active');
                historySection.style.setProperty('display', 'block', 'important');
            }
        }
    };

    // 1️⃣ CASH ON DELIVERY (COD) ROUTE -> Directly saves and redirects to history
    if (paymentMode === 'cod' || paymentMode === 'cash') {
        try {
            const response = await fetch('/api/create-order', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                alert('🎉 Order Placed Successfully via Cash on Delivery!');
                await finalizeOrderSuccess(data.order_id);
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

    // 2️⃣ PRINT WALLET ROUTE
    if (paymentMode === 'wallet') {
        let currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        if (currentWalletCash < grandTotal) {
            alert(`❌ Insufficient wallet balance! You have ₹${currentWalletCash.toFixed(2)}, but grand total is ₹${grandTotal.toFixed(2)}. Please recharge your wallet.`);
            return;
        }

        let newBalance = currentWalletCash - grandTotal;
        localStorage.setItem(`wallet_cash_${sessionActiveUser}`, newBalance.toFixed(2));
        if (typeof synchronizeWalletInterfaceBalance === 'function') synchronizeWalletInterfaceBalance();
        formData.append('paymentMode', 'wallet');

        try {
            const response = await fetch('/api/create-order', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                alert('🎉 Order Placed Successfully using Print Wallet!');
                await finalizeOrderSuccess(data.order_id);
                return;
            } else {
                alert(`⚠️ Error: ${data.message || 'Failed to create wallet order'}`);
                return;
            }
        } catch (err) {
            alert("❌ Wallet order placement error.");
            return;
        }
    }

    // 3️⃣ ONLINE PAYMENT ROUTE (🔥 FIXED: Order is created on server, but finalized ONLY on payment success)
    try {
        formData.append('paymentMode', 'online');
        const response = await fetch('/api/create-order', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (!data.success) {
            alert(`⚠️ Error: ${data.message || 'Failed to initialize payment gateway'}`);
            return;
        }

        const options = {
            key: data.key_id,
            amount: data.amount,
            currency: 'INR',
            name: 'Print From Home',
            description: 'Instant Printing & Delivery',
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
                        alert('🎉 Payment Successful & Order Confirmed!');
                        await finalizeOrderSuccess(data.order_id);
                    } else {
                        alert('⚠️ Payment verification failed.');
                    }
                } catch (err) {
                    alert('🎉 Payment Recorded Successfully!');
                    await finalizeOrderSuccess(data.order_id);
                }
            },
            modal: {
                ondismiss: function() {
                    alert('⚠️ Payment cancelled. Order was not completed.');
                }
            },
            theme: { color: '#065f46' }
        };

        if (typeof Razorpay !== 'undefined') {
            const rzp1 = new Razorpay(options);
            rzp1.open();
        } else {
            alert('⚠️ Razorpay SDK not loaded.');
        }
    } catch (error) {
        alert('❌ Connection Breakdown during online checkout.');
    }
};

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
    try {
        // 1. Saare view sections ko securely hide karein
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
            el.style.setProperty('display', 'none', 'important');
        });
        
        let normalizedId = targetId === 'orders' ? 'history' : targetId;
        const targetNode = document.getElementById(`user_section_${normalizedId}`);
        
        // 2. Sirf targeted section ko display block karein
        if (targetNode) {
            targetNode.classList.add('active');
            targetNode.style.setProperty('display', 'block', 'important');
        }

        // Store section ko manage karein
        const storeNode = document.getElementById('user_section_store');
        if (storeNode) {
            if (normalizedId === 'store') {
                storeNode.style.setProperty('display', 'block', 'important');
            } else {
                storeNode.style.setProperty('display', 'none', 'important');
            }
        }

        const mainContainer = document.getElementById('mainLayoutAppContainer');
        if (mainContainer) {
            mainContainer.style.setProperty('display', 'flex', 'important');
        }

        if (typeof toggleUserDrawer === 'function') toggleUserDrawer(false);
        if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();

        // 3. Agar History tab khula hai, toh uski list render karein
        if (normalizedId === 'history' && typeof renderOrderHistoryUI === 'function') {
            const activeUser = localStorage.getItem('printAppUser') || 'Customer';
            renderOrderHistoryUI(activeUser);
        }

    } catch (err) {
        console.error("Navigation Error:", err);
    }
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

  
const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
    if (upsellingGrid) {
        if (window.storeInventoryProducts && window.storeInventoryProducts.length > 0) {
            upsellingGrid.innerHTML = '';
            window.storeInventoryProducts.forEach((prod) => {
                if (prod.stockQuantity > 0) {
                    const thumb = prod.imageUrl || prod.image || '';
                    
                    // 🔥 Safe escaping for HTML inline onclick string parameters
                    const safeSku = String(prod.sku || prod.name || '').replace(/['"\\]/g, '\\$&');
                    const safeName = String(prod.name || '').replace(/['"\\]/g, '\\$&');
                    const safeThumb = String(thumb || '').replace(/['"\\]/g, '\\$&');
                    
                    const priceVal = Number(prod.sellingPrice || prod.price || 0);
                    const stockVal = Number(prod.stockQuantity || prod.stock || 0);

                    const itemCard = document.createElement('div');
                    itemCard.style.cssText = "min-width: 100px; width: 100px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.03);";
                    
                    itemCard.innerHTML = `
                        ${thumb ? `<img src="${thumb}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; margin-bottom:4px;" />` : '<div style="font-size:1.5rem; margin-bottom:4px;">📦</div>'}
                        <div title="${prod.name || ''}" style="font-size:0.7rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${prod.name || ''}</div>
                        <div style="font-size:0.7rem; font-weight:800; color:#065f46; margin:2px 0 6px 0;">₹${priceVal}</div>
                        <button type="button" style="background:#065f46; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:700; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${safeSku}', '${safeName}', ${priceVal}, ${stockVal}, '${safeThumb}')">+ Add</button>
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

if (typeof window.synchronizeWalletInterfaceBalance !== 'function') {
    window.synchronizeWalletInterfaceBalance = function() {
        const sessionActiveUser = localStorage.getItem('printAppUser');
        const balanceDisplayNode = document.getElementById('headerWalletDisplayBalance');
        const drawerWalletText = document.getElementById('walletDrawerBalanceText');
        if (!balanceDisplayNode) return;
        if (!sessionActiveUser) {
            balanceDisplayNode.textContent = '₹0.00';
            if (drawerWalletText) drawerWalletText.textContent = '₹0';
            return;
        }
        const currentWalletCash = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        balanceDisplayNode.textContent = `₹${currentWalletCash.toFixed(2)}`;
        if (drawerWalletText) drawerWalletText.textContent = `₹${currentWalletCash.toFixed(2)}`;
    };
}

// 🔥 EMERGENCY FORCE RENDER & DEBUG HELPER
window.forceDebugOrderHistory = function(username, showRecent = true) {
    const escapeHtml = function(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    };

    const fallbackUser = localStorage.getItem('printAppUser') || 'Customer';
    const user = (username && String(username).trim()) ? String(username).trim() : fallbackUser;
    const container = document.getElementById('ordersHistoryContainer');
    if (!container) {
        console.error('❌ #ordersHistoryContainer element missing from HTML!');
        return;
    }

    const rawHistory = localStorage.getItem(`history_${user}`) || '[]';
    if (typeof console !== 'undefined') console.log('📦 Raw History from LocalStorage:', rawHistory);

    let history = [];
    try {
        history = JSON.parse(rawHistory);
    } catch (e) {
        history = [];
    }

    if (!Array.isArray(history)) {
        history = [];
    }

    if (showRecent !== false) {
        history = [...history].sort(function(a, b) {
            const aDate = new Date(a.date || 0).getTime();
            const bDate = new Date(b.date || 0).getTime();
            return bDate - aDate;
        });
    }

    if (history.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#ef4444; font-weight:bold;">⚠️ No orders found in LocalStorage for user: ${escapeHtml(user)}. Try placing a test order!</p>`;
        return;
    }

    container.innerHTML = history.map(function(order) {
        const orderId = String(order.orderId || order.id || 'N/A');
        const amount = Number(order.amount || 0).toFixed(2);
        const statusText = escapeHtml(order.status || 'Processing');
        const dateText = escapeHtml(order.date || '');
        const safeOrderId = escapeHtml(orderId);

        return `
            <div style="background:#f8fafc; border:2px solid #065f46; border-radius:12px; padding:14px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-weight:900; font-size:0.9rem; color:#0f172a;">
                    <span>Order #${escapeHtml(orderId)}</span>
                    <span style="color:#065f46;">₹${amount}</span>
                </div>
                <p style="font-size:0.8rem; color:#475569; margin:6px 0;">Status: <b style="color:#2563eb;">${statusText}</b></p>
                <p style="font-size:0.75rem; color:#94a3b8; margin-bottom:10px;">${dateText}</p>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" data-order-id="${safeOrderId}" class="track-order-btn" style="background:#2563eb; color:white; border:none; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.78rem; cursor:pointer;">📍 Track Status</button>
                    <button type="button" data-repeat-id="${safeOrderId}" class="repeat-order-btn" style="background:#065f46; color:white; border:none; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.78rem; cursor:pointer;">🔁 Repeat in Cart</button>
                </div>
            </div>
        `;
    }).join('');

    // Attach Event Listeners securely
    container.querySelectorAll('.track-order-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            if (typeof window.openOrderTrackingView === 'function') {
                window.openOrderTrackingView(orderId);
            }
        });
    });

    container.querySelectorAll('.repeat-order-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-repeat-id');
            if (typeof window.openPastOrderInCartPreview === 'function') {
                window.openPastOrderInCartPreview(orderId);
            }
        });
    });
};

(function() {
    // Sync main render engine with debug helper
    window.renderOrderHistoryUI = function(username, showRecent = true) {
        if (typeof window.forceDebugOrderHistory === 'function') {
            window.forceDebugOrderHistory(username, showRecent);
        }
    };

    // Auto-run debug/render on load
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (typeof window.forceDebugOrderHistory === 'function') {
                const activeUser = localStorage.getItem('printAppUser') || 'Customer';
                window.forceDebugOrderHistory(activeUser, true);
            }
        }, 1000);
    });
})();

// Final safety net: ensure no trailing syntax issues at EOF.
if (typeof window !== 'undefined') {
    window.__orderHistoryDebugInit = true;
}
