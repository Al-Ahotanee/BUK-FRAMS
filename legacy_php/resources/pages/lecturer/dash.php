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

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $request === 'get_data') {
    $type = filter_var($_GET['type'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    if ($type === 'courses') {
        $lecturerId = $_SESSION['user']['id'] ?? null;
        if ($lecturerId) {
            $stmt = $pdo->prepare("SELECT u.unitCode, u.name 
                                  FROM tblunit u 
                                  JOIN tbllecturer_unit lu ON u.Id = lu.unitId 
                                  WHERE lu.lecturerId = :lecturerId");
            $stmt->execute([':lecturerId' => $lecturerId]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
        } else {
            $response['message'] = 'Lecturer not authenticated';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'get_analytics') {
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $startDate = filter_var($_POST['startDate'] ?? date('Y-m-d', strtotime('-7 days')), FILTER_SANITIZE_SPECIAL_CHARS);
    $endDate = filter_var($_POST['endDate'] ?? date('Y-m-d'), FILTER_SANITIZE_SPECIAL_CHARS);
    try {
        $unitStmt = $pdo->prepare("SELECT Id FROM tblunit WHERE unitCode = :unitCode");
        $unitStmt->execute([':unitCode' => $unitCode]);
        $unit = $unitStmt->fetch(PDO::FETCH_ASSOC);
        if ($unit) {
            $unitId = $unit['Id'];
            $stmt = $pdo->prepare("SELECT COUNT(DISTINCT s.Id) as count 
                                  FROM tblstudents s 
                                  JOIN tblstudent_unit su ON s.Id = su.studentId 
                                  WHERE su.unitId = :unitId");
            $stmt->execute([':unitId' => $unitId]);
            $totalStudents = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            $stmt = $pdo->prepare("SELECT COUNT(*) as count 
                                  FROM tblattendance a
                                  JOIN tblstudent_unit su ON a.studentRegistrationNumber = (SELECT registrationNumber FROM tblstudents WHERE Id = su.studentId)
                                  WHERE a.unit = :unitCode AND a.attendanceStatus = 'Present' 
                                  AND a.dateMarked BETWEEN :startDate AND :endDate AND su.unitId = :unitId");
            $stmt->execute([':unitCode' => $unitCode, ':startDate' => $startDate, ':endDate' => $endDate, ':unitId' => $unitId]);
            $presentCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            $stmt = $pdo->prepare("SELECT COUNT(*) as count 
                                  FROM tblattendance a
                                  JOIN tblstudent_unit su ON a.studentRegistrationNumber = (SELECT registrationNumber FROM tblstudents WHERE Id = su.studentId)
                                  WHERE a.unit = :unitCode 
                                  AND a.dateMarked BETWEEN :startDate AND :endDate AND su.unitId = :unitId");
            $stmt->execute([':unitCode' => $unitCode, ':startDate' => $startDate, ':endDate' => $endDate, ':unitId' => $unitId]);
            $totalAttendance = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            $attendanceRate = $totalAttendance ? round(($presentCount / $totalAttendance) * 100, 2) : 0;

            $stmt = $pdo->prepare("SELECT a.dateMarked, COUNT(*) as count 
                                  FROM tblattendance a
                                  JOIN tblstudent_unit su ON a.studentRegistrationNumber = (SELECT registrationNumber FROM tblstudents WHERE Id = su.studentId)
                                  WHERE a.unit = :unitCode AND a.attendanceStatus = 'Present' 
                                  AND a.dateMarked BETWEEN :startDate AND :endDate AND su.unitId = :unitId
                                  GROUP BY a.dateMarked");
            $stmt->execute([':unitCode' => $unitCode, ':startDate' => $startDate, ':endDate' => $endDate, ':unitId' => $unitId]);
            $trendData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response['status'] = 'success';
            $response['data'] = [
                'totalStudents' => $totalStudents,
                'attendanceRate' => $attendanceRate,
                'presentCount' => $presentCount,
                'totalAttendance' => $totalAttendance,
                'trendData' => $trendData
            ];
        } else {
            $response['message'] = 'Invalid unit code';
        }
    } catch (Exception $e) {
        error_log('get_analytics error: ' . $e->getMessage());
        $response['message'] = 'Server error fetching analytics';
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
    <title>JIGPOLY-FRBAS Dashboard</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background: #f4f7fa; }
        .content-wrapper { background: linear-gradient(135deg, #e0e7ff 0%, #f9fafb 100%); min-height: calc(100vh - 120px); }
        .fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .btn-custom {
            background: linear-gradient(45deg, #2d68c4, #00a896);
            color: white; border: none; padding: 12px 24px;
            border-radius: 10px; transition: all 0.4s ease;
            box-shadow: 0 4px 15px rgba(45, 104, 196, 0.3);
        }
        .btn-custom:hover {
            background: linear-gradient(45deg, #1a4a9b, #007d6a);
            transform: translateY(-3px); box-shadow: 0 6px 20px rgba(45, 104, 196, 0.4);
        }
        .card {
            border: none; border-radius: 15px;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.08);
            background: #ffffff; transition: all 0.3s ease;
        }
        .card:hover { box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); transform: translateY(-5px); }
        .info-box {
            border-radius: 15px; overflow: hidden;
            background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .info-box:hover {
            transform: translateY(-6px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .info-box-icon {
            background: linear-gradient(135deg, #2d68c4, #00a896);
            border-radius: 50%; width: 70px; height: 70px;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.3s ease;
        }
        .info-box-icon i { color: #fff; font-size: 1.5rem; }
        .info-box:hover .info-box-icon { background: linear-gradient(135deg, #1a4a9b, #007d6a); }
        .main-sidebar {
            background: linear-gradient(180deg, #1a2e44 0%, #2d68c4 100%);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-link {
            background: #1a2e44; color: white !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px 25px; display: flex; align-items: center;
        }
        .brand-text { font-size: 1.6rem; font-weight: 700; }
        .nav-link {
            color: #b0c4de !important; padding: 15px 20px;
            border-radius: 10px; margin: 6px 12px;
            transition: all 0.3s ease; display: flex; align-items: center;
            gap: 12px; font-size: 1rem; font-weight: 500;
        }
        .nav-link:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff !important; transform: translateX(8px);
        }
        .nav-link.active {
            background: linear-gradient(135deg, #2d68c4, #00a896) !important;
            color: #ffffff !important; box-shadow: 0 4px 15px rgba(45, 104, 196, 0.4);
        }
        .nav-icon { font-size: 1.3rem; }
        .sidebar { padding: 15px 0; }
        select.form-control, input.form-control {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232d68c4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 0.75rem center;
            background-size: 1.5em; padding-right: 3rem; border-radius: 10px;
            border: 1px solid #e2e8f0; transition: all 0.3s ease;
        }
        select.form-control:focus, input.form-control:focus {
            border-color: #2d68c4; box-shadow: 0 0 8px rgba(45, 104, 196, 0.3);
            outline: none;
        }
        .swal2-popup {
            border-radius: 15px !important; box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
            font-family: 'Inter', sans-serif;
        }
        .content-header h1 {
            font-size: 2.2rem; font-weight: 600; color: #1e293b;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
        }
        .chart-container { position: relative; height: 300px; margin-top: 20px; }
    </style>
</head>
<body class="hold-transition sidebar-mini layout-fixed">
<div class="wrapper">
    <nav class="main-header navbar navbar-expand navbar-dark" style="background: linear-gradient(90deg, #1a2e44, #2d68c4);">
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
                        <a href="dash.php" class="nav-link active">
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
                <h1 class="m-0 text-dark">JIGPOLY-FRBAS Lecturer Dashboard</h1>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-4 col-6">
                        <div class="info-box">
                            <span class="info-box-icon"><i class="fas fa-book"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Assigned Courses</span>
                                <span class="info-box-number" id="courseCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-6">
                        <div class="info-box">
                            <span class="info-box-icon"><i class="fas fa-users"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Registered Students</span>
                                <span class="info-box-number" id="totalStudents">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-6">
                        <div class="info-box">
                            <span class="info-box-icon"><i class="fas fa-check-circle"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Attendance Rate</span>
                                <span class="info-box-number" id="attendanceRate">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Attendance Overview</h3>
                    </div>
                    <div class="card-body chart-container">
                        <canvas id="attendanceChart"></canvas>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<script>
    const AJAX_TIMEOUT = 5000;
    let attendanceChart;

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

    function initChart(labels, data) {
        if (attendanceChart) attendanceChart.destroy();
        const ctx = document.getElementById('attendanceChart').getContext('2d');
        attendanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Present Students',
                    data: data,
                    borderColor: 'rgba(45, 104, 196, 0.9)',
                    backgroundColor: 'rgba(45, 104, 196, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#2d68c4'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Students Present', color: '#1e293b' } },
                    x: { title: { display: true, text: 'Date', color: '#1e293b' } }
                },
                plugins: {
                    legend: { labels: { color: '#1e293b' } }
                }
            }
        });
    }

    $(document).ready(function() {
        // Load courses and analytics on page load
        $.ajax({
            url: 'dash.php?request=get_data&type=courses',
            type: 'GET',
            dataType: 'json',
            timeout: AJAX_TIMEOUT,
            beforeSend: function() {
                Swal.fire({ title: 'Loading Dashboard...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
            },
            success: function(data) {
                Swal.close();
                if (data.status === 'success') {
                    const courses = data.data;
                    $('#courseCount').text(courses.length);
                    if (courses.length > 0) {
                        const unitCode = courses[0].unitCode; // Use first course for initial analytics
                        const startDate = '<?php echo date('Y-m-d', strtotime('-7 days')); ?>';
                        const endDate = '<?php echo date('Y-m-d'); ?>';
                        $.ajax({
                            url: 'dash.php?request=get_analytics',
                            type: 'POST',
                            contentType: 'application/x-www-form-urlencoded',
                            data: `unitCode=${encodeURIComponent(unitCode)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
                            dataType: 'json',
                            timeout: AJAX_TIMEOUT,
                            success: function(analytics) {
                                if (analytics.status === 'success') {
                                    $('#totalStudents').text(analytics.data.totalStudents || 0);
                                    $('#attendanceRate').text((analytics.data.attendanceRate || 0) + '%');
                                    const labels = analytics.data.trendData.map(d => d.dateMarked);
                                    const counts = analytics.data.trendData.map(d => d.count);
                                    initChart(labels, counts);
                                } else {
                                    showAlert(analytics.message, 'error');
                                }
                            },
                            error: function(xhr, status, error) {
                                showAlert('Error loading analytics: ' + error, 'error');
                                console.error('Analytics fetch error:', xhr.responseText);
                            }
                        });
                    }
                } else {
                    showAlert(data.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                Swal.close();
                showAlert('Error loading dashboard: ' + error, 'error');
                console.error('Courses fetch error:', xhr.responseText);
            }
        });
    });
</script>
</body>
</html>