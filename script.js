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
        summaryDelivery.textContent = `₹${total.toFixed(2)}`; // Total value passes to backend
    }

    // Event listeners to recalculate dynamically
    pagesInput.addEventListener('input', calculateTotal);
    printTypeInput.addEventListener('change', calculateTotal);
    bindingInput.addEventListener('change', calculateTotal);

    // 🔥 REAL RAZORPAY PAYMENT GATEWAY INTEGRATION
    printForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Total price text se sirf number nikalne ke liye
        const totalAmountText = summaryTotal.textContent.replace('₹', '');
        
        // Form ka saara data akatha karo (file ke sath)
        const formData = new FormData(printForm);
        formData.append('totalAmount', totalAmountText);

        try {
            // 1. Backend server se Order ID mango
            const response = await fetch('/api/create-order', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!data.success) {
                alert('Order create karne mein dikkat aayi bhai!');
                return;
            }

            // 2. Razorpay Gateway Options Setup karo
            const options = {
                "key": data.key_id, 
                "amount": data.amount, 
                "currency": "INR",
                "name": "Blinkit Print From Home",
                "description": "Document Printing Charges",
                "order_id": data.order_id, 
                "handler": async function (response){
                    // Payment successful hone par backend ko inform karo
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
                        calculateTotal();
                    }
                },
                "theme": {
                    "color": "#F4C430" // Blinkit Yellow Theme 💛
                }
            };

            // 3. Razorpay Popup Window Kholo
            const rzp1 = new Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error("Payment Error:", error);
            alert("Server se connect nahi ho paa raha hai bhai!");
        }
    });
});