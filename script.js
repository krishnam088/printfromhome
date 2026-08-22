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

   // 🌍 STORE EXACT LOCATION CONFIG (Pandeypur, Varanasi - Hidden from public address text)
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
            fileRow.className = 'blinkit-file-card';
            fileRow.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);";

            const activeColorBw = item.config.printType === 'bw' ? 'active' : '';
            const activeColorCol = item.config.printType === 'color' ? 'active' : '';
            const activeOriPort = item.config.orientation === 'portrait' ? 'active' : '';
            const activeOriLand = item.config.orientation === 'landscape' ? 'active' : '';

            fileRow.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 8px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; cursor:pointer;" onclick="previewFileInA4Studio(${index})">
                        <span style="font-size: 1.1rem;">📄</span>
                        <div>
                            <h4 style="font-weight: 700; font-size: 0.85rem; color: #1a202c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${item.name}">${item.name}</h4>
                            <span style="font-size:0.68rem; color:var(--blinkit-green); font-weight:700;">👁️ Tap to View A4 Preview</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="add-more-inline-card-btn" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; cursor: pointer;" onclick="triggerInlineFileUploadClick()">+ Add More</button>
                        <button type="button" id="removeFile_${index}" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; width: 24px; height: 24px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">&times;</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; margin-bottom: 12px; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 0.7rem; font-weight: 700; color: #4a5568;">Total Pages:</label>
                        <input type="number" id="pages_${index}" min="1" value="${item.config.pages}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; background: #f8fafc; outline: none;" required>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 0.7rem; font-weight: 700; color: #4a5568;">Copies:</label>
                        <div class="blinkit-stepper" style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2px 8px; height: 32px;">
                            <button type="button" id="minusCopy_${index}" class="stepper-btn" style="background: none; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: #334155;">-</button>
                            <span id="copyCountLabel_${index}" style="font-weight: 700; font-size: 0.8rem; color: #0f172a;">${item.config.copies}</span>
                            <button type="button" id="plusCopy_${index}" class="stepper-btn" style="background: none; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: #334155;">+</button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <p style="font-size: 0.7rem; font-weight: 700; color: #4a5568; margin-bottom: 6px;">Print Color</p>
                    <div class="blinkit-grid-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="blinkit-option-box ${activeColorCol}" id="optColor_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeColorCol ? '#16a34a' : '#cbd5e1'}; background: ${activeColorCol ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">🎨</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Coloured</span><span style="font-size: 0.65rem; color: #64748b;">₹10/pg</span></div>
                        </div>
                        <div class="blinkit-option-box ${activeColorBw}" id="optBw_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeColorBw ? '#16a34a' : '#cbd5e1'}; background: ${activeColorBw ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">🌑</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">B & W</span><span style="font-size: 0.65rem; color: #64748b;">₹3/pg</span></div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <p style="font-size: 0.7rem; font-weight: 700; color: #4a5568; margin-bottom: 6px;">Orientation</p>
                    <div class="blinkit-grid-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="blinkit-option-box ${activeOriPort}" id="optPort_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeOriPort ? '#16a34a' : '#cbd5e1'}; background: ${activeOriPort ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">📱</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Portrait</span></div>
                        </div>
                        <div class="blinkit-option-box ${activeOriLand}" id="optLand_${index}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid ${activeOriLand ? '#16a34a' : '#cbd5e1'}; background: ${activeOriLand ? '#f0fdf4' : '#f8fafc'}; border-radius: 8px; cursor: pointer;">
                            <div style="font-size: 1rem;">💻</div>
                            <div style="display: flex; flex-direction: column;"><span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">Landscape</span></div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #334155;">Binding Option:</label>
                    <select id="binding_${index}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 600; background: #ffffff; outline: none;">
                        <option value="none" ${item.config.binding === 'none' ? 'selected' : ''}>No Binding</option>
                        <option value="staple" ${item.config.binding === 'staple' ? 'selected' : ''}>Stapled (Free)</option>
                        <option value="spiral" ${item.config.binding === 'spiral' ? 'selected' : ''}>Spiral (+₹30)</option>
                    </select>
                </div>
            `;
            multiFilesContainer.appendChild(fileRow);

            document.getElementById(`optColor_${index}`).addEventListener('click', () => { item.config.printType = 'color'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optBw_${index}`).addEventListener('click', () => { item.config.printType = 'bw'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optPort_${index}`).addEventListener('click', () => { item.config.orientation = 'portrait'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`optLand_${index}`).addEventListener('click', () => { item.config.orientation = 'landscape'; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`plusCopy_${index}`).addEventListener('click', () => { item.config.copies++; saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`minusCopy_${index}`).addEventListener('click', () => { if (item.config.copies > 1) { item.config.copies--; saveCurrentFilesToSession(); renderFilesUI(); } });
            document.getElementById(`removeFile_${index}`).addEventListener('click', () => { masterFilesArray.splice(index, 1); saveCurrentFilesToSession(); renderFilesUI(); });
            document.getElementById(`pages_${index}`).addEventListener('input', (e) => { item.config.pages = parseInt(e.target.value) || 1; saveCurrentFilesToSession(); calculateTotal(); });
            document.getElementById(`binding_${index}`).addEventListener('change', (e) => { item.config.binding = e.target.value; saveCurrentFilesToSession(); calculateTotal(); });
        });
        calculateTotal();
        updateFloatingCartBar();
    }

    if(fileUpload) {
        fileUpload.addEventListener('change', async () => {
            if (fileUpload.files.length === 0) return;
            
            for (const file of Array.from(fileUpload.files)) {
                if (!masterFilesArray.some(f => f.name === file.name && f.size === file.size)) {
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

                    masterFilesArray.push({ 
                        name: file.name, 
                        size: file.size, 
                        type: file.type, 
                        fileData: file, 
                        config: { 
                            pages: pageCount, 
                            printType: 'bw', 
                            orientation: 'portrait', 
                            binding: 'none', 
                            copies: 1 
                        } 
                    });
                }
            }
            fileUpload.value = ''; 
            saveCurrentFilesToSession(); 
            renderFilesUI();
        });
    }

    window.triggerInlineFileUploadClick = function() {
        if(fileUpload) fileUpload.click();
    };

    window.previewFileInA4Studio = function(index) {
        if (masterFilesArray[index] && masterFilesArray[index].fileData) {
            window.openDocumentInA4Studio(masterFilesArray[index].fileData, masterFilesArray[index].name);
        } else {
            alert("⚠️ Please re-upload the document to open A4 interactive studio.");
        }
    };

    const printForm = document.getElementById('printForm');
    if(printForm) {
        printForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (masterFilesArray.length === 0) {
                alert("⚠️ Please upload at least one valid document to add to cart.");
                return;
            }

            masterFilesArray.forEach(item => {
                window.cartPrintJobsArray.push({
                    fileName: item.name,
                    pages: parseInt(item.config.pages) || 1,
                    printType: item.config.printType,
                    sides: item.config.orientation === 'portrait' ? 'single' : 'landscape',
                    binding: item.config.binding,
                    copies: parseInt(item.config.copies) || 1,
                    orientation: item.config.orientation,
                    fileData: item.fileData
                });
            });

            persistCartStateData();
            alert("🎉 Print job(s) successfully added to Cart!");
            masterFilesArray = [];
            sessionStorage.removeItem('savedPrintFiles');
            printForm.reset();
            if(multiFilesContainer) multiFilesContainer.innerHTML = '';
            refreshInvoiceTabState();
            calculateTotal();
            toggleCartDrawer(true);
        });
    }

    // 🔥 A4 STUDIO PREVIEW ENGINE
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

            card.innerHTML = `
                ${imgHtml}
                <div style="font-weight:700; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-bottom:2px;">${prod.name}</div>
                <div style="font-weight:800; font-size:0.8rem; color:#065f46; margin-bottom:8px;">₹${prod.sellingPrice || 0}</div>
                ${isOutOfStock 
                    ? `<button type="button" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; width:100%; cursor:pointer;" disabled>Out of Stock</button>`
                    : `<button type="button" style="background:#065f46; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:0.75rem; font-weight:800; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${prod.sku}', '${prod.name}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${finalImgUrl}'); closeSearchOverlay();">+ Add</button>`
                }
            `;
            grid.appendChild(card);
        });
    };

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
        renderStoreProductsUI();
    };

    window.filterStoreBySearchInput = function(query) {
        window.currentStoreSearchQuery = query.toLowerCase().trim();
        renderStoreProductsUI();
    };

    function renderStoreProductsUI() {
        const gridContainers = document.querySelectorAll('.snacks-horizontal-slider');
        if (gridContainers.length === 0) return;

        gridContainers.forEach(container => {
            container.style.display = 'flex';
            container.style.flexWrap = 'nowrap';
            container.style.overflowX = 'auto';
            container.style.gap = '12px';
            container.style.padding = '10px 4px';
            container.style.width = '100%';
            container.style.scrollbarWidth = 'none';

            container.innerHTML = '';

            if (!window.storeInventoryProducts || window.storeInventoryProducts.length === 0) {
                container.innerHTML = `<p style="font-size:0.75rem; color:#64748b; padding:10px; grid-column: 1 / -1; text-align:center;">No store products available currently.</p>`;
                return;
            }

            let filteredProducts = window.storeInventoryProducts.filter(prod => {
                let nameMatch = (prod.name || '').toLowerCase().includes(window.currentStoreSearchQuery);
                let categoryLower = (prod.category || prod.type || '').toLowerCase();
                
                let matchesCategory = true;
                if (window.currentStoreSelectedCategory === 'munchies') {
                    matchesCategory = categoryLower.includes('munchies') || categoryLower.includes('chips') || categoryLower.includes('namkeen') || (prod.name || '').toLowerCase().includes('lays') || (prod.name || '').toLowerCase().includes('kurkure');
                } else if (window.currentStoreSelectedCategory === 'snacks') {
                    matchesCategory = categoryLower.includes('snacks') || categoryLower.includes('food') || categoryLower.includes('beverage');
                } else if (window.currentStoreSelectedCategory === 'socks') {
                    matchesCategory = categoryLower.includes('socks') || categoryLower.includes('apparel') || categoryLower.includes('clothing') || (prod.name || '').toLowerCase().includes('sock');
                }

                return nameMatch && matchesCategory;
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
                    if (typeof openProductDetailModal === 'function') {
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
    };

  // 🔥 ENHANCED USER PRODUCT DETAIL MODAL WITH MULTI-IMAGE SLIDER & SCROLLABLE DESCRIPTION
window.openProductDetailModal = function(prod) {
    let modal = document.getElementById('productDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productDetailModal';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:999999; display:none; align-items:center; justify-content:center; padding:16px;";
        modal.innerHTML = `
            <div style="background:white; border-radius:20px; width:100%; max-width:400px; max-height:85vh; overflow-y:auto; padding:20px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-family:'Poppins',sans-serif;">
                <span onclick="closeProductDetailModal()" style="position:absolute; top:12px; right:16px; font-size:1.4rem; cursor:pointer; font-weight:bold; color:#64748b; z-index:10;">&times;</span>
                
                <!-- Image Slider Container (Supports Multiple Images) -->
                <div id="modalImageSliderContainer" style="position:relative; width:100%; height:200px; background:#f8fafc; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:14px;"></div>

                <h3 id="modalProductName" style="font-size:1.1rem; font-weight:800; color:#0f172a; margin-bottom:4px;"></h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span id="modalProductPrice" style="font-size:1rem; font-weight:900; color:#065f46;"></span>
                    <span id="modalProductStock" style="font-size:0.75rem; font-weight:700; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px;"></span>
                </div>

                <!-- Scrollable Description Section -->
                <div style="margin-bottom:16px;">
                    <h4 style="font-size:0.78rem; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:4px;">Product Details</h4>
                    <div id="modalProductDescriptionBox" style="font-size:0.82rem; color:#334155; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; max-height:100px; overflow-y:auto; line-height:1.4;">No additional description available.</div>
                </div>

                <div id="modalActionArea">
                    <button type="button" id="modalAddToCartBtn" style="width:100%; padding:12px; background:#065f46; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:pointer;">+ Add to Cart</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const nameEl = document.getElementById('modalProductName');
    const priceEl = document.getElementById('modalProductPrice');
    const stockEl = document.getElementById('modalProductStock');
    const sliderContainer = document.getElementById('modalImageSliderContainer');
    const descBox = document.getElementById('modalProductDescriptionBox');
    const addBtn = document.getElementById('modalAddToCartBtn');

    if (nameEl) nameEl.textContent = prod.name;
    if (priceEl) priceEl.textContent = `₹${prod.sellingPrice || 0}`;
    if (stockEl) stockEl.textContent = prod.stockQuantity > 0 ? `Stock: ${prod.stockQuantity} units` : `Out of Stock`;
    if (descBox) descBox.textContent = prod.description ? prod.description : "No additional description available for this product.";

    // Handle Images Slider (Array of images or single image)
    let imagesList = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
        imagesList = prod.images;
    } else if (prod.imageUrl) {
        imagesList = [prod.imageUrl];
    } else if (prod.image) {
        imagesList = [prod.image];
    }

    if (imagesList.length > 0) {
        sliderContainer.innerHTML = `
            <div id="sliderTrack" style="display:flex; width:100%; height:100%; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none;">
                ${imagesList.map((imgUrl) => `
                    <div style="min-width:100%; height:100%; display:flex; align-items:center; justify-content:center; scroll-snap-align:center;">
                        <img src="${imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                    </div>
                `).join('')}
            </div>
            ${imagesList.length > 1 ? `
                <div style="position:absolute; bottom:8px; background:rgba(0,0,0,0.6); color:white; padding:2px 8px; border-radius:10px; font-size:0.65rem; font-weight:700;">
                    Swipe for more (${imagesList.length} photos)
                </div>
            ` : ''}
        `;
    } else {
        sliderContainer.innerHTML = `<span style="font-size:3.5rem;">📦</span>`;
    }

    let existing = window.cartSnacksArray ? window.cartSnacksArray.find(item => item.sku === prod.sku || item.name === prod.name) : null;
    let currentQty = existing ? existing.qty : 0;
    let primaryImg = imagesList.length > 0 ? imagesList[0] : '';

    if (prod.stockQuantity <= 0) {
        if (addBtn) addBtn.outerHTML = `<button type="button" style="width:100%; padding:12px; background:#ef4444; color:white; border:none; border-radius:12px; font-weight:800; font-size:0.9rem; cursor:not-allowed;" disabled>Out of Stock</button>`;
    } else {
        if (addBtn) {
            addBtn.outerHTML = `
                <div id="modalActionArea" style="display:flex; align-items:center; justify-content:space-between; width:100%; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:6px 12px;">
                    <span style="font-weight:700; font-size:0.85rem; color:#0f172a;">Quantity:</span>
                    <div style="display:flex; align-items:center; gap:14px;">
                        <button type="button" onclick="adjustModalItemQty('${prod.sku || prod.name}', -1, ${prod.stockQuantity}, ${prod.sellingPrice || 0}, '${prod.name}', '${primaryImg}')" style="width:34px; height:34px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">-</button>
                        <span id="modalItemQtyVal" style="font-weight:800; font-size:1rem; color:#065f46;">${currentQty}</span>
                        <button type="button" onclick="adjustModalItemQty('${prod.sku || prod.name}', 1, ${prod.stockQuantity}, ${prod.sellingPrice || 0}, '${prod.name}', '${primaryImg}')" style="width:34px; height:34px; background:#065f46; color:white; border:none; border-radius:8px; font-weight:bold; font-size:1.1rem; cursor:pointer;">+</button>
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

        // Auto-close cart drawer if empty
        if (totalCount === 0 && drawerOverlay && drawerOverlay.style.display === 'flex') {
            toggleCartDrawer(false);
        }

        if (!sessionActiveUser || isAuthVisible || !isStoreActive || totalCount === 0 || (drawerOverlay && drawerOverlay.style.display === 'flex')) {
            bar.classList.add('hidden');
            bar.style.display = 'none';
            return;
        }

        let totalSnacksPrice = window.cartSnacksArray.reduce((acc, item) => acc + (item.price * item.qty), 0);
        let totalPrintPrice = window.cartPrintJobsArray.reduce((acc, job) => acc + (job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0)), 0);
        
        let subtotalCalc = totalSnacksPrice + totalPrintPrice;
        let delFee = (subtotalCalc >= 99.00 || subtotalCalc === 0) ? 0.00 : 25.00;
        let rainFee = window.isRainSurgeActive ? 15 : 0;
        let totalPrice = subtotalCalc + delFee + rainFee + (window.currentDeliveryTip || 0);

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

    // 🔥 THE DEFINITIVE CART DRAWER RENDERER WITH VERTICAL LIST & UPSELLING SLIDER
    window.renderCartDrawerContents = function() {
        const container = document.getElementById('cartDrawerItemsList');
        if (!container) return;

        container.innerHTML = '';
        
        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

        let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
        
        if (!hasItems) {
            container.innerHTML = `<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:15px;">Your cart is empty.</p>`;
            calculateTotal();
            toggleCartDrawer(false);
            return;
        }

        const verticalListWrapper = document.createElement('div');
        verticalListWrapper.style.cssText = "display:flex; flex-direction:column; gap:12px; width:100%;";

        // Render Store Products / Snacks in Cart
        window.cartSnacksArray.forEach((snack, idx) => {
            const card = document.createElement('div');
            card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:12px;";
            
            const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:45px; height:45px; object-fit:cover; border-radius:10px;" />` : `<div style="font-size:1.8rem; width:45px; height:45px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px;">📦</div>`;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    ${thumbImg}
                    <div style="overflow:hidden;">
                        <div title="${snack.name}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snack.name}</div>
                        <div style="font-size:0.72rem; color:#059669; font-weight:800; margin-top:2px;">₹${snack.price * snack.qty} <span style="color:#64748b; font-weight:500;">(₹${snack.price} ea)</span></div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:2px 6px; gap:8px;">
                        <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#0f172a;">-</button>
                        <span style="font-weight:800; font-size:0.82rem; color:#0f172a;">${snack.qty}</span>
                        <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#065f46;">+</button>
                    </div>
                    <button type="button" onclick="removeSnackItemCompletely(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px; font-size:0.75rem; cursor:pointer;" title="Remove Item">🗑️</button>
                </div>
            `;
            verticalListWrapper.appendChild(card);
        });

        // Render Print Jobs in Cart
        window.cartPrintJobsArray.forEach((job, idx) => {
            const card = document.createElement('div');
            card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:12px;";
            
            let jobTotal = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    <div style="font-size:1.8rem; width:45px; height:45px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px;">📄</div>
                    <div style="overflow:hidden;">
                        <div title="${job.fileName}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.fileName}</div>
                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; margin-top:2px;">${job.pages} pgs | ${job.printType.toUpperCase()} | Copies: ${job.copies}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-weight:800; font-size:0.82rem; color:#065f46;">₹${jobTotal}</div>
                    <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px; font-size:0.75rem; cursor:pointer;" title="Remove Print Job">🗑️</button>
                </div>
            `;
            verticalListWrapper.appendChild(card);
        });

        container.appendChild(verticalListWrapper);

        // 🔥 UPSELLING SECTION: If inventory products are loaded, display them
        const upsellingSection = document.createElement('div');
        upsellingSection.style.cssText = "margin-top: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px;";
        upsellingSection.innerHTML = `
            <h4 style="font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase;">⚡ Quick Add Store Items (Boost Sales)</h4>
            <div id="cartDrawerUpsellingGrid" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;"></div>
        `;
        container.appendChild(upsellingSection);

        const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
        if (upsellingGrid) {
            if (window.storeInventoryProducts && window.storeInventoryProducts.length > 0) {
                upsellingGrid.innerHTML = '';
                window.storeInventoryProducts.forEach(prod => {
                    if (prod.stockQuantity > 0) {
                        const thumb = prod.imageUrl || prod.image || '';
                        const itemCard = document.createElement('div');
                        itemCard.style.cssText = "min-width: 90px; width: 90px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
                        itemCard.innerHTML = `
                            ${thumb ? `<img src="${thumb}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; margin-bottom:4px;" />` : '<div style="font-size:1.5rem; margin-bottom:4px;">📦</div>'}
                            <div title="${prod.name}" style="font-size:0.68rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${prod.name}</div>
                            <div style="font-size:0.68rem; font-weight:800; color:#065f46; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                            <button type="button" style="background:#065f46; color:white; border:none; padding:3px 6px; border-radius:6px; font-size:0.65rem; font-weight:700; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${prod.sku || prod.name}', '${prod.name}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${thumb}')">+ Add</button>
                        `;
                        upsellingGrid.appendChild(itemCard);
                    }
                });
            } else {
                upsellingGrid.innerHTML = `<p style="font-size:0.75rem; color:#64748b; text-align:center; padding:10px;">Loading store products...</p>`;
            }
        }
        
        if (typeof calculateTotal === 'function') {
            calculateTotal();
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

    // 🔥 ADDRESS MANAGEMENT SYSTEM
    window.loadUserAddressesFromStorage = function() {
        const raw = localStorage.getItem('saved_addresses');
        if (raw) {
            try { window.savedUserAddresses = JSON.parse(raw); } catch(e) { window.savedUserAddresses = []; }
        }
        if (window.savedUserAddresses.length > 0 && !selectedActiveAddress) {
            selectedActiveAddress = localStorage.getItem('selected_active_address') || window.savedUserAddresses[0];
        }
        renderSavedAddressesUI();
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
        const paymentMode = selectedPaymentRadio ? selectedPaymentRadio.value : 'online';
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
        };

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
        const container = document.getElementById('cartDrawerItemsList');
        if (!container) return;

        container.innerHTML = '';
        
        window.cartSnacksArray = JSON.parse(localStorage.getItem('cart_snacks') || '[]');
        window.cartPrintJobsArray = JSON.parse(localStorage.getItem('cart_print_jobs') || '[]');

        let hasItems = (window.cartSnacksArray.length > 0) || (window.cartPrintJobsArray.length > 0);
        
        if (!hasItems) {
            container.innerHTML = `<p style="font-size:0.8rem; color:#64748b; text-align:center; padding:15px;">Your cart is empty.</p>`;
            calculateTotal();
            toggleCartDrawer(false);
            return;
        }

        const verticalListWrapper = document.createElement('div');
        verticalListWrapper.style.cssText = "display:flex; flex-direction:column; gap:12px; width:100%;";

        // Render Store Products / Snacks in Cart
        window.cartSnacksArray.forEach((snack, idx) => {
            const card = document.createElement('div');
            card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:12px;";
            
            const thumbImg = snack.imageUrl ? `<img src="${snack.imageUrl}" style="width:45px; height:45px; object-fit:cover; border-radius:10px;" />` : `<div style="font-size:1.8rem; width:45px; height:45px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px;">📦</div>`;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    ${thumbImg}
                    <div style="overflow:hidden;">
                        <div title="${snack.name}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snack.name}</div>
                        <div style="font-size:0.72rem; color:#059669; font-weight:800; margin-top:2px;">₹${snack.price * snack.qty} <span style="color:#64748b; font-weight:500;">(₹${snack.price} ea)</span></div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:flex; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:2px 6px; gap:8px;">
                        <button type="button" onclick="adjustSnackQty(${idx}, -1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#0f172a;">-</button>
                        <span style="font-weight:800; font-size:0.82rem; color:#0f172a;">${snack.qty}</span>
                        <button type="button" onclick="adjustSnackQty(${idx}, 1)" style="background:none; border:none; font-weight:bold; font-size:1rem; cursor:pointer; color:#065f46;">+</button>
                    </div>
                    <button type="button" onclick="removeSnackItemCompletely(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px; font-size:0.75rem; cursor:pointer;" title="Remove Item">🗑️</button>
                </div>
            `;
            verticalListWrapper.appendChild(card);
        });

        // Render Print Jobs in Cart
        window.cartPrintJobsArray.forEach((job, idx) => {
            const card = document.createElement('div');
            card.style.cssText = "background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:12px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 6px rgba(0,0,0,0.02); gap:12px;";
            
            let jobTotal = job.pages * (job.printType === 'bw' ? 3 : 10) * job.copies + (job.binding === 'spiral' ? 30 * job.copies : 0);

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    <div style="font-size:1.8rem; width:45px; height:45px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px;">📄</div>
                    <div style="overflow:hidden;">
                        <div title="${job.fileName}" style="font-weight:700; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.fileName}</div>
                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; margin-top:2px;">${job.pages} pgs | ${job.printType.toUpperCase()} | Copies: ${job.copies}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-weight:800; font-size:0.82rem; color:#065f46;">₹${jobTotal}</div>
                    <button type="button" onclick="removePrintJobFromCart(${idx})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px; font-size:0.75rem; cursor:pointer;" title="Remove Print Job">🗑️</button>
                </div>
            `;
            verticalListWrapper.appendChild(card);
        });

        container.appendChild(verticalListWrapper);

        // 🔥 UPSELLING SECTION
        const upsellingSection = document.createElement('div');
        upsellingSection.style.cssText = "margin-top: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px;";
        upsellingSection.innerHTML = `
            <h4 style="font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:8px; text-transform:uppercase;">⚡ Quick Add Store Items (Boost Sales)</h4>
            <div id="cartDrawerUpsellingGrid" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;"></div>
        `;
        container.appendChild(upsellingSection);

        const upsellingGrid = document.getElementById('cartDrawerUpsellingGrid');
        if (upsellingGrid) {
            if (window.storeInventoryProducts && window.storeInventoryProducts.length > 0) {
                upsellingGrid.innerHTML = '';
                window.storeInventoryProducts.forEach(prod => {
                    if (prod.stockQuantity > 0) {
                        const thumb = prod.imageUrl || prod.image || '';
                        const itemCard = document.createElement('div');
                        itemCard.style.cssText = "min-width: 90px; width: 90px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
                        itemCard.innerHTML = `
                            ${thumb ? `<img src="${thumb}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; margin-bottom:4px;" />` : '<div style="font-size:1.5rem; margin-bottom:4px;">📦</div>'}
                            <div title="${prod.name}" style="font-size:0.68rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${prod.name}</div>
                            <div style="font-size:0.68rem; font-weight:800; color:#065f46; margin:2px 0 6px 0;">₹${prod.sellingPrice || 0}</div>
                            <button type="button" style="background:#065f46; color:white; border:none; padding:3px 6px; border-radius:6px; font-size:0.65rem; font-weight:700; width:100%; cursor:pointer;" onclick="addDynamicProductToCart('${prod.sku || prod.name}', '${prod.name}', ${prod.sellingPrice || 0}, ${prod.stockQuantity}, '${thumb}')">+ Add</button>
                        `;
                        upsellingGrid.appendChild(itemCard);
                    }
                });
            } else {
                upsellingGrid.innerHTML = `<p style="font-size:0.75rem; color:#64748b; text-align:center; padding:10px;">Loading store products...</p>`;
            }
        }
        
        if (typeof calculateTotal === 'function') {
            calculateTotal();
        }
    };
});