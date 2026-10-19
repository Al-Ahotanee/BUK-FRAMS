<?php
session_start();
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/php_errors.log');
error_reporting(E_ALL);

// Database connection
$dsn = 'mysql:host=127.0.0.1;dbname=attendance-db;charset=utf8mb4';
$username = 'root';
$password = '';
try {
    $pdo = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Handle API requests
$request = $_GET['request'] ?? $_POST['request'] ?? '';
$response = ['status' => 'error', 'message' => 'Invalid request', 'data' => []];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $request === 'get_courses') {
    try {
        $lecturerId = $_SESSION['user']['id'] ?? null;
        if (!$lecturerId) {
            $response['message'] = 'Lecturer not authenticated';
        } else {
            $stmt = $pdo->prepare("SELECT u.name, u.unitCode 
                                  FROM tblunit u 
                                  JOIN tbllecturer_unit lu ON u.Id = lu.unitId 
                                  WHERE lu.lecturerId = :lecturerId");
            $stmt->execute([':lecturerId' => $lecturerId]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
        }
    } catch (PDOException $e) {
        error_log('get_courses error: ' . $e->getMessage());
        $response['message'] = 'Error fetching courses';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'get_students') {
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    if ($unitCode) {
        try {
            // Get unitId from unitCode
            $unitStmt = $pdo->prepare("SELECT Id FROM tblunit WHERE unitCode = :unitCode");
            $unitStmt->execute([':unitCode' => $unitCode]);
            $unit = $unitStmt->fetch(PDO::FETCH_ASSOC);
            if ($unit) {
                $unitId = $unit['Id'];
                // Get students enrolled in this unit
                $stmt = $pdo->prepare("SELECT s.registrationNumber, s.firstName, s.lastName, s.email 
                                      FROM tblstudents s 
                                      JOIN tblstudent_unit su ON s.Id = su.studentId 
                                      WHERE su.unitId = :unitId");
                $stmt->execute([':unitId' => $unitId]);
                $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $html = '<table class="table table-striped table-bordered"><thead><tr><th>Reg No</th><th>Name</th><th>Email</th></tr></thead><tbody>';
                foreach ($students as $student) {
                    $html .= "<tr><td>" . htmlspecialchars($student['registrationNumber']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($student['firstName'] . ' ' . $student['lastName']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($student['email']) . "</td></tr>";
                }
                $html .= '</tbody></table>';
                $response['status'] = empty($students) ? 'warning' : 'success';
                $response['message'] = empty($students) ? 'No students registered for this course' : 'Students loaded successfully';
                $response['html'] = $html;
            } else {
                $response['message'] = 'Invalid unit code';
                $response['html'] = '<div class="alert alert-danger">Invalid course selected.</div>';
            }
        } catch (PDOException $e) {
            error_log('get_students error: ' . $e->getMessage());
            $response['message'] = 'Error fetching students';
            $response['html'] = '<div class="alert alert-danger">Error loading students.</div>';
        }
    } else {
        $response['message'] = 'Missing unit code';
        $response['html'] = '<div class="alert alert-danger">No course selected.</div>';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'get_attendance') {
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $date = filter_var($_POST['date'] ?? date('Y-m-d'), FILTER_SANITIZE_SPECIAL_CHARS); // Default to today: 2025-08-30
    if ($unitCode) {
        try {
            // Get unitId from unitCode
            $unitStmt = $pdo->prepare("SELECT Id FROM tblunit WHERE unitCode = :unitCode");
            $unitStmt->execute([':unitCode' => $unitCode]);
            $unit = $unitStmt->fetch(PDO::FETCH_ASSOC);
            if ($unit) {
                $unitId = $unit['Id'];
                $stmt = $pdo->prepare("SELECT a.studentRegistrationNumber, s.firstName, s.lastName, a.attendanceStatus, a.dateMarked
                                      FROM tblattendance a
                                      JOIN tblstudents s ON a.studentRegistrationNumber = s.registrationNumber
                                      JOIN tblstudent_unit su ON s.Id = su.studentId
                                      WHERE a.unit = :unitCode AND a.dateMarked = :date AND su.unitId = :unitId");
                $stmt->execute([':unitCode' => $unitCode, ':date' => $date, ':unitId' => $unitId]);
                $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $html = '<table class="table table-striped table-bordered"><thead><tr><th>Reg No</th><th>Name</th><th>Status</th><th>Date</th></tr></thead><tbody>';
                foreach ($attendance as $record) {
                    $html .= "<tr><td>" . htmlspecialchars($record['studentRegistrationNumber']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['firstName'] . ' ' . $record['lastName']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['attendanceStatus']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['dateMarked']) . "</td></tr>";
                }
                $html .= '</tbody></table>';
                $response['status'] = empty($attendance) ? 'warning' : 'success';
                $response['message'] = empty($attendance) ? 'No attendance records for this date' : 'Attendance loaded successfully';
                $response['html'] = $html;
            } else {
                $response['message'] = 'Invalid unit code';
                $response['html'] = '<div class="alert alert-danger">Invalid course selected.</div>';
            }
        } catch (PDOException $e) {
            error_log('get_attendance error: ' . $e->getMessage());
            $response['message'] = 'Error fetching attendance';
            $response['html'] = '<div class="alert alert-danger">Error loading attendance.</div>';
        }
    } else {
        $response['message'] = 'Missing unit code';
        $response['html'] = '<div class="alert alert-danger">No course selected.</div>';
    }
}

if ($request) {
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
ob_end_clean();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIGPOLY-FRBAS</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .content-wrapper { 
            background: linear-gradient(180deg, #f0f4f8 0%, #d1e0f7 100%); 
            min-height: calc(100vh - 120px); 
        }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-custom {
            background: linear-gradient(45deg, #028090, #00a896); color: white; border: none;
            padding: 12px 24px; border-radius: 10px; transition: all 0.3s ease; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); font-weight: 500;
        }
        .btn-custom:hover {
            background: linear-gradient(45deg, #026670, #008573); transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        .card {
            border: none; border-radius: 15px; box-shadow: 0 6px 25px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease; background: #ffffff;
        }
        .card:hover { box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15); transform: translateY(-2px); }
        .card-header { 
            background: linear-gradient(90deg, #003049, #00a896); color: white; 
            border-radius: 15px 15px 0 0; padding: 15px 20px; 
        }
        .table-container { max-height: 400px; overflow-y: auto; }
        .main-sidebar { 
            background: linear-gradient(180deg, #003049 0%, #004b6b 100%); 
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-link { 
            background: #003049; color: white !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
            padding: 18px 25px; display: flex; align-items: center;
        }
        .brand-text { font-size: 1.6rem; font-weight: 700; }
        .nav-link { 
            color: #d1d5db !important; padding: 14px 18px; border-radius: 10px; 
            margin: 6px 12px; transition: all 0.2s ease; display: flex; align-items: center; 
            gap: 12px; font-size: 1rem; font-weight: 500;
        }
        .nav-link:hover { 
            background: rgba(255, 255, 255, 0.2); color: white !important; transform: translateX(6px);
        }
        .nav-link.active { 
            background: #00a896 !important; color: white !important; 
            box-shadow: 0 2px 10px rgba(0, 168, 150, 0.4);
        }
        .nav-icon { font-size: 1.2rem; }
        .sidebar { padding: 12px 0; }
        select.form-control, input.form-control {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300a896'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 0.75rem center;
            background-size: 1.5em; padding-right: 2.8rem; border-radius: 10px;
            border: 1px solid #d1d5db; transition: all 0.3s ease;
        }
        select.form-control:focus, input.form-control:focus {
            border-color: #00a896; box-shadow: 0 0 6px rgba(0, 168, 150, 0.4);
            outline: none;
        }
        .swal2-popup { 
            border-radius: 15px !important; box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2); 
            font-family: 'Inter', sans-serif;
        }
        .content-header h1 { 
            font-size: 2rem; font-weight: 600; color: #1e293b; 
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
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
                    <i class="fas fa-user mr-2"></i><?php echo htmlspecialchars($_SESSION['user']['firstName'] ?? 'Lecturer'); ?>
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
                        <a href="list.php" class="nav-link active">
                            <i class="nav-icon fas fa-list"></i><p>Student & Attendance List</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="notify.php" class="nav-link">
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
        <div class="content-header">
            <div class="container-fluid">
                <h1 class="m-0 text-dark">JIGPOLY Face Recognition Based Attendance System</h1>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="card card-primary card-outline p-4 mb-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Filter Options</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4 form-group">
                                <label for="courseSelect" class="text-lg font-semibold text-gray-700">Course</label>
                                <select id="courseSelect" class="form-control">
                                    <option value="">Select Course</option>
                                </select>
                            </div>
                            <div class="col-md-4 form-group">
                                <label for="dateSelect" class="text-lg font-semibold text-gray-700">Date</label>
                                <input type="date" id="dateSelect" class="form-control" value="<?php echo date('Y-m-d'); ?>">
                            </div>
                        </div>
                        <div class="d-flex justify-content-center mt-5">
                            <button id="loadData" class="btn btn-custom"><i class="fas fa-search mr-2"></i>Load Data</button>
                        </div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 mb-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Registered Students</h3>
                    </div>
                    <div class="card-body table-responsive p-0 table-container">
                        <div id="studentTableContainer"></div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Attendance Records</h3>
                    </div>
                    <div class="card-body table-responsive p-0 table-container">
                        <div id="attendanceTableContainer"></div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<script>
    const AJAX_TIMEOUT = 5000;
    const today = new Date().toISOString().split('T')[0]; // 2025-08-30

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

    $(document).ready(function() {
        // Load courses (lecturer-specific)
        $.ajax({
            url: 'list.php?request=get_courses',
            type: 'GET',
            dataType: 'json',
            timeout: AJAX_TIMEOUT,
            beforeSend: function() {
                Swal.fire({ title: 'Loading Courses...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
            },
            success: function(data) {
                Swal.close();
                if (data.status === 'success') {
                    $('#courseSelect').append(data.data.map(c => `<option value="${c.unitCode}">${c.name}</option>`));
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

        // Load data
        $('#loadData').click(function() {
            const unitCode = $('#courseSelect').val();
            const date = $('#dateSelect').val() || today;
            if (!unitCode) {
                showAlert('Please select a course.', 'warning');
                return;
            }

            // Load students
            $.ajax({
                url: 'list.php?request=get_students',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: `unitCode=${encodeURIComponent(unitCode)}`,
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    $('#studentTableContainer').html('<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>');
                },
                success: function(data) {
                    $('#studentTableContainer').html(data.html);
                    showAlert(data.message, data.status === 'success' ? 'success' : 'warning');
                },
                error: function(xhr, status, error) {
                    $('#studentTableContainer').html('<div class="alert alert-danger">Error loading students.</div>');
                    showAlert('Error fetching students: ' + error, 'error');
                    console.error('Students fetch error:', xhr.responseText);
                }
            });

            // Load attendance
            $.ajax({
                url: 'list.php?request=get_attendance',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: `unitCode=${encodeURIComponent(unitCode)}&date=${encodeURIComponent(date)}`,
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    $('#attendanceTableContainer').html('<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>');
                },
                success: function(data) {
                    $('#attendanceTableContainer').html(data.html);
                    showAlert(data.message, data.status === 'success' ? 'success' : 'warning');
                },
                error: function(xhr, status, error) {
                    $('#attendanceTableContainer').html('<div class="alert alert-danger">Error loading attendance.</div>');
                    showAlert('Error fetching attendance: ' + error, 'error');
                    console.error('Attendance fetch error:', xhr.responseText);
                }
            });
        });
    });
</script>
</body>
</html>