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
    $type = filter_var($_GET['type'] ?? '', FILTER_SANITIZE_STRING);
    if ($type === 'courses') {
        $stmt = $pdo->query("SELECT courseCode, name FROM tblcourse");
        $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['status'] = 'success';
    } elseif ($type === 'units') {
        $courseCode = filter_var($_GET['course'] ?? '', FILTER_SANITIZE_STRING);
        if ($courseCode) {
            $stmt = $pdo->prepare("SELECT u.unitCode, u.name 
                                  FROM tblunit u 
                                  JOIN tblcourse c ON u.courseID = c.facultyID 
                                  WHERE c.courseCode = :courseCode");
            $stmt->execute([':courseCode' => $courseCode]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
        } else {
            $response['message'] = 'Missing course code';
        }
    } elseif ($type === 'venues') {
        $stmt = $pdo->query("SELECT className FROM tblvenue");
        $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response['status'] = 'success';
    } elseif ($type === 'view-students') {
        $courseCode = filter_var($_GET['course'] ?? '', FILTER_SANITIZE_STRING);
        if ($courseCode) {
            $stmt = $pdo->prepare("SELECT registrationNumber, firstName, lastName, email FROM tblstudents WHERE courseCode = :courseCode");
            $stmt->execute([':courseCode' => $courseCode]);
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
        } else {
            $response['message'] = 'Missing course code';
        }
    } elseif ($type === 'download-record') {
        $courseCode = filter_var($_GET['course'] ?? '', FILTER_SANITIZE_STRING);
        $unitCode = filter_var($_GET['unit'] ?? '', FILTER_SANITIZE_STRING);
        if ($courseCode && $unitCode) {
            $stmtDates = $pdo->prepare("SELECT DISTINCT dateMarked FROM tblattendance WHERE course = :courseCode AND unit = :unitCode");
            $stmtDates->execute([':courseCode' => $courseCode, ':unitCode' => $unitCode]);
            $dates = $stmtDates->fetchAll(PDO::FETCH_COLUMN);

            $stmtStudents = $pdo->prepare("SELECT DISTINCT studentRegistrationNumber FROM tblattendance WHERE course = :courseCode AND unit = :unitCode");
            $stmtStudents->execute([':courseCode' => $courseCode, ':unitCode' => $unitCode]);
            $students = $stmtStudents->fetchAll(PDO::FETCH_COLUMN);

            $attendanceData = [];
            foreach ($students as $student) {
                $studentData = ['studentRegistrationNumber' => $student];
                foreach ($dates as $date) {
                    $stmtAttendance = $pdo->prepare("SELECT attendanceStatus FROM tblattendance 
                        WHERE studentRegistrationNumber = :studentID AND dateMarked = :date 
                        AND course = :courseCode AND unit = :unitCode");
                    $stmtAttendance->execute([
                        ':studentID' => $student,
                        ':date' => $date,
                        ':courseCode' => $courseCode,
                        ':unitCode' => $unitCode
                    ]);
                    $result = $stmtAttendance->fetch(PDO::FETCH_ASSOC);
                    $studentData[$date] = $result ? $result['attendanceStatus'] : 'Absent';
                }
                $attendanceData[] = $studentData;
            }
            $response['status'] = 'success';
            $response['dates'] = $dates;
            $response['students'] = $attendanceData;
        } else {
            $response['message'] = 'Missing course or unit code';
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'manageFolder') {
    $courseID = filter_var($_POST['courseID'] ?? '', FILTER_SANITIZE_STRING);
    $unitID = filter_var($_POST['unitID'] ?? '', FILTER_SANITIZE_STRING);
    $venueID = filter_var($_POST['venueID'] ?? '', FILTER_SANITIZE_STRING);
    if ($courseID && $unitID && $venueID) {
        try {
            $stmt = $pdo->prepare("SELECT registrationNumber, firstName, lastName FROM tblstudents WHERE courseCode = :courseID");
            $stmt->execute([':courseID' => $courseID]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("manageFolder: Found " . count($students) . " students for course $courseID");

            $validLabels = [];
            $html = '<table class="table table-striped" id="studentTableContainer"><thead><tr><th>Registration No</th><th>Name</th><th>Course</th><th>Unit</th><th>Venue</th><th>Attendance</th><th>Settings</th></tr></thead><tbody>';
            foreach ($students as $student) {
                $labelDir = "resources/labels/{$student['registrationNumber']}";
                $imageCount = is_dir($labelDir) ? count(glob("$labelDir/*.png")) : 0;
                error_log("manageFolder: Checking $labelDir, found $imageCount images");
                if ($imageCount >= 1) {
                    $validLabels[] = $student['registrationNumber'];
                    $html .= "<tr>";
                    $html .= "<td>" . htmlspecialchars($student['registrationNumber']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($student['firstName'] . ' ' . $student['lastName']) . "</td>";
                    $html .= "<td>" . htmlspecialchars($courseID) . "</td>";
                    $html .= "<td>" . htmlspecialchars($unitID) . "</td>";
                    $html .= "<td>" . htmlspecialchars($venueID) . "</td>";
                    $html .= "<td>Absent</td>";
                    $html .= "<td><span><i class='ri-edit-line edit'></i><i class='ri-delete-bin-line delete'></i></span></td>";
                    $html .= "</tr>";
                }
            }
            $html .= '</tbody></table>';
            $response['status'] = empty($students) ? 'error' : (empty($validLabels) ? 'warning' : 'success');
            $response['message'] = empty($students) ? 'No students found for this course' : (empty($validLabels) ? 'No students with valid images found. Capture images to proceed.' : 'Success');
            $response['data'] = $validLabels;
            $response['html'] = empty($students) ? '<p>No students found for this course.</p>' : (empty($validLabels) ? '<p>No students found with valid images. Use "Capture Image" to add images.</p>' : $html);
            error_log("manageFolder: Response status: {$response['status']}, message: {$response['message']}, validLabels: " . count($validLabels));
        } catch (Exception $e) {
            error_log('manageFolder error: ' . $e->getMessage());
            $response['message'] = 'Server error processing students';
        }
    } else {
        $response['message'] = 'Missing parameters';
        error_log("manageFolder: Missing parameters - courseID: $courseID, unitID: $unitID, venueID: $venueID");
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'save_attendance') {
    $attendanceData = json_decode(file_get_contents("php://input"), true);
    if ($attendanceData && is_array($attendanceData)) {
        try {
            $sql = "INSERT INTO tblattendance (studentRegistrationNumber, course, unit, attendanceStatus, dateMarked) 
                    VALUES (:studentID, :course, :unit, :attendanceStatus, :date)";
            $stmt = $pdo->prepare($sql);
            foreach ($attendanceData as $data) {
                $stmt->execute([
                    ':studentID' => filter_var($data['studentID'], FILTER_SANITIZE_STRING),
                    ':course' => filter_var($data['course'], FILTER_SANITIZE_STRING),
                    ':unit' => filter_var($data['unit'], FILTER_SANITIZE_STRING),
                    ':attendanceStatus' => filter_var($data['attendanceStatus'], FILTER_SANITIZE_STRING),
                    ':date' => date("Y-m-d")
                ]);
            }
            $response['status'] = 'success';
            $response['message'] = 'Attendance recorded successfully';
        } catch (PDOException $e) {
            error_log('save_attendance error: ' . $e->getMessage());
            $response['message'] = 'Error inserting attendance';
        }
    } else {
        $response['message'] = 'Invalid attendance data';
        error_log('save_attendance: Invalid attendance data');
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $request === 'save_image') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (isset($data['image']) && isset($data['studentID'])) {
        try {
            $imageData = str_replace('data:image/png;base64,', '', $data['image']);
            $imageData = str_replace(' ', '+', $imageData);
            $imageBinary = base64_decode($imageData);
            $studentID = filter_var($data['studentID'], FILTER_SANITIZE_STRING);
            $labelDir = "resources/labels/$studentID";
            if (!is_dir($labelDir)) {
                mkdir($labelDir, 0777, true);
                error_log("save_image: Created directory $labelDir");
            }
            $imageNumber = 1;
            while (file_exists("$labelDir/$imageNumber.png")) {
                $imageNumber++;
            }
            $filePath = "$labelDir/$imageNumber.png";
            if (file_put_contents($filePath, $imageBinary)) {
                $response['status'] = 'success';
                $response['message'] = "Image saved as $filePath";
                error_log("save_image: Image saved as $filePath");
            } else {
                error_log('save_image: Failed to save image: ' . $filePath);
                $response['message'] = 'Failed to save image';
            }
        } catch (Exception $e) {
            error_log('save_image error: ' . $e->getMessage());
            $response['message'] = 'Error processing image';
        }
    } else {
        $response['message'] = 'Invalid image data or student ID';
        error_log('save_image: Invalid image data or student ID');
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
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="resources/images/logo/attnlg.png" rel="icon">
    <title>Lecturer Dashboard</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Remixicon CSS -->
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css" rel="stylesheet">
    <!-- Font Awesome CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- XLSX and FileSaver -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.21.0/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"></script>
    <!-- Local Face-API.js -->
    <script src="http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/javascript/face_logics/face-api.min.js"></script>
    <style>
        body {
            background-color: #f8f9fa;
        }
        .sidebar {
            width: 250px;
            background-color: #fff;
            padding: 20px;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .sidebar.hidden {
            transform: translateX(-250px);
        }
        .sidebar .nav-link {
            display: flex;
            align-items: center;
            padding: 10px;
            color: #333;
            text-decoration: none;
        }
        .sidebar .nav-link:hover, .sidebar .nav-link.active {
            background-color: #007bff;
            color: white !important;
        }
        .sidebar .nav-link i {
            margin-right: 10px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: #fff;
            border-bottom: 1px solid #ddd;
            position: fixed;
            top: 0;
            left: 250px;
            right: 0;
            z-index: 999;
        }
        .header .menu-toggle {
            cursor: pointer;
        }
        .main-content {
            margin-left: 250px;
            padding: 80px 20px 20px;
            transition: margin-left 0.3s ease;
        }
        .main-content.full {
            margin-left: 0;
        }
        .content-section {
            display: none;
        }
        .content-section.active {
            display: block;
        }
        .video-container canvas {
            position: absolute;
            top: 0;
            left: 0;
        }
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-250px);
            }
            .sidebar.active {
                transform: translateX(0);
            }
            .header {
                left: 0;
            }
            .main-content {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <section class="header">
        <div class="d-flex align-items-center">
            <i class="ri-menu-line menu-toggle fs-4 me-2"></i>
            <h2 class="mb-0">Attendance M<span class="text-primary">s</span></h2>
        </div>
        <div class="d-flex align-items-center">
            <div class="input-group me-3">
                <input type="text" id="searchText" class="form-control" placeholder="Search ...">
                <button class="btn btn-primary" onclick="searchItems()"><i class="ri-search-2-line"></i></button>
            </div>
            <div class="d-flex align-items-center">
                <span class="me-2">@ <?php echo htmlspecialchars($_SESSION['firstName'] ?? 'Lecturer'); ?></span>
                <img src="https://ui-avatars.com/api/?name=Lecturer" alt="Profile" class="rounded-circle" width="40" height="40">
            </div>
        </div>
    </section>
    <!-- Sidebar -->
    <nav class="sidebar">
        <ul class="nav flex-column">
            <li class="nav-item"><a class="nav-link active" href="#" data-section="take-attendance"><i class="ri-file-text-line"></i> Take Attendance</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-section="view-attendance"><i class="ri-map-pin-line"></i> View Attendance</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-section="view-students"><i class="ri-user-line"></i> Students</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-section="download-record"><i class="ri-download-line"></i> Download Attendance</a></li>
            <li class="nav-item mt-auto"><a class="nav-link" href="#"><i class="ri-settings-3-line"></i> Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="logout"><i class="ri-logout-box-r-line"></i> Logout</a></li>
        </ul>
    </nav>
    <!-- Main Content -->
    <div class="main-content">
        <!-- Toast Container -->
        <div class="toast-container position-fixed top-0 end-0 p-3">
            <div id="statusToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">Status</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body"></div>
            </div>
        </div>
        <!-- Modal for Capture Feedback -->
        <div class="modal fade" id="captureModal" tabindex="-1" aria-labelledby="captureModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="captureModalLabel">Image Capture</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="captureModalBody"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Content Sections -->
        <div id="take-attendance" class="content-section active">
            <h2 class="text-center mb-4">Take Attendance</h2>
            <div class="row mb-3">
                <div class="col-md-4">
                    <select id="courseSelect" class="form-select">
                        <option value="">Select Course</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <select id="unitSelect" class="form-select">
                        <option value="">Select Unit</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <select id="venueSelect" class="form-select">
                        <option value="">Select Venue</option>
                    </select>
                </div>
            </div>
            <div class="d-flex justify-content-center mb-3">
                <button class="btn btn-primary me-2" id="startWebcam"><i class="fas fa-camera"></i> Launch Facial Recognition</button>
                <button class="btn btn-success me-2" id="captureImage" style="display: none;"><i class="fas fa-camera-retro"></i> Capture Image</button>
                <button class="btn btn-warning me-2" id="stopWebcam" style="display: none;"><i class="fas fa-stop"></i> Stop Recognition</button>
                <button class="btn btn-danger" id="endAttendance"><i class="fas fa-sign-out-alt"></i> End Attendance</button>
            </div>
            <div class="card mx-auto video-container mb-3" style="display: none; max-width: 600px;">
                <div class="card-body position-relative">
                    <video id="video" class="img-fluid rounded" width="600" height="450" autoplay></video>
                    <canvas id="overlay" style="position: absolute; top: 0; left: 0;"></canvas>
                </div>
            </div>
            <div id="capturedImagesContainer" class="row mb-3" style="display: none;">
                <h5 class="text-center mb-3">Captured Images (Click to Retake)</h5>
            </div>
            <div id="studentTableContainer" class="table-responsive"></div>
        </div>
        <div id="view-attendance" class="content-section">
            <h2 class="text-center mb-4">View Attendance</h2>
            <div class="row mb-3">
                <div class="col-md-6">
                    <select id="viewCourseSelect" class="form-select">
                        <option value="">Select Course</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <select id="viewUnitSelect" class="form-select">
                        <option value="">Select Unit</option>
                    </select>
                </div>
            </div>
            <div id="attendanceTableContainer" class="table-responsive"></div>
        </div>
        <div id="view-students" class="content-section">
            <h2 class="text-center mb-4">View Students</h2>
            <div class="row mb-3">
                <div class="col-md-12">
                    <select id="studentsCourseSelect" class="form-select">
                        <option value="">Select Course</option>
                    </select>
                </div>
            </div>
            <div id="studentsTableContainer" class="table-responsive"></div>
        </div>
        <div id="download-record" class="content-section">
            <h2 class="text-center mb-4">Download Attendance</h2>
            <div class="row mb-3">
                <div class="col-md-5">
                    <select id="downloadCourseSelect" class="form-select">
                        <option value="">Select Course</option>
                    </select>
                </div>
                <div class="col-md-5">
                    <select id="downloadUnitSelect" class="form-select">
                        <option value="">Select Unit</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <button class="btn btn-primary w-100" id="exportExcel">Export as Excel</button>
                </div>
            </div>
            <div id="downloadTableContainer" class="table-responsive"></div>
        </div>
    </div>

    <script>
        let webcamStarted = false;
        let modelsLoaded = false;
        let capturedImages = [];
        let detectedFaces = [];
        const successSound = new Audio('https://freesound.org/data/previews/484/484344_10734782-lq.mp3');
        const errorSound = new Audio('https://freesound.org/data/previews/142/142608_2527786-lq.mp3');

        function showToast(message, type = 'info') {
            const toast = $('#statusToast');
            toast.find('.toast-body').text(message);
            toast.removeClass('bg-success bg-danger bg-warning bg-info');
            toast.addClass(`bg-${type}`);
            new bootstrap.Toast(toast[0]).show();
        }

        function showModal(message) {
            $('#captureModalBody').text(message);
            new bootstrap.Modal($('#captureModal')[0]).show();
        }

        function searchItems() {
            const input = $('#searchText').val().toLowerCase();
            $('table tr').each(function(index) {
                if (index === 0) return;
                const cells = $(this).find('td');
                let found = false;
                cells.each(function() {
                    if ($(this).text().toLowerCase().includes(input)) found = true;
                });
                $(this).css('display', found ? '' : 'none');
            });
        }

        $(document).ready(function() {
            // Check if faceapi is loaded
            if (typeof faceapi === 'undefined') {
                showToast('Face API failed to load. Check the local file path at http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/javascript/face_logics/face-api.min.js', 'danger');
                errorSound.play().catch(() => console.warn('Error sound failed to play'));
                return;
            }

            // Sidebar toggle for mobile
            $('.menu-toggle').click(function() {
                $('.sidebar').toggleClass('hidden active');
                $('.main-content').toggleClass('full');
            });

            // SPA navigation
            $('.nav-link[data-section]').click(function(e) {
                e.preventDefault();
                $('.nav-link').removeClass('active');
                $(this).addClass('active');
                $('.content-section').removeClass('active');
                $(`#${$(this).data('section')}`).addClass('active');
                if ($(window).width() <= 768) {
                    $('.sidebar').removeClass('active').addClass('hidden');
                    $('.main-content').addClass('full');
                }
            });

            // Load initial data
            $.ajax({
                url: 'lspa.php?request=get_data&type=courses',
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    if (data.status === 'success') {
                        $('#courseSelect, #viewCourseSelect, #downloadCourseSelect, #studentsCourseSelect').each(function() {
                            $(this).append(data.data.map(c => `<option value="${c.courseCode}">${c.name}</option>`));
                        });
                    } else {
                        showToast(data.message, 'danger');
                    }
                },
                error: function(xhr, status, error) {
                    showToast('Error fetching courses: ' + error, 'danger');
                    console.error('Courses fetch error:', xhr.responseText);
                }
            });

            $('#courseSelect, #viewCourseSelect, #downloadCourseSelect').change(function() {
                const course = $(this).val();
                const target = $(this).attr('id').includes('view') ? '#viewUnitSelect' : 
                              $(this).attr('id').includes('download') ? '#downloadUnitSelect' : '#unitSelect';
                if (course) {
                    $.ajax({
                        url: `lspa.php?request=get_data&type=units&course=${encodeURIComponent(course)}`,
                        type: 'GET',
                        dataType: 'json',
                        success: function(data) {
                            if (data.status === 'success') {
                                $(target).html('<option value="">Select Unit</option>' + 
                                    data.data.map(u => `<option value="${u.unitCode}">${u.name}</option>`).join(''));
                            } else {
                                showToast(data.message, 'danger');
                            }
                        },
                        error: function(xhr, status, error) {
                            showToast('Error fetching units: ' + error, 'danger');
                            console.error('Units fetch error:', xhr.responseText);
                        }
                    });
                } else {
                    $(target).html('<option value="">Select Unit</option>');
                }
            });

            $.ajax({
                url: 'lspa.php?request=get_data&type=venues',
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    if (data.status === 'success') {
                        $('#venueSelect').append(data.data.map(v => `<option value="${v.className}">${v.className}</option>`));
                    } else {
                        showToast(data.message, 'danger');
                    }
                },
                error: function(xhr, status, error) {
                    showToast('Error fetching venues: ' + error, 'danger');
                    console.error('Venues fetch error:', xhr.responseText);
                }
            });

            // Load Face-API models
            const modelPath = 'http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/models/';
            Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
            ])
                .then(() => {
                    modelsLoaded = true;
                    showToast('Face recognition models loaded successfully', 'success');
                    successSound.play().catch(() => console.warn('Success sound failed to play'));
                })
                .catch(err => {
                    showToast('Failed to load face recognition models. Check local model files in C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/models/', 'danger');
                    console.error('Model loading error:', err);
                    errorSound.play().catch(() => console.warn('Error sound failed to play'));
                });

            // Take Attendance: Update table
            $('#courseSelect, #unitSelect, #venueSelect').change(function() {
                const course = $('#courseSelect').val();
                const unit = $('#unitSelect').val();
                const venue = $('#venueSelect').val();
                if (course && unit && venue) {
                    $.ajax({
                        url: 'lspa.php?request=manageFolder',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `courseID=${encodeURIComponent(course)}&unitID=${encodeURIComponent(unit)}&venueID=${encodeURIComponent(venue)}`,
                        dataType: 'json',
                        success: function(data) {
                            try {
                                if (data.status === 'success') {
                                    window.labels = data.data;
                                    $('#studentTableContainer').html(data.html);
                                    showToast('Student data loaded successfully', 'success');
                                } else {
                                    $('#studentTableContainer').html(data.html || '<p>No students found with valid images. Use "Capture Image" to add images.</p>');
                                    showToast(data.message, data.status === 'warning' ? 'warning' : 'danger');
                                }
                            } catch (e) {
                                showToast('Error parsing student data: Invalid server response', 'danger');
                                console.error('Parse error:', e, 'Response:', data);
                            }
                        },
                        error: function(xhr, status, error) {
                            showToast('Error fetching student data: ' + error, 'danger');
                            console.error('manageFolder error:', xhr.responseText);
                        }
                    });
                }
            });

            // Start Webcam
            $('#startWebcam').click(function() {
                if (!webcamStarted && modelsLoaded) {
                    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        .then(stream => {
                            $('#video')[0].srcObject = stream;
                            webcamStarted = true;
                            $('.video-container').show();
                            $('#captureImage, #stopWebcam').show();
                            showToast('Webcam started successfully', 'success');
                            successSound.play().catch(() => console.warn('Success sound failed to play'));
                            if (window.labels && window.labels.length > 0) {
                                startFaceRecognition();
                            } else {
                                showToast('No students with valid images. Use "Capture Image" to add images.', 'warning');
                            }
                        })
                        .catch(error => {
                            showToast('Failed to access webcam: ' + error.message, 'danger');
                            errorSound.play().catch(() => console.warn('Error sound failed to play'));
                            console.error('Webcam error:', error);
                        });
                } else if (!modelsLoaded) {
                    showToast('Face recognition models not loaded yet. Please wait or check model files.', 'warning');
                }
            });

            // Stop Webcam
            $('#stopWebcam').click(function() {
                const video = $('#video')[0];
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                    webcamStarted = false;
                    $('.video-container').hide();
                    $('#captureImage, #stopWebcam').hide();
                    showToast('Webcam stopped', 'info');
                }
            });

            // Capture Image
            $('#captureImage').click(async function() {
                if ($(this).hasClass('disabled')) return;
                $(this).addClass('disabled');
                showToast('Capturing in progress...', 'info');
                const video = $('#video')[0];
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/png');

                const img = await faceapi.fetchImage(imageData);
                const detections = await faceapi
                    .detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections) {
                    showModal('Image captured successfully! Enter student ID to save.');
                    showToast('Face detected in captured image', 'success');
                    successSound.play().catch(() => console.warn('Success sound failed to play'));
                    capturedImages.push(imageData);
                    updateCapturedImages();
                    const studentID = prompt('Enter Student Registration Number:');
                    if (studentID) {
                        $.ajax({
                            url: 'lspa.php?request=save_image',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({ image: imageData, studentID }),
                            dataType: 'json',
                            success: function(response) {
                                showToast(response.message, response.status);
                                // Refresh student table after saving image
                                $('#courseSelect').trigger('change');
                            },
                            error: function(xhr, status, error) {
                                showToast('Error saving image: ' + error, 'danger');
                                console.error('save_image error:', xhr.responseText);
                            }
                        });
                    } else {
                        showToast('No student ID provided. Image not saved.', 'warning');
                    }
                } else {
                    showModal('No face detected in the captured image. Please try again.');
                    showToast('No face detected', 'danger');
                    errorSound.play().catch(() => console.warn('Error sound failed to play'));
                }
                $(this).removeClass('disabled');
            });

            function updateCapturedImages() {
                const container = $('#capturedImagesContainer');
                container.show().find('div').remove();
                capturedImages.forEach((img, index) => {
                    container.append(`
                        <div class="col-md-4 mb-2">
                            <img src="${img}" class="img-thumbnail cursor-pointer" onclick="retakeImage(${index})">
                        </div>
                    `);
                });
            }

            window.retakeImage = function(index) {
                capturedImages.splice(index, 1);
                updateCapturedImages();
                if (capturedImages.length === 0) $('#capturedImagesContainer').hide();
                $('#captureImage').click();
            };

            async function startFaceRecognition() {
                const video = $('#video')[0];
                const labeledFaceDescriptors = await getLabeledFaceDescriptions();
                if (labeledFaceDescriptors.length === 0) {
                    showToast('No valid face descriptors loaded. Use "Capture Image" to add student images.', 'warning');
                    return;
                }
                const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
                const canvas = faceapi.createCanvasFromMedia(video);
                $('.video-container').append(canvas);
                const displaySize = { width: video.width, height: video.height };
                faceapi.matchDimensions(canvas, displaySize);

                setInterval(async () => {
                    const detections = await faceapi
                        .detectAllFaces(video)
                        .withFaceLandmarks()
                        .withFaceDescriptors();
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

                    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
                    detectedFaces = results.map(result => result.label).filter(label => label !== 'unknown');
                    markAttendance(detectedFaces);

                    results.forEach((result, i) => {
                        const box = resizedDetections[i].detection.box;
                        const label = result.label === 'unknown' ? 'Not Recognized' : result.label;
                        const drawBox = new faceapi.draw.DrawBox(box, { label });
                        drawBox.draw(canvas);
                        if (label === 'Not Recognized') {
                            showToast('Face not recognized', 'danger');
                            errorSound.play().catch(() => console.warn('Error sound failed to play'));
                        } else {
                            showToast(`Recognized: ${label}`, 'success');
                            successSound.play().catch(() => console.warn('Success sound failed to play'));
                        }
                    });
                }, 1000);
            }

            async function getLabeledFaceDescriptions() {
                const labeledDescriptors = [];
                for (const label of window.labels || []) {
                    const descriptions = [];
                    let validImages = 0;
                    for (let i = 1; i <= 5; i++) {
                        try {
                            const img = await faceapi.fetchImage(`http://localhost/T/Face-Recognition-Attendance-System-main/resources/labels/${label}/${i}.png`);
                            const detections = await faceapi
                                .detectSingleFace(img)
                                .withFaceLandmarks()
                                .withFaceDescriptor();
                            if (detections) {
                                descriptions.push(detections.descriptor);
                                validImages++;
                            }
                        } catch (error) {
                            console.warn(`Error loading http://localhost/T/Face-Recognition-Attendance-System-main/resources/labels/${label}/${i}.png: ${error.message}`);
                        }
                    }
                    if (descriptions.length > 0) {
                        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptions));
                        showToast(`Loaded ${validImages} images for student ${label}`, 'success');
                    } else {
                        showToast(`No valid images for student ${label}. Skipping.`, 'warning');
                    }
                }
                return labeledDescriptors;
            }

            function markAttendance(detectedFaces) {
                $('#studentTableContainer tr').each(function(index) {
                    if (index === 0) return;
                    const registrationNumber = $(this).find('td').eq(0).text().trim();
                    if (detectedFaces.includes(registrationNumber)) {
                        $(this).find('td').eq(5).text('present');
                    }
                });
            }

            $('#endAttendance').click(function() {
                const attendanceData = [];
                $('#studentTableContainer tr').each(function(index) {
                    if (index === 0) return;
                    const studentID = $(this).find('td').eq(0).text().trim();
                    const course = $(this).find('td').eq(2).text().trim();
                    const unit = $(this).find('td').eq(3).text().trim();
                    const attendanceStatus = $(this).find('td').eq(5).text().trim();
                    attendanceData.push({ studentID, course, unit, attendanceStatus });
                });

                $.ajax({
                    url: 'lspa.php?request=save_attendance',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(attendanceData),
                    dataType: 'json',
                    success: function(response) {
                        showToast(response.message, response.status);
                    },
                    error: function(xhr, status, error) {
                        showToast('Error saving attendance: ' + error, 'danger');
                        console.error('save_attendance error:', xhr.responseText);
                    }
                });
                $('#stopWebcam').click();
                $('.video-container').hide();
                $('#capturedImagesContainer').hide();
            });

            // View Attendance
            $('#viewCourseSelect, #viewUnitSelect').change(function() {
                const course = $('#viewCourseSelect').val();
                const unit = $('#viewUnitSelect').val();
                if (course && unit) {
                    $.ajax({
                        url: `lspa.php?request=get_data&type=download-record&course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`,
                        type: 'GET',
                        dataType: 'json',
                        success: function(data) {
                            if (data.status === 'success') {
                                let html = '<table class="table table-striped"><thead><tr><th>Registration No</th>';
                                data.dates.forEach(date => html += `<th>${date}</th>`);
                                html += '</tr></thead><tbody>';
                                data.students.forEach(student => {
                                    html += `<tr><td>${student.studentRegistrationNumber}</td>`;
                                    data.dates.forEach(date => html += `<td>${student[date] || 'Absent'}</td>`);
                                    html += '</tr>';
                                });
                                html += '</tbody></table>';
                                $('#attendanceTableContainer').html(html);
                            } else {
                                showToast(data.message, 'danger');
                            }
                        },
                        error: function(xhr, status, error) {
                            showToast('Error fetching attendance: ' + error, 'danger');
                            console.error('Attendance fetch error:', xhr.responseText);
                        }
                    });
                }
            });

            // View Students
            $('#studentsCourseSelect').change(function() {
                const course = $(this).val();
                if (course) {
                    $.ajax({
                        url: `lspa.php?request=get_data&type=view-students&course=${encodeURIComponent(course)}`,
                        type: 'GET',
                        dataType: 'json',
                        success: function(data) {
                            if (data.status === 'success') {
                                let html = '<table class="table table-striped"><thead><tr><th>Registration No</th><th>First Name</th><th>Last Name</th><th>Email</th></tr></thead><tbody>';
                                data.data.forEach(student => {
                                    html += `<tr><td>${student.registrationNumber}</td><td>${student.firstName}</td><td>${student.lastName}</td><td>${student.email}</td></tr>`;
                                });
                                html += '</tbody></table>';
                                $('#studentsTableContainer').html(html);
                            } else {
                                showToast(data.message, 'danger');
                            }
                        },
                        error: function(xhr, status, error) {
                            showToast('Error fetching students: ' + error, 'danger');
                            console.error('Students fetch error:', xhr.responseText);
                        }
                    });
                }
            });

            // Download Attendance
            $('#downloadCourseSelect, #downloadUnitSelect').change(function() {
                const course = $('#downloadCourseSelect').val();
                const unit = $('#downloadUnitSelect').val();
                if (course && unit) {
                    $.ajax({
                        url: `lspa.php?request=get_data&type=download-record&course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`,
                        type: 'GET',
                        dataType: 'json',
                        success: function(data) {
                            if (data.status === 'success') {
                                let html = '<table class="table table-striped"><thead><tr><th>Registration No</th>';
                                data.dates.forEach(date => html += `<th>${date}</th>`);
                                html += '</tr></thead><tbody>';
                                data.students.forEach(student => {
                                    html += `<tr><td>${student.studentRegistrationNumber}</td>`;
                                    data.dates.forEach(date => html += `<td>${student[date] || 'Absent'}</td>`);
                                    html += '</tr>';
                                });
                                html += '</tbody></table>';
                                $('#downloadTableContainer').html(html);
                                window.attendanceData = data;
                            } else {
                                showToast(data.message, 'danger');
                            }
                        },
                        error: function(xhr, status, error) {
                            showToast('Error fetching attendance: ' + error, 'danger');
                            console.error('Download fetch error:', xhr.responseText);
                        }
                    });
                }
            });

            $('#exportExcel').click(function() {
                if (!window.attendanceData) return showToast('No attendance data to export', 'danger');
                const table = $('<table>').html(`
                    <thead><tr><th>Registration No</th>${window.attendanceData.dates.map(date => `<th>${date}</th>`).join('')}</tr></thead>
                    <tbody>${window.attendanceData.students.map(student => `
                        <tr><td>${student.studentRegistrationNumber}</td>${window.attendanceData.dates.map(date => `<td>${student[date] || 'Absent'}</td>`).join('')}</tr>
                    `).join('')}</tbody>
                `);
                const wb = XLSX.utils.table_to_book(table[0], { sheet: 'Attendance' });
                const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });
                const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
                saveAs(blob, `${$('#downloadUnitSelect').val()}_on_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
            });

            function s2ab(s) {
                const buf = new ArrayBuffer(s.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            }
        });
    </script>
</body>
</html>