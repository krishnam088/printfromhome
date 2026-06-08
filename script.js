document.addEventListener('DOMContentLoaded', () => {
    const pagesInput = document.getElementById('pages');
    const printTypeInput = document.getElementById('printType');
    const bindingInput = document.getElementById('binding');
    const printForm = document.getElementById('printForm');

    // Price configuration elements
    const summaryPrint = document.getElementById('summaryPrint');
    const summaryBinding = document.getElementById('summaryBinding');
    const summaryDelivery = document.getElementById('summaryDelivery');
    const summaryTotal = document.getElementById('summaryTotal');

    const DELIVERY_CHARGE = 40.00;

    function calculateTotal() {
        const pages = parseInt(pagesInput.value) || 1;
        const printType = printTypeInput.value;
        const binding = bindingInput.value;

        // 1. Calculate print cost
        let perPageRate = (printType === 'bw') ? 2.00 : 10.00;
        let printCost = pages * perPageRate;

        // 2. Calculate binding cost
        let bindingCost = 0;
        if (binding === 'spiral') bindingCost = 30.00;
        if (binding === 'soft') bindingCost = 50.00;

        // 3. Total calculation
        let total = printCost + bindingCost + DELIVERY_CHARGE;

        // Update UI
        summaryPrint.textContent = `₹${printCost.toFixed(2)}`;
        summaryBinding.textContent = `₹${bindingCost.toFixed(2)}`;
        summaryDelivery.textContent = `₹${DELIVERY_CHARGE.toFixed(2)}`;
        summaryTotal.textContent = `₹${total.toFixed(2)}`;
    }

    // Event listeners to recalculate dynamically
    pagesInput.addEventListener('input', calculateTotal);
    printTypeInput.addEventListener('change', calculateTotal);
    bindingInput.addEventListener('change', calculateTotal);

    // Form submission simulation
    printForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Form submitted! Redirecting to payment gateway integration...');
    });
});