<?php
/**
 * Zenith Assets - PHP Backend (Alternative)
 * Secure Backend for PesaPal Integration
 */

$consumer_key = "KHoxY4mbcGO24cIgx21VDwt4MKHyveIm";
$consumer_secret = "LXW1k3Eg+giZwZnkrZHnTAGyeIk=";

// PesaPal API URLs
$auth_url = "https://pay.pesapal.com/v3/api/Auth/RequestToken";
$submit_url = "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest";

// 1. Get Access Token
function getAccessToken($consumer_key, $consumer_secret, $auth_url) {
    $headers = ["Content-Type: application/json", "Accept: application/json"];
    $postData = json_encode([
        "consumer_key" => $consumer_key, 
        "consumer_secret" => $consumer_secret
    ]);
    
    $ch = curl_init($auth_url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    return $data['token'] ?? null;
}

// 2. Create Order - Generate redirect link for MoMo payments
function createOrder($token, $amount, $phone, $email, $submit_url) {
    $headers = [
        "Content-Type: application/json", 
        "Accept: application/json",
        "Authorization: Bearer " . $token
    ];
    
    $orderData = [
        "id" => "ZENITH-" . rand(10000, 99999),
        "currency" => "UGX",
        "amount" => $amount,
        "description" => "Investment Top-up",
        "callback_url" => "http://localhost:3000/callback",
        "notification_id" => "",
        "billing_address" => [
            "email_address" => $email ?: "user@zenith.com",
            "phone_number" => $phone
        ]
    ];
    
    $ch = curl_init($submit_url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));
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
    
    $token = getAccessToken($consumer_key, $consumer_secret, $auth_url);
    
    if ($token) {
        $result = createOrder($token, $amount, $phone, $email, $submit_url);
        header('Content-Type: application/json');
        echo json_encode($result);
    } else {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(["error" => "Failed to get authentication token"]);
    }
}
?>
