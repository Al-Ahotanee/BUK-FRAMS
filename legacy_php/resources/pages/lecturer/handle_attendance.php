<?php
session_start();
include './includes/dbcon.php'; // Ensure this uses PDO

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $attendanceData = json_decode(file_get_contents("php://input"), true);
    $response = [];

    if ($attendanceData) {
        try {
            $sql = "INSERT INTO tblattendance (studentRegistrationNumber, course, unit, attendanceStatus, dateMarked)  
                    VALUES (:studentID, :course, :unit, :attendanceStatus, :date)";
            $stmt = $pdo->prepare($sql);

            foreach ($attendanceData as $data) {
                $studentID = filter_var($data['studentID'], FILTER_SANITIZE_STRING);
                $attendanceStatus = filter_var($data['attendanceStatus'], FILTER_SANITIZE_STRING);
                $course = filter_var($data['course'], FILTER_SANITIZE_STRING);
                $unit = filter_var($data['unit'], FILTER_SANITIZE_STRING);
                $date = date("Y-m-d");

                $stmt->execute([
                    ':studentID' => $studentID,
                    ':course' => $course,
                    ':unit' => $unit,
                    ':attendanceStatus' => $attendanceStatus,
                    ':date' => $date
                ]);
            }

            $response['status'] = 'success';
            $response['message'] = "Attendance recorded successfully for all entries.";
        } catch (PDOException $e) {
            $response['status'] = 'error';
            $response['message'] = "Error inserting attendance data: " . $e->getMessage();
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = "No attendance data received.";
    }

    header('Content-Type: application/json');
    echo json_encode($response);
} else {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
}
?>