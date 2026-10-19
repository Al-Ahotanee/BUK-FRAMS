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
    error_log('Unauthorized access attempt to adminlog.php: ' . json_encode($_SESSION));
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

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $request === 'get_admin_logs') {
    try {
        // Query to fetch log data. Assuming a table named `tbl_admin_logs`
        // with columns `timestamp`, `user_name`, `action`, `description`.
        // You may need to adjust this query based on your actual database schema.
        $stmt = $pdo->query("SELECT * FROM tbl_admin_logs ORDER BY timestamp DESC");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['status'] = 'success';
        $response['data'] = $logs;
    } catch (PDOException $e) {
        error_log('get_admin_logs error: ' . $e->getMessage());
        $response['message'] = 'Error fetching admin logs';
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'export_csv') {
    try {
        // Fetch all admin logs to export
        $stmt = $pdo->query("SELECT * FROM tbl_admin_logs ORDER BY timestamp DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($data)) {
            $response['message'] = 'No data to export.';
        } else {
            // Define CSV headers based on the fetched data keys
            $headers = array_keys($data[0]);

            $csv = fopen('php://output', 'w');
            fputcsv($csv, $headers);
            foreach ($data as $row) {
                fputcsv($csv, array_map('htmlspecialchars_decode', array_values($row)));
            }
            fclose($csv);

            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="admin_logs_export_' . date('Ymd') . '.csv"');
            exit;
        }
    } catch (PDOException $e) {
        error_log("export_csv error (admin_logs): " . $e->getMessage());
        $response['message'] = 'Error exporting admin log data';
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
    <title>Admin Logs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
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
        .dataTables_wrapper .dataTables_filter { text-align: right; }
        .dataTables_wrapper .dataTables_paginate { text-align: right; }
        .table th { background: #f1f5f9; }
    </style>
</head>
<body class="hold-transition sidebar-mini layout-fixed">
<div class="wrapper">
    <!-- Navbar -->
    <nav class="main-header navbar navbar-expand navbar-dark">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="home.php">Smart Attendance <span style="color: #00a896;">Ms</span></a>
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
    <!-- End Navbar -->

    <?php include 'sidebar.php'; ?>

    <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
        <div class="content-header">
            <div class="container-fluid">
                <div class="row mb-2">
                    <div class="col-sm-6">
                        <h1 class="m-0">Admin Logs</h1>
                    </div>
                </div>
                <?php if ($debug): ?>
                    <pre>Session Debug: <?php print_r($_SESSION); ?></pre>
                <?php endif; ?>
            </div>
        </div>
        <!-- Main content -->
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">System Activity Logs</h3>
                                <div class="card-tools">
                                    <button id="exportCsvBtn" class="btn btn-custom export-csv" data-type="admin_logs"><i class="fas fa-file-csv mr-2"></i>Export CSV</button>
                                </div>
                            </div>
                            <div class="card-body table-responsive">
                                <table id="adminLogsTable" class="table table-striped table-bordered" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be loaded via AJAX -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <!-- /.content -->
    </div>
    <!-- /.content-wrapper -->
</div>
<!-- ./wrapper -->

<script>
$(document).ready(function() {
    // Initialize DataTable
    var table = $('#adminLogsTable').DataTable({
        "paging": true,
        "lengthChange": true,
        "searching": true,
        "ordering": true,
        "info": true,
        "autoWidth": false,
        "responsive": true
    });

    // Function to fetch and display admin logs
    function fetchAdminLogs() {
        $.ajax({
            url: 'adminlog.php',
            type: 'GET',
            dataType: 'json',
            data: { request: 'get_admin_logs' },
            success: function(response) {
                if (response.status === 'success') {
                    table.clear().draw();
                    $.each(response.data, function(index, log) {
                        // Assuming the log data keys match the table headers
                        table.row.add([
                            log.timestamp,
                            log.user_name,
                            log.action,
                            log.description
                        ]).draw(false);
                    });
                } else {
                    Swal.fire('Error', response.message, 'error');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                Swal.fire('Error', 'Failed to fetch admin logs. Please try again.', 'error');
                console.error("AJAX Error: " + textStatus, errorThrown);
            }
        });
    }

    // Handle CSV export button click
    $('#exportCsvBtn').on('click', function() {
        var form = $('<form action="adminlog.php" method="post" style="display:none;"></form>');
        form.append('<input type="hidden" name="request" value="export_csv" />');
        $('body').append(form);
        form.submit();
        form.remove();
    });

    // Initial data load
    fetchAdminLogs();
});
</script>

</body>
</html>
