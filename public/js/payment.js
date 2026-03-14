/**
 * Zenith Assets - Manual Deposit Handler
 * Users deposit by sending money to the admin mobile money number
 */

// Deposit function - shows manual payment instructions
function initiateDeposit() {
    const amt = document.getElementById('deposit-amount').value;
    const phone = document.getElementById('login-phone')?.value || '';

    if (!amt || amt < 1000) {
        alert("Minimum deposit is UGX 1,000");
        return;
    }

    // Show manual deposit instructions
    const depositMessage = `DEPOSIT INSTRUCTIONS:\n\n` +
        `Send UGX ${parseInt(amt).toLocaleString()} to:\n` +
        `📱 0749846848 (KABALI MADINA)\n\n` +
        `Network: Airtel Money\n` +
        `After sending, contact admin to confirm your deposit.\n\n` +
        `Your deposit will be credited manually within 24 hours.`;

    alert(depositMessage);
    
    // Optionally open phone dialer
    if (confirm("Would you like to open your phone dialer to send money?")) {
        window.location.href = "tel:*185*8*6*1*74846848*AMOUNT#";
    }
}

// Legacy function name for compatibility
async function initiateYoPayment() {
    initiateDeposit();
}

// Show toast notification
function showToast(message) {
    console.log(message);
}
