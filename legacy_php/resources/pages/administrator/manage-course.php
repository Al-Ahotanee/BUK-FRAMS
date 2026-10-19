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
    error_log('Unauthorized access attempt to manage-course.php: ' . json_encode($_SESSION));
    header('Location: ../../login');
    exit;
}

// Set session variables for compatibility
$_SESSION['emailAddress'] = $_SESSION['user']['email'];
$_SESSION['firstName'] = $_SESSION['user']['name'];

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    if (isset($_POST["addCourse"])) {
        $courseName = htmlspecialchars(trim($_POST["courseName"]));
        $courseCode = htmlspecialchars(trim($_POST["courseCode"]));
        $facultyID = filter_var($_POST["faculty"], FILTER_VALIDATE_INT);
        $dateRegistered = date("Y-m-d");

        if ($courseName && $courseCode && $facultyID) {
            try {
                $query = $pdo->prepare("SELECT * FROM tblcourse WHERE courseCode = :courseCode");
                $query->bindParam(':courseCode', $courseCode);
                $query->execute();

                if ($query->rowCount() > 0) {
                    $response['status'] = 'error';
                    $response['message'] = "Programme Already Exists";
                } else {
                    $query = $pdo->prepare("INSERT INTO tblcourse (name, courseCode, facultyID, dateCreated) 
                                           VALUES (:name, :courseCode, :facultyID, :dateCreated)");
                    $query->bindParam(':name', $courseName);
                    $query->bindParam(':courseCode', $courseCode);
                    $query->bindParam(':facultyID', $facultyID, PDO::PARAM_INT);
                    $query->bindParam(':dateCreated', $dateRegistered);
                    $query->execute();
                    $response['status'] = 'success';
                    $response['message'] = "Programme Inserted Successfully";
                }
            } catch (PDOException $e) {
                $response['status'] = 'error';
                $response['message'] = "Database Error: " . $e->getMessage();
                error_log("Programme insertion error: " . $e->getMessage());
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid input for programme";
        }
    } elseif (isset($_POST["addUnit"])) {
        $unitName = htmlspecialchars(trim($_POST["unitName"]));
        $unitCode = htmlspecialchars(trim($_POST["unitCode"]));
        $courseID = filter_var($_POST["course"], FILTER_VALIDATE_INT);
        $dateRegistered = date("Y-m-d");

        if ($unitName && $unitCode && $courseID) {
            try {
                $query = $pdo->prepare("SELECT * FROM tblunit WHERE unitCode = :unitCode");
                $query->bindParam(':unitCode', $unitCode);
                $query->execute();

                if ($query->rowCount() > 0) {
                    $response['status'] = 'error';
                    $response['message'] = "Course Already Exists";
                } else {
                    $query = $pdo->prepare("INSERT INTO tblunit (name, unitCode, courseID, dateCreated) 
                                           VALUES (:name, :unitCode, :courseID, :dateCreated)");
                    $query->bindParam(':name', $unitName);
                    $query->bindParam(':unitCode', $unitCode);
                    $query->bindParam(':courseID', $courseID, PDO::PARAM_INT);
                    $query->bindParam(':dateCreated', $dateRegistered);
                    $query->execute();
                    $response['status'] = 'success';
                    $response['message'] = "Course Inserted Successfully";
                }
            } catch (PDOException $e) {
                $response['status'] = 'error';
                $response['message'] = "Database Error: " . $e->getMessage();
                error_log("Course insertion error: " . $e->getMessage());
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid input for course";
        }
    } elseif (isset($_POST["addFaculty"])) {
        $facultyName = htmlspecialchars(trim($_POST["facultyName"]));
        $facultyCode = htmlspecialchars(trim($_POST["facultyCode"]));
        $dateRegistered = date("Y-m-d");

        if ($facultyName && $facultyCode) {
            try {
                $query = $pdo->prepare("SELECT * FROM tblfaculty WHERE facultyCode = :facultyCode");
                $query->bindParam(':facultyCode', $facultyCode);
                $query->execute();

                if ($query->rowCount() > 0) {
                    $response['status'] = 'error';
                    $response['message'] = "College Already Exists";
                } else {
                    $query = $pdo->prepare("INSERT INTO tblfaculty (facultyName, facultyCode, dateRegistered) 
                                           VALUES (:facultyName, :facultyCode, :dateRegistered)");
                    $query->bindParam(':facultyName', $facultyName);
                    $query->bindParam(':facultyCode', $facultyCode);
                    $query->bindParam(':dateRegistered', $dateRegistered);
                    $query->execute();
                    $response['status'] = 'success';
                    $response['message'] = "College Inserted Successfully";
                }
            } catch (PDOException $e) {
                $response['status'] = 'error';
                $response['message'] = "Database Error: " . $e->getMessage();
                error_log("College insertion error: " . $e->getMessage());
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = "Invalid input for college";
        }
    } elseif (isset($_POST['request']) && $_POST['request'] === 'delete_record') {
        $id = filter_var($_POST['id'] ?? '', FILTER_SANITIZE_NUMBER_INT);
        $type = filter_var($_POST['type'] ?? '', FILTER_SANITIZE_SPECIAL_CHARS);
        $tableMap = [
            'course' => 'tblcourse',
            'unit' => 'tblunit',
            'faculty' => 'tblfaculty'
        ];
        $displayType = [
            'course' => 'programme',
            'unit' => 'course',
            'faculty' => 'college'
        ];
        if ($id && isset($tableMap[$type])) {
            try {
                $stmt = $pdo->prepare("DELETE FROM {$tableMap[$type]} WHERE Id = :id");
                $stmt->execute([':id' => $id]);
                $response['status'] = 'success';
                $response['message'] = ucfirst($displayType[$type]) . ' deleted successfully';
            } catch (PDOException $e) {
                $response['status'] = 'error';
                $response['message'] = 'Error deleting ' . $displayType[$type];
                error_log("delete_record error ($type, ID: $id): " . $e->getMessage());
            }
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Invalid ID or type';
            error_log("delete_record: Invalid ID ($id) or type ($type)");
        }
    }

    if (isset($response['message']) && $_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['request'])) {
        $_SESSION['message'] = $response['message'];
        $_SESSION['message_type'] = $response['status'];
        header('Location: manage-course.php');
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
    <title>Manage Programmes</title>
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
                <a class="nav-link" href="home">Smart Attendance <span style="color: #00a896;">Ms</span></a>
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
                        <h1 class="m-0">Manage Programmes</h1>
                    </div>
                </div>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-4 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-graduation-cap"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Programmes</span>
                                <span class="info-box-number">
                                    <?php
                                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblcourse");
                                    echo htmlspecialchars($stmt->fetch(PDO::FETCH_ASSOC)['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addProgrammeModal"><i class="fas fa-plus mr-2"></i>Add Programme</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-book"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Courses</span>
                                <span class="info-box-number">
                                    <?php
                                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblunit");
                                    echo htmlspecialchars($stmt->fetch(PDO::FETCH_ASSOC)['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addCourseModal"><i class="fas fa-plus mr-2"></i>Add Course</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-6">
                        <div class="info-box fade-in">
                            <span class="info-box-icon"><i class="fas fa-building"></i></span>
                            <div class="info-box-content">
                                <span class="info-box-text">Colleges</span>
                                <span class="info-box-number">
                                    <?php
                                    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblfaculty");
                                    echo htmlspecialchars($stmt->fetch(PDO::FETCH_ASSOC)['count']);
                                    ?>
                                </span>
                                <button class="btn btn-custom mt-2" data-bs-toggle="modal" data-bs-target="#addCollegeModal"><i class="fas fa-plus mr-2"></i>Add College</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline fade-in">
                            <div class="card-header">
                                <h3 class="card-title">Programmes</h3>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="programmeTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>College</th>
                                            <th>Total Courses</th>
                                            <th>Total Students</th>
                                            <th>Date Created</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT 
                                            c.name AS course_name,
                                            c.Id AS Id,
                                            c.facultyID AS faculty,
                                            f.facultyName AS faculty_name,
                                            COUNT(u.Id) AS total_units,
                                            COUNT(DISTINCT s.Id) AS total_students,
                                            c.dateCreated AS date_created
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
                                <h3 class="card-title">Courses</h3>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="courseTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Course Code</th>
                                            <th>Name</th>
                                            <th>Programme</th>
                                            <th>Total Students</th>
                                            <th>Date Created</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT 
                                            c.name AS course_name,
                                            u.unitCode AS unit_code,
                                            u.name AS unit_name,
                                            u.Id AS Id,
                                            u.dateCreated AS date_created,
                                            COUNT(s.Id) AS total_students
                                            FROM tblunit u
                                            LEFT JOIN tblcourse c ON u.courseID = c.Id
                                            LEFT JOIN tblstudents s ON c.courseCode = s.courseCode
                                            GROUP BY u.Id");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowunit{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['unit_code']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['unit_name']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['course_name'] ?? '-') . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_students']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['date_created']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='unit'><i class='fas fa-trash'></i></button></td>";
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
                                <h3 class="card-title">Colleges</h3>
                            </div>
                            <div class="card-body table-responsive p-0">
                                <table id="collegeTable" class="table table-striped table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Total Programmes</th>
                                            <th>Total Students</th>
                                            <th>Total Lecturers</th>
                                            <th>Date Created</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        $stmt = $pdo->query("SELECT 
                                            f.facultyName AS faculty_name,
                                            f.facultyCode AS faculty_code,
                                            f.Id AS Id,
                                            f.dateRegistered AS date_created,
                                            COUNT(DISTINCT c.Id) AS total_courses,
                                            COUNT(DISTINCT s.Id) AS total_students,
                                            COUNT(DISTINCT l.Id) AS total_lecturers
                                            FROM tblfaculty f
                                            LEFT JOIN tblcourse c ON f.Id = c.facultyID
                                            LEFT JOIN tblstudents s ON f.facultyCode = s.faculty
                                            LEFT JOIN tbllecture l ON f.facultyCode = l.facultyCode
                                            GROUP BY f.Id");
                                        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                                            echo "<tr id='rowfaculty{$row['Id']}'>";
                                            echo "<td>" . htmlspecialchars($row['faculty_code']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['faculty_name']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_courses']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_students']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['total_lecturers']) . "</td>";
                                            echo "<td>" . htmlspecialchars($row['date_created']) . "</td>";
                                            echo "<td><button class='btn btn-sm btn-danger delete-record' data-id='{$row['Id']}' data-type='faculty'><i class='fas fa-trash'></i></button></td>";
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

        <!-- Modals -->
        <div class="modal fade" id="addProgrammeModal" tabindex="-1" aria-labelledby="addProgrammeModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addProgrammeModalLabel">Add Programme</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form method="POST" action="manage-course.php">
                            <div class="form-group">
                                <label for="courseName">Programme Name</label>
                                <input type="text" class="form-control" name="courseName" placeholder="Programme Name" required>
                            </div>
                            <div class="form-group">
                                <label for="courseCode">Programme Code</label>
                                <input type="text" class="form-control" name="courseCode" placeholder="Programme Code" required>
                            </div>
                            <div class="form-group">
                                <label for="faculty">College</label>
                                <select class="form-control" name="faculty" required>
                                    <option value="" selected>Select College</option>
                                    <?php
                                    $stmt = $pdo->query("SELECT Id, facultyName FROM tblfaculty");
                                    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $faculty) {
                                        echo '<option value="' . $faculty['Id'] . '">' . htmlspecialchars($faculty['facultyName']) . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-custom" name="addCourse">Save Programme</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="addCourseModal" tabindex="-1" aria-labelledby="addCourseModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addCourseModalLabel">Add Course</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form method="POST" action="manage-course.php">
                            <div class="form-group">
                                <label for="unitName">Course Name</label>
                                <input type="text" class="form-control" name="unitName" placeholder="Course Name" required>
                            </div>
                            <div class="form-group">
                                <label for="unitCode">Course Code</label>
                                <input type="text" class="form-control" name="unitCode" placeholder="Course Code" required>
                            </div>
                            <div class="form-group">
                                <label for="course">Programme</label>
                                <select class="form-control" name="course" required>
                                    <option value="" selected>Select Programme</option>
                                    <?php
                                    $stmt = $pdo->query("SELECT Id, name FROM tblcourse");
                                    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $course) {
                                        echo '<option value="' . $course['Id'] . '">' . htmlspecialchars($course['name']) . '</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-custom" name="addUnit">Save Course</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="addCollegeModal" tabindex="-1" aria-labelledby="addCollegeModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addCollegeModalLabel">Add College</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form method="POST" action="manage-course.php">
                            <div class="form-group">
                                <label for="facultyName">College Name</label>
                                <input type="text" class="form-control" name="facultyName" placeholder="College Name" required>
                            </div>
                            <div class="form-group">
                                <label for="facultyCode">College Code</label>
                                <input type="text" class="form-control" name="facultyCode" placeholder="College Code" required>
                            </div>
                            <button type="submit" class="btn btn-custom" name="addFaculty">Save College</button>
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
        $('#programmeTable, #courseTable, #collegeTable').DataTable({
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
            const displayType = {
                'course': 'programme',
                'unit': 'course',
                'faculty': 'college'
            }[type] || type;
            Swal.fire({
                title: 'Are you sure?',
                text: `Delete this ${displayType}? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#00a896',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!',
                customClass: { popup: 'swal2-popup' }
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: BASE_URL + 'manage-course.php',
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