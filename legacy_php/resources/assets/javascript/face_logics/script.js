var labels = [];
let detectedFaces = [];
let sendingData = false;
let videoStream = null;
let capturedImages = [];
let isCapturing = false;

// Sound Alerts
const successSound = new Audio('resources/assets/sounds/success.wav'); // Adjust path after downloading
const errorSound = new Audio('resources/assets/sounds/error.wav'); // Adjust path after downloading

// Bootstrap Toast
const statusToast = new bootstrap.Toast(document.getElementById('statusToast'));

function showToast(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    const toastBody = toast.querySelector('.toast-body');
    toastBody.textContent = message;
    toast.classList.remove('bg-success', 'bg-danger', 'bg-info');
    toast.classList.add(`bg-${type}`);
    statusToast.show();
}

// Bootstrap Modal
function showModal(message) {
    const modalBody = document.getElementById('captureModalBody');
    modalBody.textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('captureModal'));
    modal.show();
}

function updateTable() {
    var selectedCourseID = document.getElementById("courseSelect").value;
    var selectedUnitCode = document.getElementById("unitSelect").value;
    var selectedVenue = document.getElementById("venueSelect").value;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "resources/pages/lecture/manageFolder.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            if (response.status === "success") {
                labels = response.data;
                if (selectedCourseID && selectedUnitCode && selectedVenue) {
                    updateOtherElements();
                }
                document.getElementById("studentTableContainer").innerHTML = response.html;
            } else {
                console.error("Error:", response.message);
                showToast("Error fetching student data: " + response.message, 'danger');
            }
        }
    };
    xhr.send(
        "courseID=" + encodeURIComponent(selectedCourseID) +
        "&unitID=" + encodeURIComponent(selectedUnitCode) +
        "&venueID=" + encodeURIComponent(selectedVenue)
    );
}

function markAttendance(detectedFaces) {
    document.querySelectorAll("#studentTableContainer tr").forEach((row) => {
        const registrationNumber = row.cells[0].innerText.trim();
        if (detectedFaces.includes(registrationNumber)) {
            row.cells[5].innerText = "present";
        }
    });
}

function updateOtherElements() {
    const video = document.getElementById("video");
    const videoContainer = document.querySelector(".video-container");
    const startButton = document.getElementById("startButton");
    const captureButton = document.getElementById("captureButton");
    const endButton = document.getElementById("endButton");
    const capturedImagesContainer = document.getElementById("capturedImagesContainer");
    let webcamStarted = false;
    let modelsLoaded = false;

    Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("models"),
    ])
        .then(() => {
            modelsLoaded = true;
            showToast("Face recognition models loaded successfully", 'success');
        })
        .catch((err) => {
            showToast("Failed to load models. Check model folder.", 'danger');
            console.error("Model loading error:", err);
        });

    startButton.addEventListener("click", async () => {
        videoContainer.style.display = "flex";
        capturedImagesContainer.style.display = "flex";
        startButton.style.display = "none";
        captureButton.style.display = "inline-block";
        endButton.style.display = "inline-block";
        if (!webcamStarted && modelsLoaded) {
            startWebcam();
            webcamStarted = true;
        }
    });

    captureButton.addEventListener("click", async () => {
        if (isCapturing) return;
        isCapturing = true;
        showToast("Capturing in progress...", 'info');
        const canvas = faceapi.createCanvasFromMedia(video);
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, video.width, video.height);
        const imageData = canvas.toDataURL('image/png');

        // Detect face in captured image
        const img = await faceapi.fetchImage(imageData);
        const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detections) {
            showModal("Image captured successfully!");
            showToast("Face detected in captured image", 'success');
            addCapturedImage(imageData);
        } else {
            showModal("No face detected in the captured image. Please try again.");
            showToast("No face detected", 'danger');
            errorSound.play();
        }
        isCapturing = false;
    });

    endButton.addEventListener("click", () => {
        videoContainer.style.display = "none";
        capturedImagesContainer.style.display = "none";
        startButton.style.display = "inline-block";
        captureButton.style.display = "none";
        endButton.style.display = "none";
        stopWebcam();
    });

    function startWebcam() {
        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: false,
            })
            .then((stream) => {
                video.srcObject = stream;
                videoStream = stream;
                showToast("Webcam started successfully", 'success');
            })
            .catch((error) => {
                showToast("Failed to access webcam: " + error.message, 'danger');
                console.error(error);
            });
    }

    async function getLabeledFaceDescriptions() {
        const labeledDescriptors = [];
        for (const label of labels) {
            const descriptions = [];
            for (let i = 1; i <= 5; i++) {
                try {
                    const img = await faceapi.fetchImage(`resources/labels/${label}/${i}.png`);
                    const detections = await faceapi
                        .detectSingleFace(img)
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    if (detections) {
                        descriptions.push(detections.descriptor);
                    } else {
                        console.log(`No face detected in ${label}/${i}.png`);
                    }
                } catch (error) {
                    console.error(`Error processing ${label}/${i}.png:`, error);
                }
            }
            if (descriptions.length > 0) {
                detectedFaces.push(label);
                labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptions));
            }
        }
        return labeledDescriptors;
    }

    function addCapturedImage(imageData) {
        const container = document.getElementById('capturedImagesContainer');
        const col = document.createElement('div');
        col.className = 'col-4';
        const img = document.createElement('img');
        img.src = imageData;
        img.className = 'img-thumbnail';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            // Retake image
            img.remove();
            captureButton.click();
        });
        col.appendChild(img);
        container.appendChild(col);
        capturedImages.push(imageData);
    }

    video.addEventListener("play", async () => {
        const labeledFaceDescriptors = await getLabeledFaceDescriptions();
        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
        const canvas = faceapi.createCanvasFromMedia(video);
        document.querySelector(".video-container").appendChild(canvas);
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            const detections = await faceapi
                .detectAllFaces(video)
                .withFaceLandmarks()
                .withFaceDescriptors();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

            const results = resizedDetections.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor);
            });

            detectedFaces = results.map((result) => result.label);
            markAttendance(detectedFaces);

            results.forEach((result, i) => {
                const box = resizedDetections[i].detection.box;
                const label = result.label === 'unknown' ? 'Not Recognized' : result.label;
                const drawBox = new faceapi.draw.DrawBox(box, { label });
                drawBox.draw(canvas);

                if (label === 'Not Recognized') {
                    showToast("Face not recognized", 'danger');
                    errorSound.play();
                } else {
                    showToast(`Recognized: ${label}`, 'success');
                    successSound.play();
                }
            });
        }, 1000); // Slower interval to reduce load
    });

    function sendAttendanceDataToServer() {
        const attendanceData = [];
        document.querySelectorAll("#studentTableContainer tr").forEach((row, index) => {
            if (index === 0) return;
            const studentID = row.cells[0].innerText.trim();
            const course = row.cells[2].innerText.trim();
            const unit = row.cells[3].innerText.trim();
            const attendanceStatus = row.cells[5].innerText.trim();
            attendanceData.push({ studentID, course, unit, attendanceStatus });
        });

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "handle_attendance", true);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.status === "success") {
                            showToast(response.message || "Attendance recorded successfully.", 'success');
                        } else {
                            showToast(response.message || "Error recording attendance.", 'danger');
                        }
                    } catch (e) {
                        showToast("Error: Failed to parse server response.", 'danger');
                        console.error(e);
                    }
                } else {
                    showToast("Error: Unable to record attendance. HTTP Status: " + xhr.status, 'danger');
                    console.error("HTTP Error", xhr.status, xhr.statusText);
                }
            }
        };
        xhr.send(JSON.stringify(attendanceData));
    }

    function stopWebcam() {
        if (videoStream) {
            const tracks = videoStream.getTracks();
            tracks.forEach((track) => track.stop());
            video.srcObject = null;
            videoStream = null;
            showToast("Webcam stopped", 'info');
        }
    }

    document.getElementById("endAttendance").addEventListener("click", function () {
        sendAttendanceDataToServer();
        document.querySelector(".video-container").style.display = "none";
        document.getElementById("capturedImagesContainer").style.display = "none";
        stopWebcam();
    });
}