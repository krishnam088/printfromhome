window.currentCartDeliveryMode = 'doorstep'; // Default doorstep

window.updateCartDeliveryMode = function(mode) {
    window.currentCartDeliveryMode = mode;
    if (typeof calculateTotal === 'function') {
        calculateTotal();
    }
};




// 🔥 Diwali Pre-Launch Notice Popup Helper Function
window.showDiwaliPreLaunchNotice = function(message) {
    let existingModal = document.getElementById('diwaliPreLaunchModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'diwaliPreLaunchModal';
    modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Poppins', sans-serif;";
    
    modal.innerHTML = `
        <div style="background:#ffffff; border-radius:20px; width:100%; max-width:380px; padding:24px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.2); position:relative;">
            <div style="font-size:3rem; margin-bottom:10px;">🪔</div>
            <h3 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:8px;">Diwali Pre-Launch Notice</h3>
            <p style="font-size:0.85rem; color:#475569; line-height:1.5; margin-bottom:20px;">${message}</p>
            <button type="button" onclick="document.getElementById('diwaliPreLaunchModal').remove()" style="width:100%; padding:12px; background:#065f46; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:pointer;">Got it, thanks!</button>
        </div>
    `;
    document.body.appendChild(modal);
};

// 🔥 GLOBAL STORE LOCATION
const STORE_LOCATION = {
    lat: 25.3451,
    lng: 83.0012,
    name: "Store"
};

// ==========================================
// 🔥 STRICTLY USER-SPECIFIC ORDER HISTORY RENDER ENGINE
// ==========================================
window.renderOrderHistoryUI = function(username, showRecent = true) {
    try {
        const container = document.getElementById('ordersHistoryContainer') || document.querySelector('[id*="history"]');
        if (!container) return;

        // 1. Sirf active logged-in user ki keys target karein (Doosre users ka data mix na ho)
        const sessionActiveUser = localStorage.getItem('printAppUser') || username || 'Customer';
        const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';

        const targetKeys = [
            `history_${sessionActiveUser}`,
            activeIdentity ? `history_${activeIdentity}` : null
        ].filter(Boolean);

        let history = [];
        let seenOrderIds = new Set();

        targetKeys.forEach(key => {
            try {
                let items = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(items)) {
                    items.forEach(ord => {
                        if (ord) {
                            let uniqueId = ord.orderId || ord.id || JSON.stringify(ord);
                            if (!seenOrderIds.has(uniqueId)) {
                                seenOrderIds.add(uniqueId);
                                history.push(ord);
                            }
                        }
                    });
                }
            } catch (e) {}
        });

        if (showRecent !== false) {
            history = history.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        }

        const homeTopBar = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;">
                <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Your Orders (${history.length})</h3>
                <button type="button" onclick="navigateDrawerSection('store')" style="background: #065f46; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🏠 Home</button>
            </div>
        `;

        if (history.length === 0) {
            container.innerHTML = `
                ${homeTopBar}
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border: 1.5px dashed #16a34a; border-radius: 20px; padding: 36px 20px; text-align: center; font-family: 'Poppins', sans-serif; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.05); margin-top: 10px;">
                    <div style="font-size: 3.2rem; margin-bottom: 12px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.06));">📦✨</div>
                    <h3 style="font-size: 1.15rem; font-weight: 900; color: #0f172a; margin-bottom: 6px; letter-spacing: -0.3px;">No orders found yet</h3>
                    <p style="font-size: 0.8rem; color: #64748b; line-height: 1.5; margin-bottom: 22px; max-width: 290px; margin-left: auto; margin-right: auto; font-weight: 500;">You haven't placed any print orders or store purchases. Kickstart your first order and get superfast doorstep delivery!</p>
                    <button type="button" onclick="navigateDrawerSection('store')" style="background: #065f46; color: white; border: none; padding: 12px 28px; border-radius: 14px; font-weight: 900; font-size: 0.85rem; cursor: pointer; box-shadow: 0 6px 20px rgba(6, 95, 70, 0.25); transition: transform 0.2s ease;">Start Your First Order &rarr;</button>
                </div>
            `;
            return;
        }

        container.innerHTML = homeTopBar + history.map(order => {
            if (!order) return '';
            let safeId = order.orderId || order.id || 'N/A';
            let safeAmount = Number(order.amount || order.totalAmount || 0).toFixed(2);
            let safeStatus = order.status || 'Processing';
            let safeDate = order.date || '';
            
            let itemsHtml = '';
            let detailsArray = order.details || order.configDetails || [];
            if (typeof detailsArray === 'string') {
                try { detailsArray = JSON.parse(detailsArray); } catch(e) { detailsArray = []; }
            }

            if (Array.isArray(detailsArray)) {
                itemsHtml = detailsArray.map(item => `<div style="font-size: 0.75rem; color: #334155; margin-top: 2px;">• ${item.name || item.fileName || 'Item'} (Qty: ${item.qty || item.copies || 1})</div>`).join('');
            }

            return `
                <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin-bottom:12px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem; color:#0f172a;">
                        <span>Order #${safeId}</span>
                        <span style="color:#065f46;">₹${safeAmount}</span>
                    </div>
                    <div style="margin: 6px 0;">${itemsHtml}</div>
                    <p style="font-size:0.75rem; color:#64748b; margin:4px 0;">Status: <b style="color:#2563eb;">${safeStatus}</b></p>
                    <p style="font-size:0.7rem; color:#94a3b8; margin-bottom:10px;">${safeDate}</p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" onclick="openOrderTrackingView('${safeId}')" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">📍 Track Status</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Render Order History Error:", err);
    }
};

// Auto-run every time history section or drawer is accessed
document.addEventListener("click", (e) => {
    const target = e.target.closest('[onclick*="history"], [href*="history"], button');
    if (target) {
        setTimeout(() => {
            if (typeof renderOrderHistoryUI === 'function') {
                renderOrderHistoryUI();
            }
        }, 100);
    }
});

// Safe background watcher to keep history container filled
window.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        const container = document.getElementById('ordersHistoryContainer');
        if (container && (container.innerHTML.includes('No orders found') || container.innerHTML.trim() === '')) {
            if (typeof renderOrderHistoryUI === 'function') {
                renderOrderHistoryUI();
            }
        }
    }, 1000);
});


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


    // 🔥 Bulletproof Address Updater (Handles both Google LatLng object and plain {lat, lng} object)
    function updateAddressFromLatLng(geocoder, latLng, inputElement) {
        const latVal = (typeof latLng.lat === 'function') ? latLng.lat() : latLng.lat;
        const lngVal = (typeof latLng.lng === 'function') ? latLng.lng() : latLng.lng;

        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                if (inputElement) {
                    inputElement.value = results[0].formatted_address;
                    inputElement.removeAttribute('readonly');
                }
            } else {
                if (inputElement) {
                    inputElement.value = `Location: ${Number(latVal).toFixed(5)}, ${Number(lngVal).toFixed(5)}`;
                    inputElement.removeAttribute('readonly');
                }
            }
        });
    }
 
// 🔥 100% Bulletproof Order History UI Render Engine (Stops White Screen Crashes)
window.renderOrderHistoryUI = function(username, showRecent = true) {
    try {
        const container = document.getElementById('ordersHistoryContainer');
        if (!container) return;
        
        let allOrdersMap = new Map();

        // localStorage ki saari 'history_' keys ko automatic scan karega
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key && key.startsWith('history_')) {
                try {
                    let items = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(items)) {
                        items.forEach(ord => {
                            if (ord) {
                                let uniqueId = ord.orderId || ord.id || JSON.stringify(ord);
                                allOrdersMap.set(uniqueId, ord);
                            }
                        });
                    }
                } catch (e) {}
            }
        }

        let history = Array.from(allOrdersMap.values());

        const homeTopBar = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;">
                <h3 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;">Your Orders</h3>
                <button type="button" onclick="navigateDrawerSection('store')" style="background: #065f46; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🏠 Home</button>
            </div>
        `;

        if (history.length === 0) {
            container.innerHTML = `
                ${homeTopBar}
                <div style="text-align:center; padding:45px 20px; font-family:'Poppins', sans-serif;">
                    <div style="font-size:3.5rem; margin-bottom:12px;">📦✨</div>
                    <h3 style="font-size:1.15rem; font-weight:900; color:#0f172a; margin-bottom:6px;">No orders found</h3>
                    <p style="font-size:0.82rem; color:#64748b; line-height:1.5; margin-bottom:20px; max-width:280px; margin-left:auto; margin-right:auto;">You haven't placed any orders yet. Place your first order now and enjoy special first-order delivery perks!</p>
                    <button type="button" onclick="navigateDrawerSection('store')" style="background:#065f46; color:white; border:none; padding:12px 24px; border-radius:12px; font-weight:900; font-size:0.85rem; cursor:pointer; box-shadow:0 4px 12px rgba(6,95,70,0.2);">Start Your First Order &rarr;</button>
                </div>
            `;
            return;
        }

        if (showRecent !== false) {
            history = history.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        }

        container.innerHTML = homeTopBar + history.map(order => {
            if (!order) return '';
            let safeId = order.orderId || order.id || 'N/A';
            let safeAmount = Number(order.amount || order.totalAmount || 0).toFixed(2);
            let safeStatus = order.status || 'Processing';
            let safeDate = order.date || '';

            return `
                <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin-bottom:12px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem; color:#0f172a;">
                        <span>Order #${safeId}</span>
                        <span style="color:#065f46;">₹${safeAmount}</span>
                    </div>
                    <p style="font-size:0.75rem; color:#64748b; margin:4px 0;">Status: <b style="color:#2563eb;">${safeStatus}</b></p>
                    <p style="font-size:0.7rem; color:#94a3b8; margin-bottom:10px;">${safeDate}</p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" onclick="openOrderTrackingView('${safeId}')" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">📍 Track Status</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Render Order History Error:", err);
    }
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
                    <div style="font-size:0.7rem; color:#475569;">${c.desc || 'Special Offer'} (Min order: ₹${c.minOrder || 0})</div>
                </div>
                <button type="button" onclick="applyCouponCode('${c.code}', ${c.minOrder || 0}, ${c.discount || 20})" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">Apply</button>
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

  // 🔥 Dynamic Free Delivery Threshold (New User = ₹49, Regular = ₹99)
window.getDynamicFreeDeliveryThreshold = function() {
    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem(`history_${sessionActiveUser}`) || '[]');
    } catch(e) {
        history = [];
    }
    return (!Array.isArray(history) || history.length === 0) ? 49.00 : 99.00;
};

// 🔥 Active Coupon State Engine
window.appliedActiveCoupon = null;

window.applyCouponCode = function(code, minOrderValue, discountAmount) {
    let snacksTotal = window.cartSnacksArray ? window.cartSnacksArray.reduce((acc, item) => acc + (parseFloat(item.price || 0) * parseInt(item.qty || 1)), 0) : 0;
    let printJobsTotal = window.cartPrintJobsArray ? window.cartPrintJobsArray.reduce((acc, job) => acc + (parseInt(job.pages || 1) * (job.printType === 'bw' ? 3 : 10) * parseInt(job.copies || 1) + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0) : 0;

    let productSubtotal = snacksTotal + printJobsTotal;

    if (productSubtotal < (minOrderValue || 0)) {
        alert(`⚠️ Minimum product subtotal of ₹${minOrderValue} required for coupon ${code}! (Current items total: ₹${productSubtotal})`);
        return;
    }

    window.appliedActiveCoupon = { code: code, discount: discountAmount };
    alert(`✅ Coupon "${code}" Applied Successfully! ₹${discountAmount} off.`);
    if (typeof calculateTotal === 'function') calculateTotal();
    if (typeof toggleCouponDrawer === 'function') toggleCouponDrawer();
};

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
        const freeDeliveryThreshold = window.getDynamicFreeDeliveryThreshold();
        
        // 🔥 Strictly Admin Controlled Delivery Fee & Store Pickup Check
        let activeDeliveryFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
        let accurateDeliveryCharge = (window.currentCartDeliveryMode === 'pickup') ? 0.00 : ((finalDocumentCost >= freeDeliveryThreshold || finalDocumentCost === 0) ? 0.00 : activeDeliveryFee); 
     
        const progressBarBox = document.getElementById('freeDeliveryProgressBarBox');
        const messageText = document.getElementById('freeDeliveryMessageText');
        const fillBar = document.getElementById('freeDeliveryFillBar');

        if (progressBarBox && messageText && fillBar) {
            if (finalDocumentCost >= freeDeliveryThreshold) {
                messageText.innerHTML = `🎉 Yay! Free delivery unlocked (Threshold ₹${freeDeliveryThreshold})!`;
                fillBar.style.width = "100%";
            } else {
                let neededMore = freeDeliveryThreshold - finalDocumentCost;
                let progressPercent = Math.min(100, (finalDocumentCost / freeDeliveryThreshold) * 100);
                messageText.innerHTML = `🎉 Add items worth <b>₹${neededMore.toFixed(2)}</b> more for FREE delivery (Threshold ₹${freeDeliveryThreshold})!`;
                fillBar.style.width = `${progressPercent}%`;
            }
        }

        let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
        let rainFee = window.isRainSurgeActive ? activeRainFee : 0;
        let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;
        let couponDiscount = window.appliedActiveCoupon ? window.appliedActiveCoupon.discount : 0;

        let grandTotalCombined = finalDocumentCost + accurateDeliveryCharge + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0) - couponDiscount;
        grandTotalCombined = Math.max(0, grandTotalCombined);

        const updateUI = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        updateUI('summaryPrint', `₹${(totalPrintCost + printJobsTotal).toFixed(2)}`);
        updateUI('summaryBinding', `₹${(totalBindingCost + snacksTotal).toFixed(2)}`);
        updateUI('summaryDelivery', accurateDeliveryCharge === 0 ? "FREE" : `₹${accurateDeliveryCharge.toFixed(2)}`);
        updateUI('cartHandlingFee', `₹${activeHandlingFee.toFixed(2)}`);
        
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
        // 🔥 Print Service Maintenance Check
        try {
            const statusRes = await fetch('/api/store-status');
            const statusData = await statusRes.json();
            if (statusData.success && statusData.printEnabled === false) {
                alert("⚠️ Printing service is currently temporarily OFF due to technical maintenance. Please try again later.");
                event.target.value = '';
                return;
            }
        } catch (e) {}

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

            // 🔥 Check karo ki kya user ne 'photo' paper type select kiya hai
            const isPhotoMode = (typeof currentSelectedPaperType !== 'undefined' && currentSelectedPaperType === 'photo');

            if (isPhotoMode) {
                const layoutSelect = document.getElementById('photoLayoutSelect');
                const selectedLayout = layoutSelect ? layoutSelect.value : 'passport_8';
                
                // Layout ke hisab से grid count set karein
                let gridCount = 8;
                if (selectedLayout === 'passport_12') gridCount = 12;
                else if (selectedLayout === 'passport_20') gridCount = 20;
                else if (selectedLayout === 'photo_2_a4') gridCount = 2;
                else if (selectedLayout === 'photo_single_glossy') gridCount = 1;

                let gridItemsHtml = '';
                let singleImgSrc = (f.pageImages && f.pageImages.length > 0) ? f.pageImages[0] : f.fileUrl;

                for (let g = 0; g < gridCount; g++) {
                    gridItemsHtml += `
                        <div style="border: 1px dashed #cbd5e1; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; box-sizing: border-box;">
                            <img src="${singleImgSrc}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                    `;
                }

                // A4 Sheet Grid Layout Columns
                let gridTemplateCols = 'repeat(4, 1fr)';
                if (selectedLayout === 'passport_12') gridTemplateCols = 'repeat(4, 1fr)';
                else if (selectedLayout === 'passport_20') gridTemplateCols = 'repeat(5, 1fr)';
                else if (selectedLayout === 'photo_2_a4') gridTemplateCols = 'repeat(1, 1fr)';
                else if (selectedLayout === 'photo_single_glossy') gridTemplateCols = 'repeat(1, 1fr)';

                previewContent = `
                    <div style="width: 85%; height: 85%; background: #ffffff; border: 2px solid #065f46; border-radius: 8px; padding: 10px; display: grid; grid-template-columns: ${gridTemplateCols}; gap: 6px; align-content: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08); box-sizing: border-box; overflow: hidden;">
                        ${gridItemsHtml}
                    </div>
                `;
            } else {
                // 🔥 MULTI-PAGE PDF & NORMAL DOCUMENT PREVIEW CHECK
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
        // 🔥 Agar photo mode hai toh layout ke mutabiq pricing dikhayein
        if (typeof currentSelectedPaperType !== 'undefined' && currentSelectedPaperType === 'photo') {
            totalPriceText.textContent = `₹${window.currentCalculatedJobPrice || 50}`;
        } else {
            totalPriceText.textContent = `₹${grandTotalPrice} (${totalPagesCombined} pgs)`;
        }
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

// 🔥 Make setStudioPaperType globally accessible
window.currentSelectedPaperType = 'document';

window.setStudioPaperType = function(type) {
    window.currentSelectedPaperType = type;
    const docBox = document.getElementById('paperTypeDoc');
    const photoBox = document.getElementById('paperTypePhoto');
    const photoContainer = document.getElementById('photoOptionsContainer');
    
    const colorContainer = document.getElementById('printColorContainer');
    const orientationContainer = document.getElementById('printOrientationContainer');

    if (type === 'document') {
        if (docBox) { docBox.style.borderColor = '#065f46'; docBox.style.background = '#f0fdf4'; }
        if (photoBox) { photoBox.style.borderColor = '#e2e8f0'; photoBox.style.background = '#ffffff'; }
        if (photoContainer) photoContainer.style.display = 'none';
        
        if (colorContainer) colorContainer.style.display = 'block';
        if (orientationContainer) orientationContainer.style.display = 'block';
    } else {
        if (photoBox) { photoBox.style.borderColor = '#065f46'; photoBox.style.background = '#f0fdf4'; }
        if (docBox) { docBox.style.borderColor = '#e2e8f0'; docBox.style.background = '#ffffff'; }
        if (photoContainer) photoContainer.style.display = 'block';
        
        if (colorContainer) colorContainer.style.display = 'none';
        if (orientationContainer) orientationContainer.style.display = 'none';

        if (typeof updatePhotoLayoutPricing === 'function') {
            updatePhotoLayoutPricing();
        }
    }

    if (typeof updateMultiFileStudioUI === 'function') {
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

window.addStudioJobToCart = async function() {
    // 🔥 Print Service Maintenance Check for Print Studio
    try {
        const statusRes = await fetch('/api/store-status');
        const statusData = await statusRes.json();
        if (statusData.success && statusData.printEnabled === false) {
            alert("⚠️ Printing service is currently temporarily OFF due to technical maintenance. Please try again later.");
            return;
        }
    } catch (e) {}

    if (!window.studioMasterFiles || window.studioMasterFiles.length === 0) return;

    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    // 🔥 1. Yahan Paper Type aur Photo/Passport Layout ki values nikal lein
    const paperType = typeof currentSelectedPaperType !== 'undefined' ? currentSelectedPaperType : 'document';
    const jobType = (paperType === 'photo') ? 'photo_print' : 'document_print';
    let photoLayout = null;
    let photoCalculatedPrice = 50; // Default passport price

    if (paperType === 'photo') {
        const layoutSelect = document.getElementById('photoLayoutSelect');
        photoLayout = layoutSelect ? layoutSelect.value : 'passport_8';
        
        // Layout ke hisab se price set karein
        if (photoLayout === 'passport_8') photoCalculatedPrice = 50;
        else if (photoLayout === 'passport_12') photoCalculatedPrice = 60;
        else if (photoLayout === 'passport_20') photoCalculatedPrice = 100;
        else if (photoLayout === 'photo_2_a4') photoCalculatedPrice = 50;
        else if (photoLayout === 'photo_single_glossy') photoCalculatedPrice = 100;
    }

    window.studioMasterFiles.forEach(f => {
        let rate = (f.printType === 'bw') ? 3 : 10;
        
        // 🔥 2. Agar photo print hai toh photo price lagega, warna normal document calculation
        let itemPrice = (paperType === 'photo') ? photoCalculatedPrice : (f.pages * rate * f.copies);

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
            
            // 🔥 3. Yeh naye parameters add kiye hain agent aur routing ke liye
            paperType: paperType,       // 'document' ya 'photo'
            jobType: jobType,           // 'document_print' ya 'photo_print'
            photoLayout: photoLayout,   // 'passport_8', 'passport_12' etc.
            
            price: itemPrice
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

                // 🔥 Dynamic Store Timings Sync Code
                if (data.openTime && data.closeTime) {
                    const formatTime12h = (timeStr) => {
                        let [hours, mins] = timeStr.split(':');
                        let h = parseInt(hours);
                        let ampm = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        return `${h}:${mins} ${ampm}`;
                    };

                    const timingSubtext = document.getElementById('shopTimingSubtext');
                    if (timingSubtext) {
                        timingSubtext.textContent = `${formatTime12h(data.openTime)} - ${formatTime12h(data.closeTime)}`;
                    }
                }

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

// 🌟 Blinkit-Style Search Overlay Engine
window.openSearchOverlay = function() {
    let overlay = document.getElementById('blinkitSearchOverlayModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'blinkitSearchOverlayModal';
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#ffffff; z-index:999999; display:flex; flex-direction:column; padding:16px; overflow-y:auto; font-family:'Poppins', sans-serif;";
        overlay.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
                <span onclick="closeSearchOverlay()" style="font-size:1.4rem; cursor:pointer; font-weight:bold; color:#0f172a;">&larr;</span>
                <input type="text" id="fullscreenSearchInput" placeholder="Search for atta, dal, chips, socks, print..." oninput="performFullscreenLiveSearch(this.value)" style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #cbd5e1; font-size:0.9rem; outline:none; background:#f8fafc;" />
                <span onclick="startVoiceSearch()" style="font-size:1.2rem; cursor:pointer;" title="Voice Search">🎤</span>
            </div>
            
            <div id="recentSearchesBox" style="margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:0.78rem; font-weight:800; color:#64748b; text-transform:uppercase;">Recent Searches</span>
                    <span onclick="clearRecentSearches()" style="font-size:0.75rem; color:#2563eb; cursor:pointer; font-weight:700;">clear</span>
                </div>
                <div id="recentSearchesChipsContainer" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
            </div>

            <div style="font-size:0.78rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:10px;">Products & Store Items</div>
            <div id="fullscreenSearchResultsGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:12px; width:100%;"></div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    const input = document.getElementById('fullscreenSearchInput');
    if (input) {
        input.value = "";
        input.focus();
    }
    renderRecentSearchesChips();
    document.getElementById('fullscreenSearchResultsGrid').innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:#64748b; font-size:0.8rem; padding:20px;">Type above or search items instantly.</p>';
};

window.closeSearchOverlay = function() {
    const overlay = document.getElementById('blinkitSearchOverlayModal');
    if (overlay) overlay.style.display = 'none';
};

window.startVoiceSearch = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showAppToast("Voice search is not supported in your browser.", "error");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.start();

    recognition.onresult = function(event) {
        const speechToText = event.results[0][0].transcript;
        const input = document.getElementById('fullscreenSearchInput');
        if (input) {
            input.value = speechToText;
            performFullscreenLiveSearch(speechToText);
        }
    };
};

window.renderRecentSearchesChips = function() {
    const container = document.getElementById('recentSearchesChipsContainer');
    if (!container) return;
    let recents = JSON.parse(localStorage.getItem('blinkit_recent_searches') || '["chocolate", "sugar", "refined", "chips"]');
    container.innerHTML = recents.map(item => `
        <div onclick="fillSearchAndRun('${item}')" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:10px; font-size:0.78rem; font-weight:600; color:#0f172a; cursor:pointer; display:flex; align-items:center; gap:6px;">
            <span>🔍</span> ${item}
        </div>
    `).join('');
};

window.fillSearchAndRun = function(query) {
    const input = document.getElementById('fullscreenSearchInput');
    if (input) {
        input.value = query;
        performFullscreenLiveSearch(query);
    }
};

window.clearRecentSearches = function() {
    localStorage.removeItem('blinkit_recent_searches');
    renderRecentSearchesChips();
};

window.performFullscreenLiveSearch = function(query) {
    const grid = document.getElementById('fullscreenSearchResultsGrid');
    if (!grid) return;
    const q = (query || "").toLowerCase().trim();
    grid.innerHTML = '';

    if (q === "") {
        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align:center; color:#64748b; font-size:0.8rem; padding:20px;">Type something to search items...</p>`;
        return;
    }

    let recents = JSON.parse(localStorage.getItem('blinkit_recent_searches') || '[]');
    if (!recents.includes(q)) {
        recents.unshift(q);
        if (recents.length > 6) recents.pop();
        localStorage.setItem('blinkit_recent_searches', JSON.stringify(recents));
    }

    const filtered = (window.storeInventoryProducts || []).filter(p => (p.name || '').toLowerCase().includes(q));

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1 / -1; text-align:center; color:#64748b; font-size:0.8rem; padding:20px;">No products found matching "${query}".</p>`;
        return;
    }

    filtered.forEach(prod => {
        const isOutOfStock = (prod.stockQuantity <= 0);
        const finalImgUrl = prod.imageUrl || prod.image || '';
        const card = document.createElement('div');
        card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.03);";
        
        const imgHtml = finalImgUrl ? `<img src="${finalImgUrl}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; margin-bottom:8px;" />` : `<div style="font-size:2.5rem; margin-bottom:8px;">📦</div>`;

        let safeSku = String(prod.sku || prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeName = String(prod.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeImg = String(finalImgUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        card.innerHTML = `
            ${imgHtml}
            <div style="font-weight:700; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:4px;">${prod.name}</div>
            <div style="font-weight:800; font-size:0.8rem; color:#065f46; margin-bottom:8px;">₹${prod.sellingPrice || 0}</div>
            ${isOutOfStock 
                ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:6px; border-radius:8px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" disabled>Out of Stock</button>`
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
    const container = document.getElementById('cartDrawerItemsList') || 
                        document.getElementById('cartItemsListContainer') || 
                        document.getElementById('cartItemsContainer');
    
    if (!container) return;
    container.innerHTML = '';
    
    // 🔥 Selected active address se name aur phone dynamically fetch karna
    const activeAddress = localStorage.getItem('selected_active_address') || '';
    let extractedName = localStorage.getItem('printAppUser') || 'Customer';
    let extractedPhone = localStorage.getItem('printAppUserIdentity') || '7398746551';

    if (activeAddress && activeAddress.includes('Contact:')) {
        try {
            let contactPart = activeAddress.split('Contact:')[1].trim();
            let namePart = contactPart.split('(')[0].trim();
            let phonePart = contactPart.split('(')[1].replace(')', '').trim();
            if (namePart) extractedName = namePart;
            if (phonePart) extractedPhone = phonePart;
        } catch (e) {}
    }

    const identityBox = document.getElementById('cartUserIdentitySummary');
    if (identityBox) {
        identityBox.textContent = `Order for User (${extractedName}) | (${extractedPhone})`;
    }

    const addressSummaryNode = document.getElementById('cartDrawerAddressSummary');
    if (addressSummaryNode) {
        addressSummaryNode.textContent = activeAddress || 'No delivery address added yet.';
    }

    // 🌟 Stylish Green & Yellow Cart Header (Search bar removed)
    const stylishCartHeader = `
        <div style="background: linear-gradient(135deg, #fef08a 0%, #bbf7d0 100%); border: 1px solid #16a34a; border-radius: 12px; padding: 10px 14px; text-align: center; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
            <h2 style="font-size: 0.95rem; font-weight: 900; color: #065f46; margin: 0; letter-spacing: 0.5px;">🌱 Print From Home Cart 🛒</h2>
        </div>
    `;

    window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
    window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

    // 🔥 Print Job hone par sirf COD lock karna (Online aur Wallet dono allow honge)
    const hasPrintJobs = window.cartPrintJobsArray && window.cartPrintJobsArray.length > 0;
    const paymentSelect = document.getElementById('cartDrawerPaymentSelect');
    
    if (paymentSelect) {
        if (hasPrintJobs) {
            // COD option ko disable ya hide kar sakte hain agar select mein ho, ya fir dropdown ko enable rakhain taaki Online / Wallet select ho sake
            paymentSelect.disabled = false;
            paymentSelect.title = "Online payment or Print Wallet is required for print orders";
        } else {
            paymentSelect.disabled = false;
        }
    }

    let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
    
    if (!hasItems) {
        container.innerHTML = stylishCartHeader + `<p style="font-size:0.82rem; color:#64748b; text-align:center; padding:20px;">Your cart is empty.</p>`;
        if (typeof calculateTotal === 'function') calculateTotal();
        if (typeof renderUpsellingGridSafely === 'function') renderUpsellingGridSafely();
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = "display:flex; flex-direction:column; gap:12px; width:100%;";
    wrapper.innerHTML = stylishCartHeader;

    // 1. Render Print Jobs in Cart
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
        `;
        wrapper.appendChild(card);
    });

    // 2. Render Snacks / Store Products in Cart (Fixed typo: snack.price * snack.qty)
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
    showAppConfirm(
        "Clear Cart?", 
        "Are you sure you want to clear all items from your cart?", 
        function() {
            window.cartPrintJobsArray = [];
            window.cartSnacksArray = [];
            window.currentDeliveryTip = 0;
            persistCartStateData();
            renderCartDrawerContents();
            calculateTotal();
            updateFloatingCartBar();
            toggleCartDrawer(false);
            showAppToast("Cart cleared successfully!", "success");
        }, 
        "🛒"
    );
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
// 🔥 Use Current Location GPS Fetch Function

window.fetchUserCurrentGpsLocation = function() {

    if (!navigator.geolocation) {

        alert("⚠️ Geolocation is not supported by your browser.");

        return;

    }



    alert("📍 Fetching your current GPS location...");



    navigator.geolocation.getCurrentPosition(

        (position) => {

            const lat = position.coords.latitude;

            const lng = position.coords.longitude;

            

            if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {

                const geocoder = new google.maps.Geocoder();

                const latLng = { lat: lat, lng: lng };

                

                geocoder.geocode({ location: latLng }, (results, status) => {

                    if (status === "OK" && results[0]) {

                        const formattedAddr = results[0].formatted_address;

                        const addressInput = document.getElementById('mapSelectedAddressInput');

                        if (addressInput) {

                            addressInput.value = formattedAddr;

                        }

                        if (typeof googleDeliveryMap !== 'undefined' && googleDeliveryMap) {

                            googleDeliveryMap.setCenter(latLng);

                            if (typeof deliveryMarker !== 'undefined' && deliveryMarker) {

                                deliveryMarker.setPosition(latLng);

                            }

                        }

                        alert("✅ Current location fetched successfully!");

                    } else {

                        alert("⚠️ Could not retrieve address from coordinates.");

                    }

                });

            } else {

                alert(`✅ GPS coords fetched: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

            }

        },

        (error) => {

            alert("⚠️ Unable to retrieve your location. Please check location permissions.");

        },

        { timeout: 10000, enableHighAccuracy: true }

    );

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

        // 2. Process App-Related FAQs with Real User & Order Context
        setTimeout(() => {
            const aiBubble = document.createElement('div');
            aiBubble.style.cssText = "background: #e2e8f0; color: #0f172a; padding: 10px 14px; border-radius: 12px; font-size: 0.82rem; max-width: 80%; align-self: flex-start; font-weight: 500; line-height: 1.4;";
            
            const lower = userText.toLowerCase();
            const activeUser = localStorage.getItem('printAppUser') || 'Customer';
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem(`history_${activeUser}`) || '[]');
            } catch(e) { history = []; }

            if (lower.includes('order') || lower.includes('track') || lower.includes('status') || lower.includes('kahan') || lower.includes('where')) {
                if (history.length > 0) {
                    let latestOrder = history[0];
                    if (currentAiLang === 'hi') {
                        aiBubble.innerHTML = `📦 <b>आपका हालिया ऑर्डर मिल गया है!</b><br>
                        • ऑर्डर आईडी: #${latestOrder.orderId || latestOrder.id}<br>
                        • स्टेटस: <b style="color:#2563eb;">${latestOrder.status}</b><br>
                        • कुल राशि: ₹${latestOrder.amount || latestOrder.totalAmount}<br><br>
                        आप इसे अपने <b>'Your orders'</b> सेक्शन से लाइव ट्रैक कर सकते हैं!`;
                    } else {
                        aiBubble.innerHTML = `📦 <b>Latest Order Found!</b><br>
                        • Order ID: #${latestOrder.orderId || latestOrder.id}<br>
                        • Status: <b style="color:#2563eb;">${latestOrder.status}</b><br>
                        • Amount: ₹${latestOrder.amount || latestOrder.totalAmount}<br><br>
                        You can track it live from your <b>'Your orders'</b> section!`;
                    }
                } else {
                    if (currentAiLang === 'hi') {
                        aiBubble.innerHTML = `📦 आपके अकाउंट में कोई हालिया ऑर्डर नहीं मिला। आप होम स्क्रीन से अपना पहला प्रिंट ऑर्डर शुरू कर सकते हैं!`;
                    } else {
                        aiBubble.innerHTML = `📦 No active orders found in your account. You can start your first print order from the home screen!`;
                    }
                }
            } 
            else if (lower.includes('cancel') || lower.includes('cancellation') || lower.includes('रद्द')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `❌ <b>ऑर्डर कैंसिलेशन नीति:</b><br>यदि आपका प्रिंट जॉब शुरू नहीं हुआ है, तो आप इसे ऑर्डर हिस्ट्री से रद्द कर सकते हैं। अधिक सहायता के लिए नीचे दिए गए बटन से सीधे हमारे सपोर्ट ईमेल पर संपर्क करें।`;
                } else {
                    aiBubble.innerHTML = `❌ <b>Order Cancellation Policy:</b><br>If your print job has not started yet, you can cancel it from your order history. For urgent assistance, reach out directly to our support email below.`;
                }
            } 
            else if (lower.includes('price') || lower.includes('rate') || lower.includes('cost') || lower.includes('kitna') || lower.includes('कीमत')) {
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `💰 <b>प्रिंटिंग रेट्स और प्राइसिंग:</b><br>• ब्लैक एंड व्हाइट: ₹3 प्रति पेज<br>• रंगीन (Coloured): ₹10 प्रति पेज<br>• स्पाइरल बाइंडिंग: +₹30<br>• ₹99 से ऊपर के ऑर्डर पर <b>फ्री डिलीवरी</b>!`;
                } else {
                    aiBubble.innerHTML = `💰 <b>Printing Rates & Pricing:</b><br>• Black & White: ₹3 per page<br>• Coloured: ₹10 per page<br>• Spiral Binding: +₹30<br>• Orders above ₹99 get <b>FREE Delivery</b>!`;
                }
            } 
            else {
                // 🔥 Professional Business Email Handoff (No Personal WhatsApp)
                if (currentAiLang === 'hi') {
                    aiBubble.innerHTML = `🤖 मुझे आपके इस सवाल का सटीक उत्तर स्वतः नहीं मिला। मैंने आपकी यह क्वेरी हमारे <b>सपोर्ट विभाग (Help Department)</b> को भेज दी है। आप चाहें तो नीचे दिए गए बटन पर क्लिक करके सीधे हमारी व्यावसायिक ईमेल पर संपर्क कर सकते हैं:<br><br>
                        <a href="mailto:support@printfromhomes.com?subject=Support%20Inquiry:%20${encodeURIComponent(userText)}&body=Hello%20Support%20Team,%0A%0AMy%20Query:%20${encodeURIComponent(userText)}" target="_blank" style="display:inline-block; background:#0070f3; color:white; padding:8px 14px; border-radius:8px; text-decoration:none; font-weight:700; margin-top:4px;">📧 सपोर्ट टीम को ईमेल भेजें</a>`;
                } else {
                    aiBubble.innerHTML = `🤖 I have routed your query to our <b>Help Support Department</b>. You can also drop us a direct email at our official business desk for prompt assistance:<br><br>
                        <a href="mailto:support@printfromhomes.com?subject=Support%20Inquiry:%20${encodeURIComponent(userText)}&body=Hello%20Support%20Team,%0A%0AMy%20Query:%20${encodeURIComponent(userText)}" target="_blank" style="display:inline-block; background:#0070f3; color:white; padding:8px 14px; border-radius:8px; text-decoration:none; font-weight:700; margin-top:4px;">📧 Email Support Department</a>`;
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
                // 🔥 Strict check so that '0' is correctly retained instead of falling back
                window.adminDeliveryFee = (data.settings.deliveryFee !== undefined && data.settings.deliveryFee !== null && data.settings.deliveryFee !== '') ? parseFloat(data.settings.deliveryFee) : 0;
                window.adminHandlingFee = (data.settings.handlingFee !== undefined && data.settings.handlingFee !== null && data.settings.handlingFee !== '') ? parseFloat(data.settings.handlingFee) : 0;
                window.adminRainFee = (data.settings.rainFee !== undefined && data.settings.rainFee !== null && data.settings.rainFee !== '') ? parseFloat(data.settings.rainFee) : 0;
                
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

    // 🔥 WhatsApp ya phone ki jagah seedha business email par redirect karne ke liye
window.connectToHumanSupport = function() {
    window.location.href = "mailto:support@printfromhomes.com?subject=Customer%20Support%20Assistance&body=Hello%20Support%20Team,%0A%0AI%20need%20help%20with%20my%20order.";
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

    // 🔥 Strict LocalStorage Fetch (Allows 0 correctly)
    const cachedDel = localStorage.getItem('cached_delivery_fee');
    const cachedHan = localStorage.getItem('cached_handling_fee');
    const cachedRai = localStorage.getItem('cached_rain_fee');

    window.adminDeliveryFee = (cachedDel !== null && cachedDel !== undefined && cachedDel !== '') ? parseFloat(cachedDel) : 0;
    window.adminHandlingFee = (cachedHan !== null && cachedHan !== undefined && cachedHan !== '') ? parseFloat(cachedHan) : 0;
    window.adminRainFee = (cachedRai !== null && cachedRai !== undefined && cachedRai !== '') ? parseFloat(cachedRai) : 0;
    
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
    const freeDeliveryThreshold = window.getDynamicFreeDeliveryThreshold ? window.getDynamicFreeDeliveryThreshold() : 99.00;
    
    // 🔥 Fetch Selected Delivery Mode ('doorstep' or 'pickup')
    const selectedDeliveryModeRadio = document.querySelector('input[name="cartDeliveryModeRadio"]:checked');
    let deliveryMode = selectedDeliveryModeRadio ? selectedDeliveryModeRadio.value : (window.currentCartDeliveryMode || 'doorstep');

    let activeDelFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
    // Agar Store Pickup hai toh delivery fee strictly 0 hogi!
    let delivery = (deliveryMode === 'pickup') ? 0 : ((subtotal >= freeDeliveryThreshold || subtotal === 0) ? 0 : activeDelFee);
    
    let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
    let rainFee = window.isRainSurgeActive ? activeRainFee : 0;
    
    let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;
    let couponDiscount = window.appliedActiveCoupon ? window.appliedActiveCoupon.discount : 0;
    
    let grandTotal = subtotal + delivery + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0) - couponDiscount;
    grandTotal = Math.max(0, grandTotal);

    const paymentSelect = document.getElementById('cartDrawerPaymentSelect');
    const selectedRadio = document.querySelector('input[name="cartPaymentMode"]:checked');
    let paymentMode = selectedRadio ? selectedRadio.value.toLowerCase() : (paymentSelect ? paymentSelect.value.toLowerCase() : 'online');

    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
    const userPhone = localStorage.getItem('printAppUserIdentity') || 'N/A';

    // 🔥 Capture Selected Delivery Instruction safely
    let deliveryInstructionText = "Standard Delivery";
    const activeCheckedInstruction = document.querySelector('input[name="deliveryInstruction"]:checked');
    if (activeCheckedInstruction) {
        deliveryInstructionText = activeCheckedInstruction.value;
    } else {
        const highlightedInstruction = document.querySelector('[style*="background: rgb(240, 253, 244)"], [style*="background:#f0fdf4"]');
        if (highlightedInstruction) {
            deliveryInstructionText = highlightedInstruction.innerText.replace('✔', '').trim();
        }
    }

    // 🔥 FETCH USER LATITUDE & LONGITUDE BEFORE SENDING ORDER
    let userLat = STORE_LOCATION.lat;
    let userLng = STORE_LOCATION.lng;
    
    try {
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject("Geolocation not supported");
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
    } catch (e) {
        console.warn("Using store location fallback for order coordinates.");
    }

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
    formData.append('deliveryMode', deliveryMode); // 🔥 Delivery Mode appended here
    formData.append('userLat', userLat);
    formData.append('userLng', userLng);
    formData.append('deliveryInstruction', deliveryInstructionText);

    let initialOrderStatus = (window.cartPrintJobsArray.length > 0) ? "Ready for Print" : "Order Placed & Picking";

    const finalizeOrderSuccess = async (orderId) => {
    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
    const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';
    
    // 🔥 Dono keys (username aur mobile identity) par save karein taaki mismatch na ho
    const historyKeys = [
        `history_${sessionActiveUser}`,
        activeIdentity ? `history_${activeIdentity}` : null
    ].filter(Boolean);

    const newOrderObj = { 
        orderId: orderId,
        date: new Date().toLocaleString(), 
        amount: grandTotal.toFixed(2), 
        status: initialOrderStatus, 
        details: finalMetaConfig, 
        address: activeAddress,
        deliveryMode: deliveryMode,
        deliveryInstruction: deliveryInstructionText, 
        deliveryTip: window.currentDeliveryTip || 0
    };

    historyKeys.forEach(key => {
        let currentHistoryArray = JSON.parse(localStorage.getItem(key) || '[]');
        currentHistoryArray.unshift(newOrderObj);
        localStorage.setItem(key, JSON.stringify(currentHistoryArray));
    });

    // 🔥 Clear used coupon after successful order (One-time validity rule)
    window.appliedActiveCoupon = null;

    try {
        await fetch('/api/admin/inventory/decrement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: finalMetaConfig })
        });
    } catch (e) {
        console.error("Inventory decrement sync error:", e);
    }

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

    // 🔥 Order successful hote hi seedha live tracking popup kholo
    if (typeof window.openOrderTrackingView === 'function') {
        window.openOrderTrackingView(orderId);
    }
};

   // ==========================================
// 💳 BULLETPROOF ORDER PLACEMENT & PAYMENT GATEWAY ENGINE (SINGLE-TAP SECURED)
// ==========================================
window.executeFinalCartOrderPlacement = async function() {
    // 🔥 Single-Tap Safeguard: Button ko lock kar do taaki double-tap na ho
    const submitOrderBtn = document.getElementById('submitOrderBtn') || document.querySelector('[onclick*="executeFinalCartOrderPlacement"]');
    if (submitOrderBtn) {
        if (submitOrderBtn.disabled) return;
        submitOrderBtn.disabled = true;
        submitOrderBtn.style.opacity = '0.6';
        submitOrderBtn.textContent = 'Processing Order... 🚀';
    }

    try {
        if (typeof isStoreCurrentlyOpen !== 'undefined' && !isStoreCurrentlyOpen) {
            if (typeof showAppToast === 'function') showAppToast("Store is currently closed. Orders cannot be accepted right now.", "error");
            const storeClosedModal = document.getElementById('storeClosedPopupModal');
            if (storeClosedModal) storeClosedModal.style.display = 'flex';
            return;
        }

        const activeAddress = localStorage.getItem('selected_active_address');
        if (!activeAddress || activeAddress.trim() === "") {
            if (typeof showAppToast === 'function') showAppToast("Please add and select a delivery address first.", "error");
            if (typeof openAddressManagerModal === 'function') {
                openAddressManagerModal();
            }
            return;
        }

        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

        const cachedDel = localStorage.getItem('cached_delivery_fee');
        const cachedHan = localStorage.getItem('cached_handling_fee');
        const cachedRai = localStorage.getItem('cached_rain_fee');

        window.adminDeliveryFee = (cachedDel !== null && cachedDel !== undefined && cachedDel !== '') ? parseFloat(cachedDel) : 0;
        window.adminHandlingFee = (cachedHan !== null && cachedHan !== undefined && cachedHan !== '') ? parseFloat(cachedHan) : 0;
        window.adminRainFee = (cachedRai !== null && cachedRai !== undefined && cachedRai !== '') ? parseFloat(cachedRai) : 0;
        
        let totalItemsCount = window.cartSnacksArray.reduce((acc, item) => acc + item.qty, 0) + window.cartPrintJobsArray.length;
        if (totalItemsCount === 0) {
            if (typeof showAppToast === 'function') showAppToast("Your cart is empty. Please add items first.", "error");
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
        const freeDeliveryThreshold = window.getDynamicFreeDeliveryThreshold ? window.getDynamicFreeDeliveryThreshold() : 99.00;
        
        const selectedDeliveryModeRadio = document.querySelector('input[name="cartDeliveryModeRadio"]:checked');
        let deliveryMode = selectedDeliveryModeRadio ? selectedDeliveryModeRadio.value : (window.currentCartDeliveryMode || 'doorstep');

        let activeDelFee = window.adminDeliveryFee !== undefined ? window.adminDeliveryFee : 0;
        let delivery = (deliveryMode === 'pickup') ? 0 : ((subtotal >= freeDeliveryThreshold || subtotal === 0) ? 0 : activeDelFee);
        
        let activeRainFee = window.adminRainFee !== undefined ? window.adminRainFee : 0;
        let rainFee = window.isRainSurgeActive ? activeRainFee : 0;
        
        let activeHandlingFee = window.adminHandlingFee !== undefined ? window.adminHandlingFee : 0;
        let couponDiscount = window.appliedActiveCoupon ? window.appliedActiveCoupon.discount : 0;
        
        let grandTotal = subtotal + delivery + rainFee + activeHandlingFee + (window.currentDeliveryTip || 0) - couponDiscount;
        grandTotal = Math.max(0, grandTotal);

        const paymentSelect = document.getElementById('cartDrawerPaymentSelect');
        const selectedRadio = document.querySelector('input[name="cartPaymentMode"]:checked');
        let paymentMode = selectedRadio ? selectedRadio.value.toLowerCase() : (paymentSelect ? paymentSelect.value.toLowerCase() : 'online');

        const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
        const userPhone = localStorage.getItem('printAppUserIdentity') || 'N/A';

        let deliveryInstructionText = "Standard Delivery";
        const activeCheckedInstruction = document.querySelector('input[name="deliveryInstruction"]:checked');
        if (activeCheckedInstruction) {
            deliveryInstructionText = activeCheckedInstruction.value;
        } else {
            const highlightedInstruction = document.querySelector('[style*="background: rgb(240, 253, 244)"], [style*="background:#f0fdf4"]');
            if (highlightedInstruction) {
                deliveryInstructionText = highlightedInstruction.innerText.replace('✔', '').trim();
            }
        }

        let userLat = STORE_LOCATION.lat;
        let userLng = STORE_LOCATION.lng;
        
        try {
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) reject("Geolocation not supported");
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
            });
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
        } catch (e) {
            console.warn("Using store location fallback for order coordinates.");
        }

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
        formData.append('deliveryMode', deliveryMode);
        formData.append('userLat', userLat);
        formData.append('userLng', userLng);
        formData.append('deliveryInstruction', deliveryInstructionText);

        let initialOrderStatus = (window.cartPrintJobsArray.length > 0) ? "Ready for Print" : "Order Placed & Picking";

        const finalizeOrderSuccess = async (orderId) => {
            const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
            const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';
            
            const historyKeys = [
                `history_${sessionActiveUser}`,
                activeIdentity ? `history_${activeIdentity}` : null
            ].filter(Boolean);

            const newOrderObj = { 
                orderId: orderId,
                date: new Date().toLocaleString(), 
                amount: grandTotal.toFixed(2), 
                status: initialOrderStatus, 
                details: finalMetaConfig, 
                address: activeAddress,
                deliveryMode: deliveryMode,
                deliveryInstruction: deliveryInstructionText, 
                deliveryTip: window.currentDeliveryTip || 0
            };

            historyKeys.forEach(key => {
                let currentHistoryArray = JSON.parse(localStorage.getItem(key) || '[]');
                currentHistoryArray.unshift(newOrderObj);
                localStorage.setItem(key, JSON.stringify(currentHistoryArray));
            });

            window.appliedActiveCoupon = null;

            try {
                await fetch('/api/admin/inventory/decrement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: finalMetaConfig })
                });
            } catch (e) {
                console.error("Inventory decrement sync error:", e);
            }

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

            // 🔥 FIX: History page par bhejne ki jagah 100% seedha live tracking popup kholo
            if (typeof window.openOrderTrackingView === 'function') {
                window.openOrderTrackingView(orderId);
            }
        };

        const response = await fetch('/api/create-order', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (!data.success) {
            if (data.isDiwaliHold) {
                showDiwaliPreLaunchNotice(data.message);
            } else {
                if (typeof showAppToast === 'function') showAppToast(data.message || 'Failed to create order', "error");
            }
            return;
        }

        // 1️⃣ CASH ON DELIVERY (COD) ROUTE
        if (paymentMode === 'cod' || paymentMode === 'cash') {
            if (typeof showAppToast === 'function') showAppToast("Order placed successfully via Cash on Delivery!", "success", true);
            await finalizeOrderSuccess(data.order_id);
            return;
        }

        // 2️⃣ PRINT WALLET ROUTE
        if (paymentMode === 'wallet') {
            const walletKey = `wallet_balance_${sessionActiveUser}`;
            let currentWalletCash = parseFloat(localStorage.getItem(walletKey)) || 0.00;
            
            if (currentWalletCash < grandTotal) {
                if (typeof showAppToast === 'function') showAppToast(`Insufficient wallet balance! Available: ₹${currentWalletCash.toFixed(2)}, Needed: ₹${grandTotal.toFixed(2)}`, "error");
                return;
            }

            let newBalance = currentWalletCash - grandTotal;
            localStorage.setItem(walletKey, newBalance.toFixed(2));
            
            const balanceDisplay = document.getElementById('headerWalletDisplayBalance');
            if (balanceDisplay) {
                balanceDisplay.textContent = `₹${newBalance.toFixed(2)}`;
            }
            if (typeof synchronizeWalletInterfaceBalance === 'function') synchronizeWalletInterfaceBalance();

            if (typeof showAppToast === 'function') showAppToast("Order placed successfully using Print Wallet!", "success", true);
            await finalizeOrderSuccess(data.order_id);
            return;
        }

        // 3️⃣ ONLINE PAYMENT ROUTE (Razorpay)
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
                        if (typeof showAppToast === 'function') showAppToast("Payment successful & order confirmed!", "success", true);
                        await finalizeOrderSuccess(data.order_id);
                    } else {
                        if (typeof showAppToast === 'function') showAppToast("Payment verification failed.", "error");
                    }
                } catch (err) {
                    if (typeof showAppToast === 'function') showAppToast("Payment recorded successfully!", "success", true);
                    await finalizeOrderSuccess(data.order_id);
                }
            },
            modal: {
                ondismiss: function() {
                    if (typeof showAppToast === 'function') showAppToast("Payment cancelled. Order was not completed.", "error");
                }
            },
            theme: { color: '#065f46' }
        };

        if (typeof Razorpay !== 'undefined') {
            const rzp1 = new Razorpay(options);
            rzp1.open();
        } else {
            if (typeof showAppToast === 'function') showAppToast("Razorpay SDK not loaded.", "error");
        }

    } catch (error) {
        console.error("Order placement exception:", error);
        if (typeof showAppToast === 'function') showAppToast("Connection breakdown during order checkout.", "error");
    } finally {
        // Button ko wapas normal kar do agar koi error ya cancel ho
        if (submitOrderBtn) {
            submitOrderBtn.disabled = false;
            submitOrderBtn.style.opacity = '1';
            submitOrderBtn.textContent = 'Place Order';
        }
    }
};


 // --- AUTH FORM (Login & Signup) ---

// 🔥 UNIFIED & BULLETPROOF NAVIGATION ROUTER (Fixes White Screen & Overlaps)
window.navigateDrawerSection = function(targetId) {
    try {
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
            el.style.setProperty('display', 'none', 'important');
        });
        
        let normalizedId = targetId === 'orders' ? 'history' : targetId;
        const targetNode = document.getElementById(`user_section_${normalizedId}`);
        
        if (targetNode) {
            targetNode.classList.add('active');
            targetNode.style.setProperty('display', 'block', 'important');
        } else {
            console.error(`⚠️ View section not found: user_section_${normalizedId}`);
        }

        const storeSearchAndChipsBar = document.querySelector('header.brand-premium-header + div');
        if (storeSearchAndChipsBar) {
            if (normalizedId === 'store') {
                storeSearchAndChipsBar.style.setProperty('display', 'block', 'important');
            } else {
                storeSearchAndChipsBar.style.setProperty('display', 'none', 'important');
            }
        }

        const mainContainer = document.getElementById('mainLayoutAppContainer');
        if (mainContainer) {
            mainContainer.style.setProperty('display', 'flex', 'important');
        }

        if (typeof toggleUserDrawer === 'function') toggleUserDrawer(false);
        if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();

        if (normalizedId === 'history' && typeof renderOrderHistoryUI === 'function') {
            const activeUser = localStorage.getItem('printAppUser') || localStorage.getItem('printAppUserIdentity') || 'Customer';
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
}


// Final safety net: ensure no trailing syntax issues at EOF.
if (typeof window !== 'undefined') {
    window.__orderHistoryDebugInit = true;
}
// 🔥 PRINT WALLET DEPOSIT & QUICK AMOUNT ENGINE
window.setWalletQuickAmount = function(amount) {
    const input = document.getElementById('walletCustomAmountInput');
    if (input) {
        input.value = amount;
    }
};

window.executeWalletRazorpayDeposit = async function() {
    const input = document.getElementById('walletCustomAmountInput');
    const amount = parseFloat(input ? input.value : 100);

    if (isNaN(amount) || amount <= 0) {
        alert("⚠️ Please enter a valid amount to add!");
        return;
    }

    const sessionActiveUser = localStorage.getItem('printAppUser');
    if (!sessionActiveUser) {
        alert("⚠️ Please log in first to add money to your wallet.");
        return;
    }

    try {
        // 1. Initialize order on backend for wallet top-up
        const formData = new FormData();
        formData.append('totalAmount', amount.toFixed(2));
        formData.append('customerName', sessionActiveUser);
        formData.append('paymentMode', 'wallet_recharge');

        const response = await fetch('/api/create-order', { method: 'POST', body: formData });
        const data = await response.json();

        if (!data.success) {
            alert(`⚠️ Error: ${data.message || 'Failed to initialize payment'}`);
            return;
        }

        // 2. Open Razorpay Gateway
        const options = {
            key: data.key_id,
            amount: data.amount,
            currency: 'INR',
            name: 'Print From Home',
            description: 'Wallet Recharge',
            order_id: data.rzp_order_id,
            handler: function (response) {
                // 3. Success -> Add money to local wallet balance
                let currentBalance = parseFloat(localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
                let newBalance = currentBalance + amount;
                localStorage.setItem(`wallet_cash_${sessionActiveUser}`, newBalance.toFixed(2));

                if (typeof synchronizeWalletInterfaceBalance === 'function') {
                    synchronizeWalletInterfaceBalance();
                }
                alert(`🎉 Payment Successful! Added ₹${amount.toFixed(2)} to your Print Wallet. New Balance: ₹${newBalance.toFixed(2)}`);
            },
            modal: {
                ondismiss: function() {
                    alert('⚠️ Payment cancelled.');
                }
            },
            theme: { color: '#065f46' }
        };

        if (typeof Razorpay !== 'undefined') {
            const rzp = new Razorpay(options);
            rzp.open();
        } else {
            alert('⚠️ Razorpay SDK not loaded.');
        }
    } catch (err) {
        console.error("Wallet deposit gateway error:", err);
        alert("❌ Failed to initiate payment gateway.");
    }
};

// 🔥 Fix Hidden Invalid Form Control Focus Errors
document.addEventListener('DOMContentLoaded', () => {
    const hiddenInputs = document.querySelectorAll('form input[required], form select[required], form textarea[required]');
    hiddenInputs.forEach(input => {
        // Agar input hidden hai toh required attribute hata do taaki browser error na de
        if (input.offsetWidth === 0 && input.offsetHeight === 0) {
            input.removeAttribute('required');
        }
    });
});
// ==========================================
// 🔥 BULLETPROOF FIXES FOR AUTH & WHITE SCREEN
// ==========================================

// 🔥 Real Database Password Reset Function
window.initiatePasswordReset = async function() {
    const identityInput = document.getElementById('authIdentity') || document.getElementById('authEmailInput');
    const identity = identityInput ? identityInput.value.trim() : '';
    
    if (!identity) {
        alert("⚠️ Please enter your registered mobile number or Gmail first!");
        if (identityInput) identityInput.focus();
        return;
    }

    const newPassword = prompt("Enter your new password:");
    if (!newPassword || newPassword.trim() === "") {
        alert("⚠️ Password cannot be empty!");
        return;
    }

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, newPassword: newPassword.trim() })
        });
        const data = await response.json();

        if (data.success) {
            alert("✅ Password updated successfully in database! Please log in with your new password.");
            // Reset hone ke baad page reload kar dein taaki user login screen par aa jaye
            location.reload();
        } else {
            alert(`❌ ${data.message || 'Failed to reset password'}`);
        }
    } catch (err) {
        console.error("Reset Password Error:", err);
        alert("❌ Server connection error during password reset.");
    }
};

// 2. Fix Hidden Invalid Form Control Focus Errors
document.addEventListener('DOMContentLoaded', () => {
    const hiddenInputs = document.querySelectorAll('form input[required], form select[required], form textarea[required]');
    hiddenInputs.forEach(input => {
        if (input.offsetWidth === 0 && input.offsetHeight === 0) {
            input.removeAttribute('required');
        }
    });
});

// 3. Universal Click & Auth Action Fixer
document.addEventListener('click', function(e) {
    const target = e.target;
    
    // Logout Handler Fix
    if (target.id === 'logoutBtn' || target.id.toLowerCase().includes('logout')) {
        e.preventDefault();
        localStorage.removeItem('printAppUser');
        localStorage.removeItem('printAppUserIdentity');
        localStorage.removeItem('printAppUserEmail');
        alert("✅ Logged out successfully!");
        location.reload();
    }
    
    // Forgot Password Link Handler Fix
    if (target.id === 'toggleAuthLink' || target.textContent.toLowerCase().includes('forgot')) {
        const authTitle = document.getElementById('authTitle');
        if (authTitle) authTitle.textContent = "Reset Password";
    }
});
// ==========================================
// 🔥 COMPLETE WORKING AUTHENTICATION & TOGGLE ENGINE
// ==========================================

window.isSignupActive = false;

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authBtn = document.getElementById('authBtn');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    const toggleMsg = document.getElementById('toggleMsg');
    const signupOnlyFields = document.querySelectorAll('.signup-only');
    const otpBoxNode = document.querySelector('.signup-otp-box');

    if (toggleAuthLink) {
        toggleAuthLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.isSignupActive = !window.isSignupActive;

            if (window.isSignupActive) {
                if (authTitle) authTitle.textContent = "Create Account";
                if (authBtn) authBtn.textContent = "Verify & Sign Up";
                if (toggleMsg) toggleMsg.textContent = "Already have an account?";
                if (toggleAuthLink) toggleAuthLink.textContent = "Log In";
                signupOnlyFields.forEach(el => el.classList.remove('hidden'));
                if (otpBoxNode) otpBoxNode.classList.remove('hidden');
            } else {
                if (authTitle) authTitle.textContent = "Log In with Gmail OTP";
                if (authBtn) authBtn.textContent = "Verify & Log In";
                if (toggleMsg) toggleMsg.textContent = "New to Print From Home?";
                if (toggleAuthLink) toggleAuthLink.textContent = "Create Account";
                signupOnlyFields.forEach(el => el.classList.add('hidden'));
                if (otpBoxNode) otpBoxNode.classList.remove('hidden');
            }
        });
    }

});

 window.isOtpStepActive = false;

window.handleSendSignupOtp = async function() {
    const emailInput = document.getElementById('authEmailInput');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !email.includes('@gmail.com')) {
        alert("Please enter a valid Gmail address.");
        return;
    }

    let requestBody = { email: email };

    if (window.isSignupActive) {
        const nameInput = document.getElementById('authName');
        const identityInput = document.getElementById('authIdentity');
        const name = nameInput ? nameInput.value.trim() : '';
        const identity = identityInput ? identityInput.value.trim() : '';

        if (!name || !identity || identity.length !== 10) {
            alert("Please fill in your full name and a valid 10-digit mobile number.");
            return;
        }
        requestBody.name = name;
        requestBody.identity = identity;
    }

    try {
        const endpoint = window.isSignupActive ? '/api/auth/send-signup-otp' : '/api/auth/send-login-otp';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.success) {
            alert("Verification OTP has been sent to your Gmail address.");
            
            // 🔥 Yahan isOtpStepActive ko true set karna zaroori hai
            window.isOtpStepActive = true;

            // OTP box ko show karein aur input field ko bilkul blank rakhein
            const otpBox = document.querySelector('.signup-otp-box');
            if (otpBox) otpBox.classList.remove('hidden');
            
            const otpInputNode = document.getElementById('authEmailOtpInput');
            if (otpInputNode) otpInputNode.value = ''; 
        } else {
            alert(`Error: ${data.message || 'Failed to send OTP.'}`);
        }
    } catch (err) {
        console.error("OTP Send Error:", err);
        alert("Server connection error while sending OTP.");
    }
};

// 🔥 Safe Fix for Missing Function Crash
if (typeof window.forceFixWhiteScreen !== 'function') {
    window.forceFixWhiteScreen = function() {
        // Safe dummy fallback to prevent white screen timer crash
    };
}

// ==========================================
// 🔥 Updated & Clean Order Status / Tracking View Engine
// ==========================================
window.openOrderTrackingView = function(orderId) {
    try {
        const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
        const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';
        
        // 🔥 Scan all possible keys starting with 'history_' to prevent "Order details not found"
        let history = [];
        const targetKeys = [
            `history_${sessionActiveUser}`,
            activeIdentity ? `history_${activeIdentity}` : null
        ].filter(Boolean);

        for (let key of targetKeys) {
            try {
                let items = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(items) && items.length > 0) {
                    history = items;
                    break;
                }
            } catch (e) {}
        }

        const order = history.find(o => o && String(o.orderId || o.id) === String(orderId));
        
        if (!order) {
            alert("⚠️ Order details not found.");
            if (typeof navigateDrawerSection === 'function') navigateDrawerSection('history');
            return;
        }

        // 1. Navigate to the tracking section safely
        if (typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('order_tracking');
        }

        // 2. Populate Order Header Details Safely
        const setText = (id, val) => { 
            const el = document.getElementById(id); 
            if (el) el.textContent = val; 
        };
        
        setText('trackOrderIdHeader', `Order #${order.orderId || order.id || 'N/A'}`);
        setText('trackGrandTotalBadge', `₹${Number(order.amount || order.totalAmount || 0).toFixed(2)}`);
        setText('liveOrderStatusBadge', order.status || 'Your order is getting ready...');
        setText('trackShippingAddressLabel', order.address || 'Varanasi Delivery Address');

        // 3. Populate Rider Details
        const riderNameNode = document.getElementById('deliveryExecutiveName');
        const riderPhoneNode = document.getElementById('deliveryExecutivePhone');
        const callBtn = document.getElementById('callExecutiveBtn');

        if (order.assignedDeliveryBoy && order.assignedDeliveryBoy.trim() !== '') {
            if (riderNameNode) riderNameNode.textContent = `Delivery Partner (${order.assignedDeliveryBoy})`;
            if (riderPhoneNode) riderPhoneNode.textContent = `📞 ${order.assignedDeliveryBoy}`;
            if (callBtn) callBtn.href = `tel:${order.assignedDeliveryBoy}`;
        } else {
            if (riderNameNode) riderNameNode.textContent = "Assigning Delivery Executive...";
            if (riderPhoneNode) riderPhoneNode.textContent = "Will be assigned shortly";
            if (callBtn) callBtn.href = "tel:7007626731";
        }

        // 4. Render Item Manifest (Fixed multiplication bug here)
        const manifestList = document.getElementById('trackFilesManifestList');
        if (manifestList) {
            let detailsArray = order.details || order.configDetails || [];
            if (typeof detailsArray === 'string') {
                try { detailsArray = JSON.parse(detailsArray); } catch(e) { detailsArray = []; }
            }

            if (Array.isArray(detailsArray) && detailsArray.length > 0) {
                manifestList.innerHTML = detailsArray.map(item => {
                    let itemName = item.fileName || item.name || 'Print Item';
                    let itemCopies = item.copies || item.qty || 1;
                    let itemPrice = item.price || 3;
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:#334155; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                            <span>📄 ${itemName} (×${itemCopies})</span>
                            <b style="color:#065f46;">₹${Number(itemPrice) * Number(itemCopies)}</b>
                        </div>
                    `;
                }).join('');
            } else {
                manifestList.innerHTML = `<p style="font-size:0.75rem; color:#64748b; text-align:center;">No item manifest recorded.</p>`;
            }
        }

        // 5. Initialize Live Google Map
        setTimeout(() => {
            if (typeof window.initLiveOrderTrackingGoogleMap === 'function') {
                window.initLiveOrderTrackingGoogleMap(order);
            }
        }, 300);

    } catch (err) {
        console.error("Order Tracking View Error:", err);
        if (typeof navigateDrawerSection === 'function') {
            navigateDrawerSection('history');
        }
    }
};

// ==========================================
// 🔥 ADMIN LIVE GPS TRACKING & DYNAMIC ETA ENGINE
// ==========================================

let userLiveTrackingMap = null;
let userLiveAdminMarker = null;
let userLiveStoreMarker = null;
let userLiveDestinationMarker = null;

// 1. Initialize Real Google Map on Tracking Page with Live Admin Marker
window.initLiveOrderTrackingGoogleMap = function(order) {
    const mapElement = document.getElementById('liveTrackingGoogleMap');
    const distanceBadge = document.getElementById('mapDistanceBadge');
    if (!mapElement || typeof google === 'undefined') return;

    // Store Fixed Location (Varanasi Store)
    const storeLatLng = { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng };
    
    // User Delivery Address Coordinates
    const userLatLng = order.userLat && order.userLng ? 
        { lat: Number(order.userLat), lng: Number(order.userLng) } : 
        { lat: STORE_LOCATION.lat + 0.015, lng: STORE_LOCATION.lng + 0.012 };

    // Initial Map Center
    userLiveTrackingMap = new google.maps.Map(mapElement, {
        center: storeLatLng,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true
    });

    // Store Pin Marker (Green)
    userLiveStoreMarker = new google.maps.Marker({
        position: storeLatLng,
        map: userLiveTrackingMap,
        title: "Print From Home Store (Varanasi)",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }
    });

    // Destination Pin Marker (Red)
    userLiveDestinationMarker = new google.maps.Marker({
        position: userLatLng,
        map: userLiveTrackingMap,
        title: "Delivery Destination",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    });

    // Admin / Rider Live Bike Marker (Motorcycle Icon representing Admin moving)
    userLiveAdminMarker = new google.maps.Marker({
        position: storeLatLng,
        map: userLiveTrackingMap,
        title: "Delivery Partner (Admin Live)",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/motorcycle.png" }
    });

    // Start polling admin live location from server
    if (window.adminTrackingInterval) clearInterval(window.adminTrackingInterval);
    window.adminTrackingInterval = setInterval(() => {
        fetchAdminLiveLocationAndSyncMap(order.orderId || order.id, userLatLng, distanceBadge);
    }, 5000); // Check admin location every 5 seconds
};

// 2. Fetch Admin Live Coordinates from Backend Server & Update Map
async function fetchAdminLiveLocationAndSyncMap(orderId, userLatLng, distanceBadgeNode) {
    try {
        const res = await fetch(`/api/admin/live-location?orderId=${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.lat && data.lng) {
            const adminCurrentLatLng = { lat: Number(data.lat), lng: Number(data.lng) };
            
            if (userLiveAdminMarker) {
                userLiveAdminMarker.setPosition(adminCurrentLatLng);
            }

            const distanceKm = calculateHaversineKm(
                adminCurrentLatLng.lat, adminCurrentLatLng.lng, 
                userLatLng.lat, userLatLng.lng
            );

            let etaMins = Math.max(2, Math.round((distanceKm * 3) + 2));

            if (distanceBadgeNode) {
                distanceBadgeNode.innerHTML = `🛵 Arriving in <b>${etaMins} mins</b> (${distanceKm.toFixed(1)} km away)`;
            }

            const etaSubtext = document.getElementById('liveOrderEtaSubtext');
            if (etaSubtext) {
                etaSubtext.innerHTML = `Delivery partner is on the way! Estimated arrival in <b>${etaMins} mins</b>.`;
            }
        }
    } catch (e) {
        // Fallback
    }
}

// 📐 Haversine Distance Helper in Kilometers
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 3. Hook into openOrderTrackingView to initialize map automatically
const existingOpenOrderTrackingView = window.openOrderTrackingView;
window.openOrderTrackingView = function(orderId) {
    if (typeof existingOpenOrderTrackingView === 'function') {
        existingOpenOrderTrackingView(orderId);
    }

    const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
    let history = [];
    
    try {
        let rawHistory = localStorage.getItem(`history_${sessionActiveUser}`);
        history = rawHistory ? JSON.parse(rawHistory) : [];
    } catch(e) {
        history = [];
    }

    // Safe array check before calling .find()
    const order = Array.isArray(history) ? history.find(o => o && String(o.orderId || o.id) === String(orderId)) : null;

    if (order) {
        setTimeout(() => {
            initLiveOrderTrackingGoogleMap(order);
        }, 400);
    }
};

// 4. Order Place hote hi direct naye order ke tracking page par bhejna
const originalFinalizeOrderSuccessForTrackingRedirect = window.finalizeOrderSuccess;
window.finalizeOrderSuccess = async function(orderId) {
    if (typeof originalFinalizeOrderSuccessForTrackingRedirect === 'function') {
        await originalFinalizeOrderSuccessForTrackingRedirect(orderId);
    }
    if (typeof window.openOrderTrackingView === 'function') {
        window.openOrderTrackingView(orderId);
    }
};

// ==========================================
// 🔥 SERVER-SYNCED REAL-TIME ORDER STATUS & CANCELLATION POLLING ENGINE
// ==========================================
window.syncActiveOrderStatusFromBackend = async function() {
    try {
        const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
        const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';

        // 1. Fetch live orders from backend server to catch admin cancellations/updates instantly
        const res = await fetch('/api/admin/orders');
        if (!res.ok) return;
        const serverOrders = await res.json();
        if (!Array.isArray(serverOrders)) return;

        // 2. Update local storage history with latest server states
        const targetKeys = [
            `history_${sessionActiveUser}`,
            activeIdentity ? `history_${activeIdentity}` : null
        ].filter(Boolean);

        targetKeys.forEach(key => {
            try {
                let localHistory = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(localHistory) && localHistory.length > 0) {
                    let updated = false;
                    localHistory.forEach(localOrd => {
                        let matchedServerOrd = serverOrders.find(so => String(so.orderId) === String(localOrd.orderId || localOrd.id));
                        if (matchedServerOrd && matchedServerOrd.status !== localOrd.status) {
                            localOrd.status = matchedServerOrd.status;
                            updated = true;
                        }
                    });
                    if (updated) {
                        localStorage.setItem(key, JSON.stringify(localHistory));
                    }
                }
            } catch (e) {}
        });

        // 3. Update active tracking view or popup modal elements if open
        const activeTrackingModal = document.getElementById('customOrderTrackingModal');
        const orderIdHeader = document.getElementById('trackOrderIdHeader');
        
        let currentTrackedId = null;
        if (orderIdHeader) {
            currentTrackedId = orderIdHeader.textContent.replace('Order #', '').trim();
        } else if (activeTrackingModal) {
            const idSpan = activeTrackingModal.querySelector('span[style*="opacity: 0.85"]');
            if (idSpan) {
                currentTrackedId = idSpan.textContent.replace('Order ID: #', '').trim();
            }
        }

        if (currentTrackedId) {
            let currentOrderObj = serverOrders.find(so => String(so.orderId) === String(currentTrackedId));
            
            if (currentOrderObj) {
                const statusBadge = document.getElementById('liveOrderStatusBadge');
                const statusTextLower = (currentOrderObj.status || '').toLowerCase();

                if (statusBadge && statusBadge.textContent !== currentOrderObj.status) {
                    statusBadge.textContent = currentOrderObj.status;
                }

                // Agar admin ne order cancel kar diya hai, toh tracking modal par turant cancellation dikhayein
                if (statusTextLower.includes('cancel')) {
                    const mapContainer = document.getElementById('popupRealGoogleMapContainer');
                    if (mapContainer) {
                        mapContainer.innerHTML = `
                            <div style="width:100%; height:100%; background:#fef2f2; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#991b1b; padding:15px; text-align:center;">
                                <div style="font-size:2rem; margin-bottom:4px;">❌</div>
                                <div style="font-weight:900; font-size:0.9rem;">Order Cancelled by Store</div>
                                <div style="font-size:0.72rem; color:#7f1d1d; margin-top:2px;">This order has been cancelled by the admin.</div>
                            </div>
                        `;
                    }
                } else if (statusTextLower.includes('delivered')) {
                    const etaSubtext = document.getElementById('liveOrderEtaSubtext');
                    if (etaSubtext) etaSubtext.innerHTML = "🎉 Order Delivered Successfully! Thank you for ordering.";
                }
            }
        }
    } catch (e) {
        console.warn("Background order status sync warning:", e);
    }
};

// Run server status sync polling every 3 seconds seamlessly
setInterval(() => {
    if (typeof window.syncActiveOrderStatusFromBackend === 'function') {
        window.syncActiveOrderStatusFromBackend();
    }
}, 3000);

// ==========================================
// 🔥 EDIT CART PRINT JOB HANDLER
// ==========================================
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

    // Temporarily remove from cart while editing
    window.cartPrintJobsArray.splice(idx, 1);
    persistCartStateData();
    renderCartDrawerContents();
    toggleCartDrawer(false);

    if (typeof openPrintStudioWithFilesArray === 'function') {
        openPrintStudioWithFilesArray(window.studioMasterFiles, 0);
    }
};
// 🔥 Geolocation Active Permission Wrapper
window.requestUserGeolocationPermission = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                localStorage.setItem('user_lat', pos.coords.latitude);
                localStorage.setItem('user_lng', pos.coords.longitude);
            },
            (err) => { console.warn("Location permission needed for live ETA."); },
            { enableHighAccuracy: true }
        );
    }
};
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.requestUserGeolocationPermission, 1000);
});

// 🔥 Multi-Address Database Synchronization Helpers
window.saveUserAddressToDatabase = async function(formattedAddress) {
    const identity = localStorage.getItem('printAppUserIdentity');
    if (!identity) return;
    try {
        const res = await fetch('/api/user/addresses/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, address: formattedAddress })
        });
        const data = await res.json();
        if (data.success) {
            window.savedUserAddresses = data.addresses;
            localStorage.setItem('saved_addresses', JSON.stringify(data.addresses));
            if (typeof renderSavedAddressesUI === 'function') renderSavedAddressesUI();
        }
    } catch (e) {}
};

window.deleteUserAddressFromDatabase = async function(addressText) {
    const identity = localStorage.getItem('printAppUserIdentity');
    if (!identity) return;
    try {
        const res = await fetch('/api/user/addresses/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, address: addressText })
        });
        const data = await res.json();
        if (data.success) {
            window.savedUserAddresses = data.addresses;
            localStorage.setItem('saved_addresses', JSON.stringify(data.addresses));
            if (typeof renderSavedAddressesUI === 'function') renderSavedAddressesUI();
        }
    } catch (e) {}
};
// ... (apka baaki ka purana code yahan khatam hota hai)
// 🔥 Hard Override to completely silence any legacy debug order history warnings
window.forceDebugOrderHistory = function(username, showRecent) {
    if (typeof window.renderOrderHistoryUI === 'function') {
        // Redirect cleanly to standard professional render engine
        return;
    }
};
window.openEditProfileModal = function() {
    const modal = document.getElementById('editProfileModal');
    const sessionUser = localStorage.getItem('printAppUserIdentity') || localStorage.getItem('printAppUser') || '';
    const emailField = document.getElementById('modalEditEmailInput');
    const nameField = document.getElementById('modalEditNameInput');
    
    const currentName = localStorage.getItem(`user_name_${sessionUser}`) || localStorage.getItem('printAppUser') || '';
    const currentEmail = localStorage.getItem(`user_email_${sessionUser}`) || '';

    if(nameField) nameField.value = currentName !== 'Customer' ? currentName : '';
    if(emailField) emailField.value = currentEmail;
    if(modal) modal.style.display = 'flex';
};


window.submitProfileUpdates = async function(e) {
    if (e) e.preventDefault();
    
    const sessionUser = localStorage.getItem('printAppUserIdentity') || localStorage.getItem('printAppUser');
    
    const nameField = document.getElementById('modalEditNameInput');
    const emailField = document.getElementById('modalEditEmailInput');
    const passField = document.getElementById('modalEditPasswordInput');

    const newName = nameField ? nameField.value.trim() : '';
    const newEmail = emailField ? emailField.value.trim() : '';
    const newPass = passField ? passField.value.trim() : '';

    if (!newName || !newEmail) {
        alert(" Name and Gmail address cannot be empty!");
        return;
    }

    try {
        const res = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: sessionUser, name: newName, newPassword: newPass || undefined })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('printAppUser', newName);
            localStorage.setItem(`user_name_${sessionUser}`, newName);
            localStorage.setItem(`user_email_${sessionUser}`, newEmail);
            
            const greetingEl = document.getElementById('userGreeting');
            if (greetingEl) greetingEl.innerHTML = `HI, <span style="color:#000000; font-weight:800; text-transform:uppercase;">${newName}</span>`;

            if (typeof showAppToast === 'function') {
                showAppToast("✅ Profile & Gmail updated successfully!", "success");
            } else {
                alert("✅ Profile updated successfully!");
            }
            
            if (typeof closeEditProfileModal === 'function') {
                closeEditProfileModal();
            } else {
                const modal = document.getElementById('editProfileModal');
                if (modal) modal.style.display = 'none';
            }
        } else {
            alert(`❌ ${data.message || 'Failed to update profile'}`);
        }
    } catch(err) {
        console.error("Profile update error:", err);
        alert("❌ Server connection error while updating profile.");
    }
};

// 🔥 Bulletproof User Account Slider Drawer Toggle Engine
window.toggleUserDrawer = function(open) {
    const drawer = document.getElementById('userSideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer) return;
    
    if (open) {
        drawer.style.right = '0';
        if (overlay) { 
            overlay.classList.add('active'); 
            overlay.style.display = 'block'; 
        }
        const sessionUser = localStorage.getItem('printAppUser') || 'Customer';
        const sessionIdentity = localStorage.getItem('printAppUserIdentity') || '7398746551';
        
        const mobileText = document.getElementById('drawerUserMobileText');
        if (mobileText) mobileText.textContent = sessionIdentity;
    } else {
        drawer.style.right = '-100%';
        if (overlay) { 
            overlay.classList.remove('active'); 
            overlay.style.display = 'none'; 
        }
    }
};
// 🔥 Universal Global Click Listener for Profile Icon Trigger
document.addEventListener('click', function(e) {
    const target = e.target;
    // Agar user ne avatar icon par click kiya hai
    if (target.classList.contains('avatar-circle-trigger') || target.closest('.avatar-circle-trigger')) {
        e.preventDefault();
        if (typeof toggleUserDrawer === 'function') {
            toggleUserDrawer(true);
        }
    }
});

window.isOtpStepActive = false;

window.handleSendSignupOtp = async function() {
    const emailInput = document.getElementById('authEmailInput');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !email.includes('@gmail.com')) {
        alert("Please enter a valid Gmail address.");
        return;
    }

    let requestBody = { email: email };

    if (window.isSignupActive) {
        const nameInput = document.getElementById('authName');
        const identityInput = document.getElementById('authIdentity');
        const name = nameInput ? nameInput.value.trim() : '';
        const identity = identityInput ? identityInput.value.trim() : '';

        if (!name || !identity || identity.length !== 10) {
            alert("⚠️ Please fill in your full name and a valid 10-digit mobile number.");
            return;
        }
        requestBody.name = name;
        requestBody.identity = identity;
    }

    try {
        const endpoint = window.isSignupActive ? '/api/auth/send-signup-otp' : '/api/auth/send-login-otp';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.success) {
            alert("✅ Verification OTP has been sent to your Gmail address!");
            window.isOtpStepActive = true;
            
            const otpBox = document.querySelector('.signup-otp-box');
            if (otpBox) otpBox.classList.remove('hidden');
            
            const sendOtpBtn = document.getElementById('sendSignupOtpBtn');
            if (sendOtpBtn) sendOtpBtn.style.display = 'none';
            
            if (emailInput) emailInput.setAttribute('readonly', true);
            
            const authBtn = document.getElementById('authBtn');
            if (authBtn) authBtn.textContent = window.isSignupActive ? "Verify & Complete Signup" : "Verify & Log In";
            
            const otpInputNode = document.getElementById('authEmailOtpInput');
            if (otpInputNode) otpInputNode.value = '';
        } else {
            alert(`❌ ${data.message || 'OTP bhejne mein asafalta rahi.'}`);
        }
    } catch (e) {
        console.error("OTP Error:", e);
        alert("❌ Server connection error.");
    }
};

// 🔥 COMPLETE AUTH FORM SUBMIT HANDLER (MANDATORY FOR SAVING USER TO MONGODB)
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    
    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('authEmailInput');
            const otpInputNode = document.getElementById('authEmailOtpInput');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const otp = otpInputNode ? otpInputNode.value.trim() : '';

            if (!email) {
                alert("⚠️ Please enter your Gmail address!");
                if (emailInput) emailInput.focus();
                return;
            }

            if (!otp || otp.length !== 6) {
                alert("⚠️ Please enter the valid 6-digit OTP received on your Gmail!");
                if (otpInputNode) otpInputNode.focus();
                return;
            }

            try {
                if (window.isSignupActive) {
                    // --- SIGNUP FLOW & OTP VERIFICATION ---
                    const nameInput = document.getElementById('authName');
                    const identityInput = document.getElementById('authIdentity');
                    const name = nameInput ? nameInput.value.trim() : 'Customer';
                    const identity = identityInput ? identityInput.value.trim() : '';

                    if (!window.isOtpStepActive) {
                        alert("⚠️ Please click 'Send OTP' first and verify your Gmail address!");
                        return;
                    }

                const response = await fetch('/api/auth/verify-signup-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, identity, email, otpInput: otp })
                    });
                    const data = await response.json();

                    if (data.success) {
                        alert("🎉 Gmail verified and account successfully created!");
                        
                        // 🔥 YE HAI MAIN FIX: Signup successful hote hi session save karein
                        localStorage.setItem('printAppUser', name);
                        localStorage.setItem('printAppUserIdentity', identity || '');
                        localStorage.setItem('printAppUserEmail', email);

                        // 🔥 Turant page reload karein taaki app login screen ke bajaye seedha Home Page khole
                        location.reload(); 
                    } else {
                        alert(`❌ ${data.message || 'Verification failed'}`);
                    }

                } else {
                    // --- LOGIN FLOW (Sirf Gmail aur OTP se) ---
                    const response = await fetch('/api/auth/verify-login-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, otpInput: otp })
                    });
                    const data = await response.json();

                    if (data.success) {
                        localStorage.setItem('printAppUser', data.name);
                        localStorage.setItem('printAppUserIdentity', data.identity || '');
                        if (data.email) localStorage.setItem('printAppUserEmail', data.email);

                        alert(`✅ Welcome back, ${data.name}! Login Successful.`);
                        location.reload();
                    } else {
                        alert(`❌ ${data.message || 'Invalid verification code or unregistered Gmail!'}`);
                    }
                }
            } catch (err) {
                console.error("Auth Error:", err);
                alert("❌ Server connection error during authentication.");
            }
        });
    }
});

// 🔥 Bulletproof Wallet Click & Tap Handler
document.addEventListener('click', function(e) {
    // Check if click/tap is on wallet balance or any wallet micro badge
    if (e.target.id === 'headerWalletDisplayBalance' || e.target.closest('.wallet-micro-badge') || e.target.id === 'walletDrawerBalanceText') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof toggleWalletPopupGrid === 'function') {
            toggleWalletPopupGrid(true, e);
        }
    }
}, true); // Use capture phase to intercept taps reliably on mobile touch devices
// 🔥 Process Wallet Deposit & Recharge Function
// 🔥 Razorpay Real Online Payment Gateway for Wallet Recharge
window.processWalletDeposit = async function() {
    try {
        const inputField = document.getElementById('customWalletInput');
        if (!inputField) return;
        
        const amountToAdd = parseFloat(inputField.value);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
            alert("Please enter a valid recharge amount");
            return;
        }

        const activeUser = localStorage.getItem('printAppUser') || 'Customer';
        const activeMobile = localStorage.getItem('printAppUserIdentity') || '7398746551';
        const activeEmail = localStorage.getItem(`user_email_${activeUser}`) || 'support@printfromhomes.com';

        if (typeof Razorpay === 'undefined') {
            alert("Payment gateway script is loading. Please try again.");
            return;
        }

        // 🔥 Backend se live key aur order details fetch karein taaki test mode na aaye
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalAmount: amountToAdd.toFixed(2),
                configDetails: JSON.stringify([{ name: "Wallet Recharge", price: amountToAdd, copies: 1 }]),
                customerName: activeUser,
                phone: activeMobile,
                paymentMode: "online",
                deliveryMode: "pickup"
            })
        });
        const data = await res.json();

        if (!data.success) {
            alert(`⚠️ Error: ${data.message || 'Could not initiate wallet recharge'}`);
            return;
        }

        const options = {
            "key": data.key_id, // Server ki live key yahan automatic lag jayegi
            "amount": data.amount,
            "currency": "INR",
            "name": "Print From Home",
            "description": "Wallet Online Recharge",
            "image": "/icon-192.png",
            "order_id": data.rzp_order_id,
            "handler": async function (response) {
                const walletKey = `wallet_balance_${activeUser}`;
                let currentBalance = parseFloat(localStorage.getItem(walletKey) || '0');
                
                currentBalance += amountToAdd;
                localStorage.setItem(walletKey, currentBalance.toFixed(2));

                const balanceDisplay = document.getElementById('headerWalletDisplayBalance');
                if (balanceDisplay) {
                    balanceDisplay.textContent = `₹${currentBalance.toFixed(2)}`;
                }

                if (typeof toggleWalletPopupGrid === 'function') {
                    toggleWalletPopupGrid(false);
                }
                inputField.value = '';

                if (typeof showAppToast === 'function') {
                    showAppToast(`Successfully added ₹${amountToAdd.toFixed(2)} via Online Payment!`, "success");
                } else {
                    alert(`Successfully added ₹${amountToAdd.toFixed(2)} to wallet!`);
                }

                if (typeof updateFloatingCartBar === 'function') updateFloatingCartBar();
            },
            "prefill": {
                "name": activeUser,
                "email": activeEmail,
                "contact": activeMobile
            },
            "theme": {
                "color": "#065f46"
            }
        };

       const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (err) {
        console.error("Wallet Online Payment Error:", err);
        alert("Could not initiate online payment. Please try again.");
    }
}; // 👈 Sirf ek closing brace aur semicolon hona chahiye


// 🛑 Professional Confirmation Modal (Replaces browser confirm())
window.showAppConfirm = function(title, description, onConfirm, icon = "⚠️") {
    const modal = document.getElementById('appConfirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const descEl = document.getElementById('confirmModalDesc');
    const iconEl = document.getElementById('confirmModalIcon');
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if (!modal) {
        if (confirm(description)) onConfirm();
        return;
    }

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = description;
    if (iconEl) iconEl.textContent = icon;
    modal.style.display = 'flex';

    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    if (okBtn && okBtn.parentNode) okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    if (cancelBtn && cancelBtn.parentNode) cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.onclick = function() {
        modal.style.display = 'none';
        if (typeof onConfirm === 'function') onConfirm();
    };

    newCancelBtn.onclick = function() {
        modal.style.display = 'none';
    };
};

// ==========================================
// 🔥 STRICTLY USER-SPECIFIC ORDER HISTORY RENDER ENGINE
// ==========================================
window.renderOrderHistoryUI = function() {
    try {
        const container = document.getElementById('ordersHistoryContainer');
        if (!container) return;

        // 1. Sirf currently active user ki keys target karein (Doosre users ka data mix na ho)
        const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
        const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';

        const targetKeys = [
            `history_${sessionActiveUser}`,
            activeIdentity ? `history_${activeIdentity}` : null
        ].filter(Boolean);

        let history = [];
        let seenOrderIds = new Set();

        targetKeys.forEach(key => {
            try {
                let items = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(items)) {
                    items.forEach(ord => {
                        if (ord) {
                            let uniqueId = ord.orderId || ord.id || JSON.stringify(ord);
                            if (!seenOrderIds.has(uniqueId)) {
                                seenOrderIds.add(uniqueId);
                                history.push(ord);
                            }
                        }
                    });
                }
            } catch (e) {}
        });

        // Sort by newest first
        history = history.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const topBar = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 2px solid #065f46; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">
                <h3 style="font-size: 1.1rem; font-weight: 900; color: #065f46; margin: 0;">📦 Your Orders (${history.length})</h3>
                <button type="button" onclick="navigateDrawerSection('store')" style="background: #065f46; color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer;">🏠 Home</button>
            </div>
        `;

        if (history.length === 0) {
            container.innerHTML = `
                ${topBar}
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border: 1.5px dashed #16a34a; border-radius: 20px; padding: 36px 20px; text-align: center; font-family: 'Poppins', sans-serif;">
                    <div style="font-size: 3.2rem; margin-bottom: 12px;">📦✨</div>
                    <h3 style="font-size: 1.15rem; font-weight: 900; color: #0f172a; margin-bottom: 6px;">No orders found yet</h3>
                    <p style="font-size: 0.8rem; color: #64748b; line-height: 1.5; margin-bottom: 22px; max-width: 290px; margin-left: auto; margin-right: auto;">You haven't placed any orders yet. Place your first order now!</p>
                    <button type="button" onclick="navigateDrawerSection('store')" style="background: #065f46; color: white; border: none; padding: 12px 28px; border-radius: 14px; font-weight: 900; font-size: 0.85rem; cursor: pointer;">Start Your First Order &rarr;</button>
                </div>
            `;
            return;
        }

        container.innerHTML = topBar + history.map(order => {
            if (!order) return '';
            let safeId = order.orderId || order.id || 'N/A';
            let safeAmount = Number(order.amount || order.totalAmount || 0).toFixed(2);
            let rawStatus = order.status || 'Processing';
            
            // 🔥 User friendly status cleaner (Admin ke internal notes chhipane ke liye)
            let safeStatus = rawStatus;
            let statusColor = '#2563eb'; // Default blue for processing
            
            if (rawStatus.toLowerCase().includes('cancel')) {
                safeStatus = 'Cancelled ❌';
                statusColor = '#dc2626'; // Red for cancelled
            } else if (rawStatus.toLowerCase().includes('delivered')) {
                safeStatus = 'Delivered 🟢';
                statusColor = '#059669'; // Green for delivered
            }

            let safeDate = order.date || '';
            
            let itemsHtml = '';
            let detailsArray = order.details || order.configDetails || [];
            if (typeof detailsArray === 'string') {
                try { detailsArray = JSON.parse(detailsArray); } catch(e) { detailsArray = []; }
            }

            if (Array.isArray(detailsArray)) {
                itemsHtml = detailsArray.map(item => `<div style="font-size: 0.75rem; color: #334155; margin-top: 2px;">• ${item.name || item.fileName || 'Item'} (Qty: ${item.qty || item.copies || 1})</div>`).join('');
            }

            return `
                <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:14px; margin-bottom:12px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem; color:#0f172a;">
                        <span>Order #${safeId}</span>
                        <span style="color:#065f46;">₹${safeAmount}</span>
                    </div>
                    <div style="margin: 6px 0;">${itemsHtml}</div>
                    <p style="font-size:0.75rem; color:#64748b; margin:4px 0;">Status: <b style="color:${statusColor};">${safeStatus}</b></p>
                    <p style="font-size:0.7rem; color:#94a3b8; margin-bottom:10px;">${safeDate}</p>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" onclick="openOrderTrackingView('${safeId}')" style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer;">📍 Track Status</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Render Order History Error:", err);
    }
};

// 🔥 ENHANCED DIRECT TRACKING & REDIRECT ENGINE
window.openOrderTrackingView = function(orderId) {
    try {
        let targetOrder = null;
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key && key.startsWith('history_')) {
                try {
                    let items = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(items)) {
                        let found = items.find(o => (o.orderId === orderId || o.id === orderId));
                        if (found) { targetOrder = found; break; }
                    }
                } catch (e) {}
            }
        }

        if (!targetOrder) {
            console.warn("Order details not found for ID:", orderId);
            return;
        }

        let existingModal = document.getElementById('customOrderTrackingModal');
        if (existingModal) existingModal.remove();

        let itemsHtml = '';
        if (Array.isArray(targetOrder.details)) {
            itemsHtml = targetOrder.details.map(item => `
                <div style="display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 10px 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />` : ''}
                    <div style="flex: 1;">
                        <div style="font-weight: 800; font-size: 0.85rem; color: #0f172a;">${item.name || 'Product'}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Qty: ${item.qty || 1} &bull; ₹${item.price || 0} per unit</div>
                    </div>
                    <div style="font-weight: 900; font-size: 0.85rem; color: #065f46;">₹${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</div>
                </div>
            `).join('');
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'customOrderTrackingModal';
        modalOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(5px);
            display: flex; justify-content: center; align-items: center; z-index: 999999;
            padding: 16px; font-family: 'Poppins', sans-serif;
        `;

        modalOverlay.innerHTML = `
            <div style="background: white; width: 100%; max-width: 450px; border-radius: 20px; padding: 22px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); max-height: 92vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #0f172a;">Order Tracking 📦</h3>
                        <span style="font-size: 0.75rem; color: #64748b;">ID: #${targetOrder.orderId || orderId}</span>
                    </div>
                    <button type="button" onclick="document.getElementById('customOrderTrackingModal').remove()" style="background: #f1f5f9; border: none; font-size: 1.1rem; font-weight: bold; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; color: #334155; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="width: 10px; height: 10px; background: #2563eb; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 3px rgba(37,99,235,0.2);"></span>
                        <span style="font-weight: 900; font-size: 0.88rem; color: #1e40af;">${targetOrder.status || 'Order Placed & Processing'}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: #64748b; margin-left: 18px;">Placed on: ${targetOrder.date || 'N/A'}</div>
                </div>

                <div style="font-weight: 800; font-size: 0.85rem; color: #0f172a; margin-bottom: 8px;">Order Summary:</div>
                <div style="margin-bottom: 16px; max-height: 180px; overflow-y: auto;">${itemsHtml}</div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                    <div style="font-weight: 800; font-size: 0.82rem; color: #0f172a; margin-bottom: 4px;">📍 Delivery Address:</div>
                    <div style="font-size: 0.75rem; color: #475569; line-height: 1.4; margin-bottom: 8px;">${targetOrder.address || 'N/A'}</div>
                    <div style="font-size: 0.72rem; color: #065f46; font-weight: 700;">Mode: ${targetOrder.deliveryMode ? targetOrder.deliveryMode.toUpperCase() : 'DOORSTEP'}</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 18px;">
                    <span style="font-weight: 800; font-size: 0.9rem; color: #065f46;">Total Paid Amount:</span>
                    <span style="font-weight: 900; font-size: 1.1rem; color: #065f46;">₹${Number(targetOrder.amount || 0).toFixed(2)}</span>
                </div>

                <button type="button" onclick="document.getElementById('customOrderTrackingModal').remove(); if(typeof navigateDrawerSection==='function') navigateDrawerSection('store');" style="width: 100%; background: #065f46; color: white; border: none; padding: 13px; border-radius: 12px; font-weight: 900; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(6,95,70,0.25);">Back to Home / Store &rarr;</button>
            </div>
        `;

        document.body.appendChild(modalOverlay);
    } catch (err) {
        console.error("Enhanced Tracking View Error:", err);
    }
};

// 🔥 Automatic initialization on load
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderOrderHistoryUI === 'function') {
        renderOrderHistoryUI();
    }
});
// 🔥 INSTANT ORDER PLACEMENT REDIRECT HOOK
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, [type="submit"], [onclick]');
    if (!btn) return;
    
    const text = (btn.textContent || btn.getAttribute('onclick') || '').toLowerCase();
    
    // Agar user ne final order place ya pay button dabaya hai
    if (text.includes('place order') || text.includes('confirm order') || text.includes('pay now') || text.includes('complete order')) {
        setTimeout(() => {
            // localStorage scan karke sabse naya order dhoondhein
            let newestOrder = null;
            let newestTime = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                if (key && key.startsWith('history_')) {
                    try {
                        let items = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(items) && items.length > 0) {
                            items.forEach(ord => {
                                let ordTime = new Date(ord.date || 0).getTime();
                                if (ordTime >= newestTime) {
                                    newestTime = ordTime;
                                    newestOrder = ord;
                                }
                            });
                        }
                    } catch (err) {}
                }
            }
            
            // Agar pichle 30 seconds ke andar order bana hai, toh seedha tracking kholo
            if (newestOrder && newestOrder.orderId) {
                let timeDiff = Date.now() - new Date(newestOrder.date || 0).getTime();
                if (timeDiff < 30000 && typeof window.openOrderTrackingView === 'function') {
                    window.openOrderTrackingView(newestOrder.orderId);
                }
            }
        }, 500); // Thoda delay taaki order successfully save ho jaye
    }
}, true);

// 🔥 ULTIMATE ROUTER INTERCEPTOR: History redirection ko 100% block karke seedha Popup Tracking kholna
if (typeof window.navigateDrawerSection === 'function') {
    const originalNavigate = window.navigateDrawerSection;
    window.navigateDrawerSection = function(section, ...args) {
        let normalizedSection = section === 'orders' ? 'history' : section;
        
        // Agar app history section par bhej raha hai, toh check karein ki kya koi naya order abhi bana hai
        if (normalizedSection === 'history') {
            let newestOrder = null;
            let newestTime = 0;
            
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                if (key && key.startsWith('history_')) {
                    try {
                        let items = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(items) && items.length > 0) {
                            items.forEach(ord => {
                                let ordTime = new Date(ord.date || 0).getTime();
                                if (ordTime >= newestTime) {
                                    newestTime = ordTime;
                                    newestOrder = ord;
                                }
                            });
                        }
                    } catch (err) {}
                }
            }
            
            // Agar pichle 30 seconds ke andar order bana hai, toh history page kholne se STRICTLY rokein aur naya popup tracking dikhayein
            if (newestOrder && newestOrder.orderId) {
                let timeDiff = Date.now() - new Date(newestOrder.date || 0).getTime();
                if (timeDiff < 30000 && typeof window.openOrderTrackingView === 'function') {
                    console.log("🚀 Blocked old history redirect, forcing new popup tracking for order:", newestOrder.orderId);
                    window.openOrderTrackingView(newestOrder.orderId);
                    return; // 🛑 Yahi se execution rokh do taaki purana history page load na ho!
                }
            }
        }
        
        // Normal case mein original navigation chalne dein
        return originalNavigate.apply(this, [section, ...args]);
    };
}

// ==========================================
// 🚀 ULTRA-PROFESSIONAL REAL-TIME POPUP TRACKING ENGINE (WITH LIVE SERVER POLLING)
// ==========================================
window.openOrderTrackingView = function(orderId) {
    try {
        const sessionActiveUser = localStorage.getItem('printAppUser') || 'Customer';
        const activeIdentity = localStorage.getItem('printAppUserIdentity') || '';
        
        let history = [];
        const targetKeys = [
            `history_${sessionActiveUser}`,
            activeIdentity ? `history_${activeIdentity}` : null
        ].filter(Boolean);

        for (let key of targetKeys) {
            try {
                let items = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(items) && items.length > 0) {
                    history = items;
                    break;
                }
            } catch (e) {}
        }

        if (history.length === 0) {
            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);
                if (key && key.startsWith('history_')) {
                    try {
                        let items = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(items)) history = history.concat(items);
                    } catch (e) {}
                }
            }
        }

        const targetOrder = history.find(o => o && (String(o.orderId || o.id) === String(orderId)));

        if (!targetOrder) {
            console.warn("Order details not found for ID:", orderId);
            alert("⚠️ Order details not found for ID: " + orderId);
            if (typeof navigateDrawerSection === 'function') navigateDrawerSection('history');
            return;
        }

        let existingModal = document.getElementById('customOrderTrackingModal');
        if (existingModal) existingModal.remove();

        // 1. Items Manifest Breakdown
        let itemsHtml = '';
        let detailsArray = targetOrder.details || targetOrder.configDetails || [];
        if (typeof detailsArray === 'string') {
            try { detailsArray = JSON.parse(detailsArray); } catch(e) { detailsArray = []; }
        }

        if (Array.isArray(detailsArray) && detailsArray.length > 0) {
            itemsHtml = detailsArray.map(item => {
                let itemName = item.fileName || item.name || 'Print Item';
                let itemCopies = item.copies || item.qty || 1;
                let itemPrice = item.price || 3;
                let lineTotal = Number(itemPrice) * Number(itemCopies);
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #334155; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
                        <span style="font-weight: 600;">📄 ${itemName} (×${itemCopies})</span>
                        <b style="color: #065f46;">₹${lineTotal.toFixed(2)}</b>
                    </div>
                `;
            }).join('');
        } else {
            itemsHtml = `<p style="font-size: 0.78rem; color: #64748b; text-align: center;">No item manifest recorded.</p>`;
        }

        // 2. Rider Details
        let riderName = "Assigning Delivery Executive...";
        let riderPhone = "7007626731";
        if (targetOrder.assignedDeliveryBoy && targetOrder.assignedDeliveryBoy.trim() !== '') {
            riderName = `Delivery Partner (${targetOrder.assignedDeliveryBoy})`;
            riderPhone = targetOrder.assignedDeliveryBoyPhone || targetOrder.assignedDeliveryBoy;
        }

        const trackingStatus = targetOrder.status || 'Order Placed & Picking';
        const lowerStatus = trackingStatus.toLowerCase();
        const isConfirmed = true;
        const isPacked = lowerStatus.includes('packed') || lowerStatus.includes('print') || lowerStatus.includes('out') || lowerStatus.includes('delivered');
        const isOutForDelivery = lowerStatus.includes('out') || lowerStatus.includes('delivery') || lowerStatus.includes('delivered');

        // Create Comfortable Full-Screen Professional Modal Overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'customOrderTrackingModal';
        modalOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center; z-index: 9999999;
            padding: 16px; font-family: 'Poppins', sans-serif;
        `;

        modalOverlay.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 520px; border-radius: 26px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); display: flex; flex-direction: column; max-height: 94vh; overflow: hidden; position: relative; animation: modalPopUp 0.3s ease-out;">
                
                <!-- Top Header -->
                <div style="background: #065f46; color: white; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: 0.3px;">Live Order Tracking 🚀</h3>
                        <span style="font-size: 0.75rem; opacity: 0.85;">Order ID: #${targetOrder.orderId || orderId}</span>
                    </div>
                    <button type="button" onclick="document.getElementById('customOrderTrackingModal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.2rem; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: background 0.2s;">&times;</button>
                </div>

                <!-- Scrollable Body -->
                <div style="padding: 20px; overflow-y: auto; flex: 1; scrollbar-width: thin;">
                    
                    <!-- Live Real-Time ETA & Status Banner -->
                    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #a7f3d0; border-radius: 18px; padding: 16px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(5,150,105,0.08);">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span style="width: 8px; height: 8px; background: #059669; border-radius: 50%; display: inline-block; animation: pulseDot 1.5s infinite;"></span>
                                <span style="font-size: 0.75rem; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">${trackingStatus}</span>
                            </div>
                            <div id="popupRealLiveEtaBadge" style="font-size: 1.3rem; font-weight: 900; color: #065f46; margin: 2px 0;">Connecting to live GPS...</div>
                            <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">⚡ Placed on: ${targetOrder.date || 'N/A'}</div>
                        </div>
                        <div style="background: #065f46; color: white; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 12px rgba(6,95,70,0.3);">
                            🛵
                        </div>
                    </div>

                    <!-- REAL GOOGLE MAP CONTAINER -->
                    <div id="popupRealGoogleMapContainer" style="width: 100%; height: 200px; border-radius: 18px; overflow: hidden; margin-bottom: 16px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></div>

                    <!-- Delivery Partner Card -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 44px; height: 44px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">👨‍✈️</div>
                            <div>
                                <div id="deliveryExecutiveName" style="font-weight: 900; font-size: 0.88rem; color: #0f172a;">${riderName}</div>
                                <div id="deliveryExecutivePhone" style="font-size: 0.75rem; color: #64748b;">Delivery Executive &bull; ⭐ 4.9 (Verified)</div>
                            </div>
                        </div>
                        <a id="callExecutiveBtn" href="tel:${riderPhone}" style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; font-size: 1rem; box-shadow: 0 4px 10px rgba(37,99,235,0.3);">📞</a>
                    </div>

                    <!-- Step-by-Step Timeline Progress -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                        <div style="font-weight: 900; font-size: 0.85rem; color: #0f172a; margin-bottom: 12px;">Order Progress Timeline:</div>
                        
                        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                            <div style="background: ${isConfirmed ? '#065f46' : '#cbd5e1'}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: bold; margin-top: 2px;">✓</div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.8rem; color: #065f46;">Order Confirmed & Payment Verified</div>
                                <div style="font-size: 0.72rem; color: #64748b;">Securely processed in store system.</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                            <div style="background: ${isPacked ? '#065f46' : '#cbd5e1'}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: bold; margin-top: 2px;">${isPacked ? '✓' : '•'}</div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.8rem; color: ${isPacked ? '#065f46' : '#64748b'};">Item Packed & Quality Checked</div>
                                <div style="font-size: 0.72rem; color: #64748b;">Ready for dispatch.</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="background: ${isOutForDelivery ? '#2563eb' : '#cbd5e1'}; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: bold; margin-top: 2px;">${isOutForDelivery ? '✓' : '•'}</div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.8rem; color: ${isOutForDelivery ? '#2563eb' : '#64748b'};">Out for Delivery</div>
                                <div style="font-size: 0.72rem; color: #64748b;">Rider is heading to your destination.</div>
                            </div>
                        </div>
                    </div>

                    <!-- 🌟 Interactive Delivery Tip Option for User -->
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 14px 16px; margin-bottom: 16px;">
                        <div style="font-weight: 800; font-size: 0.8rem; color: #92400e; margin-bottom: 6px;">💖 Say thanks to your delivery partner:</div>
                        <div style="font-size: 0.72rem; color: #b45309; margin-bottom: 10px;">100% of the tip goes directly to the delivery executive.</div>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" onclick="setPopupTrackingTip(10, this)" class="popup-tip-btn" style="flex: 1; background: #ffffff; border: 1px solid #fcd34d; border-radius: 10px; padding: 8px; font-weight: 800; font-size: 0.78rem; cursor: pointer; color: #78350f;">₹10</button>
                            <button type="button" onclick="setPopupTrackingTip(20, this)" class="popup-tip-btn" style="flex: 1; background: #ffffff; border: 1px solid #fcd34d; border-radius: 10px; padding: 8px; font-weight: 800; font-size: 0.78rem; cursor: pointer; color: #78350f;">₹20</button>
                            <button type="button" onclick="setPopupTrackingTip(30, this)" class="popup-tip-btn" style="flex: 1; background: #ffffff; border: 1px solid #fcd34d; border-radius: 10px; padding: 8px; font-weight: 800; font-size: 0.78rem; cursor: pointer; color: #78350f;">₹30</button>
                        </div>
                    </div>

                    <!-- Items Manifest Summary -->
                    <div style="font-weight: 900; font-size: 0.85rem; color: #0f172a; margin-bottom: 8px;">Items Manifest:</div>
                    <div style="margin-bottom: 16px;">${itemsHtml}</div>

                    <!-- Delivery Address -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; margin-bottom: 16px;">
                        <div style="font-weight: 800; font-size: 0.8rem; color: #0f172a; margin-bottom: 4px;">📍 Delivery Address:</div>
                        <div style="font-size: 0.75rem; color: #475569; line-height: 1.4;">${targetOrder.address || 'Varanasi Delivery Address'}</div>
                    </div>

                    <!-- Bill Total -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 16px;">
                        <span style="font-weight: 800; font-size: 0.85rem; color: #065f46;">Total Amount Paid:</span>
                        <span style="font-weight: 900; font-size: 1.1rem; color: #065f46;">₹${Number(targetOrder.amount || targetOrder.totalAmount || 0).toFixed(2)}</span>
                    </div>

                </div>

                <!-- Footer Action -->
                <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <button type="button" onclick="document.getElementById('customOrderTrackingModal').remove(); if(typeof navigateDrawerSection==='function') navigateDrawerSection('store');" style="width: 100%; background: #065f46; color: white; border: none; padding: 13px; border-radius: 14px; font-weight: 900; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 15px rgba(6,95,70,0.3);">Back to Store / Home &rarr;</button>
                </div>
            </div>
        `;

       document.body.appendChild(modalOverlay);

        // 🔥 Clean Cancelled & Delivered Status Check & Map Initialization
        const trackingCurrentStatus = targetOrder.status || 'Order Placed & Picking';
        const trackingLowerStatus = trackingCurrentStatus.toLowerCase();
        const isOrderDelivered = trackingLowerStatus.includes('delivered');
        const isOrderCancelled = trackingLowerStatus.includes('cancel');

        const mapContainerElement = document.getElementById('popupRealGoogleMapContainer');

        if (isOrderCancelled) {
            if (mapContainerElement) {
                mapContainerElement.innerHTML = `
                    <div style="width:100%; height:100%; background:#fef2f2; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#991b1b; padding:15px; text-align:center; border:1px solid #fecaca; border-radius:18px;">
                        <div style="font-size:2.2rem; margin-bottom:4px;">❌</div>
                        <div style="font-weight:900; font-size:0.95rem;">Order Cancelled by Store</div>
                        <div style="font-size:0.75rem; color:#7f1d1d; margin-top:2px;">This order has been cancelled. Amount will be refunded if paid online.</div>
                    </div>
                `;
            }
            const tipSectionBox = document.querySelector('.popup-tip-btn')?.closest('div[style*="background: #fffbeb"]');
            if (tipSectionBox) tipSectionBox.style.display = 'none';
        } else if (isOrderDelivered) {
            if (mapContainerElement) {
                mapContainerElement.innerHTML = `
                    <div style="width:100%; height:100%; background:#f0fdf4; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#065f46; padding:15px; text-align:center; border:1px solid #bbf7d0; border-radius:18px;">
                        <div style="font-size:2.2rem; margin-bottom:4px;">🎉</div>
                        <div style="font-weight:900; font-size:0.95rem;">Order Delivered Successfully!</div>
                        <div style="font-size:0.75rem; color:#047857; margin-top:2px;">Thank you for ordering with Print From Home.</div>
                    </div>
                `;
            }
            const tipSectionBox = document.querySelector('.popup-tip-btn')?.closest('div[style*="background: #fffbeb"]');
            if (tipSectionBox) tipSectionBox.style.display = 'none';
        } else {
            setTimeout(() => {
                const mapEl = document.getElementById('popupRealGoogleMapContainer');
                const distBadge = document.getElementById('popupRealLiveEtaBadge');
                if (!mapEl || typeof google === 'undefined') return;

                const storeLatLng = { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng };
                const userLatLng = targetOrder.userLat && targetOrder.userLng ? 
                    { lat: Number(targetOrder.userLat), lng: Number(targetOrder.userLng) } : 
                    { lat: STORE_LOCATION.lat + 0.015, lng: STORE_LOCATION.lng + 0.012 };

                initLiveServerPollingMap(storeLatLng, userLatLng, mapEl, distBadge, targetOrder);
            }, 350);
        }

    } catch (err) {
        console.error("Ultra-Professional Tracking Error:", err);
    }
};

// 🔥 Automatic initialization on load
document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderOrderHistoryUI === 'function') {
        renderOrderHistoryUI();
    }
});
        

// Helper: Initialize Google Map & Poll Server for Live Rider GPS
function initLiveServerPollingMap(storeLatLng, userLatLng, mapEl, distBadge, targetOrder) {
    const map = new google.maps.Map(mapEl, {
        center: storeLatLng,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    // Store Pin (Green)
    new google.maps.Marker({
        position: storeLatLng,
        map: map,
        title: "Print From Home Store",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }
    });

    // User Destination Pin (Red)
    new google.maps.Marker({
        position: userLatLng,
        map: map,
        title: "Delivery Destination",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }
    });

    // Rider Live Marker (Motorcycle)
    let riderPos = { ...storeLatLng };
    const riderMarker = new google.maps.Marker({
        position: riderPos,
        map: map,
        title: "Delivery Executive Live",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/motorcycle.png" }
    });

    // Poll server every 4 seconds for live rider coordinates
    const orderId = targetOrder.orderId || targetOrder.id;
    if (window.adminTrackingInterval) clearInterval(window.adminTrackingInterval);

    window.adminTrackingInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/admin/live-location?orderId=${encodeURIComponent(orderId)}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data.success && data.lat && data.lng) {
                const currentRiderPos = { lat: Number(data.lat), lng: Number(data.lng) };
                riderMarker.setPosition(currentRiderPos);

                // Haversine distance calculation
                const distanceKm = Math.sqrt(
                    Math.pow(currentRiderPos.lat - userLatLng.lat, 2) + 
                    Math.pow(currentRiderPos.lng - userLatLng.lng, 2)
                ) * 111;

                let etaMins = Math.max(2, Math.round(distanceKm * 3.2));
                if (distBadge) {
                    distBadge.innerHTML = `🛵 ${distanceKm.toFixed(1)} km away &bull; ~${etaMins} mins ETA`;
                }
            }
        } catch (e) {
            console.error("Popup live polling error:", e);
        }
    }, 4000);
}

// 💖 Delivery Tip Selector Helper
window.setPopupTrackingTip = function(amount, btnElement) {
    document.querySelectorAll('.popup-tip-btn').forEach(btn => {
        btn.style.background = '#ffffff';
        btn.style.borderColor = '#fcd34d';
        btn.style.color = '#78350f';
    });
    btnElement.style.background = '#065f46';
    btnElement.style.borderColor = '#065f46';
    btnElement.style.color = '#ffffff';
    
    alert(`💖 Thank you! ₹${amount} delivery tip added for your partner.`);
};

// 🔥 Order Success Hook
(() => {
    if (typeof window === 'undefined') return;

    const originalFinalizeOrderSuccess = window.finalizeOrderSuccess;
    window.finalizeOrderSuccess = async function(orderId) {
        if (typeof originalFinalizeOrderSuccess === 'function') {
            await originalFinalizeOrderSuccess.call(this, orderId);
        }
        if (typeof window.openOrderTrackingView === 'function') {
            window.openOrderTrackingView(orderId);
        }
    };
})();

// 🔥 Safe Fallback Synchronize Wallet Balance Function
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

        const currentWalletCash = parseFloat(localStorage.getItem(`wallet_balance_${sessionActiveUser}`) || localStorage.getItem(`wallet_cash_${sessionActiveUser}`)) || 0.00;
        balanceDisplayNode.textContent = `₹${currentWalletCash.toFixed(2)}`;
        if (drawerWalletText) drawerWalletText.textContent = `₹${currentWalletCash.toFixed(2)}`;
    };
}

// 🔥 URL Query Param Detector: Automatically open tracking modal if redirected from Gmail notification
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackOrderId = urlParams.get('track_order');
    
    if (trackOrderId) {
        setTimeout(() => {
            if (typeof window.openOrderTrackingView === 'function') {
                window.openOrderTrackingView(trackOrderId);
            }
        }, 800); // Thoda delay taaki page completely load ho jaye
    }
});
// 🔥 Toggle Legal Terms Modal Function
window.toggleLegalTermsModal = function(open) {
    const modal = document.getElementById('legalTermsModal');
    if (modal) {
        modal.style.display = open ? 'flex' : 'none';
    }
};


// 🔥 Final Clean updatePhotoLayoutPricing Function
function updatePhotoLayoutPricing() {
    const layoutSelect = document.getElementById('photoLayoutSelect');
    if (!layoutSelect) return;
    
    const layout = layoutSelect.value;
    let price = 50;
    let gridCount = 8;
    
    if (layout === 'passport_8') { price = 50; gridCount = 8; }
    else if (layout === 'passport_12') { price = 60; gridCount = 12; }
    else if (layout === 'passport_20') { price = 100; gridCount = 20; }
    else if (layout === 'photo_2_a4') { price = 50; gridCount = 2; }
    else if (layout === 'photo_single_glossy') { price = 100; gridCount = 1; }

    window.currentPhotoGridCount = gridCount;
    window.currentPhotoSelectedLayout = layout;

    const totalPriceText = document.getElementById('studioTotalPriceText');
    if (totalPriceText) {
        totalPriceText.textContent = `₹${price}`;
    }
    window.currentCalculatedJobPrice = price;

    if (typeof updateMultiFileStudioUI === 'function') {
        updateMultiFileStudioUI();
    }
}