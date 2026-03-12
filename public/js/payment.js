/**
 * Zenith Assets - Payment Handler
 * Initiates PesaPal payment for deposits
 */

// Replacement function for initiatePesaPal inside index.html
async function initiatePesaPal() {
    const amt = document.getElementById('deposit-amount').value;
    const phone = document.getElementById('login-phone').value;

    if (amt < 10000) return alert("Min deposit is UGX 10,000");
    
    showToast("🔗 Securing Connection...");

    try {
        // We talk to OUR server, not PesaPal directly (Security!)
        const response = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amt, phone: phone })
        });

        const data = await response.json();

        if (data.redirect_url) {
            showToast("Redirecting to MoMo Gateway...");
            window.location.href = data.redirect_url; // Direct user to PesaPal Payment Page
        } else {
            console.error('Payment response:', data);
            alert("Error creating payment link: " + (data.error || JSON.stringify(data)));
        }
    } catch (e) {
        console.error('Payment error:', e);
        alert("Server Offline. Start the Node.js server first!");
    }
}
