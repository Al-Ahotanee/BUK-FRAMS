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
        try {
            $stmt = $pdo->query("SELECT courseCode, name FROM tblcourse");
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
        } catch (PDOException $e) {
            error_log('get_data courses error: ' . $e->getMessage());
            $response['message'] = 'Error fetching courses';
        }
    } elseif ($type === 'units') {
        $courseCode = filter_var($_GET['course'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
        if ($courseCode) {
            try {
                $stmt = $pdo->prepare("SELECT u.unitCode, u.name 
                                      FROM tblunit u 
                                      JOIN tblcourse c ON u.courseID = c.facultyID 
                                      WHERE c.courseCode = :courseCode");
                $stmt->execute([':courseCode' => $courseCode]);
                $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $response['status'] = 'success';
            } catch (PDOException $e) {
                error_log('get_data units error: ' . $e->getMessage());
                $response['message'] = 'Error fetching units';
            }
        } else {
            $response['message'] = 'Missing course code';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'generate_report') {
    $courseCode = filter_var($_POST['courseCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $startDate = filter_var($_POST['startDate'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $endDate = filter_var($_POST['endDate'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $reportType = filter_var($_POST['reportType'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $studentRegNo = filter_var($_POST['studentRegNo'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);

    if (!$courseCode || !$startDate || !$endDate || !$reportType) {
        $response['message'] = 'Missing required parameters';
        error_log("generate_report: Missing parameters - courseCode: $courseCode, startDate: $startDate, endDate: $endDate, reportType: $reportType");
    } else {
        try {
            if ($reportType === 'summary') {
                // Summary report: Attendance rate and student count
                $stmt = $pdo->prepare("SELECT COUNT(DISTINCT s.registrationNumber) as student_count,
                                             SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present_count,
                                             COUNT(a.attendanceID) as total_records
                                      FROM tblstudents s
                                      LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber
                                      AND a.dateMarked BETWEEN :startDate AND :endDate
                                      AND a.course = :courseCode
                                      WHERE s.courseCode = :courseCode");
                $stmt->execute([':courseCode' => $courseCode, ':startDate' => $startDate, ':endDate' => $endDate]);
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);
                $attendanceRate = $summary['total_records'] ? round(($summary['present_count'] / $summary['total_records']) * 100, 2) : 0;
                $response['data'] = [
                    'student_count' => $summary['student_count'],
                    'present_count' => $summary['present_count'],
                    'attendance_rate' => $attendanceRate
                ];
                $response['html'] = "<div class='alert alert-info'>
                                        <h4>Summary Report</h4>
                                        <p>Total Students: {$summary['student_count']}</p>
                                        <p>Present Records: {$summary['present_count']}</p>
                                        <p>Attendance Rate: {$attendanceRate}%</p>
                                     </div>";
                $response['status'] = 'success';
            } elseif ($reportType === 'detailed') {
                // Detailed report: Per-student attendance
                $query = "SELECT s.registrationNumber, s.firstName, s.lastName, a.attendanceStatus, a.dateMarked, a.unit
                          FROM tblstudents s
                          LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber
                          AND a.dateMarked BETWEEN :startDate AND :endDate
                          AND a.course = :courseCode";
                $params = [':courseCode' => $courseCode, ':startDate' => $startDate, ':endDate' => $endDate];
                if ($unitCode) {
                    $query .= " AND a.unit = :unitCode";
                    $params[':unitCode'] = $unitCode;
                }
                if ($studentRegNo) {
                    $query .= " AND s.registrationNumber = :studentRegNo";
                    $params[':studentRegNo'] = $studentRegNo;
                }
                $query .= " WHERE s.courseCode = :courseCode";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $html = '<table class="table table-striped table-bordered"><thead><tr><th>Reg No</th><th>Name</th><th>Unit</th><th>Status</th><th>Date</th></tr></thead><tbody>';
                foreach ($records as $record) {
                    $html .= "<tr><td>" . htmlspecialchars($record['registrationNumber']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['firstName'] . ' ' . $record['lastName']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['unit'] ?? '-') . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['attendanceStatus'] ?? '-') . "</td>";
                    $html .= "<td>" . htmlspecialchars($record['dateMarked'] ?? '-') . "</td></tr>";
                }
                $html .= '</tbody></table>';
                $response['status'] = empty($records) ? 'error' : 'success';
                $response['message'] = empty($records) ? 'No records found' : 'Detailed report generated';
                $response['html'] = empty($records) ? '<div class="alert alert-danger">No attendance records found.</div>' : $html;
                $response['data'] = $records;
            } elseif ($reportType === 'trends') {
                // Trends report: Attendance by date
                $query = "SELECT a.dateMarked, COUNT(*) as total, 
                                 SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present_count
                          FROM tblattendance a
                          WHERE a.course = :courseCode AND a.dateMarked BETWEEN :startDate AND :endDate";
                $params = [':courseCode' => $courseCode, ':startDate' => $startDate, ':endDate' => $endDate];
                if ($unitCode) {
                    $query .= " AND a.unit = :unitCode";
                    $params[':unitCode'] = $unitCode;
                }
                $query .= " GROUP BY a.dateMarked";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $response['data'] = $trends;
                $response['status'] = empty($trends) ? 'error' : 'success';
                $response['message'] = empty($trends) ? 'No trend data found' : 'Trends report generated';
            }
        } catch (PDOException $e) {
            error_log('generate_report error: ' . $e->getMessage());
            $response['message'] = 'Server error generating report';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'export_pdf') {
    $courseCode = filter_var($_POST['courseCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $unitCode = filter_var($_POST['unitCode'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $startDate = filter_var($_POST['startDate'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $endDate = filter_var($_POST['endDate'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $reportType = filter_var($_POST['reportType'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
    $studentRegNo = filter_var($_POST['studentRegNo'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);

    if (!$courseCode || !$startDate || !$endDate || !$reportType) {
        $response['message'] = 'Missing required parameters for PDF export';
        error_log("export_pdf: Missing parameters - courseCode: $courseCode, startDate: $startDate, endDate: $endDate, reportType: $reportType");
    } else {
        try {
            $courseStmt = $pdo->prepare("SELECT name FROM tblcourse WHERE courseCode = :courseCode");
            $courseStmt->execute([':courseCode' => $courseCode]);
            $courseName = $courseStmt->fetch(PDO::FETCH_ASSOC)['name'] ?? 'Unknown Course';
            $unitName = $unitCode ? ($pdo->prepare("SELECT name FROM tblunit WHERE unitCode = :unitCode")->execute([':unitCode' => $unitCode]) ? $pdo->fetch(PDO::FETCH_ASSOC)['name'] ?? 'Unknown Unit' : 'Unknown Unit') : 'All Units';

            if ($reportType === 'summary') {
                $stmt = $pdo->prepare("SELECT COUNT(DISTINCT s.registrationNumber) as student_count,
                                             SUM(CASE WHEN a.attendanceStatus = 'Present' THEN 1 ELSE 0 END) as present_count,
                                             COUNT(a.attendanceID) as total_records
                                      FROM tblstudents s
                                      LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber
                                      AND a.dateMarked BETWEEN :startDate AND :endDate
                                      AND a.course = :courseCode
                                      WHERE s.courseCode = :courseCode");
                $stmt->execute([':courseCode' => $courseCode, ':startDate' => $startDate, ':endDate' => $endDate]);
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);
                $attendanceRate = $summary['total_records'] ? round(($summary['present_count'] / $summary['total_records']) * 100, 2) : 0;

                $latex = "\\documentclass{article}\n";
                $latex .= "\\usepackage{geometry}\n\\geometry{a4paper, margin=1in}\n";
                $latex .= "\\usepackage{booktabs}\n\\usepackage[utf8]{inputenc}\n";
                $latex .= "\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n";
                $latex .= "\\begin{document}\n";
                $latex .= "\\title{Attendance Summary Report}\n";
                $latex .= "\\author{Smart Attendance System}\n";
                $latex .= "\\date{\\today}\n\\maketitle\n";
                $latex .= "\\section*{Course: $courseName}\n";
                $latex .= "\\noindent Date Range: $startDate to $endDate\n\n";
                $latex .= "\\begin{tabular}{ll}\n\\toprule\n";
                $latex .= "Metric & Value \\\\ \\midrule\n";
                $latex .= "Total Students & {$summary['student_count']} \\\\\n";
                $latex .= "Present Records & {$summary['present_count']} \\\\\n";
                $latex .= "Attendance Rate & {$attendanceRate}\\% \\\\\n";
                $latex .= "\\bottomrule\n\\end{tabular}\n";
                $latex .= "\\end{document}\n";

                $response['latex'] = $latex;
                $response['filename'] = "summary_report_{$courseCode}_" . date('Ymd') . ".tex";
                $response['status'] = 'success';
            } elseif ($reportType === 'detailed') {
                $query = "SELECT s.registrationNumber, s.firstName, s.lastName, a.attendanceStatus, a.dateMarked, a.unit
                          FROM tblstudents s
                          LEFT JOIN tblattendance a ON s.registrationNumber = a.studentRegistrationNumber
                          AND a.dateMarked BETWEEN :startDate AND :endDate
                          AND a.course = :courseCode";
                $params = [':courseCode' => $courseCode, ':startDate' => $startDate, ':endDate' => $endDate];
                if ($unitCode) {
                    $query .= " AND a.unit = :unitCode";
                    $params[':unitCode'] = $unitCode;
                }
                if ($studentRegNo) {
                    $query .= " AND s.registrationNumber = :studentRegNo";
                    $params[':studentRegNo'] = $studentRegNo;
                }
                $query .= " WHERE s.courseCode = :courseCode";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $latex = "\\documentclass{article}\n";
                $latex .= "\\usepackage{geometry}\n\\geometry{a4paper, margin=1in}\n";
                $latex .= "\\usepackage{booktabs}\n\\usepackage[utf8]{inputenc}\n";
                $latex .= "\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n";
                $latex .= "\\begin{document}\n";
                $latex .= "\\title{Detailed Attendance Report}\n";
                $latex .= "\\author{Smart Attendance System}\n";
                $latex .= "\\date{\\today}\n\\maketitle\n";
                $latex .= "\\section*{Course: $courseName}\n";
                $latex .= "\\noindent Unit: $unitName\n";
                $latex .= "\\noindent Date Range: $startDate to $endDate\n\n";
                $latex .= "\\begin{tabular}{llcll}\n\\toprule\n";
                $latex .= "Reg No & Name & Unit & Status & Date \\\\ \\midrule\n";
                foreach ($records as $record) {
                    $name = str_replace('&', '\\&', $record['firstName'] . ' ' . $record['lastName']);
                    $unit = str_replace('&', '\\&', $record['unit'] ?? '-');
                    $status = $record['attendanceStatus'] ?? '-';
                    $date = $record['dateMarked'] ?? '-';
                    $latex .= "{$record['registrationNumber']} & $name & $unit & $status & $date \\\\\n";
                }
                $latex .= "\\bottomrule\n\\end{tabular}\n";
                $latex .= "\\end{document}\n";

                $response['latex'] = $latex;
                $response['filename'] = "detailed_report_{$courseCode}_" . date('Ymd') . ".tex";
                $response['status'] = empty($records) ? 'error' : 'success';
                $response['message'] = empty($records) ? 'No records found for PDF export' : 'PDF report generated';
            }
        } catch (PDOException $e) {
            error_log('export_pdf error: ' . $e->getMessage());
            $response['message'] = 'Server error generating PDF';
        }
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
    <title>Attendance Reports</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .content-wrapper { background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%); }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-custom {
            background: linear-gradient(45deg, #028090, #00a896); color: white; border: none;
            transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-custom:hover {
            background: linear-gradient(45deg, #026670, #008573); transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .card {
            border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }
        .card:hover { box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15); }
        .table-container { max-height: 400px; overflow-y: auto; }
        .main-sidebar { background: linear-gradient(180deg, #003049 0%, #004b6b 100%); }
        .nav-link.active { background: #00a896 !important; color: white !important; border-radius: 6px; }
        .nav-link:hover { background: rgba(255, 255, 255, 0.1); color: white !important; }
        .brand-link { background: #003049; color: white !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        select.form-control, input.form-control {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300a896'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 0.75rem center;
            background-size: 1.5em; padding-right: 2.5rem;
        }
        .swal2-popup { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
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
            <span class="brand-text font-weight-bold">Smart Attendance <span style="color: #00a896;">Ms</span></span>
        </a>
        <div class="sidebar">
            <nav class="mt-2">
                <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                    <li class="nav-item">
                        <a href="attendance.php" class="nav-link">
                            <i class="nav-icon fas fa-clipboard-check"></i><p>Mark Attendance</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="dash.php" class="nav-link">
                            <i class="nav-icon fas fa-tachometer-alt"></i><p>Dashboard</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="list.php" class="nav-link">
                            <i class="nav-icon fas fa-list"></i><p>Student & Attendance List</p>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="reports.php" class="nav-link active">
                            <i class="nav-icon fas fa-file-alt"></i><p>Reports</p>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    </aside>
    <div class="content-wrapper">
        <div class="content-header">
            <div class="container-fluid">
                <h1 class="m-0 text-dark">Attendance Reports</h1>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="card card-primary card-outline p-4 mb-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Generate Report</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 form-group">
                                <label for="courseSelect">Course</label>
                                <select id="courseSelect" class="form-control">
                                    <option value="">Select Course</option>
                                </select>
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="unitSelect">Unit (Optional)</label>
                                <select id="unitSelect" class="form-control">
                                    <option value="">All Units</option>
                                </select>
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="startDate">Start Date</label>
                                <input type="date" id="startDate" class="form-control">
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="endDate">End Date</label>
                                <input type="date" id="endDate" class="form-control">
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-3 form-group">
                                <label for="reportType">Report Type</label>
                                <select id="reportType" class="form-control">
                                    <option value="summary">Summary</option>
                                    <option value="detailed">Detailed</option>
                                    <option value="trends">Trends</option>
                                </select>
                            </div>
                            <div class="col-md-3 form-group">
                                <label for="studentRegNo">Student Reg No (Optional)</label>
                                <input type="text" id="studentRegNo" class="form-control" placeholder="Enter Reg No">
                            </div>
                            <div class="col-md-6 form-group d-flex align-items-end">
                                <button id="generateReport" class="btn btn-custom mr-2"><i class="fas fa-chart-bar mr-2"></i>Generate Report</button>
                                <button id="exportPDF" class="btn btn-custom"><i class="fas fa-file-pdf mr-2"></i>Export as PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 fade-in">
                    <div class="card-header">
                        <h3 class="card-title">Report Output</h3>
                        <div class="card-tools">
                            <div class="input-group input-group-sm">
                                <input type="text" id="searchText" class="form-control" placeholder="Search report">
                                <div class="input-group-append">
                                    <button type="button" class="btn btn-default" onclick="searchItems()">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body table-responsive p-0">
                        <div id="reportContainer"></div>
                    </div>
                </div>
                <div class="card card-primary card-outline p-4 fade-in" id="trendsChartContainer" style="display: none;">
                    <div class="card-header">
                        <h3 class="card-title">Attendance Trends</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="trendsChart"></canvas>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<script>
    const AJAX_TIMEOUT = 5000;
    let trendsChart;

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

    function searchItems() {
        const input = $('#searchText').val().toLowerCase();
        $('#reportContainer tr').each(function(index) {
            if (index === 0) return;
            const cells = $(this).find('td');
            let found = false;
            cells.each(function() {
                if ($(this).text().toLowerCase().includes(input)) found = true;
            });
            $(this).toggle(found);
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

    $(document).ready(function() {
        // Load courses
        $.ajax({
            url: 'reports.php?request=get_data&type=courses',
            type: 'GET',
            dataType: 'json',
            timeout: AJAX_TIMEOUT,
            beforeSend: function() {
                Swal.fire({ title: 'Loading Courses...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
            },
            success: function(data) {
                Swal.close();
                if (data.status === 'success') {
                    $('#courseSelect').append(data.data.map(c => `<option value="${c.courseCode}">${c.name}</option>`));
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

        // Load units
        $('#courseSelect').change(function() {
            const course = $(this).val();
            $('#unitSelect').html('<option value="">All Units</option>');
            if (course) {
                $.ajax({
                    url: `reports.php?request=get_data&type=units&course=${encodeURIComponent(course)}`,
                    type: 'GET',
                    dataType: 'json',
                    timeout: AJAX_TIMEOUT,
                    beforeSend: function() {
                        Swal.fire({ title: 'Loading Units...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                    },
                    success: function(data) {
                        Swal.close();
                        if (data.status === 'success') {
                            $('#unitSelect').append(data.data.map(u => `<option value="${u.unitCode}">${u.name}</option>`));
                        } else {
                            showAlert(data.message, 'error');
                        }
                    },
                    error: function(xhr, status, error) {
                        Swal.close();
                        showAlert('Error fetching units: ' + error, 'error');
                        console.error('Units fetch error:', xhr.responseText);
                    }
                });
            }
        });

        // Generate report
        $('#generateReport').click(function() {
            const course = $('#courseSelect').val();
            const unit = $('#unitSelect').val();
            const startDate = $('#startDate').val();
            const endDate = $('#endDate').val();
            const reportType = $('#reportType').val();
            const studentRegNo = $('#studentRegNo').val();
            if (!course || !startDate || !endDate || !reportType) {
                showAlert('Please select course, date range, and report type.', 'warning');
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                showAlert('Start date cannot be after end date.', 'warning');
                return;
            }
            $.ajax({
                url: 'reports.php?request=generate_report',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: `courseCode=${encodeURIComponent(course)}&unitCode=${encodeURIComponent(unit)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&reportType=${encodeURIComponent(reportType)}&studentRegNo=${encodeURIComponent(studentRegNo)}`,
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    Swal.fire({ title: 'Generating Report...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                },
                success: function(data) {
                    Swal.close();
                    if (data.status === 'success') {
                        $('#reportContainer').html(data.html || '<div class="alert alert-info">Report generated.</div>');
                        if (reportType === 'trends') {
                            $('#trendsChartContainer').show();
                            const labels = data.data.map(d => d.dateMarked);
                            const counts = data.data.map(d => d.present_count);
                            initChart(labels, counts);
                        } else {
                            $('#trendsChartContainer').hide();
                        }
                        showAlert(data.message || 'Report generated successfully', 'success');
                    } else {
                        $('#reportContainer').html('<div class="alert alert-danger">No data found for the selected criteria.</div>');
                        $('#trendsChartContainer').hide();
                        showAlert(data.message, 'error');
                    }
                },
                error: function(xhr, status, error) {
                    Swal.close();
                    showAlert('Error generating report: ' + error, 'error');
                    console.error('Report generation error:', xhr.responseText);
                }
            });
        });

        // Export PDF
        $('#exportPDF').click(function() {
            const course = $('#courseSelect').val();
            const unit = $('#unitSelect').val();
            const startDate = $('#startDate').val();
            const endDate = $('#endDate').val();
            const reportType = $('#reportType').val();
            const studentRegNo = $('#studentRegNo').val();
            if (!course || !startDate || !endDate || !reportType) {
                showAlert('Please select course, date range, and report type.', 'warning');
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                showAlert('Start date cannot be after end date.', 'warning');
                return;
            }
            $.ajax({
                url: 'reports.php?request=export_pdf',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: `courseCode=${encodeURIComponent(course)}&unitCode=${encodeURIComponent(unit)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&reportType=${encodeURIComponent(reportType)}&studentRegNo=${encodeURIComponent(studentRegNo)}`,
                dataType: 'json',
                timeout: AJAX_TIMEOUT,
                beforeSend: function() {
                    Swal.fire({ title: 'Generating PDF...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, position: 'center' });
                },
                success: function(data) {
                    Swal.close();
                    if (data.status === 'success') {
                        const blob = new Blob([data.latex], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = data.filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        showAlert('PDF report generated successfully', 'success');
                    } else {
                        showAlert(data.message, 'error');
                    }
                },
                error: function(xhr, status, error) {
                    Swal.close();
                    showAlert('Error generating PDF: ' + error, 'error');
                    console.error('PDF export error:', xhr.responseText);
                }
            });
        });
    });
</script>
</body>
</html>