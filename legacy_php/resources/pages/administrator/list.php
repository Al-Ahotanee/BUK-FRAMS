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
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Check if user is authenticated
if (!isset($_SESSION['user']['email']) || $_SESSION['user']['role'] !== 'administrator') {
    error_log('Unauthorized access attempt to list.php: ' . json_encode($_SESSION));
    header('Location: ../../login');
    exit;
}

// Set session variables for compatibility
$_SESSION['emailAddress'] = $_SESSION['user']['email'];
$_SESSION['firstName'] = $_SESSION['user']['name'];

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['addStudent'])) {
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    // Sanitize and validate inputs
    $firstName = htmlspecialchars(trim($_POST['firstName'] ?? ''));
    $lastName = htmlspecialchars(trim($_POST['lastName'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $registrationNumber = preg_replace('/[^A-Za-z0-9\-]/', '', trim($_POST['registrationNumber'] ?? ''));
    $courseCode = htmlspecialchars(trim($_POST['course'] ?? ''));
    $faculty = htmlspecialchars(trim($_POST['faculty'] ?? ''));

    // Validate inputs
    if (!$firstName || !$lastName || !$email || !$registrationNumber || !$courseCode || !$faculty) {
        $response['message'] = 'All fields are required and must be valid.';
        error_log("Validation failed: Missing or invalid fields for student $registrationNumber");
    } elseif (!preg_match('/^[A-Za-z0-9\-]{3,50}$/', $registrationNumber)) {
        $response['message'] = 'Invalid registration number. Use only letters, numbers, and hyphens (3-50 characters).';
        error_log("Invalid registration number: $registrationNumber");
    } else {
        // Check for duplicate registration number
        try {
            $checkQuery = $pdo->prepare("SELECT COUNT(*) FROM tblstudents WHERE registrationNumber = :registrationNumber");
            $checkQuery->execute([':registrationNumber' => $registrationNumber]);
            if ($checkQuery->fetchColumn() > 0) {
                $response['message'] = "Student with Registration No: $registrationNumber already exists!";
                error_log("Duplicate registration number: $registrationNumber");
            } else {
                // Store validated data in session and redirect to cap.php
                $_SESSION['student_data'] = [
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'email' => $email,
                    'registrationNumber' => $registrationNumber,
                    'courseCode' => $courseCode,
                    'faculty' => $faculty,
                    'dateRegistered' => date('Y-m-d')
                ];
                header('Location: cap.php');
                exit;
            }
        } catch (PDOException $e) {
            $response['message'] = 'Database Error: ' . $e->getMessage();
            error_log("Validation error for $registrationNumber: " . $e->getMessage());
        }
    }

    $_SESSION['message'] = $response['message'];
    $_SESSION['message_type'] = $response['status'];
    header('Location: list.php');
    exit;
}

// Handle delete request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['request']) && $_POST['request'] === 'delete_record') {
    $response = ['status' => 'error', 'message' => 'Invalid ID'];
    $id = filter_var($_POST['id'] ?? '', FILTER_SANITIZE_NUMBER_INT);

    if ($id) {
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT registrationNumber FROM tblstudents WHERE Id = :id");
            $stmt->execute([':id' => $id]);
            $registrationNumber = $stmt->fetchColumn();

            if ($registrationNumber) {
                $folderPath = "resources/labels/{$registrationNumber}/";
                if (file_exists($folderPath)) {
                    array_map('unlink', glob("$folderPath*.png"));
                    rmdir($folderPath);
                    error_log("Deleted directory: $folderPath");
                }

                $stmt = $pdo->prepare("DELETE FROM tblstudents WHERE Id = :id");
                $stmt->execute([':id' => $id]);
                $pdo->commit();
                $response['status'] = 'success';
                $response['message'] = 'Student deleted successfully';
                error_log("Student ID $id deleted successfully");
            } else {
                $response['message'] = 'Student not found';
                error_log("Student ID $id not found");
            }
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response['message'] = 'Error deleting student: ' . $e->getMessage();
            error_log("Delete error for student ID $id: " . $e->getMessage());
        }
    }

    ob_end_clean();
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
    <title>Manage Students</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%); }
        .main-sidebar { background: linear-gradient(180deg, #003049 0%, #004b6b 100%); }
        .brand-link { background: #003049; color: white !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .nav-link { color: white !important; }
        .nav-link:hover { background: rgba(255, 255, 255, 0.1); }
        .nav-link.active { background: #00a896 !important; border-radius: 6px; }
        .main-header { background: linear-gradient(90deg, #003049, #00a896); }
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
        .modal-content { border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .modal-header { background: linear-gradient(45deg, #028090, #00a896); color: white; }
        .swal2-popup { border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
        .form-control:focus { border-color: #00a896; box-shadow: 0 0 0 0.2rem rgba(0, 168, 150, 0.25); }
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
                <a class="nav-link" href="home">Face Recognition Attendance System</a>
            </li>
        </ul>
        <ul class="navbar-nav ml-auto">
            <li class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <i class="fas fa-user mr-2"></i><?php echo htmlspecialchars($_SESSION['firstName'] ?? 'Admin'); ?>
                </a>
                <div class="dropdown-menu dropdown-menu-right">
                    <a href="../../logout" class="dropdown-item"><i class="fas fa-sign-out-alt mr-2"></i>Logout</a>
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
                                    echo htmlspecialchars($stmt->fetch()['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addStudentModal"><i class="fas fa-plus mr-2"></i>Add Student</button>
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
                                        foreach ($stmt->fetchAll() as $row) {
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
                        <form method="POST" action="list.php" id="addStudentForm">
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
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="registrationNumber">Registration Number</label>
                                        <input type="text" class="form-control" id="registrationNumber" name="registrationNumber" placeholder="Registration Number" required>
                                        <p id="error" class="text-red-500 text-sm mt-1 hidden">Invalid characters in registration number.</p>
                                    </div>
                                    <div class="form-group">
                                        <label for="faculty">College</label>
                                        <select class="form-control" name="faculty" required>
                                            <option value="" selected>-- Select College --</option>
                                            <?php
                                            $stmt = $pdo->query("SELECT facultyCode, facultyName FROM tblfaculty");
                                            foreach ($stmt->fetchAll() as $faculty) {
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
                                            foreach ($stmt->fetchAll() as $course) {
                                                echo '<option value="' . htmlspecialchars($course['courseCode']) . '">' . htmlspecialchars($course['name']) . '</option>';
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-custom w-full" name="addStudent">Proceed to Capture Photos</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
<script>
    $(document).ready(function() {
        // Initialize DataTable
        $('#studentTable').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            info: true,
            lengthMenu: [5, 10, 25],
            pageLength: 5
        });

        // Display session message
        <?php if (isset($_SESSION['message']) && isset($_SESSION['message_type'])): ?>
            Swal.fire({
                icon: '<?php echo htmlspecialchars($_SESSION['message_type']); ?>',
                title: '<?php echo htmlspecialchars($_SESSION['message_type']); ?>',
                text: '<?php echo htmlspecialchars($_SESSION['message']); ?>',
                showConfirmButton: false,
                timer: 3000,
                position: 'center'
            });
            <?php unset($_SESSION['message'], $_SESSION['message_type']); ?>
        <?php endif; ?>

        // Delete record handler
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
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: 'list.php',
                        type: 'POST',
                        data: { request: 'delete_record', id: id, type: type },
                        dataType: 'json',
                        success: function(response) {
                            if (response.status === 'success') {
                                $(`#row${type}${id}`).remove();
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Success',
                                    text: response.message,
                                    showConfirmButton: false,
                                    timer: 2000
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: response.message,
                                    showConfirmButton: false,
                                    timer: 2000
                                });
                            }
                        },
                        error: function() {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Failed to delete record.',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        }
                    });
                }
            });
        });

        // Registration number validation
        const registrationNumberInput = document.getElementById('registrationNumber');
        const errorMessage = document.getElementById('error');
        if (registrationNumberInput && errorMessage) {
            registrationNumberInput.addEventListener('input', () => {
                const originalValue = registrationNumberInput.value;
                const sanitizedValue = originalValue.replace(/[^A-Za-z0-9\-]/g, '');
                if (originalValue !== sanitizedValue) {
                    errorMessage.classList.remove('hidden');
                    errorMessage.textContent = 'Invalid characters removed.';
                } else {
                    errorMessage.classList.add('hidden');
                }
                registrationNumberInput.value = sanitizedValue;
            });
        }
    });
</script>
</body>
</html>