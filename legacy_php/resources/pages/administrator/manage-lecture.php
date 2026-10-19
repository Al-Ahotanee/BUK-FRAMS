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
    error_log('Unauthorized access attempt to manage-lecture.php: ' . json_encode($_SESSION));
    header('Location: ../../login');
    exit;
}

// Set session variables for compatibility
$_SESSION['emailAddress'] = $_SESSION['user']['email'];
$_SESSION['firstName'] = $_SESSION['user']['name'];

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    if (isset($_POST["addLecture"])) {
        $firstName = htmlspecialchars(trim($_POST["firstName"]));
        $lastName = htmlspecialchars(trim($_POST["lastName"]));
        $email = filter_var(trim($_POST["email"]), FILTER_VALIDATE_EMAIL);
        $phoneNumber = htmlspecialchars(trim($_POST["phoneNumber"]));
        $faculty = htmlspecialchars(trim($_POST["faculty"]));
        $password = $_POST['password'];
        $dateRegistered = date("Y-m-d");

        if (!$password) {
            $response['message'] = "Password is required.";
        } elseif ($email && $firstName && $lastName && $phoneNumber && $faculty) {
            try {
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $query = $pdo->prepare("SELECT * FROM tbllecture WHERE emailAddress = :email");
                $query->bindParam(':email', $email);
                $query->execute();

                if ($query->rowCount() > 0) {
                    $response['message'] = "Lecturer Already Exists";
                } else {
                    $query = $pdo->prepare(
                        "INSERT INTO tbllecture (firstName, lastName, emailAddress, password, phoneNo, facultyCode, dateCreated) 
                        VALUES (:firstName, :lastName, :email, :password, :phoneNumber, :faculty, :dateCreated)"
                    );
                    $query->bindParam(':firstName', $firstName);
                    $query->bindParam(':lastName', $lastName);
                    $query->bindParam(':email', $email);
                    $query->bindParam(':password', $hashedPassword);
                    $query->bindParam(':phoneNumber', $phoneNumber);
                    $query->bindParam(':faculty', $faculty);
                    $query->bindParam(':dateCreated', $dateRegistered);

                    if ($query->execute()) {
                        $response['status'] = 'success';
                        $response['message'] = "Lecturer Added Successfully";
                    } else {
                        $response['message'] = "Failed to Add Lecturer";
                    }
                }
            } catch (PDOException $e) {
                $response['message'] = "Database Error: " . $e->getMessage();
                error_log("Lecturer insertion error for college: " . $e->getMessage());
            }
        } else {
            $response['message'] = "Invalid input. Please check your data.";
        }
    } elseif (isset($_POST['request']) && $_POST['request'] === 'delete_record') {
        $id = filter_var($_POST['id'] ?? '', FILTER_SANITIZE_NUMBER_INT);
        if ($id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM tbllecture WHERE Id = :id");
                $stmt->execute([':id' => $id]);
                $response['status'] = 'success';
                $response['message'] = 'Lecturer deleted successfully';
            } catch (PDOException $e) {
                $response['message'] = 'Error deleting lecturer';
                error_log("delete_record error (lecturer, ID: $id): " . $e->getMessage());
            }
        } else {
            $response['message'] = 'Invalid ID';
            error_log("delete_record: Invalid ID ($id)");
        }
    }

    if (isset($response['message']) && $_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['request'])) {
        $_SESSION['message'] = $response['message'];
        $_SESSION['message_type'] = $response['status'];
        header('Location: manage-lecture.php');
        exit;
    } elseif (isset($_POST['request'])) {
        ob_end_clean();
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Lecturers</title>
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
        .modal-content { border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .modal-header { background: linear-gradient(45deg, #028090, #00a896); color: white; }
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
                        <h1 class="m-0">Manage Lecturers</h1>
                    </div>
                </div>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-4 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-chalkboard-teacher"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Lecturers</span>
                                <span class="info-box-number">
                                    <?php
                                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbllecture");
                                    echo htmlspecialchars($stmt->fetch(PDO::FETCH_ASSOC)['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addLecturerModal"><i class="fas fa-plus mr-2"></i>Add Lecturer</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Lecturer Details</h3>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="lecturerTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email Address</th>
                                            <th>Phone Number</th>
                                            <th>College</th>
                                            <th>Date Registered</th>
                                            <th>Action</th>
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
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='lecturer'><i class='fas fa-trash'></i></button></td>";
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

        <!-- Add Lecturer Modal -->
        <div class="modal fade" id="addLecturerModal" tabindex="-1" aria-labelledby="addLecturerModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addLecturerModalLabel">Add Lecturer</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form method="POST" action="manage-lecture.php">
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
                                <label for="phoneNumber">Phone Number</label>
                                <input type="text" class="form-control" name="phoneNumber" placeholder="Phone Number" required>
                            </div>
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" class="form-control" name="password" placeholder="Password" required>
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
                            <button type="submit" class="btn btn-custom" name="addLecture">Save Lecturer</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
    const BASE_URL = './';

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
        $('#lecturerTable').DataTable({
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
                        url: BASE_URL + 'manage-lecture.php',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `request=delete_record&id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`,
                        dataType: 'json',
                        timeout: 5000,
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
    });
</script>
</body>
</html>