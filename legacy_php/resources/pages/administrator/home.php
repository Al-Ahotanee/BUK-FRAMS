<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/pages/administrator/php_errors.log');
error_reporting(E_ALL);

// Debug mode (set to false in production)
$debug = false;

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

// Check if user is authenticated
if (!isset($_SESSION['user']['email']) || $_SESSION['user']['role'] !== 'administrator') {
    error_log('Unauthorized access attempt to home.php: ' . json_encode($_SESSION));
    if (isset($_GET['request'])) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
        exit;
    }
    header('Location: ../../login.php');
    exit;
}

// Set session variables for compatibility
$_SESSION['emailAddress'] = $_SESSION['user']['email'];
$_SESSION['firstName'] = $_SESSION['user']['name'];

// Handle API requests
$request = $_GET['request'] ?? $_POST['request'] ?? '';
$response = ['status' => 'error', 'message' => 'Invalid request', 'data' => []];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $request === 'get_dashboard_data') {
    $period = filter_var($_GET['period'] ?? 'today', FILTER_SANITIZE_SPECIAL_CHARS);
    error_log("Processing get_dashboard_data request with period: $period");
    try {
        $dateFilter = '';
        $params = [];
        if ($period === 'today') {
            $dateFilter = 'WHERE a.dateMarked = CURDATE()';
        } elseif ($period === 'lastweek') {
            $dateFilter = 'WHERE a.dateMarked >= CURDATE() - INTERVAL 7 DAY';
        } elseif ($period === 'lastmonth') {
            $dateFilter = 'WHERE a.dateMarked >= CURDATE() - INTERVAL 1 MONTH';
        } elseif ($period === 'lastyear') {
            $dateFilter = 'WHERE a.dateMarked >= CURDATE() - INTERVAL 1 YEAR';
        }

        $studentsStmt = $pdo->query("SELECT COUNT(*) as count FROM tblstudents");
        $lecturersStmt = $pdo->query("SELECT COUNT(*) as count FROM tbllecture");
        $unitsStmt = $pdo->query("SELECT COUNT(*) as count FROM tblunit");
        $coursesStmt = $pdo->query("SELECT COUNT(*) as count FROM tblcourse");
        $venuesStmt = $pdo->query("SELECT COUNT(*) as count FROM tblvenue");

        $attendanceStmt = $pdo->prepare("SELECT 
            COUNT(a.attendanceID) as total_records,
            SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present_count
            FROM tblattendance a $dateFilter");
        $attendanceStmt->execute($params);
        $attendanceData = $attendanceStmt->fetch(PDO::FETCH_ASSOC);
        $attendanceRate = $attendanceData['total_records'] ? round(($attendanceData['present_count'] / $attendanceData['total_records']) * 100, 2) : 0;

        $lowAttendanceStmt = $pdo->prepare("SELECT s.registrationNumber, s.firstName, s.lastName, 
            COUNT(a.attendanceID) as total, 
            SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present
            FROM tblstudents s
            LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber $dateFilter
            GROUP BY s.registrationNumber
            HAVING (present / NULLIF(total, 0)) < 0.7 AND total > 0");
        $lowAttendanceStmt->execute($params);
        $lowAttendance = $lowAttendanceStmt->fetchAll(PDO::FETCH_ASSOC);

        $trendsStmt = $pdo->prepare("SELECT a.dateMarked, 
            COUNT(*) as total, 
            SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present_count
            FROM tblattendance a $dateFilter
            GROUP BY a.dateMarked
            ORDER BY a.dateMarked");
        $trendsStmt->execute($params);
        $trends = $trendsStmt->fetchAll(PDO::FETCH_ASSOC);

        $response['status'] = 'success';
        $response['data'] = [
            'students' => $studentsStmt->fetch(PDO::FETCH_ASSOC)['count'],
            'lecturers' => $lecturersStmt->fetch(PDO::FETCH_ASSOC)['count'],
            'units' => $unitsStmt->fetch(PDO::FETCH_ASSOC)['count'],
            'courses' => $coursesStmt->fetch(PDO::FETCH_ASSOC)['count'],
            'venues' => $venuesStmt->fetch(PDO::FETCH_ASSOC)['count'],
            'attendance_rate' => $attendanceRate,
            'low_attendance' => $lowAttendance,
            'trends' => $trends
        ];
    } catch (PDOException $e) {
        error_log('get_dashboard_data error: ' . $e->getMessage());
        $response['message'] = 'Error fetching dashboard data';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'delete_record') {
    $id = filter_var($_POST['id'] ?? '', FILTER_SANITIZE_NUMBER_INT);
    $type = filter_var($_POST['type'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $tableMap = [
        'lecture' => 'tbllecture',
        'students' => 'tblstudents',
        'venue' => 'tblvenue',
        'course' => 'tblcourse'
    ];
    if ($id && isset($tableMap[$type])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM {$tableMap[$type]} WHERE Id = :id");
            $stmt->execute([':id' => $id]);
            $response['status'] = 'success';
            $response['message'] = ucfirst($type) . ' deleted successfully';
        } catch (PDOException $e) {
            error_log("delete_record error ($type, ID: $id): " . $e->getMessage());
            $response['message'] = 'Error deleting ' . $type;
        }
    } else {
        $response['message'] = 'Invalid ID or type';
        error_log("delete_record: Invalid ID ($id) or type ($type)");
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'export_csv') {
    $type = filter_var($_POST['type'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $tableMap = [
        'lecture' => ['table' => 'tbllecture', 'columns' => ['firstName', 'emailAddress', 'phoneNo', 'facultyCode', 'dateCreated'], 'headers' => ['Name', 'Email Address', 'Phone No', 'Faculty', 'Date Registered']],
        'students' => ['table' => 'tblstudents', 'columns' => ['registrationNumber', 'firstName', 'faculty', 'courseCode', 'email'], 'headers' => ['Reg No', 'Name', 'Faculty', 'Course', 'Email']],
        'course' => ['table' => 'tblcourse', 'columns' => ['name', 'facultyID', 'dateCreated'], 'headers' => ['Name', 'Faculty', 'Date Created']],
        'venue' => ['table' => 'tblvenue', 'columns' => ['className', 'facultyCode', 'currentStatus', 'capacity', 'classification'], 'headers' => ['Class Name', 'Faculty', 'Current Status', 'Capacity', 'Classification']]
    ];
    if (isset($tableMap[$type])) {
        try {
            $columns = implode(',', $tableMap[$type]['columns']);
            $stmt = $pdo->query("SELECT $columns FROM {$tableMap[$type]['table']}");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $csv = fopen('php://output', 'w');
            fputcsv($csv, $tableMap[$type]['headers']);
            foreach ($data as $row) {
                fputcsv($csv, array_map('htmlspecialchars_decode', array_values($row)));
            }
            fclose($csv);
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . $type . '_export_' . date('Ymd') . '.csv"');
            exit;
        } catch (PDOException $e) {
            error_log("export_csv error ($type): " . $e->getMessage());
            $response['message'] = 'Error exporting ' . $type . ' data';
        }
    } else {
        $response['message'] = 'Invalid export type';
        error_log("export_csv: Invalid type ($type)");
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
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .main-sidebar { background: linear-gradient(180deg, #003049 0%, #004b6b 100%); }
        .brand-link { background: #003049; color: white !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .nav-link { color: white !important; }
        .nav-link:hover { background: rgba(255, 255, 255, 0.1); }
        .nav-link.active { background: #00a896 !important; border-radius: 6px; }
        .main-header { background: linear-gradient(90deg, #003049, #00a896); }
        .content-wrapper { background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%); }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-custom {
            background: linear-gradient(45deg, #028090, #00a896);
            color: white;
            border: none;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-custom:hover {
            background: linear-gradient(45deg, #026670, #008573);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        .card:hover { box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15); }
        .card-header { background: linear-gradient(45deg, #028090, #00a896); color: white; }
        .info-box { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .info-box-icon { background: linear-gradient(45deg, #028090, #00a896); color: white; }
        select.form-control {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300a896'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
            background-size: 1.5em;
            padding-right: 2.5rem;
        }
        .swal2-popup { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
        .low-attendance { color: #dc3545; font-weight: 600; }
    </style>
</head>
<body class="hold-transition sidebar-mini layout-fixed">
<div class="wrapper">
    <nav class="main-header navbar navbar-expand navbar-dark">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="home.php">Face Recognition Based Attendance System<span style="color: #00a896;"> </span></a>
            </li>
        </ul>
        <ul class="navbar-nav ml-auto">
            <li class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <i class="fas fa-user mr-2"></i><?php echo htmlspecialchars($_SESSION['firstName'] ?? 'Admin'); ?>
                </a>
                <div class="dropdown-menu dropdown-menu-right">
                    <a href="../../logout.php" class="dropdown-item"><i class="fas fa-sign-out-alt mr-2"></i> Logout</a>
                </div>
            </li>
        </ul>
    </nav>
    <?php include 'sidebar.php'; ?>
    <div class="content-wrapper">
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0">Admin Dashboard</h1>
                    </div>
                </div>
                <?php if ($debug): ?>
                    <pre>Session Debug: <?php print_r($_SESSION); ?></pre>
                <?php endif; ?>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row mb-4">
                    <div class="col-md-3 form-group">
                        <label for="periodSelect">Time Period</label>
                        <select id="periodSelect" class="form-control">
                            <option value="today">Today</option>
                            <option value="lastweek">Last Week</option>
                            <option value="lastmonth">Last Month</option>
                            <option value="lastyear">Last Year</option>
                            <option value="alltime">All Time</option>
                        </select>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-users"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Registered Students</span>
                                <span class="info-box-number" id="studentCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-user-tie"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Registered Lecturers</span>
                                <span class="info-box-number" id="lecturerCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-book"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Units</span>
                                <span class="info-box-number" id="unitCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-graduation-cap"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Courses</span>
                                <span class="info-box-number" id="courseCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-building"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Venues</span>
                                <span class="info-box-number" id="venueCount">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-chart-line"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Attendance Rate</span>
                                <span class="info-box-number" id="attendanceRate">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Attendance Trends</h3>
                            </div>
                            <div class="card-body">
                                <canvas id="trendsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Low Attendance Alerts</h3>
                                <div class="card-tools">
                                    <button id="exportLowAttendance" class="btn btn-custom"><i class="fas fa-file-pdf mr-2"></i>Export PDF</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="lowAttendanceTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Reg No</th>
                                            <th>Name</th>
                                            <th>Attendance Rate</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Lecturers</h3>
                                <div class="card-tools">
                                    <a href="manage-lecture.php.php" class="btn btn-custom"><i class="fas fa-plus mr-2"></i>Add Lecturer</a>
                                    <button class="btn btn-custom export-csv" data-type="lecture"><i class="fas fa-file-csv mr-2"></i>Export CSV</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="lecturerTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email Address</th>
                                            <th>Phone No</th>
                                            <th>Faculty</th>
                                            <th>Date Registered</th>
                                            <th>Settings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT l.*, f.facultyName FROM tbllecture l LEFT JOIN tblfaculty f ON l.facultyCode = f.facultyCode");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowlecture{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['firstName'] . ' ' . $row['lastName']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['emailAddress']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['phoneNo']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['facultyName'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['dateCreated']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='lecture'><i class='fas fa-trash'></i></button></td>";
                                            echo "</tr>";
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Students</h3>
                                <div class="card-tools">
                                    <a href="manage-lecture.php.php" class="btn btn-custom"><i class="fas fa-plus mr-2"></i>Add Student</a>
                                    <button class="btn btn-custom export-csv" data-type="students"><i class="fas fa-file-csv mr-2"></i>Export CSV</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="studentTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Reg No</th>
                                            <th>Name</th>
                                            <th>Faculty</th>
                                            <th>Course</th>
                                            <th>Email</th>
                                            <th>Settings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT s.*, c.name as courseName, f.facultyName 
                                            FROM tblstudents s 
                                            LEFT JOIN tblcourse c ON s.courseCode = c.courseCode 
                                            LEFT JOIN tblfaculty f ON s.faculty = f.facultyCode");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowstudents{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['registrationNumber']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['firstName'] . ' ' . $row['lastName']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['facultyName'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['courseName'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['email']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='students'><i class='fas fa-trash'></i></button></td>";
                                            echo "</tr>";
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Courses</h3>
                                <div class="card-tools">
                                    <a href="manage-course.php" class="btn btn-custom"><i class="fas fa-plus mr-2"></i>Add Course</a>
                                    <button class="btn btn-custom export-csv" data-type="course"><i class="fas fa-file-csv mr-2"></i>Export CSV</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="courseTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Faculty</th>
                                            <th>Total Units</th>
                                            <th>Total Students</th>
                                            <th>Date Created</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT c.name AS course_name, c.Id AS Id, c.facultyID AS faculty, 
                                            f.facultyName AS faculty_name, COUNT(u.Id) AS total_units, 
                                            COUNT(DISTINCT s.Id) AS total_students, c.dateCreated AS date_created
                                            FROM tblcourse c
                                            LEFT JOIN tblunit u ON c.Id = u.courseID
                                            LEFT JOIN tblstudents s ON c.courseCode = s.courseCode
                                            LEFT JOIN tblfaculty f ON c.facultyID = f.Id
                                            GROUP BY c.Id");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowcourse{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['course_name']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['faculty_name'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_units']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_students']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['date_created']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='course'><i class='fas fa-trash'></i></button></td>";
                                            echo "</tr>";
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Venues</h3>
                                <div class="card-tools">
                                    <a href="create-venue.php.php" class="btn btn-custom"><i class="fas fa-plus mr-2"></i>Add Venue</a>
                                    <button class="btn btn-custom export-csv" data-type="venue"><i class="fas fa-file-csv mr-2"></i>Export CSV</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="venueTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Class Name</th>
                                            <th>Faculty</th>
                                            <th>Current Status</th>
                                            <th>Capacity</th>
                                            <th>Classification</th>
                                            <th>Settings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT v.*, f.facultyName FROM tblvenue v LEFT JOIN tblfaculty f ON v.facultyCode = f.facultyCode");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowvenue{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['className']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['facultyName'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['currentStatus']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['capacity']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['classification']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='venue'><i class='fas fa-trash'></i></button></td>";
                                            echo "</tr>";
                                        }
                                        ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<script>
    const AJAX_TIMEOUT = 5000;
    let trendsChart;
    const BASE_URL = '/T/Face-Recognition-Attendance-System-main/resources/pages/administrator/';

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
        if (trendsChart) trendsChart.destroy();
        const ctx = document.getElementById('trendsChart').getContext('2d');
        trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Present Students',
                    data: data,
                    borderColor: '#00a896',
                    backgroundColor: 'rgba(0, 168, 150, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Students' } },
                    x: { title: { display: true, text: 'Date' } }
                }
            }
        });
    }

    function loadDashboardData(period) {
        $.ajax({
            url: BASE_URL + 'home.php?request=get_dashboard_data&period=' + encodeURIComponent(period),
            type: 'GET',
            dataType: 'json',
            timeout: AJAX_TIMEOUT,
            beforeSend: function() {
                Swal.fire({ title: 'Loading Dashboard...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
            },
            success: function(data) {
                Swal.close();
                if (data.status === 'success') {
                    $('#studentCount').text(data.data.students);
                    $('#lecturerCount').text(data.data.lecturers);
                    $('#unitCount').text(data.data.units);
                    $('#courseCount').text(data.data.courses);
                    $('#venueCount').text(data.data.venues);
                    $('#attendanceRate').text(data.data.attendance_rate + '%');

                    const table = $('#lowAttendanceTable').DataTable();
                    table.clear();
                    if (data.data.low_attendance.length > 0) {
                        data.data.low_attendance.forEach(student => {
                            const rate = student.total ? ((student.present / student.total) * 100).toFixed(2) : 0;
                            table.row.add([
                                student.registrationNumber,
                                `${student.firstName} ${student.lastName}`,
                                `${rate}%`,
                                '<button class="btn btn-sm btn-warning notify-student" data-regno="' + student.registrationNumber + '">Notify</button>'
                            ]).draw();
                        });
                    } else {
                        table.row.add(['-', 'No low attendance records', '-', '-']).draw();
                    }

                    if (data.data.trends.length > 0) {
                        initChart(data.data.trends.map(t => t.dateMarked), data.data.trends.map(t => t.present_count));
                    } else {
                        $('#trendsChart').parent().html('<div class="alert alert-info">No attendance data for this period.</div>');
                    }
                } else {
                    showAlert(data.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                Swal.close();
                showAlert('Error loading dashboard data: ' + error, 'error');
                console.error('Dashboard data error:', xhr.responseText);
            }
        });
    }

    $(document).ready(function() {
        $('#lecturerTable, #studentTable, #courseTable, #venueTable, #lowAttendanceTable').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            info: true,
            lengthMenu: [5, 10, 25],
            pageLength: 5
        });

        loadDashboardData('today');

        $('#periodSelect').change(function() {
            loadDashboardData($(this).val());
        });

        $(document).on('click', '.delete-record', function() {
            const id = $(this).data('id');
            const type = $(this).data('type');
            Swal.fire({
                title: 'Are you sure?',
                text: `Delete this ${type}? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#00a896',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!',
                customClass: { popup: 'swal2-popup' }
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: BASE_URL + 'home.php?request=delete_record',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
                        dataType: 'json',
                        timeout: AJAX_TIMEOUT,
                        success: function(response) {
                            if (response.status === 'success') {
                                $(`#row${type}${id}`).remove();
                                showAlert(response.message, 'success');
                            } else {
                                showAlert(response.message, 'error');
                            }
                        },
                        error: function(xhr, status, error) {
                            showAlert('Error deleting record: ' + error, 'error');
                            console.error('Delete error:', xhr.responseText);
                        }
                    });
                }
            });
        });

        $(document).on('click', '.export-csv', function() {
            const type = $(this).data('type');
            $.ajax({
                url: BASE_URL + 'home.php?request=export_csv',
                type: 'POST',
                data: `type=${encodeURIComponent(type)}`,
                xhrFields: {
                    responseType: 'blob'
                },
                beforeSend: function() {
                    Swal.fire({ title: 'Exporting CSV...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                },
                success: function(data) {
                    Swal.close();
                    const url = window.URL.createObjectURL(data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    showAlert('CSV exported successfully', 'success');
                },
                error: function(xhr, status, error) {
                    Swal.close();
                    showAlert('Error exporting CSV: ' + error, 'error');
                    console.error('CSV export error:', xhr.responseText);
                }
            });
        });

        $('#exportLowAttendance').click(function() {
            const period = $('#periodSelect').val();
            $.ajax({
                url: BASE_URL + 'home.php?request=get_dashboard_data&period=' + encodeURIComponent(period),
                type: 'GET',
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    Swal.fire({ title: 'Generating PDF...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                },
                success: function(data) {
                    Swal.close();
                    if (data.status === 'success' && data.data.low_attendance.length > 0) {
                        const latex = `\\documentclass{article}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}
\\usepackage{booktabs}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\begin{document}
\\title{Low Attendance Report}
\\author{Smart Attendance System}
\\date{\\today}
\\maketitle
\\section*{Low Attendance Alerts}
\\noindent Period: ${period.charAt(0).toUpperCase() + period.slice(1)}
\\begin{tabular}{llr}
\\toprule
Reg No & Name & Attendance Rate \\\\ \\midrule
${data.data.low_attendance.map(s => `${s.registrationNumber} & ${s.firstName} ${s.lastName} & ${((s.present / s.total) * 100).toFixed(2)}\\% \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{document}`;
                        const blob = new Blob([latex], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `low_attendance_report_${period}_${new Date().toISOString().slice(0, 10)}.tex`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        showAlert('Low attendance report exported successfully', 'success');
                    } else {
                        showAlert('No low attendance records to export', 'warning');
                    }
                },
                error: function(xhr, status, error) {
                    Swal.close();
                    showAlert('Error exporting report: ' + error, 'error');
                    console.error('Export error:', xhr.responseText);
                }
            });
        });

        $(document).on('click', '.notify-student', function() {
            const regNo = $(this).data('regno');
            showAlert(`Notification for student ${regNo} would be sent here (e.g., via email).`, 'info');
        });
    });
</script>
</body>
</html>