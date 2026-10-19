<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="resources/images/logo/attnlg.png" rel="icon">
    <title>Lecture Dashboard</title>
    <link rel="stylesheet" href="resources/assets/css/styles.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.2.0/remixicon.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script defer src="resources/assets/javascript/face_logics/face-api.min.js"></script>
</head>
<body>
    <?php include 'includes/topbar.php'; ?>
    <section class="main">
        <?php include 'includes/sidebar.php'; ?>
        <div class="main--content">
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

            <!-- Message Div (Retained for Compatibility) -->
            <div id="messageDiv" class="messageDiv" style="display:none;"></div>

            <p class="text-center text-primary fw-bold fs-4 mt-2">Please select course, unit, and venue before launching facial recognition</p>
            <form class="lecture-options" id="selectForm">
                <select required name="course" id="courseSelect" class="form-select mb-3" onChange="updateTable()">
                    <option value="" selected>Select Course</option>
                    <?php
                    $courseNames = getCourseNames();
                    foreach ($courseNames as $course) {
                        echo '<option value="' . $course["courseCode"] . '">' . $course["name"] . '</option>';
                    }
                    ?>
                </select>
                <select required name="unit" id="unitSelect" class="form-select mb-3" onChange="updateTable()">
                    <option value="" selected>Select Unit</option>
                    <?php
                    $unitNames = getUnitNames();
                    foreach ($unitNames as $unit) {
                        echo '<option value="' . $unit["unitCode"] . '">' . $unit["name"] . '</option>';
                    }
                    ?>
                </select>
                <select required name="venue" id="venueSelect" class="form-select mb-3" onChange="updateTable()">
                    <option value="" selected>Select Venue</option>
                    <?php
                    $venueNames = getVenueNames();
                    foreach ($venueNames as $venue) {
                        echo '<option value="' . $venue["className"] . '">' . $venue["className"] . '</option>';
                    }
                    ?>
                </select>
            </form>

            <div class="attendance-button d-flex gap-2 justify-content-center mb-3">
                <button id="startButton" class="btn btn-primary"><i class="fas fa-camera"></i> Launch Facial Recognition</button>
                <button id="captureButton" class="btn btn-success" style="display:none;"><i class="fas fa-camera-retro"></i> Capture Image</button>
                <button id="endButton" class="btn btn-warning" style="display:none;"><i class="fas fa-stop"></i> Stop Recognition</button>
                <button id="endAttendance" class="btn btn-danger"><i class="fas fa-sign-out-alt"></i> End Attendance</button>
            </div>

            <div class="video-container card mx-auto" style="display:none; max-width: 600px;">
                <div class="card-body">
                    <video id="video" class="img-fluid rounded" autoplay></video>
                    <canvas id="overlay" style="position: absolute; top: 0; left: 0;"></canvas>
                </div>
            </div>

            <!-- Captured Images Grid -->
            <div id="capturedImagesContainer" class="row mt-3 g-2" style="display:none;">
                <h5 class="text-center">Captured Images (Click to Retake)</h5>
            </div>

            <div class="table-container mt-3">
                <div id="studentTableContainer" class="table-responsive"></div>
            </div>

            <!-- Bootstrap Modal for Capture Feedback -->
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
        </div>
    </section>

    <?php js_asset(["active_link", 'face_logics/script']) ?>
</body>
</html>