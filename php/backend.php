<?php
/**
 * Zenith Assets - PHP Backend (Alternative)
 * Secure Backend for Yo! Payments (Airtel Uganda) - NEW API
 */

// Yo! Payments Configuration - Set these in your environment or here
$consumer_key = getenv('YO_CONSUMER_KEY') ?: 'QDKT6BIR';
$consumer_secret = getenv('YO_CONSUMER_SECRET') ?: 'your_yo_consumer_secret_here';
$public_key = getenv('YO_PUBLIC_KEY') ?: 'your_yo_public_key_here';

// Yo! Payments NEW API URLs
// Staging: https://openapiuat.airtel.ug
// Production: https://openapi.airtel.ug
$base_url = getenv('YO_BASE_URL') ?: 'https://openapiuat.airtel.ug';
$auth_url = $base_url . '/auth/oauth2/token';
$payment_url = $base_url . '/merchant/v1/payments';

// 1. Get Access Token
function getAccessToken($consumer_key, $consumer_secret, $auth_url) {
    $credentials = base64_encode("$consumer_key:$consumer_secret");
    
    $headers = [
        "Authorization: Basic $credentials",
        "Content-Type: application/json"
    ];
    
    $postData = json_encode(["grant_type" => "client_credentials"]);
    
    $ch = curl_init($auth_url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

// 2. Create Payment - Generate redirect link for Airtel Money payments
function createPayment($token, $amount, $phone, $email, $payment_url, $callback_url) {
    // Format phone number (Uganda format)
    $phone = preg_replace('/[^0-9]/', '', $phone);
    if (substr($phone, 0, 1) === '0') {
        $phone = '256' . substr($phone, 1);
    } elseif (substr($phone, 0, 3) !== '256') {
        $phone = '256' . $phone;
    }
    
    $headers = [
        "Authorization: Bearer $token",
        "Content-Type: application/json",
        "X-Country: UGA",
        "X-Currency: UGX"
    ];
    
    $paymentData = [
        "reference" => "ZENITH-" . rand(10000, 99999),
        "subscriber" => [
            "country" => "UGA",
            "currency" => "UGX",
            "msisdn" => $phone
        ],
        "transaction" => [
            "amount" => $amount,
            "currency" => "UGX",
            "description" => "Investment Top-up"
        ],
        "callback_url" => $callback_url,
        "return_url" => $callback_url
    ];
    
    $ch = curl_init($payment_url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Handle incoming payment requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $amount = $input['amount'] ?? 0;
    $phone = $input['phone'] ?? '';
    $email = $input['email'] ?? '';
    $callback_url = getenv('CALLBACK_URL') ?: 'http://localhost:3000/callback';
    
    $token = getAccessToken($consumer_key, $consumer_secret, $auth_url);
    
    if ($token) {
        $result = createPayment($token, $amount, $phone, $email, $payment_url, $callback_url);
        header('Content-Type: application/json');
        echo json_encode($result);
    } else {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["error" => "Failed to get authentication token"]);
    }
}
?>
