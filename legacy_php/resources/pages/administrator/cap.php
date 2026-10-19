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
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Check if user is authenticated
if (!isset($_SESSION['user']['email']) || $_SESSION['user']['role'] !== 'administrator') {
    error_log('Unauthorized access attempt to cap.php: ' . json_encode($_SESSION));
    header('Location: ../../login');
    exit;
}

// Check for student data from list.php
if (!isset($_SESSION['student_data'])) {
    error_log('No student data in session for cap.php');
    $_SESSION['message'] = 'No student data provided. Please start from the student form.';
    $_SESSION['message_type'] = 'error';
    header('Location: list.php');
    exit;
}

$studentData = $_SESSION['student_data'];
$registrationNumber = $studentData['registrationNumber'];

// Handle AJAX form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['saveStudent'])) {
    $response = ['status' => 'error', 'message' => 'Invalid request'];
    $imageFileNames = [];
    $basePath = 'C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/labels/';
    $folderPath = $basePath . $registrationNumber . '/';

    // Validate session data
    if (empty($studentData['firstName']) || empty($studentData['lastName']) || empty($studentData['email']) ||
        empty($registrationNumber) || empty($studentData['faculty']) || empty($studentData['courseCode'])) {
        $response['message'] = 'Invalid or incomplete student data in session.';
        error_log("Invalid session data for student $registrationNumber: " . json_encode($studentData));
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }

    // Create directory if it doesn't exist
    if (!file_exists($folderPath)) {
        if (!mkdir($folderPath, 0777, true)) {
            $response['message'] = 'Failed to create directory for images.';
            error_log("Failed to create directory: $folderPath");
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
    }

    // Check directory writability
    if (!is_writable($folderPath)) {
        $response['message'] = "Directory $folderPath is not writable.";
        error_log("Directory not writable: $folderPath");
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }

    $capturedImages = 0;
    for ($i = 1; $i <= 5; $i++) {
        if (isset($_POST["capturedImage$i"]) && !empty($_POST["capturedImage$i"])) {
            try {
                $imageData = $_POST["capturedImage$i"];
                if (strpos($imageData, 'data:image/') !== 0) {
                    error_log("Invalid image data format for image $i for student $registrationNumber");
                    continue;
                }

                $base64Data = explode(',', $imageData)[1];
                if (!base64_decode($base64Data, true)) {
                    error_log("Invalid base64 data for image $i for student $registrationNumber");
                    continue;
                }

                $decodedImage = base64_decode($base64Data);
                if ($decodedImage === false) {
                    error_log("Failed to decode base64 image $i for student $registrationNumber");
                    continue;
                }

                $fileName = "{$registrationNumber}_image{$i}.png";
                $labelName = "{$i}.png";
                $fullPath = $folderPath . $labelName;

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

    if ($capturedImages === 0) {
        $response['message'] = 'At least one valid image is required.';
        error_log("No valid images captured for student $registrationNumber");
    } else {
        try {
            $pdo->beginTransaction();
            $insertQuery = $pdo->prepare(
                "INSERT INTO tblstudents 
                (firstName, lastName, email, registrationNumber, faculty, courseCode, studentImage, dateRegistered) 
                VALUES (:firstName, :lastName, :email, :registrationNumber, :faculty, :courseCode, :studentImage, :dateRegistered)"
            );
            $success = $insertQuery->execute([
                ':firstName' => $studentData['firstName'],
                ':lastName' => $studentData['lastName'],
                ':email' => $studentData['email'],
                ':registrationNumber' => $registrationNumber,
                ':faculty' => $studentData['faculty'],
                ':courseCode' => $studentData['courseCode'],
                ':studentImage' => $imagesJson,
                ':dateRegistered' => $studentData['dateRegistered']
            ]);

            if (!$success) {
                throw new PDOException("Failed to insert student record");
            }

            $pdo->commit();
            $response['status'] = 'success';
            $response['message'] = "Student $registrationNumber added successfully with $capturedImages images!";
            error_log("Student $registrationNumber added successfully with $capturedImages images");
            unset($_SESSION['student_data']);
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response['message'] = 'Database Error: ' . $e->getMessage();
            error_log("Student insertion error for $registrationNumber: " . $e->getMessage());
        } catch (Exception $e) {
            $pdo->rollBack();
            $response['message'] = 'Unexpected error: ' . $e->getMessage();
            error_log("Unexpected error for $registrationNumber: " . $e->getMessage());
        }
    }

    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// Handle get_student_images request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['request']) && $_POST['request'] === 'get_student_images') {
    $response = ['status' => 'error', 'message' => 'Failed to fetch images'];
    try {
        $stmt = $pdo->query("SELECT registrationNumber, studentImage FROM tblstudents");
        $students = $stmt->fetchAll();
        $imageData = [];
        $basePath = 'C:/xampp/htdocs/T/Face-Recognition-Attendance-System-main/resources/labels/';
        foreach ($students as $student) {
            $images = json_decode($student['studentImage'], true);
            if (!is_array($images)) {
                error_log("Invalid studentImage JSON for registrationNumber: {$student['registrationNumber']}");
                continue;
            }
            foreach ($images as $index => $image) {
                $imagePath = "resources/labels/{$student['registrationNumber']}/" . ($index + 1) . ".png";
                $fullPath = $basePath . $student['registrationNumber'] . '/' . ($index + 1) . '.png';
                if (file_exists($fullPath)) {
                    $imageData[] = [
                        'registrationNumber' => $student['registrationNumber'],
                        'imagePath' => "http://localhost/T/Face-Recognition-Attendance-System-main/$imagePath"
                    ];
                    error_log("Found image for {$student['registrationNumber']}: $fullPath");
                } else {
                    error_log("Image not found in file system: $fullPath");
                }
            }
        }
        $response['status'] = 'success';
        $response['data'] = $imageData;
        error_log("Successfully fetched " . count($imageData) . " student images for get_student_images request");
    } catch (PDOException $e) {
        $response['message'] = "Database Error: " . $e->getMessage();
        error_log("get_student_images error: " . $e->getMessage());
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
    <title>Capture or Upload Student Photos</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/css/adminlte.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
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
        .camera-canvas { display: none; }
        #multiple-images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        #multiple-images img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 5px;
            border: 2px solid #00a896;
        }
        .status-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .status-success { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
        #face-overlay { position: absolute; top: 0; left: 0; pointer-events: none; }
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
                <a class="nav-link" href="list.php">Face Recognition Attendance System</a>
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
                        <h1 class="m-0">Capture or Upload Student Photos</h1>
                    </div>
                </div>
            </div>
        </div>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card card-primary card-outline">
                            <div class="card-header">
                                <h3 class="card-title">Capture/Upload Photos for <?php echo htmlspecialchars($studentData['firstName'] . ' ' . $studentData['lastName']); ?></h3>
                            </div>
                            <div class="card-body">
                                <form id="captureForm">
                                    <div class="form-group">
                                        <label>Take or Upload Student Pictures (Required: At least 1, Recommended: 5)</label>
                                        <div class="flex space-x-4 mb-4">
                                            <div id="open_camera" class="border-2 border-dashed border-gray-300 p-5 rounded-lg text-center cursor-pointer hover:border-teal-500 flex-1" onclick="openCameraInterface()">
                                                <i class="fas fa-camera fa-2x mb-2 text-teal-500"></i><br>
                                                <span>Capture with Camera</span>
                                            </div>
                                            <div id="upload_image" class="border-2 border-dashed border-gray-300 p-5 rounded-lg text-center cursor-pointer hover:border-teal-500 flex-1">
                                                <i class="fas fa-upload fa-2x mb-2 text-teal-500"></i><br>
                                                <span>Upload Image</span>
                                                <input type="file" id="imageUpload" accept="image/png,image/jpeg" class="hidden">
                                            </div>
                                        </div>
                                        <div id="multiple-images" class="mt-3"></div>
                                        <div id="capture-status" class="mt-2">
                                            <small class="text-gray-600">Images captured: <span id="image-count">0</span>/5</small>
                                        </div>
                                        <input type="hidden" name="capturedImage1" id="capturedImage1">
                                        <input type="hidden" name="capturedImage2" id="capturedImage2">
                                        <input type="hidden" name="capturedImage3" id="capturedImage3">
                                        <input type="hidden" name="capturedImage4" id="capturedImage4">
                                        <input type="hidden" name="capturedImage5" id="capturedImage5">
                                        <input type="hidden" name="saveStudent" value="1">
                                    </div>
                                    <button type="submit" class="btn btn-custom w-full" id="submitButton">Save Student</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2.0/dist/js/adminlte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/javascript/face_logics/face-api.min.js"></script>
<script>
    const DEBUG = true;
    const BASE_URL = './';
    const MODEL_PATH = 'http://localhost/T/Face-Recognition-Attendance-System-main/resources/pages/lecturer/models/';
    const MODEL_LOAD_TIMEOUT = 15000;
    let imageCount = 0;
    let modelsLoaded = false;
    let currentStream = null;
    let faceDetectionActive = false;
    let isUploading = false;

    // Show alert messages
    function showAlert(message, type = 'info', redirect = false) {
        console.log(`[${type.toUpperCase()}] ${new Date().toISOString()}: Alert shown: ${message} (${type})`);
        Swal.fire({
            icon: type,
            title: type.charAt(0).toUpperCase() + type.slice(1),
            text: message,
            showConfirmButton: true,
            confirmButtonText: redirect ? 'Continue' : 'OK',
            confirmButtonColor: '#00a896',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (redirect && result.isConfirmed) {
                console.log(`[DEBUG] ${new Date().toISOString()}: User confirmed redirect to list.php`);
                window.location.href = 'list.php';
            }
        });
    }

    // Load face-api.js models
    async function loadFaceApiModels() {
        console.log(`[DEBUG] ${new Date().toISOString()}: Starting to load face-api.js models`);
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[DEBUG] ${new Date().toISOString()}: Model loading attempt ${attempt}`);
                await Promise.race([
                    Promise.all([
                        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
                        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
                        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                    ]),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Model loading timed out')), MODEL_LOAD_TIMEOUT))
                ]);
                modelsLoaded = true;
                console.log(`[DEBUG] ${new Date().toISOString()}: Face-api models loaded successfully`);
                return true;
            } catch (err) {
                console.error(`[ERROR] ${new Date().toISOString()}: Model loading attempt ${attempt} failed: ${err.message}`);
                if (attempt === 3) {
                    console.error(`[ERROR] ${new Date().toISOString()}: Failed to load face-api models after 3 attempts`);
                    showAlert('Failed to load facial recognition models. Please refresh the page.', 'error');
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return false;
    }

    // Open camera interface
    async function openCameraInterface() {
        console.log(`[DEBUG] ${new Date().toISOString()}: Opening camera interface`);
        if (!modelsLoaded) {
            console.log(`[DEBUG] ${new Date().toISOString()}: Models not loaded, attempting to load...`);
            if (!await loadFaceApiModels()) {
                showAlert('Face recognition models are not loaded. Please refresh the page.', 'error');
                return;
            }
        }

        if (isUploading) {
            console.log(`[DEBUG] ${new Date().toISOString()}: Upload in progress, preventing camera interface from opening`);
            showAlert('Please complete the image upload before using the camera.', 'warning');
            return;
        }

        try {
            const constraints = { video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' } };
            console.log(`[DEBUG] ${new Date().toISOString()}: Requesting camera access with constraints`, constraints);
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log(`[DEBUG] ${new Date().toISOString()}: Camera access granted`);

            const modal = document.createElement('div');
            modal.className = 'camera-modal';
            modal.id = 'cameraModal';

            const container = document.createElement('div');
            container.className = 'camera-container';
            container.style.position = 'relative';

            const video = document.createElement('video');
            video.className = 'camera-video';
            video.srcObject = currentStream;
            video.autoplay = true;
            video.playsInline = true;

            const canvas = document.createElement('canvas');
            canvas.className = 'camera-canvas';
            canvas.width = 320;
            canvas.height = 240;

            const overlayCanvas = document.createElement('canvas');
            overlayCanvas.id = 'face-overlay';
            overlayCanvas.width = 320;
            overlayCanvas.height = 240;
            overlayCanvas.style.position = 'absolute';
            overlayCanvas.style.top = '0';
            overlayCanvas.style.left = '0';

            const statusDiv = document.createElement('div');
            statusDiv.id = 'faceStatus';
            statusDiv.className = 'text-sm mb-2';
            statusDiv.innerHTML = '<small class="text-info">Position your face in the camera...</small>';

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'mt-4';

            const captureButton = document.createElement('button');
            captureButton.textContent = `Capture Image (${imageCount}/5)`;
            captureButton.className = 'btn btn-custom mr-2';
            captureButton.disabled = imageCount >= 5;

            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close Camera';
            closeButton.className = 'btn btn-secondary';

            container.appendChild(statusDiv);
            container.appendChild(video);
            container.appendChild(overlayCanvas);
            container.appendChild(canvas);
            buttonContainer.appendChild(captureButton);
            buttonContainer.appendChild(closeButton);
            container.appendChild(buttonContainer);
            modal.appendChild(container);
            document.body.appendChild(modal);

            console.log(`[DEBUG] ${new Date().toISOString()}: Camera modal created and added to DOM`);

            video.addEventListener('loadedmetadata', () => {
                console.log(`[DEBUG] ${new Date().toISOString()}: Video metadata loaded, starting face detection`);
                startFaceDetection(video, statusDiv, overlayCanvas);
            });

            captureButton.addEventListener('click', async () => {
                console.log(`[DEBUG] ${new Date().toISOString()}: Capture button clicked`);
                await captureImage(video, canvas, captureButton, statusDiv);
            });

            closeButton.addEventListener('click', () => {
                console.log(`[DEBUG] ${new Date().toISOString()}: Close button clicked`);
                closeCameraInterface();
            });
        } catch (err) {
            console.error(`[ERROR] ${new Date().toISOString()}: Error accessing camera: ${err.message}`);
            showAlert('Error accessing camera: ' + err.message, 'error');
        }
    }

    // Start face detection
    async function startFaceDetection(video, statusDiv, overlayCanvas) {
        faceDetectionActive = true;
        const overlayCtx = overlayCanvas.getContext('2d');
        console.log(`[DEBUG] ${new Date().toISOString()}: Starting continuous face detection`);

        const detectFace = async () => {
            if (!faceDetectionActive || !video.videoWidth) return;
            try {
                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                    .withFaceLandmarks();
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                if (detection) {
                    const box = detection.detection.box;
                    overlayCtx.strokeStyle = '#00a896';
                    overlayCtx.lineWidth = 2;
                    overlayCtx.strokeRect(box.x, box.y, box.width, box.height);
                    statusDiv.innerHTML = '<small class="text-success"><i class="fas fa-check-circle"></i> Face detected - Ready to capture!</small>';
                } else {
                    statusDiv.innerHTML = '<small class="text-warning"><i class="fas fa-exclamation-triangle"></i> No face detected - Please position your face in the camera</small>';
                }
            } catch (err) {
                console.error(`[ERROR] ${new Date().toISOString()}: Face detection error: ${err.message}`);
                statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-times-circle"></i> Error detecting face</small>';
            }
            if (faceDetectionActive) setTimeout(detectFace, 500);
        };

        setTimeout(detectFace, 500);
    }

    // Capture image
    async function captureImage(video, canvas, captureButton, statusDiv, retries = 2) {
        if (imageCount >= 5) {
            showAlert('Maximum 5 images allowed', 'warning');
            return;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`[DEBUG] ${new Date().toISOString()}: Attempting to capture image ${imageCount + 1}, attempt ${attempt}`);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                console.log(`[DEBUG] ${new Date().toISOString()}: Image ${imageCount + 1} captured, size: ${dataUrl.length} characters`);

                if (!dataUrl || dataUrl === 'data:,') {
                    throw new Error('Failed to capture image data');
                }

                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error(`Failed to load captured image ${imageCount + 1}`));
                    img.src = dataUrl;
                });

                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                if (!detection || !detection.descriptor) {
                    throw new Error(`No face detected in captured image ${imageCount + 1}`);
                }

                console.log(`[DEBUG] ${new Date().toISOString()}: Face detected in image ${imageCount + 1}`, {
                    score: detection.detection.score,
                    imageSize: { width: img.width, height: img.height }
                });

                imageCount++;
                document.getElementById(`capturedImage${imageCount}`).value = dataUrl;

                const imgElement = document.createElement('img');
                imgElement.src = dataUrl;
                imgElement.title = `Image ${imageCount}`;
                document.getElementById('multiple-images').appendChild(imgElement);

                document.getElementById('image-count').textContent = imageCount;
                captureButton.textContent = `Capture Image (${imageCount}/5)`;
                captureButton.disabled = imageCount >= 5;

                statusDiv.innerHTML = `<small class="text-success"><i class="fas fa-check-circle"></i> Image ${imageCount} captured successfully!</small>`;
                showAlert(`Image ${imageCount} captured successfully!`, 'success');

                if (imageCount >= 5) {
                    statusDiv.innerHTML += '<br><small class="text-info">All 5 images captured. You can now save the student.</small>';
                }
                return;
            } catch (err) {
                console.error(`[ERROR] ${new Date().toISOString()}: Error capturing image ${imageCount + 1}, attempt ${attempt}: ${err.message}`);
                if (attempt === retries) {
                    statusDiv.innerHTML = `<small class="text-danger"><i class="fas fa-times-circle"></i> Error capturing image: ${err.message}</small>`;
                    showAlert(`Error capturing image: ${err.message}`, 'error');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // Handle image upload
    async function handleImageUpload(file) {
        if (imageCount >= 5) {
            showAlert('Maximum 5 images allowed', 'warning');
            isUploading = false;
            return;
        }

        if (!modelsLoaded) {
            console.log(`[DEBUG] ${new Date().toISOString()}: Models not loaded for image upload, attempting to load...`);
            if (!await loadFaceApiModels()) {
                showAlert('Face recognition models are not loaded. Please refresh the page.', 'error');
                isUploading = false;
                return;
            }
        }

        try {
            console.log(`[DEBUG] ${new Date().toISOString()}: Processing uploaded image for slot ${imageCount + 1}`);
            if (!file.type.match(/image\/(png|jpeg)/)) {
                throw new Error('Only PNG and JPEG images are supported');
            }

            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read uploaded image'));
                reader.readAsDataURL(file);
            });

            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error(`Failed to load uploaded image`));
                img.src = dataUrl;
            });

            const detection = await faceapi
                .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (!detection || !detection.descriptor) {
                throw new Error(`No face detected in uploaded image`);
            }

            console.log(`[DEBUG] ${new Date().toISOString()}: Face detected in uploaded image`, {
                score: detection.detection.score,
                imageSize: { width: img.width, height: img.height }
            });

            imageCount++;
            document.getElementById(`capturedImage${imageCount}`).value = dataUrl;

            const imgElement = document.createElement('img');
            imgElement.src = dataUrl;
            imgElement.title = `Image ${imageCount} (Uploaded)`;
            document.getElementById('multiple-images').appendChild(imgElement);

            document.getElementById('image-count').textContent = imageCount;

            showAlert(`Image ${imageCount} uploaded successfully!`, 'success');
            if (imageCount >= 5) {
                showAlert('All 5 images captured. You can now save the student.', 'info');
            }
        } catch (err) {
            console.error(`[ERROR] ${new Date().toISOString()}: Error processing uploaded image: ${err.message}`);
            showAlert(`Error uploading image: ${err.message}`, 'error');
        } finally {
            isUploading = false;
        }
    }

    // Close camera interface
    function closeCameraInterface() {
        console.log(`[DEBUG] ${new Date().toISOString()}: Closing camera interface`);
        faceDetectionActive = false;
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        const modal = document.getElementById('cameraModal');
        if (modal) modal.remove();
    }

    // Fetch existing student face descriptors
    async function getLabeledFaceDescriptors() {
        console.log(`[DEBUG] ${new Date().toISOString()}: Fetching existing student face descriptors`);
        const labeledDescriptors = [];
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[DEBUG] ${new Date().toISOString()}: getLabeledFaceDescriptors attempt ${attempt}`);
                const response = await $.ajax({
                    url: 'cap.php',
                    type: 'POST',
                    data: { request: 'get_student_images' },
                    dataType: 'json',
                    timeout: 10000
                });

                if (response.status !== 'success') {
                    throw new Error(response.message || 'Failed to fetch student images');
                }

                if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                    console.log(`[DEBUG] ${new Date().toISOString()}: No existing student images found`);
                    return labeledDescriptors;
                }

                console.log(`[DEBUG] ${new Date().toISOString()}: Processing ${response.data.length} student images`);
                for (const item of response.data) {
                    try {
                        console.log(`[DEBUG] ${new Date().toISOString()}: Fetching image: ${item.imagePath}`);
                        const img = await faceapi.fetchImage(item.imagePath);
                        const detection = await faceapi
                            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                            .withFaceLandmarks()
                            .withFaceDescriptor();
                        if (detection && detection.descriptor) {
                            let existingDescriptor = labeledDescriptors.find(ld => ld.label === item.registrationNumber);
                            if (!existingDescriptor) {
                                existingDescriptor = new faceapi.LabeledFaceDescriptors(item.registrationNumber, []);
                                labeledDescriptors.push(existingDescriptor);
                            }
                            existingDescriptor.descriptors.push(new Float32Array(detection.descriptor));
                            console.log(`[DEBUG] ${new Date().toISOString()}: Descriptor added for ${item.registrationNumber}`, {
                                descriptorLength: detection.descriptor.length,
                                score: detection.detection.score
                            });
                        } else {
                            console.warn(`[WARNING] ${new Date().toISOString()}: No face detected in image ${item.imagePath}`);
                        }
                    } catch (error) {
                        console.error(`[ERROR] ${new Date().toISOString()}: Error processing image ${item.imagePath}: ${error.message}`);
                    }
                }
                console.log(`[DEBUG] ${new Date().toISOString()}: Generated ${labeledDescriptors.length} labeled descriptors`, labeledDescriptors.map(ld => ({ label: ld.label, descriptorCount: ld.descriptors.length })));
                return labeledDescriptors;
            } catch (error) {
                console.error(`[ERROR] ${new Date().toISOString()}: getLabeledFaceDescriptors attempt ${attempt} failed: ${error.message}`);
                if (attempt === 3) {
                    console.error(`[ERROR] ${new Date().toISOString()}: Failed to fetch student images after 3 attempts`);
                    showAlert('Error fetching existing student data. Please try again.', 'error');
                    return labeledDescriptors;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return labeledDescriptors;
    }

    // Validate form submission
    async function validateFormSubmission() {
        console.log(`[DEBUG] ${new Date().toISOString()}: Starting form validation`);
        if (imageCount === 0) {
            showAlert('Please capture or upload at least one image before submitting.', 'error');
            return false;
        }

        if (!modelsLoaded) {
            showAlert('Face recognition models are not loaded. Please refresh the page.', 'error');
            return false;
        }

        showAlert('Processing captured images for face detection...', 'info');

        try {
            const processedDescriptors = [];
            const invalidImages = [];
            for (let i = 1; i <= imageCount; i++) {
                const imageData = document.getElementById(`capturedImage${i}`).value;
                if (!imageData) continue;
                try {
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error(`Failed to load image ${i}`));
                        img.src = imageData;
                    });
                    const detection = await faceapi
                        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    if (detection && detection.descriptor) {
                        processedDescriptors.push({ index: i, descriptor: new Float32Array(detection.descriptor) });
                        console.log(`[DEBUG] ${new Date().toISOString()}: Face detected in image ${i}`, {
                            score: detection.detection.score,
                            imageSize: { width: img.width, height: img.height }
                        });
                    } else {
                        invalidImages.push(i);
                        console.warn(`[WARNING] ${new Date().toISOString()}: No face detected in image ${i}`);
                    }
                } catch (error) {
                    console.error(`[ERROR] ${new Date().toISOString()}: Error processing image ${i}: ${error.message}`);
                    invalidImages.push(i);
                }
            }

            if (processedDescriptors.length === 0) {
                showAlert('No faces detected in any captured or uploaded images. Please try again with clear face images.', 'error');
                return false;
            }

            if (invalidImages.length > 0) {
                showAlert(`Warning: No faces detected in image(s) ${invalidImages.join(', ')}. Proceeding with ${processedDescriptors.length} valid face(s).`, 'warning');
            }

            showAlert('Checking for duplicate faces...', 'info');
            const labeledDescriptors = await getLabeledFaceDescriptors();
            if (labeledDescriptors.length === 0) {
                console.log(`[DEBUG] ${new Date().toISOString()}: No existing students found, proceeding with submission`);
                return true;
            }

            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
            console.log(`[DEBUG] ${new Date().toISOString()}: FaceMatcher initialized with ${labeledDescriptors.length} students and threshold 0.45`);
            for (const processed of processedDescriptors) {
                const bestMatch = faceMatcher.findBestMatch(processed.descriptor);
                console.log(`[DEBUG] ${new Date().toISOString()}: Image ${processed.index} best match: ${bestMatch.label}, distance: ${bestMatch.distance}, similarity: ${(1 - bestMatch.distance).toFixed(2)}`);
                if (bestMatch.label !== 'unknown') {
                    showAlert(`The face in image ${processed.index} matches an existing student (Registration No: ${bestMatch.label}, similarity: ${(1 - bestMatch.distance).toFixed(2)}).`, 'error');
                    return false;
                }
            }

            console.log(`[DEBUG] ${new Date().toISOString()}: Face validation completed successfully, no duplicates found`);
            return true;
        } catch (error) {
            console.error(`[ERROR] ${new Date().toISOString()}: Error during face validation: ${error.message}`);
            showAlert('Error validating faces: ' + error.message, 'error');
            return false;
        }
    }

    // Document ready
    $(document).ready(function() {
        if (typeof faceapi === 'undefined') {
            console.error(`[ERROR] ${new Date().toISOString()}: Face API failed to load`);
            showAlert('Face recognition system failed to load. Please check the face-api.min.js file path.', 'error');
            return;
        }

        loadFaceApiModels();

        // Bind upload click handler
        $('#upload_image').off('click').on('click', function() {
            if (isUploading) {
                console.log(`[DEBUG] ${new Date().toISOString()}: Upload already in progress, ignoring click`);
                return;
            }
            if (currentStream) {
                console.log(`[DEBUG] ${new Date().toISOString()}: Camera is active, closing before upload`);
                closeCameraInterface();
            }
            console.log(`[DEBUG] ${new Date().toISOString()}: Triggering file input click`);
            isUploading = true;
            $('#imageUpload').trigger('click');
        });

        // Bind change handler for file input
        $('#imageUpload').off('change').on('change', function(e) {
            console.log(`[DEBUG] ${new Date().toISOString()}: File input change event triggered`, { files: e.target.files.length });
            if (e.target.files.length > 0 && !isUploading) {
                console.log(`[DEBUG] ${new Date().toISOString()}: Unexpected change event, resetting isUploading`);
                isUploading = true;
            }
            if (e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
            } else {
                console.log(`[DEBUG] ${new Date().toISOString()}: No file selected in change event`);
                isUploading = false;
            }
        });

        <?php if (isset($_SESSION['message']) && isset($_SESSION['message_type'])): ?>
            showAlert('<?php echo htmlspecialchars($_SESSION['message']); ?>', '<?php echo htmlspecialchars($_SESSION['message_type']); ?>');
            <?php unset($_SESSION['message'], $_SESSION['message_type']); ?>
        <?php endif; ?>

        $('#captureForm').on('submit', async function(e) {
            e.preventDefault();
            console.log(`[DEBUG] ${new Date().toISOString()}: Form submission started`);
            const submitButton = $('#submitButton');
            const originalText = submitButton.text();

            try {
                submitButton.prop('disabled', true).text('Validating...');
                if (!await validateFormSubmission()) {
                    console.log(`[DEBUG] ${new Date().toISOString()}: Form validation failed`);
                    submitButton.prop('disabled', false).text(originalText);
                    return;
                }

                submitButton.text('Submitting...');
                console.log(`[DEBUG] ${new Date().toISOString()}: Form validation passed, submitting via AJAX`);

                const formData = new FormData(this);
                $.ajax({
                    url: 'cap.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    timeout: 15000,
                    success: function(response) {
                        console.log(`[DEBUG] ${new Date().toISOString()}: AJAX submission response`, response);
                        showAlert(response.message, response.status, response.status === 'success');
                        if (response.status === 'success') {
                            console.log(`[DEBUG] ${new Date().toISOString()}: Submission successful, waiting for user to confirm redirect`);
                            setTimeout(() => {
                                if (Swal.isVisible()) return; // Wait for user to click Continue
                                console.log(`[DEBUG] ${new Date().toISOString()}: Automatic redirect to list.php after 10 seconds`);
                                window.location.href = 'list.php';
                            }, 10000);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error(`[ERROR] ${new Date().toISOString()}: AJAX submission failed`, { status, error, response: xhr.responseJSON });
                        let errorMessage = 'Failed to save student. Please try again.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMessage = xhr.responseJSON.message;
                        }
                        showAlert(errorMessage, 'error');
                    },
                    complete: function() {
                        submitButton.prop('disabled', false).text(originalText);
                    }
                });
            } catch (error) {
                console.error(`[ERROR] ${new Date().toISOString()}: Error during form submission: ${error.message}`);
                showAlert('Error during form submission: ' + error.message, 'error');
                submitButton.prop('disabled', false).text(originalText);
            }
        });

        $('#captureForm').on('hidden.bs.modal', function() {
            console.log(`[DEBUG] ${new Date().toISOString()}: Modal closed, clearing captured images`);
            imageCount = 0;
            document.getElementById('multiple-images').innerHTML = '';
            document.getElementById('image-count').textContent = '0';
            for (let i = 1; i <= 5; i++) {
                document.getElementById(`capturedImage${i}`).value = '';
            }
            closeCameraInterface();
            isUploading = false;
        });
    });
</script>
</body>
</html>