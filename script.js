document.addEventListener('DOMContentLoaded', () => {
    // Stage Containers & Elements
    const fileUpload = document.getElementById('fileUpload');
    const multiFilesContainer = document.getElementById('multiFilesContainer');
    const uploadScreenInitialState = document.getElementById('uploadScreenInitialState');
    const configurationScreenState = document.getElementById('configurationScreenState');
    const btnSubmit = document.getElementById('submitOrderBtn');

    let masterFilesArray = [];

    // --- 🛡️ STORE STATUS & ADMIN TOGGLE ---
    window.toggleStoreStatus = function() {
        const isClosed = localStorage.getItem('manual_store_close') === 'true';
        localStorage.setItem('manual_store_close', (!isClosed).toString());
        alert(!isClosed ? "🛑 Store Band kar diya gaya!" : "✅ Store Khul gaya!");
        window.location.reload(); 
    };

    function runSilentIntradaySchedulerGuard() {
        const isManuallyClosed = localStorage.getItem('manual_store_close') === 'true';
        const now = new Date();
        const hoursIST = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(now));
        const isOpen = (hoursIST >= 7 && hoursIST < 24) && !isManuallyClosed;

        const badge = document.getElementById('userShopStatus');
        const btn = document.getElementById('submitOrderBtn');
        
        if(badge) {
            badge.textContent = isOpen ? "OPEN 🟢" : "CLOSED 🔴";
            badge.className = isOpen ? "shop-status-text-badge open" : "shop-status-text-badge closed";
        }
        if(btn) {
            btn.disabled = !isOpen;
            btn.style.opacity = isOpen ? "1" : "0.5";
            btn.textContent = isOpen ? "Proceed to Payment" : "❌ Store is Closed";
        }
    }
    
    setInterval(runSilentIntradaySchedulerGuard, 2000);
    window.addEventListener('load', runSilentIntradaySchedulerGuard);

    // --- 🖨️ FILE UPLOAD & COMPACT GRID ENGINE ---
    window.triggerInlineFileUploadClick = function() {
        document.getElementById('fileUpload').click();
    }

    if(fileUpload) {
        fileUpload.addEventListener('change', function() {
            if(this.files.length === 0) return;
            Array.from(this.files).forEach(file => {
                masterFilesArray.push({ name: file.name, config: { pages: 1, copies: 1 } });
            });
            renderFilesUI();
        });
    }

    window.renderFilesUI = function() {
        if(!multiFilesContainer) return;
        multiFilesContainer.innerHTML = '';
        masterFilesArray.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'blinkit-file-card';
            card.innerHTML = `
                <div class="blinkit-card-row">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h4 style="font-size:0.85rem;">📄 ${item.name}</h4>
                        <button class="add-more-inline-card-btn" onclick="triggerInlineFileUploadClick()">+ Add More</button>
                    </div>
                    <button onclick="masterFilesArray.splice(${index}, 1); renderFilesUI();" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>
                </div>
            `;
            multiFilesContainer.appendChild(card);
        });

        // Screen Diversion
        if(uploadScreenInitialState) uploadScreenInitialState.classList.add('hidden');
        if(configurationScreenState) configurationScreenState.classList.remove('hidden');
    }

    window.forceReturnToUploadView = function() {
        masterFilesArray = [];
        if(uploadScreenInitialState) uploadScreenInitialState.classList.remove('hidden');
        if(configurationScreenState) configurationScreenState.classList.add('hidden');
    }
});