<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/pages/administrator/php_errors.log');
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

// Check if user is authenticated
if (!isset($_SESSION['user']['email']) || $_SESSION['user']['role'] !== 'administrator') {
    error_log('Unauthorized access attempt to manage-students.php: ' . json_encode($_SESSION));
    header('Location: ../../login');
    exit;
}

// Set session variables for compatibility
$_SESSION['emailAddress'] = $_SESSION['user']['email'];
$_SESSION['firstName'] = $_SESSION['user']['name'];

// Handle form submissions and AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    if (isset($_POST["addStudent"])) {
        // Sanitize and validate inputs
        $firstName = htmlspecialchars(trim($_POST['firstName'] ?? ''));
        $lastName = htmlspecialchars(trim($_POST['lastName'] ?? ''));
        $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
        $registrationNumber = preg_replace('/[^A-Za-z0-9\-]/', '', trim($_POST['registrationNumber'] ?? '')); // Sanitize for file system
        $courseCode = htmlspecialchars(trim($_POST['course'] ?? ''));
        $faculty = htmlspecialchars(trim($_POST['faculty'] ?? ''));
        $dateRegistered = date("Y-m-d");

        // Validate registration number
        if (!preg_match('/^[A-Za-z0-9\-]{3,50}$/', $registrationNumber)) {
            $response['message'] = 'Invalid registration number. Use only letters, numbers, and hyphens (3-50 characters).';
            error_log("Invalid registration number: $registrationNumber");
            $_SESSION['message'] = $response['message'];
            $_SESSION['message_type'] = $response['status'];
            header('Location: manage-students.php');
            exit;
        }

        $imageFileNames = [];
        $folderPath = "resources/labels/{$registrationNumber}/";
        if (!file_exists($folderPath)) {
            if (!mkdir($folderPath, 0777, true)) {
                $response['message'] = 'Failed to create directory for images.';
                error_log("Failed to create directory: $folderPath");
                $_SESSION['message'] = $response['message'];
                $_SESSION['message_type'] = $response['status'];
                header('Location: manage-students.php');
                exit;
            }
        }

        $capturedImages = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (isset($_POST["capturedImage$i"]) && !empty($_POST["capturedImage$i"])) {
                try {
                    $imageData = $_POST["capturedImage$i"];
                    if (strpos($imageData, 'data:image/png;base64,') !== 0) {
                        error_log("Invalid image data format for image $i for student $registrationNumber");
                        continue; // Skip invalid image data
                    }

                    $base64Data = explode(',', $imageData)[1];
                    if (!base64_decode($base64Data, true)) {
                        error_log("Invalid base64 data for image $i for student $registrationNumber");
                        continue; // Skip invalid base64
                    }

                    $decodedImage = base64_decode($base64Data);
                    if ($decodedImage === false) {
                        error_log("Failed to decode base64 image $i for student $registrationNumber");
                        continue;
                    }

                    $fileName = "{$registrationNumber}_image{$i}.png";
                    $labelName = "{$i}.png";
                    $fullPath = "{$folderPath}{$labelName}";

                    if (!is_writable(dirname($fullPath))) {
                        $response['message'] = "Directory $folderPath is not writable.";
                        error_log("Directory not writable: $folderPath");
                        $_SESSION['message'] = $response['message'];
                        $_SESSION['message_type'] = $response['status'];
                        header('Location: manage-students.php');
                        exit;
                    }

                    if (file_put_contents($fullPath, $decodedImage)) {
                        $imageFileNames[] = $fileName;
                        $capturedImages++;
                        error_log("Successfully saved image $i for student $registrationNumber at $fullPath");
                    } else {
                        error_log("Failed to save image $i for student $registrationNumber at $fullPath");
                    }
                } catch (Exception $e) {
                    error_log("Error processing image $i for student $registrationNumber: " . $e->getMessage());
                }
            }
        }

        $imagesJson = json_encode($imageFileNames);

        if (!$email || !$firstName || !$lastName || !$registrationNumber || !$courseCode || !$faculty) {
            $response['message'] = "All fields are required and must be valid.";
            error_log("Validation failed: Missing or invalid fields for student $registrationNumber");
        } elseif ($capturedImages === 0) {
            $response['message'] = "At least one valid image is required.";
            error_log("No valid images captured for student $registrationNumber");
        } else {
            try {
                // Start transaction
                $pdo->beginTransaction();

                // Check for existing student
                $checkQuery = $pdo->prepare("SELECT COUNT(*) FROM tblstudents WHERE registrationNumber = :registrationNumber");
                $checkQuery->execute([':registrationNumber' => $registrationNumber]);
                $count = $checkQuery->fetchColumn();

                if ($count > 0) {
                    $response['message'] = "Student with Registration No: $registrationNumber already exists!";
                    error_log("Duplicate registration number: $registrationNumber");
                } else {
                    $insertQuery = $pdo->prepare(
                        "INSERT INTO tblstudents 
                        (firstName, lastName, email, registrationNumber, faculty, courseCode, studentImage, dateRegistered) 
                        VALUES (:firstName, :lastName, :email, :registrationNumber, :faculty, :courseCode, :studentImage, :dateRegistered)"
                    );
                    $success = $insertQuery->execute([
                        ':firstName' => $firstName,
                        ':lastName' => $lastName,
                        ':email' => $email,
                        ':registrationNumber' => $registrationNumber,
                        ':faculty' => $faculty,
                        ':courseCode' => $courseCode,
                        ':studentImage' => $imagesJson,
                        ':dateRegistered' => $dateRegistered
                    ]);

                    if (!$success) {
                        throw new PDOException("Failed to insert student record");
                    }

                    $pdo->commit();
                    $response['status'] = 'success';
                    $response['message'] = "Student: $registrationNumber added successfully with $capturedImages images!";
                    error_log("Student $registrationNumber added successfully with $capturedImages images");
                }
            } catch (PDOException $e) {
                $pdo->rollBack();
                $response['message'] = "Database Error: " . $e->getMessage();
                error_log("Student insertion error for $registrationNumber: " . $e->getMessage());
            } catch (Exception $e) {
                $pdo->rollBack();
                $response['message'] = "Unexpected error: " . $e->getMessage();
                error_log("Unexpected error for $registrationNumber: " . $e->getMessage());
            }
        }

        $_SESSION['message'] = $response['message'];
        $_SESSION['message_type'] = $response['status'];
        header('Location: manage-students.php');
        exit;
    } elseif (isset($_POST['request']) && $_POST['request'] === 'delete_record') {
        $id = filter_var($_POST['id'] ?? '', FILTER_SANITIZE_NUMBER_INT);
        if ($id) {
            try {
                $stmt = $pdo->prepare("SELECT registrationNumber FROM tblstudents WHERE Id = :id");
                $stmt->execute([':id' => $id]);
                $registrationNumber = $stmt->fetchColumn();

                if ($registrationNumber) {
                    $folderPath = "resources/labels/{$registrationNumber}/";
                    if (file_exists($folderPath)) {
                        array_map('unlink', glob("$folderPath*.png"));
                        rmdir($folderPath);
                    }

                    $stmt = $pdo->prepare("DELETE FROM tblstudents WHERE Id = :id");
                    $stmt->execute([':id' => $id]);
                    $response['status'] = 'success';
                    $response['message'] = 'Student deleted successfully';
                } else {
                    $response['message'] = 'Student not found';
                }
            } catch (PDOException $e) {
                error_log("delete_record error (student, ID: $id): " . $e->getMessage());
                $response['message'] = 'Error deleting student';
            }
        } else {
            $response['message'] = 'Invalid ID';
            error_log("delete_record: Invalid ID ($id)");
        }
    } elseif (isset($_POST['request']) && $_POST['request'] === 'get_student_images') {
        try {
            $stmt = $pdo->query("SELECT registrationNumber, studentImage FROM tblstudents");
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $imageData = [];
            foreach ($students as $student) {
                $images = json_decode($student['studentImage'], true);
                if (is_array($images)) {
                    foreach ($images as $index => $image) {
                        $imagePath = "resources/labels/{$student['registrationNumber']}/" . ($index + 1) . ".png";
                        if (file_exists($imagePath)) {
                            $imageData[] = [
                                'registrationNumber' => $student['registrationNumber'],
                                'imagePath' => "http://localhost/T/Face-Recognition-Attendance-System-main/resources/labels/{$student['registrationNumber']}/" . ($index + 1) . ".png"
                            ];
                        }
                    }
                }
            }
            $response['status'] = 'success';
            $response['data'] = $imageData;
        } catch (PDOException $e) {
            $response['message'] = "Database Error: " . $e->getMessage();
            error_log("get_student_images error: " . $e->getMessage());
        }
    }

    if (isset($response['message']) && $_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['request'])) {
        $_SESSION['message'] = $response['message'];
        $_SESSION['message_type'] = $response['status'];
        header('Location: manage-students.php');
        exit;
    } elseif (isset($_POST['request'])) {
        ob_end_clean();
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
}
?>

<!-- The HTML and JavaScript remain unchanged to avoid affecting other pages -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Students</title>
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
    <script src="http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/javascript/face_logics/face-api.min.js"></script>
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
        .modal-content { border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .modal-header { background: linear-gradient(45deg, #028090, #00a896); color: white; }
        .image-box { cursor: pointer; text-align: center; border: 2px dashed #ccc; padding: 20px; border-radius: 8px; }
        .image-box:hover { border-color: #00a896; }
        .image-box img { width: 100%; max-width: 150px; height: auto; }
        #multiple-images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        #multiple-images img { 
            width: 80px; 
            height: 80px; 
            object-fit: cover; 
            border-radius: 5px; 
            border: 2px solid #00a896;
            position: relative;
        }
        .camera-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        .camera-container {
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            max-width: 90vw;
            max-height: 90vh;
        }
        .camera-video {
            width: 320px;
            height: 240px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .camera-canvas {
            display: none;
        }
        .status-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .status-success { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
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
                <a class="nav-link" href="home">Face Recognition Based Attendance System <span style="color: #00a896;"></a>
            </li>
        </ul>
        <ul class="navbar-nav ml-auto">
            <li class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <i class="fas fa-user mr-2"></i><?php echo htmlspecialchars($_SESSION['firstName'] ?? 'Admin'); ?>
                </a>
                <div class="dropdown-menu dropdown-menu-right">
                    <a href="../../logout" class="dropdown-item"><i class="fas fa-sign-out-alt mr-2"></i> Logout</a>
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
                        <h1 class="m-0">Manage Students</h1>
                    </div>
                </div>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-4 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-users"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Students</span>
                                <span class="info-box-number">
                                    <?php
                                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblstudents");
                                    echo htmlspecialchars($stmt->fetch(PDO::FETCH_ASSOC)['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addStudentModal"><i class="fas fa-plus mr-2"></i>Add Student</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-8">
                        <div class="info-box fade-in">
                            <span class="info-box-icon bg-info"><i class="fas fa-info-circle"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">System Status</span>
                                <span class="info-box-number" id="systemStatus">
                                    <span class="status-indicator status-warning">Initializing...</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Student Details</h3>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="studentTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Registration No</th>
                                            <th>Name</th>
                                            <th>College</th>
                                            <th>Programme</th>
                                            <th>Email</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT s.*, f.facultyName, c.name as courseName 
                                                            FROM tblstudents s 
                                                            LEFT JOIN tblfaculty f ON s.faculty = f.facultyCode 
                                                            LEFT JOIN tblcourse c ON s.courseCode = c.courseCode");
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
            </div>
        </section>

        <!-- Add Student Modal -->
        <div class="modal fade" id="addStudentModal" tabindex="-1" aria-labelledby="addStudentModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addStudentModalLabel">Add Student</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form method="POST" action="manage-students.php" enctype="multipart/form-data" id="addStudentForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="firstName">First Name</label>
                                        <input type="text" class="form-control" name="firstName" placeholder="First Name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="lastName">Last Name</label>
                                        <input type="text" class="form-control" name="lastName" placeholder="Last Name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="email">Email Address</label>
                                        <input type="email" class="form-control" name="email" placeholder="Email Address" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="registrationNumber">Registration Number</label>
                                        <input type="text" class="form-control" id="registrationNumber" name="registrationNumber" placeholder="Registration Number" required>
                                        <p id="error" style="color: red; display: none;">Invalid characters in registration number.</p>
                                    </div>
                                    <div class="form-group">
                                        <label for="faculty">College</label>
                                        <select class="form-control" name="faculty" required>
                                            <option value="" selected>-- Select College --</option>
                                            <?php
                                            $stmt = $pdo->query("SELECT facultyCode, facultyName FROM tblfaculty");
                                            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $faculty) {
                                                echo '<option value="' . htmlspecialchars($faculty['facultyCode']) . '">' . htmlspecialchars($faculty['facultyName']) . '</option>';
                                            }
                                            ?>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="course">Programme</label>
                                        <select class="form-control" name="course" required>
                                            <option value="" selected>-- Select Programme --</option>
                                            <?php
                                            $stmt = $pdo->query("SELECT courseCode, name FROM tblcourse");
                                            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $course) {
                                                echo '<option value="' . htmlspecialchars($course['courseCode']) . '">' . htmlspecialchars($course['name']) . '</option>';
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label>Take Student Pictures (Required: At least 1, Recommended: 5)</label>
                                        <div id="open_camera" class="image-box" onclick="openCameraInterface()">
                                            <i class="fas fa-camera fa-2x mb-2" style="color: #00a896;"></i><br>
                                            <span>Click to capture photos</span>
                                        </div>
                                        <div id="multiple-images"></div>
                                        <div id="capture-status" class="mt-2">
                                            <small class="text-muted">Images captured: <span id="image-count">0</span>/5</small>
                                        </div>
                                        <input type="hidden" name="capturedImage1" id="capturedImage1">
                                        <input type="hidden" name="capturedImage2" id="capturedImage2">
                                        <input type="hidden" name="capturedImage3" id="capturedImage3">
                                        <input type="hidden" name="capturedImage4" id="capturedImage4">
                                        <input type="hidden" name="capturedImage5" id="capturedImage5">
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-custom" name="addStudent" id="submitButton">Save Student</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Enhanced logging and error handling
    const DEBUG = true;
    const BASE_URL = './';
    const MODEL_PATH = 'http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/models/';
    const MODEL_LOAD_TIMEOUT = 15000;

    function debugLog(message, data = null) {
        if (DEBUG) {
            console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, data ? data : '');
        }
    }

    function errorLog(message, error = null) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error ? error : '');
    }

    function updateSystemStatus(message, type = 'warning') {
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            statusElement.innerHTML = `<span class="status-indicator status-${type}">${message}</span>`;
        }
        debugLog(`System status updated: ${message} (${type})`);
    }

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
        debugLog(`Alert shown: ${message} (${type})`);
    }

    let imageCount = 0;
    let capturedDescriptors = [];
    let modelsLoaded = false;
    let currentStream = null;
    let faceDetectionActive = false;

    // Enhanced model loading with better error handling
    async function loadFaceApiModels() {
        updateSystemStatus('Loading face recognition models...', 'warning');
        debugLog('Starting to load face-api.js models');
        
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                debugLog(`Model loading attempt ${attempt}`);
                
                const modelPromises = [
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                ];

                await Promise.race([
                    Promise.all(modelPromises),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Model loading timed out')), MODEL_LOAD_TIMEOUT)
                    )
                ]);

                modelsLoaded = true;
                updateSystemStatus('Face recognition models loaded successfully', 'success');
                debugLog('Face-api models loaded successfully');
                return true;
            } catch (err) {
                errorLog(`Model loading attempt ${attempt} failed`, err);
                if (attempt === 3) {
                    updateSystemStatus('Failed to load face recognition models', 'error');
                    errorLog('Failed to load face-api models after 3 attempts', err);
                    showAlert('Failed to load facial recognition models. Please refresh the page and try again.', 'error');
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            }
        }
        return false;
    }

    // Enhanced camera interface with better error handling
    async function openCameraInterface() {
        debugLog('Opening camera interface');
        
        if (!modelsLoaded) {
            debugLog('Models not loaded, attempting to load...');
            const loaded = await loadFaceApiModels();
            if (!loaded) {
                showAlert('Face recognition models are not loaded. Please refresh the page.', 'error');
                return;
            }
        }

        try {
            // Request camera access with better constraints
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };

            debugLog('Requesting camera access with constraints:', constraints);
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            debugLog('Camera access granted');

            // Create camera modal
            const modal = document.createElement('div');
            modal.className = 'camera-modal';
            modal.id = 'cameraModal';

            const container = document.createElement('div');
            container.className = 'camera-container';

            // Create video element
            const video = document.createElement('video');
            video.className = 'camera-video';
            video.srcObject = currentStream;
            video.autoplay = true;
            video.playsInline = true;

            // Create canvas for capturing
            const canvas = document.createElement('canvas');
            canvas.className = 'camera-canvas';
            canvas.width = 320;
            canvas.height = 240;

            // Create status display
            const statusDiv = document.createElement('div');
            statusDiv.id = 'faceStatus';
            statusDiv.style.marginBottom = '10px';
            statusDiv.innerHTML = '<small class="text-info">Position your face in the camera...</small>';

            // Create buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '15px';

            const captureButton = document.createElement('button');
            captureButton.textContent = `Capture Image (${imageCount}/5)`;
            captureButton.className = 'btn btn-custom me-2';
            captureButton.disabled = imageCount >= 5;

            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close Camera';
            closeButton.className = 'btn btn-secondary';

            // Assemble modal
            container.appendChild(statusDiv);
            container.appendChild(video);
            container.appendChild(canvas);
            buttonContainer.appendChild(captureButton);
            buttonContainer.appendChild(closeButton);
            container.appendChild(buttonContainer);
            modal.appendChild(container);
            document.body.appendChild(modal);

            debugLog('Camera modal created and added to DOM');

            // Start face detection
            video.addEventListener('loadedmetadata', () => {
                debugLog('Video metadata loaded, starting face detection');
                startFaceDetection(video, statusDiv);
            });

            // Capture button handler
            captureButton.addEventListener('click', async () => {
                debugLog('Capture button clicked');
                await captureImage(video, canvas, captureButton, statusDiv);
            });

            // Close button handler
            closeButton.addEventListener('click', () => {
                debugLog('Close button clicked');
                closeCameraInterface();
            });

        } catch (err) {
            errorLog('Error accessing camera', err);
            if (err.name === 'NotAllowedError') {
                showAlert('Camera access denied. Please allow camera access and try again.', 'error');
            } else if (err.name === 'NotFoundError') {
                showAlert('No camera found. Please ensure a camera is connected.', 'error');
            } else {
                showAlert('Error accessing camera: ' + err.message, 'error');
            }
        }
    }

    async function startFaceDetection(video, statusDiv) {
        faceDetectionActive = true;
        debugLog('Starting continuous face detection');

        const detectFace = async () => {
            if (!faceDetectionActive || !video.videoWidth) return;

            try {
                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check-circle"></i> Face detected - Ready to capture!</small>';
                    debugLog('Face detected successfully');
                } else {
                    statusDiv.innerHTML = '<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> No face detected - Please position your face in the camera</small>';
                }
            } catch (err) {
                errorLog('Face detection error', err);
                statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-times-circle"></i> Face detection error</small>';
            }

            // Continue detection
            if (faceDetectionActive) {
                setTimeout(detectFace, 500); // Check every 500ms
            }
        };

        // Start detection after a short delay
        setTimeout(detectFace, 1000);
    }

    async function captureImage(video, canvas, captureButton, statusDiv) {
        if (imageCount >= 5) {
            showAlert('Maximum 5 images allowed', 'warning');
            return;
        }

        try {
            debugLog(`Attempting to capture image ${imageCount + 1}`);
            
            // Draw video frame to canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png', 0.8);
            debugLog(`Image ${imageCount + 1} captured, size: ${dataUrl.length} characters`);

            // Validate image data
            if (!dataUrl || dataUrl === 'data:,') {
                throw new Error('Failed to capture image data');
            }

            imageCount++;
            debugLog(`Image ${imageCount} captured successfully`);

            // Store the captured image
            document.getElementById(`capturedImage${imageCount}`).value = dataUrl;

            // Display thumbnail
            const img = document.createElement('img');
            img.src = dataUrl;
            img.title = `Image ${imageCount}`;
            document.getElementById('multiple-images').appendChild(img);

            // Update UI
            document.getElementById('image-count').textContent = imageCount;
            captureButton.textContent = `Capture Image (${imageCount}/5)`;
            captureButton.disabled = imageCount >= 5;
            
            statusDiv.innerHTML = `<small class="text-success"><i class="fas fa-check-circle"></i> Image ${imageCount} captured successfully!</small>`;
            
            showAlert(`Image ${imageCount} captured successfully!`, 'success');

            if (imageCount >= 5) {
                statusDiv.innerHTML += '<br><small class="text-info">All 5 images captured. You can now close the camera and submit the form.</small>';
            }

        } catch (err) {
            errorLog('Error capturing image', err);
            statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-times-circle"></i> Error capturing image. Please try again.</small>';
            showAlert('Error capturing image: ' + err.message, 'error');
        }
    }

    function closeCameraInterface() {
        debugLog('Closing camera interface');
        faceDetectionActive = false;
        
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
                debugLog(`Stopped track: ${track.kind}`);
            });
            currentStream = null;
        }

        const modal = document.getElementById('cameraModal');
        if (modal) {
            modal.remove();
            debugLog('Camera modal removed');
        }
    }

    // Enhanced face comparison with better error handling
    async function getLabeledFaceDescriptors() {
        debugLog('Fetching existing student face descriptors');
        const labeledDescriptors = [];
        
        try {
            const response = await $.ajax({
                url: BASE_URL + 'manage-students.php',
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: 'request=get_student_images',
                dataType: 'json',
                timeout: 15000
            });

            debugLog('Server response for student images:', response);

            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to fetch student images');
            }

            if (!response.data || response.data.length === 0) {
                debugLog('No existing student images found');
                return labeledDescriptors;
            }

            let processedCount = 0;
            let errorCount = 0;

            for (const item of response.data) {
                try {
                    debugLog(`Processing existing student image: ${item.registrationNumber} - ${item.imagePath}`);
                    
                    const img = await faceapi.fetchImage(item.imagePath);
                    const detection = await faceapi
                        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    
                    if (detection) {
                        // Find existing labeled descriptor or create new one
                        let existingDescriptor = labeledDescriptors.find(ld => ld.label === item.registrationNumber);
                        if (!existingDescriptor) {
                            existingDescriptor = new faceapi.LabeledFaceDescriptors(item.registrationNumber, []);
                            labeledDescriptors.push(existingDescriptor);
                        }
                        existingDescriptor.descriptors.push(detection.descriptor);
                        processedCount++;
                        debugLog(`Successfully processed existing student image: ${item.registrationNumber}`);
                    } else {
                        errorLog(`No face detected in existing student image: ${item.imagePath}`);
                        errorCount++;
                    }
                } catch (error) {
                    errorLog(`Error processing existing student image ${item.imagePath}`, error);
                    errorCount++;
                }
            }

            debugLog(`Processed ${processedCount} existing student images successfully, ${errorCount} errors`);
            
        } catch (error) {
            errorLog('Error fetching existing student images', error);
            showAlert('Error fetching existing student data: ' + error.message, 'error');
        }
        
        return labeledDescriptors;
    }

    // Process captured images to extract face descriptors
    async function processCapturedImages() {
        debugLog('Starting to process captured images for face detection');
        const processedDescriptors = [];
        const invalidImages = [];
        
        for (let i = 1; i <= imageCount; i++) {
            const imageData = document.getElementById(`capturedImage${i}`).value;
            if (!imageData) continue;
            
            try {
                debugLog(`Processing image ${i} for face detection`);
                
                // Convert data URL to image element
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = imageData;
                });
                
                debugLog(`Image ${i} loaded successfully, detecting face...`);
                
                // Detect face using the loaded image element directly
                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    processedDescriptors.push({
                        index: i,
                        descriptor: detection.descriptor,
                        confidence: detection.detection.score
                    });
                    debugLog(`Face detected in image ${i}. Confidence: ${(detection.detection.score * 100).toFixed(1)}%`);
                } else {
                    invalidImages.push(i);
                    debugLog(`No face detected in image ${i}`);
                }
                
            } catch (error) {
                errorLog(`Error processing image ${i}`, error);
                invalidImages.push(i);
            }
        }
        
        return { processedDescriptors, invalidImages };
    }

    // Enhanced form validation with separated processing
    async function validateFormSubmission() {
        debugLog('Starting form validation');
        
        if (imageCount === 0) {
            showAlert('Please capture at least one image before submitting.', 'error');
            return false;
        }

        if (!modelsLoaded) {
            showAlert('Face recognition models are not loaded. Please refresh the page.', 'error');
            return false;
        }

        // Show processing message
        showAlert('Processing captured images for face detection...', 'info');
        
        try {
            // Step 1: Process all captured images to detect faces
            const { processedDescriptors, invalidImages } = await processCapturedImages();
            
            if (processedDescriptors.length === 0) {
                let message = 'No faces detected in any of the captured images. ';
                if (invalidImages.length > 0) {
                    message += `Images with no faces: ${invalidImages.join(', ')}. `;
                }
                message += 'Please capture new images with clear faces.';
                showAlert(message, 'error');
                return false;
            }
            
            if (invalidImages.length > 0) {
                debugLog(`Some images had no faces detected: ${invalidImages.join(', ')}`);
                showAlert(`Warning: No faces detected in image(s) ${invalidImages.join(', ')}. Proceeding with ${processedDescriptors.length} valid face(s).`, 'warning');
            }
            
            debugLog(`Successfully processed ${processedDescriptors.length} face descriptors`);
            
            // Step 2: Check for duplicate faces against existing students
            showAlert('Checking for duplicate faces...', 'info');
            
            const labeledDescriptors = await getLabeledFaceDescriptors();
            
            if (labeledDescriptors.length === 0) {
                debugLog('No existing students found, proceeding with submission');
                showAlert('Face validation completed. No duplicates found.', 'success');
                return true;
            }

            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
            debugLog('Created face matcher with threshold 0.6');

            // Check each processed descriptor for duplicates
            for (const processed of processedDescriptors) {
                const bestMatch = faceMatcher.findBestMatch(processed.descriptor);
                
                debugLog(`Image ${processed.index} best match: ${bestMatch.label} (distance: ${bestMatch.distance.toFixed(3)})`);
                
                if (bestMatch.label !== 'unknown') {
                    showAlert(`The face in image ${processed.index} matches an existing student (Registration No: ${bestMatch.label}). This face is already registered in the system.`, 'error');
                    return false;
                }
            }

            debugLog('All face validations passed - no duplicates found');
            showAlert('Face validation completed successfully. No duplicates found.', 'success');
            return true;
            
        } catch (error) {
            errorLog('Error during face validation', error);
            showAlert('Error validating faces: ' + error.message, 'error');
            return false;
        }
    }

    // Document ready handler
    $(document).ready(function() {
        debugLog('Document ready, initializing application');
        
        // Initialize DataTable
        $('#studentTable').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            info: true,
            lengthMenu: [5, 10, 25],
            pageLength: 5
        });

        // Display session message if exists
        <?php if (isset($_SESSION['message']) && isset($_SESSION['message_type'])): ?>
            showAlert('<?php echo htmlspecialchars($_SESSION['message']); ?>', '<?php echo htmlspecialchars($_SESSION['message_type']); ?>');
            <?php unset($_SESSION['message'], $_SESSION['message_type']); ?>
        <?php endif; ?>

        // Check if face-api is loaded
        if (typeof faceapi === 'undefined') {
            errorLog('Face API failed to load');
            updateSystemStatus('Face API failed to load', 'error');
            showAlert('Face recognition system failed to load. Please check the face-api.min.js file path.', 'error');
            return;
        }

        // Load face-api.js models
        loadFaceApiModels();

        // Enhanced form submission handler
        $('#addStudentForm').on('submit', async function(e) {
            e.preventDefault();
            debugLog('Form submission started');
            
            const submitButton = $('#submitButton');
            const originalText = submitButton.text();
            
            try {
                // Disable submit button
                submitButton.prop('disabled', true).text('Validating...');
                
                // Validate form
                const isValid = await validateFormSubmission();
                
                if (!isValid) {
                    debugLog('Form validation failed');
                    return;
                }
                
                submitButton.text('Submitting...');
                debugLog('Form validation passed, submitting form');
                
                // Submit the form
                this.submit();
                
            } catch (error) {
                errorLog('Error during form submission', error);
                showAlert('Error during form submission: ' + error.message, 'error');
            } finally {
                // Re-enable submit button
                submitButton.prop('disabled', false).text(originalText);
            }
        });

        // Delete record handler
        $(document).on('click', '.delete-record', function() {
            const id = $(this).data('id');
            const type = $(this).data('type');
            
            debugLog(`Delete request for ${type} ID: ${id}`);
            
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
                        url: BASE_URL + 'manage-students.php',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `request=delete_record&id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
                        dataType: 'json',
                        timeout: 5000,
                        success: function(response) {
                            debugLog('Delete response:', response);
                            if (response.status === 'success') {
                                $(`#row${type}${id}`).remove();
                                showAlert(response.message, 'success');
                            } else {
                                showAlert(response.message, 'error');
                            }
                        },
                        error: function(xhr, status, error) {
                            errorLog('Delete request failed', {xhr: xhr.responseText, status, error});
                            showAlert('Error deleting record: ' + error, 'error');
                        }
                    });
                }
            });
        });

        // Registration number validation
        const registrationNumberInput = document.getElementById('registrationNumber');
        const errorMessage = document.getElementById('error');
        const invalidCharacters = /[\\/:*?"<>|]/g;

        if (registrationNumberInput && errorMessage) {
            registrationNumberInput.addEventListener('input', () => {
                const originalValue = registrationNumberInput.value;
                const sanitizedValue = originalValue.replace(invalidCharacters, '');
                if (originalValue !== sanitizedValue) {
                    errorMessage.style.display = 'inline';
                    errorMessage.textContent = 'Invalid characters removed.';
                    debugLog('Invalid characters removed from registration number');
                } else {
                    errorMessage.style.display = 'none';
                }
                registrationNumberInput.value = sanitizedValue;
            });
        }

        // Clear images when modal is closed
        $('#addStudentModal').on('hidden.bs.modal', function() {
            debugLog('Modal closed, clearing captured images');
            imageCount = 0;
            capturedDescriptors = []; // Keep this for backward compatibility even though we don't use it
            document.getElementById('multiple-images').innerHTML = '';
            document.getElementById('image-count').textContent = '0';
            for (let i = 1; i <= 5; i++) {
                document.getElementById(`capturedImage${i}`).value = '';
            }
            closeCameraInterface();
        });
    });

    // Global error handler
    window.addEventListener('error', function(e) {
        errorLog('Global error caught', e.error);
    });

    window.addEventListener('unhandledrejection', function(e) {
        errorLog('Unhandled promise rejection', e.reason);
    });

    debugLog('Face recognition application script loaded successfully');
</script>
</body>
</html>