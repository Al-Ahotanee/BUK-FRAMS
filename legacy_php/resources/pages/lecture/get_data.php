<?php
session_start();
include './includes/dbcon.php';

ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

$response = ['status' => 'error', 'message' => 'Invalid request', 'data' => []];

if (isset($_GET['type'])) {
    $type = filter_var($_GET['type'], FILTER_SANITIZE_STRING);
    
    if ($type === 'courses') {
        $sql = "SELECT courseCode, name FROM tblcourse";
        $stmt = $pdo->query($sql);
        $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['status'] = 'success';
    } elseif ($type === 'units') {
        $sql = "SELECT unitCode, name FROM tblunit";
        $stmt = $pdo->query($sql);
        $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['status'] = 'success';
    } elseif ($type === 'venues') {
        $sql = "SELECT className FROM tblvenue";
        $stmt = $pdo->query($sql);
        $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['status'] = 'success';
    }
}

ob_end_clean();
header('Content-Type: application/json');
echo json_encode($response);
?>