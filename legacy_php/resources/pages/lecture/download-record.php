<?php
session_start();
include './includes/dbcon.php';

ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

$courseCode = isset($_GET['course']) ? filter_var($_GET['course'], FILTER_SANITIZE_STRING) : '';
$unitCode = isset($_GET['unit']) ? filter_var($_GET['unit'], FILTER_SANITIZE_STRING) : '';
$response = ['status' => 'error', 'message' => 'Invalid input', 'dates' => [], 'students' => []];

if ($courseCode && $unitCode) {
    try {
        // Fetch distinct dates
        $distinctDatesQuery = "SELECT DISTINCT dateMarked FROM tblattendance WHERE course = :courseCode AND unit = :unitCode";
        $stmtDates = $pdo->prepare($distinctDatesQuery);
        $stmtDates->execute([':courseCode' => $courseCode, ':unitCode' => $unitCode]);
        $dates = $stmtDates->fetchAll(PDO::FETCH_COLUMN);

        // Fetch students and their attendance
        $studentsQuery = "SELECT DISTINCT studentRegistrationNumber FROM tblattendance WHERE course = :courseCode AND unit = :unitCode";
        $stmtStudents = $pdo->prepare($studentsQuery);
        $stmtStudents->execute([':courseCode' => $courseCode, ':unitCode' => $unitCode]);
        $students = $stmtStudents->fetchAll(PDO::FETCH_COLUMN);

        $attendanceData = [];
        foreach ($students as $student) {
            $studentData = ['studentRegistrationNumber' => $student];
            foreach ($dates as $date) {
                $attendanceQuery = "SELECT attendanceStatus FROM tblattendance 
                                    WHERE studentRegistrationNumber = :studentID 
                                    AND dateMarked = :date 
                                    AND course = :courseCode 
                                    AND unit = :unitCode";
                $stmtAttendance = $pdo->prepare($attendanceQuery);
                $stmtAttendance->execute([
                    ':studentID' => $student,
                    ':date' => $date,
                    ':courseCode' => $courseCode,
                    ':unitCode' => $unitCode
                ]);
                $result = $stmtAttendance->fetch(PDO::FETCH_ASSOC);
                $studentData[$date] = $result ? $result['attendanceStatus'] : 'Absent';
            }
            $attendanceData[] = $studentData;
        }

        $response['status'] = 'success';
        $response['dates'] = $dates;
        $response['students'] = $attendanceData;
    } catch (PDOException $e) {
        $response['message'] = 'Error fetching attendance: ' . $e->getMessage();
    }
}

ob_end_clean();
header('Content-Type: application/json');
echo json_encode($response);
?>