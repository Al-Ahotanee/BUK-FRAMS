<?php
session_start();
include './includes/dbcon.php';

ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $response = [];

    if (isset($data['image']) && isset($data['studentID'])) {
        $imageData = $data['image'];
        $studentID = filter_var($data['studentID'], FILTER_SANITIZE_STRING);
        
        $imageData = str_replace('data:image/png;base64,', '', $imageData);
        $imageData = str_replace(' ', '+', $imageData);
        $imageBinary = base64_decode($imageData);
        
        $labelDir = "resources/labels/$studentID";
        if (!is_dir($labelDir)) {
            mkdir($labelDir, 0777, true);
        }
        
        $imageNumber = 1;
        while (file_exists("$labelDir/$imageNumber.png")) {
            $imageNumber++;
        }
        
        $filePath = "$labelDir/$imageNumber.png";
        if (file_put_contents($filePath, $imageBinary)) {
            $response['status'] = 'success';
            $response['message'] = "Image saved successfully as $filePath";
        } else {
            $response['status'] = 'error';
            $response['message'] = "Failed to save image";
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = "Invalid image data or student ID";
    }

    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($response);
} else {
    ob_end_clean();
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
?>