<?php
session_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
set_time_limit(60); // Increase PHP execution time for email sending

// Redirect to login if not authenticated
if (!isset($_SESSION['emailAddress'])) {
    header("Location: entry.php");
    exit;
}

// Database connection
$dsn = 'mysql:host=127.0.0.1;dbname=attendance-db;charset=utf8mb4';
$username = 'root';
$password = '';
try {
    $pdo = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    die('Database connection failed: ' . $e->getMessage());
}

// Include PHPMailer files
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';
require 'PHPMailer/Exception.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Handle API requests
$request = $_GET['request'] ?? $_POST['request'] ?? '';
$response = ['status' => 'error', 'message' => 'Invalid request', 'data' => []];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $request === 'get_data') {
    $type = filter_var($_GET['type'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    if ($type === 'courses') {
        try {
            $stmt = $pdo->query("SELECT courseCode, name FROM tblcourse");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['data'] = $data;
            $response['status'] = empty($data) ? 'warning' : 'success';
            $response['message'] = empty($data) ? 'No programmes found in the database.' : 'Programmes loaded successfully';
        } catch (PDOException $e) {
            error_log('get_data courses error: ' . $e->getMessage());
            $response['message'] = 'Error fetching programmes: ' . $e->getMessage();
        }
    } elseif ($type === 'units') {
        $courseCode = filter_var($_GET['course'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
        if ($courseCode) {
            try {
                $stmt = $pdo->prepare("
                    SELECT u.unitCode, u.name 
                    FROM tblunit u 
                    JOIN tblcourse c ON u.courseID = c.facultyID 
                    WHERE c.courseCode = :courseCode
                ");
                $stmt->execute([':courseCode' => $courseCode]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $response['data'] = $data;
                $response['status'] = empty($data) ? 'warning' : 'success';
                $response['message'] = empty($data) ? 'No courses found for this programme.' : 'Courses loaded successfully';
            } catch (PDOException $e) {
                error_log('get_data units error: ' . $e->getMessage());
                $response['message'] = 'Error fetching courses: ' . $e->getMessage();
            }
        } else {
            $response['message'] = 'Missing programme code';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'get_low_attendance') {
    $courseCode = filter_var($_POST['courseCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    if ($courseCode && $unitCode) {
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    s.registrationNumber, 
                    s.firstName, 
                    s.lastName, 
                    s.email,
                    COUNT(a.attendanceID) AS total_sessions,
                    SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) AS present_sessions,
                    IF(COUNT(a.attendanceID) > 0, 
                        (SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) / COUNT(a.attendanceID) * 100), 
                        0) AS attendance_percentage
                FROM tblstudents s
                LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber 
                    AND a.course = :courseCode 
                    AND a.unit = :unitCode
                WHERE s.courseCode = :courseCode
                GROUP BY s.registrationNumber, s.firstName, s.lastName, s.email
                HAVING attendance_percentage < 70 OR total_sessions = 0
            ");
            $stmt->execute([':courseCode' => $courseCode, ':unitCode' => $unitCode]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $html = '<table class="table table-striped table-bordered"><thead><tr><th>Reg No</th><th>Name</th><th>Email</th><th>Attendance (%)</th></tr></thead><tbody>';
            foreach ($students as $student) {
                $percentage = number_format($student['attendance_percentage'], 2);
                $html .= "<tr><td>" . htmlspecialchars($student['registrationNumber']) . "</td>";
                $html .= "<td>" . htmlspecialchars($student['firstName'] . ' ' . $student['lastName']) . "</td>";
                $html .= "<td>" . htmlspecialchars($student['email']) . "</td>";
                $html .= "<td>" . $percentage . "</td></tr>";
            }
            $html .= '</tbody></table>';
            $response['status'] = empty($students) ? 'warning' : 'success';
            $response['message'] = empty($students) ? 'No students with less than 70% attendance found for this programme and course.' : 'Students with low attendance loaded successfully';
            $response['html'] = empty($students) ? '<div class="alert alert-warning">No students with less than 70% attendance found.</div>' : $html;
            $response['data'] = $students;
        } catch (PDOException $e) {
            error_log('get_low_attendance error: ' . $e->getMessage());
            $response['message'] = 'Server error fetching low attendance students: ' . $e->getMessage();
        }
    } else {
        $response['message'] = 'Missing programme or course code';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'send_emails') {
    $students = json_decode($_POST['students'] ?? '[]', true);
    $courseCode = filter_var($_POST['courseCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    if ($courseCode && $unitCode && !empty($students)) {
        try {
            $mail = new PHPMailer(true);
            $mail->SMTPDebug = 2;
            $mail->Debugoutput = function($str, $level) {
                error_log('PHPMailer Debug: ' . $str);
            };
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'elahotany@gmail.com';
            $mail->Password = 'rjycmmlnyjshfxsz'; // Replace with your new App Password
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            $mail->setFrom('elahotany@gmail.com', 'Smart Attendance System');
            $sentCount = 0;
            foreach ($students as $student) {
                if (!isset($student['email'], $student['firstName'], $student['lastName'], $student['attendance_percentage'])) {
                    continue;
                }
                $percentage = number_format($student['attendance_percentage'], 2);
                $mail->addAddress($student['email'], $student['firstName'] . ' ' . $student['lastName']);
                $mail->isHTML(true);
                $mail->Subject = 'Low Attendance Warning for ' . htmlspecialchars($courseCode) . ' - ' . htmlspecialchars($unitCode);
                $mail->Body = "
                    <html>
                    <head><title>Low Attendance Warning</title></head>
                    <body style='font-family: Arial, sans-serif; color: #333;'>
                        <h2>Dear " . htmlspecialchars($student['firstName'] . ' ' . $student['lastName']) . ",</h2>
                        <p>Your attendance for the programme <strong>" . htmlspecialchars($courseCode) . "</strong> and course <strong>" . htmlspecialchars($unitCode) . "</strong> is currently at <strong>" . $percentage . "%</strong>, which is below the required 70% threshold.</p>
                        <p>If your attendance does not improve, you may be ineligible to sit for the final examination. Please take immediate action to attend all scheduled sessions.</p>
                        <p>Best regards,<br>Smart Attendance System Team</p>
                    </body>
                    </html>";
                $mail->send();
                $sentCount++;
                $mail->clearAddresses();
            }
            $response['status'] = 'success';
            $response['message'] = "Emails sent successfully to $sentCount students.";
        } catch (Exception $e) {
            error_log('send_emails error: ' . $e->getMessage());
            $response['message'] = 'Error sending emails: ' . $e->getMessage();
        }
    } else {
        $response['message'] = 'Missing parameters or no students to email';
    }
}

if ($request) {
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Send notifications to students with low attendance for programmes and courses.">
    <meta name="keywords" content="Smart Attendance System, low attendance, notifications">
    <title>Notifications | Smart Attendance System</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Open+Sans:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        body { font-family: 'Open Sans', sans-serif; background: linear-gradient(135deg, #f4f9f9, #e0e0e0); }
        .content-wrapper { padding: 20px; min-height: calc(100vh - 56px); }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-custom {
            background: linear-gradient(45deg, #028090, #00a896); color: white; border: none;
            padding: 12px 20px; border-radius: 25px; font-family: 'Poppins', sans-serif;
            font-size: 1.1rem; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-custom:hover {
            background: linear-gradient(45deg, #026670, #008573); transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .card {
            border: none; border-radius: 15px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            background: #fff; animation: fadeInUp 1s ease-in-out;
        }
        .card-header {
            background: linear-gradient(45deg, #028090, #00a896); color: #fff;
            font-family: 'Poppins', sans-serif; font-size: 1.5rem; font-weight: 700;
            padding: 15px; border-radius: 15px 15px 0 0;
        }
        .card-body { padding: 25px; }
        .table-container { max-height: 400px; overflow-y: auto; }
        .main-sidebar { 
            background: linear-gradient(180deg, #003049 0%, #004b6b 100%); 
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-link { 
            background: #003049; color: white !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
            padding: 15px 20px; display: flex; align-items: center;
        }
        .brand-text { font-size: 1.4rem; font-weight: 700; }
        .nav-link { 
            color: #d1d5db !important; padding: 12px 15px; border-radius: 8px; 
            margin: 5px 10px; transition: all 0.2s ease; display: flex; align-items: center; 
            gap: 10px; font-size: 0.95rem;
        }
        .nav-link:hover { 
            background: rgba(255, 255, 255, 0.15); color: white !important; transform: translateX(5px);
        }
        .nav-link.active { 
            background: #00a896 !important; color: white !important; 
            box-shadow: 0 2px 8px rgba(0, 168, 150, 0.3);
        }
        .nav-icon { font-size: 1.1rem; }
        .sidebar { padding: 10px 0; }
        .form-group { margin-bottom: 20px; }
        .form-label {
            font-family: 'Poppins', sans-serif; font-size: 1.1rem; font-weight: 500; color: #333;
            display: flex; align-items: center;
        }
        .form-label i { margin-left: 5px; color: #00a896; }
        .form-control {
            width: 100%;
            min-height: 40px;
            border-radius: 8px;
            padding: 12px 15px;
            border: 1px solid #ddd;
            font-size: 1rem;
            line-height: 1.5;
            color: #333;
            background: #fff;
            /* The following properties were causing the display issue */
            /* background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300a896'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); */
            /* background-repeat: no-repeat; */
            /* background-position: right 0.75rem center; */
            /* background-size: 1.5em; */
            /* padding-right: 2.5rem; */
            white-space: normal;
            overflow: visible;
            -webkit-appearance: menulist;
            -moz-appearance: menulist;
            appearance: menulist;
        }
        .form-control:focus {
            border-color: #00a896; box-shadow: 0 0 5px rgba(0, 168, 150, 0.5); color: #333;
        }
        .form-control option { 
            color: #333; background: #fff; font-size: 1rem; padding: 10px; white-space: normal;
        }
        .alert {
            border-radius: 5px; padding: 15px; font-size: 1rem; text-align: center; margin-bottom: 20px;
        }
        .alert-success { background: #4caf50; color: #fff; }
        .alert-danger { background: #e74c3c; color: #fff; }
        .content-header h1 {
            font-family: 'Poppins', sans-serif; font-size: 2rem; font-weight: 700; color: #1a237e;
        }
        .swal2-popup { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
        .hidden { display: none; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .card { margin: 0 10px; }
            .content-header h1 { font-size: 1.5rem; }
            .btn-custom { font-size: 1rem; padding: 10px 15px; }
            .form-control { font-size: 0.9rem; min-height: 36px; }
        }
    </style>
</head>
<body class="hold-transition sidebar-mini layout-fixed">
<div class="wrapper">
    <nav class="main-header navbar navbar-expand navbar-dark" style="background: linear-gradient(90deg, #003049, #00a896);">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
            </li>
        </ul>
        <ul class="navbar-nav ml-auto">
            <li class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <i class="fas fa-user mr-2"></i><?php echo htmlspecialchars($_SESSION['firstName'] ?? 'Lecturer'); ?>
                </a>
                <div class="dropdown-menu dropdown-menu-right">
                    <a href="logout" class="dropdown-item"><i class="fas fa-sign-out-alt mr-2"></i> Logout</a>
                </div>
            </li>
        </ul>
    </nav>

    <aside class="main-sidebar sidebar-dark-primary elevation-4">
        <a href="#" class="brand-link">
            <span class="brand-text font-weight-bold">JIGPOLY-FRBAS <span style="color: #00a896;">
        </a>
        <div class="sidebar">
            <nav class="mt-2">
                <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                    <li class="nav-item">
                        <a href="dash.php" class="nav-link">
                            <i class="nav-icon fas fa-tachometer-alt"></i><p>Dashboard</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="capture.php" class="nav-link">
                            <i class="nav-icon fas fa-clipboard-check"></i><p>Mark Attendance</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="list.php" class="nav-link">
                            <i class="nav-icon fas fa-list"></i><p>Student & Attendance List</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="notify.php" class="nav-link active">
                            <i class="nav-icon fas fa-bell"></i><p>Send Notification</p>
                        </a>
                    </li>
					<li class="nav-item">
                        <a href="../exit.php" class="nav-link">
                          <i class="fas fa-sign-out-alt mr-2"></i>Logout</p>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    </aside>   
   <div class="content-wrapper">
        <section class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1>Notifications</h1>
                    </div>
                </div>
            </div>
        </section>
        <section class="content">
            <div class="container-fluid">
                <div class="card card-primary card-outline p-4 mb-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Low Attendance Notifications</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 form-group">
                                <label for="courseSelect" class="form-label">Programme <i class="fas fa-info-circle" data-toggle="tooltip" title="Select the programme"></i></label>
                                <select id="courseSelect" class="form-control">
                                    <option value="">Select Programme</option>
                                </select>
                            </div>
                            <div class="col-md-6 form-group">
                                <label for="unitSelect" class="form-label">Course <i class="fas fa-info-circle" data-toggle="tooltip" title="Select the course"></i></label>
                                <select id="unitSelect" class="form-control">
                                    <option value="">Select Course</option>
                                </select>
                            </div>
                        </div>
                        <div class="d-flex justify-content-center mt-4">
                            <button id="loadLowAttendance" class="btn btn-custom"><i class="fas fa-search mr-2"></i>Load Low Attendance</button>
                        </div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 mb-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Students with Low Attendance (< 70%)</h3>
                        <div class="card-tools">
                            <div class="input-group input-group-sm">
                                <input type="text" id="studentSearch" class="form-control" placeholder="Search students">
                                <div class="input-group-append">
                                    <button type="button" class="btn btn-default" onclick="searchStudents()">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body table-responsive p-0">
                        <div id="studentTableContainer"></div>
                        <div class="d-flex justify-content-center mt-4">
                            <button id="sendEmails" class="btn btn-custom hidden"><i class="fas fa-envelope mr-2"></i>Send Email Reminders</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<script>
    const AJAX_TIMEOUT = 30000; // Increased to 30 seconds

    function showAlert(message, type = 'info') {
        Swal.fire({
            icon: type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            showConfirmButton: false,
            timer: 3000,
            position: 'center',
            background: '#fff',
            customClass: { popup: 'swal2-popup' }
        });
    }

    function searchStudents() {
        const input = $('#studentSearch').val().toLowerCase();
        $('#studentTableContainer tr').each(function(index) {
            if (index === 0) return;
            const cells = $(this).find('td');
            let found = false;
            cells.each(function() {
                if ($(this).text().toLowerCase().includes(input)) found = true;
            });
            $(this).toggle(found);
        });
    }

    $(document).ready(function() {
        $('[data-toggle="tooltip"]').tooltip();

        document.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('focus', function() {
                this.style.borderColor = '#00a896';
                this.style.boxShadow = '0 0 5px rgba(0, 168, 150, 0.5)';
            });
            input.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
                this.style.boxShadow = 'none';
            });
        });

        // Load programmes
        $.ajax({
            url: 'notify.php?request=get_data&type=courses',
            type: 'GET',
            dataType: 'json',
            timeout: AJAX_TIMEOUT,
            beforeSend: function() {
                Swal.fire({ title: 'Loading Programmes...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
            },
            success: function(data) {
                Swal.close();
                console.log('Programmes response:', data);
                if (data.status === 'success' || data.status === 'warning') {
                    if (data.data.length > 0) {
                        $('#courseSelect').append(data.data.map(c => `<option value="${c.courseCode}">${c.name}</option>`));
                    } else {
                        showAlert(data.message, 'warning');
                    }
                } else {
                    showAlert(data.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                Swal.close();
                showAlert('Error fetching programmes: ' + error, 'error');
                console.error('Programmes fetch error:', xhr.responseText);
            }
        });

        // Load courses
        $('#courseSelect').change(function() {
            const course = $(this).val();
            $('#unitSelect').html('<option value="">Select Course</option>');
            if (course) {
                $.ajax({
                    url: `notify.php?request=get_data&type=units&course=${encodeURIComponent(course)}`,
                    type: 'GET',
                    dataType: 'json',
                    timeout: AJAX_TIMEOUT,
                    beforeSend: function() {
                        Swal.fire({ title: 'Loading Courses...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                    },
                    success: function(data) {
                        Swal.close();
                        console.log('Courses response:', data);
                        if (data.status === 'success' || data.status === 'warning') {
                            if (data.data.length > 0) {
                                $('#unitSelect').append(data.data.map(u => `<option value="${u.unitCode}">${u.name}</option>`));
                            } else {
                                showAlert(data.message, 'warning');
                            }
                        } else {
                            showAlert(data.message, 'error');
                        }
                    },
                    error: function(xhr, status, error) {
                        Swal.close();
                        showAlert('Error fetching courses: ' + error, 'error');
                        console.error('Courses fetch error:', xhr.responseText);
                    }
                });
            }
        });

        // Load low attendance students
        $('#loadLowAttendance').click(function() {
            const course = $('#courseSelect').val();
            const unit = $('#unitSelect').val();
            if (!course || !unit) {
                showAlert('Please select a programme and course.', 'warning');
                return;
            }
            $.ajax({
                url: 'notify.php?request=get_low_attendance',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: `courseCode=${encodeURIComponent(course)}&unitCode=${encodeURIComponent(unit)}`,
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    Swal.fire({ title: 'Loading Students...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                },
                success: function(data) {
                    Swal.close();
                    console.log('Low attendance response:', data);
                    $('#studentTableContainer').html(data.html);
                    if (data.status === 'success') {
                        $('#sendEmails').removeClass('hidden');
                        $('#sendEmails').data('students', data.data);
                    } else {
                        $('#sendEmails').addClass('hidden');
                    }
                    showAlert(data.message, data.status === 'success' ? 'success' : 'warning');
                },
                error: function(xhr, status, error) {
                    Swal.close();
                    showAlert('Error fetching low attendance students: ' + error, 'error');
                    console.error('Low attendance fetch error:', xhr.responseText);
                }
            });
        });

        // Send email reminders
        $('#sendEmails').click(function() {
            const course = $('#courseSelect').val();
            const unit = $('#unitSelect').val();
            const students = $(this).data('students') || [];
            if (!course || !unit || students.length === 0) {
                showAlert('No students to email or missing programme/course.', 'warning');
                return;
            }
            Swal.fire({
                title: 'Confirm Sending Emails',
                text: `Are you sure you want to send email reminders to ${students.length} students?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Send Emails',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#00a896',
                cancelButtonColor: '#e74c3c',
                position: 'center',
                customClass: { popup: 'swal2-popup' }
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: 'notify.php?request=send_emails',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `courseCode=${encodeURIComponent(course)}&unitCode=${encodeURIComponent(unit)}&students=${encodeURIComponent(JSON.stringify(students))}`,
                        dataType: 'json',
                        timeout: AJAX_TIMEOUT,
                        beforeSend: function() {
                            Swal.fire({ title: 'Sending Emails, please wait...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                        },
                        success: function(data) {
                            Swal.close();
                            showAlert(data.message, data.status);
                            if (data.status === 'success') {
                                $('#studentTableContainer').empty();
                                $('#sendEmails').addClass('hidden');
                            }
                        },
                        error: function(xhr, status, error) {
                            Swal.close();
                            showAlert('Error sending emails: ' + error, 'error');
                            console.error('Send emails error:', xhr.responseText);
                        }
                    });
                }
            });
        });
    });
</script>
</body>
</html>
