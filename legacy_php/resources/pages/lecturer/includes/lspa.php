<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="resources/images/logo/attnlg.png" rel="icon">
    <title>Lecturer Dashboard</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Remixicon CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.2.0/remixicon.css" rel="stylesheet">
    <!-- Font Awesome CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React and Dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-router-dom@6.3.0/dist/umd/react-router-dom.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Face-API.js -->
    <script defer src="resources/assets/javascript/face_logics/face-api.min.js"></script>
    <!-- XLSX and FileSaver -->
    <script src="resources/assets/min/js/xlsx.min.js"></script>
    <script src="resources/assets/min/js/filesaver.min.js"></script>
</head>
<body class="bg-gray-100">
    <!-- Header -->
    <?php include 'includes/topbar.php'; ?>
    <section class="flex min-h-screen">
        <!-- Sidebar -->
        <?php include 'includes/sidebar.php'; ?>
        <!-- Main Content -->
        <div class="flex-1 p-6 main--content">
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
            <!-- React Root -->
            <div id="root"></div>
        </div>
    </section>

    <script type="text/babel">
        const { useState, useEffect } = React;
        const { BrowserRouter, Routes, Route, Link, useNavigate } = ReactRouterDOM;

        // Main App Component
        function App() {
            const [activeView, setActiveView] = useState('home');

            return (
                <BrowserRouter>
                    <div className="container mx-auto">
                        <Routes>
                            <Route path="/" element={<TakeAttendance />} />
                            <Route path="/view-attendance" element={<ViewAttendance />} />
                            <Route path="/view-students" element={<ViewStudents />} />
                            <Route path="/download-record" element={<DownloadAttendance />} />
                        </Routes>
                    </div>
                </BrowserRouter>
            );
        }

        // Take Attendance Component
        function TakeAttendance() {
            const [courses, setCourses] = useState([]);
            const [units, setUnits] = useState([]);
            const [venues, setVenues] = useState([]);
            const [selectedCourse, setSelectedCourse] = useState('');
            const [selectedUnit, setSelectedUnit] = useState('');
            const [selectedVenue, setSelectedVenue] = useState('');
            const [students, setStudents] = useState([]);
            const [labels, setLabels] = useState([]);
            const [capturedImages, setCapturedImages] = useState([]);
            const [isCapturing, setIsCapturing] = useState(false);
            const [webcamStarted, setWebcamStarted] = useState(false);
            const [modelsLoaded, setModelsLoaded] = useState(false);
            const navigate = useNavigate();

            const successSound = new Audio('resources/assets/sounds/success.wav');
            const errorSound = new Audio('resources/assets/sounds/error.wav');
            const statusToast = new bootstrap.Toast(document.getElementById('statusToast'));

            const showToast = (message, type = 'info') => {
                const toast = document.getElementById('statusToast');
                const toastBody = toast.querySelector('.toast-body');
                toastBody.textContent = message;
                toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
                toast.classList.add(`bg-${type}`);
                statusToast.show();
            };

            const showModal = (message) => {
                const modalBody = document.getElementById('captureModalBody');
                modalBody.textContent = message;
                const modal = new bootstrap.Modal(document.getElementById('captureModal'));
                modal.show();
            };

            useEffect(() => {
                // Fetch courses, units, and venues
                $.getJSON('get_data.php', { type: 'courses' }, (data) => setCourses(data));
                $.getJSON('get_data.php', { type: 'units' }, (data) => setUnits(data));
                $.getJSON('get_data.php', { type: 'venues' }, (data) => setVenues(data));

                // Load Face-API models
                Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('models'),
                ])
                    .then(() => {
                        setModelsLoaded(true);
                        showToast('Face recognition models loaded successfully', 'success');
                    })
                    .catch((err) => {
                        showToast('Failed to load models. Check model folder.', 'danger');
                        console.error('Model loading error:', err);
                    });
            }, []);

            const updateTable = () => {
                if (selectedCourse && selectedUnit && selectedVenue) {
                    $.ajax({
                        url: 'resources/pages/lecturer/manageFolder.php',
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: `courseID=${encodeURIComponent(selectedCourse)}&unitID=${encodeURIComponent(selectedUnit)}&venueID=${encodeURIComponent(selectedVenue)}`,
                        success: (response) => {
                            try {
                                const data = JSON.parse(response);
                                if (data.status === 'success') {
                                    setLabels(data.data);
                                    setStudents(data.html);
                                    startWebcam();
                                } else {
                                    showToast('Error fetching student data: ' + data.message, 'danger');
                                }
                            } catch (e) {
                                showToast('Error parsing student data', 'danger');
                            }
                        },
                        error: () => showToast('Error contacting server', 'danger')
                    });
                }
            };

            const startWebcam = () => {
                if (!webcamStarted && modelsLoaded) {
                    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        .then((stream) => {
                            const video = document.getElementById('video');
                            video.srcObject = stream;
                            setWebcamStarted(true);
                            showToast('Webcam started successfully', 'success');
                            startFaceRecognition();
                        })
                        .catch((error) => {
                            showToast('Failed to access webcam: ' + error.message, 'danger');
                            console.error(error);
                        });
                }
            };

            const stopWebcam = () => {
                const video = document.getElementById('video');
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                    setWebcamStarted(false);
                    showToast('Webcam stopped', 'info');
                }
            };

            const captureImage = async () => {
                if (isCapturing) return;
                setIsCapturing(true);
                showToast('Capturing in progress...', 'info');
                const video = document.getElementById('video');
                const canvas = faceapi.createCanvasFromMedia(video);
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0, video.width, video.height);
                const imageData = canvas.toDataURL('image/png');

                const img = await faceapi.fetchImage(imageData);
                const detections = await faceapi
                    .detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detections) {
                    showModal('Image captured successfully!');
                    showToast('Face detected in captured image', 'success');
                    setCapturedImages([...capturedImages, imageData]);
                    // Save image to server
                    $.ajax({
                        url: 'save_image.php',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({ image: imageData, studentID: 'temp' }),
                        success: (response) => {
                            const res = JSON.parse(response);
                            showToast(res.message, res.status);
                        }
                    });
                } else {
                    showModal('No face detected in the captured image. Please try again.');
                    showToast('No face detected', 'danger');
                    errorSound.play();
                }
                setIsCapturing(false);
            };

            const startFaceRecognition = async () => {
                const video = document.getElementById('video');
                const labeledFaceDescriptors = await getLabeledFaceDescriptions();
                if (labeledFaceDescriptors.length === 0) {
                    showToast('No valid face descriptors loaded. Please add student images.', 'danger');
                    stopWebcam();
                    return;
                }
                const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
                const canvas = faceapi.createCanvasFromMedia(video);
                document.querySelector('.video-container').appendChild(canvas);
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
                    const detectedFaces = results.map(result => result.label);
                    markAttendance(detectedFaces);

                    results.forEach((result, i) => {
                        const box = resizedDetections[i].detection.box;
                        const label = result.label === 'unknown' ? 'Not Recognized' : result.label;
                        const drawBox = new faceapi.draw.DrawBox(box, { label });
                        drawBox.draw(canvas);
                        if (label === 'Not Recognized') {
                            showToast('Face not recognized', 'danger');
                            errorSound.play();
                        } else {
                            showToast(`Recognized: ${label}`, 'success');
                            successSound.play();
                        }
                    });
                }, 1000);
            };

            const getLabeledFaceDescriptions = async () => {
                const labeledDescriptors = [];
                for (const label of labels) {
                    const descriptions = [];
                    let validImages = 0;
                    for (let i = 1; i <= 5; i++) {
                        try {
                            const img = await faceapi.fetchImage(`resources/labels/${label}/${i}.png`);
                            const detections = await faceapi
                                .detectSingleFace(img)
                                .withFaceLandmarks()
                                .withFaceDescriptor();
                            if (detections) {
                                descriptions.push(detections.descriptor);
                                validImages++;
                            }
                        } catch (error) {
                            console.warn(`Error loading resources/labels/${label}/${i}.png: ${error.message}`);
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
            };

            const markAttendance = (detectedFaces) => {
                const tableRows = document.querySelectorAll('#studentTableContainer tr');
                tableRows.forEach((row, index) => {
                    if (index === 0) return;
                    const registrationNumber = row.cells[0].innerText.trim();
                    if (detectedFaces.includes(registrationNumber)) {
                        row.cells[5].innerText = 'present';
                    }
                });
            };

            const endAttendance = () => {
                const attendanceData = [];
                const tableRows = document.querySelectorAll('#studentTableContainer tr');
                tableRows.forEach((row, index) => {
                    if (index === 0) return;
                    const studentID = row.cells[0].innerText.trim();
                    const course = row.cells[2].innerText.trim();
                    const unit = row.cells[3].innerText.trim();
                    const attendanceStatus = row.cells[5].innerText.trim();
                    attendanceData.push({ studentID, course, unit, attendanceStatus });
                });

                $.ajax({
                    url: 'handle_attendance.php',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(attendanceData),
                    success: (response) => {
                        try {
                            const res = JSON.parse(response);
                            showToast(res.message, res.status);
                        } catch (e) {
                            showToast('Error parsing server response', 'danger');
                        }
                    },
                    error: () => showToast('Error saving attendance', 'danger')
                });
                stopWebcam();
                document.querySelector('.video-container').style.display = 'none';
                document.getElementById('capturedImagesContainer').style.display = 'none';
            };

            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-blue-600 text-center">Take Attendance</h2>
                    <div className="flex space-x-4">
                        <select className="form-select" value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); updateTable(); }}>
                            <option value="">Select Course</option>
                            {courses.map(course => <option key={course.courseCode} value={course.courseCode}>{course.name}</option>)}
                        </select>
                        <select className="form-select" value={selectedUnit} onChange={(e) => { setSelectedUnit(e.target.value); updateTable(); }}>
                            <option value="">Select Unit</option>
                            {units.map(unit => <option key={unit.unitCode} value={unit.unitCode}>{unit.name}</option>)}
                        </select>
                        <select className="form-select" value={selectedVenue} onChange={(e) => { setSelectedVenue(e.target.value); updateTable(); }}>
                            <option value="">Select Venue</option>
                            {venues.map(venue => <option key={venue.className} value={venue.className}>{venue.className}</option>)}
                        </select>
                    </div>
                    <div className="flex space-x-4 justify-center">
                        <button className="btn btn-primary" onClick={() => document.querySelector('.video-container').style.display = 'flex'}><i className="fas fa-camera"></i> Launch Facial Recognition</button>
                        <button className="btn btn-success" onClick={captureImage} style={{ display: webcamStarted ? 'inline-block' : 'none' }}><i className="fas fa-camera-retro"></i> Capture Image</button>
                        <button className="btn btn-warning" onClick={() => { document.querySelector('.video-container').style.display = 'none'; stopWebcam(); }} style={{ display: webcamStarted ? 'inline-block' : 'none' }}><i className="fas fa-stop"></i> Stop Recognition</button>
                        <button className="btn btn-danger" onClick={endAttendance}><i className="fas fa-sign-out-alt"></i> End Attendance</button>
                    </div>
                    <div className="card mx-auto video-container" style={{ display: 'none', maxWidth: '600px' }}>
                        <div className="card-body relative">
                            <video id="video" className="img-fluid rounded" width="600" height="450" autoPlay></video>
                            <canvas id="overlay" style={{ position: 'absolute', top: 0, left: 0 }}></canvas>
                        </div>
                    </div>
                    <div id="capturedImagesContainer" className="grid grid-cols-3 gap-4 mt-4" style={{ display: capturedImages.length ? 'grid' : 'none' }}>
                        <h5 className="col-span-3 text-center font-semibold">Captured Images (Click to Retake)</h5>
                        {capturedImages.map((img, index) => (
                            <img key={index} src={img} className="img-thumbnail cursor-pointer" onClick={() => {
                                setCapturedImages(capturedImages.filter((_, i) => i !== index));
                                captureImage();
                            }} />
                        ))}
                    </div>
                    <div className="table-responsive" dangerouslySetInnerHTML={{ __html: students }}></div>
                </div>
            );
        }

        // View Attendance Component
        function ViewAttendance() {
            const [course, setCourse] = useState('');
            const [unit, setUnit] = useState('');
            const [courses, setCourses] = useState([]);
            const [units, setUnits] = useState([]);
            const [attendanceData, setAttendanceData] = useState({ dates: [], students: [] });
            const navigate = useNavigate();

            useEffect(() => {
                $.getJSON('get_data.php', { type: 'courses' }, (data) => setCourses(data));
                $.getJSON('get_data.php', { type: 'units' }, (data) => setUnits(data));
            }, []);

            const fetchAttendance = () => {
                if (course && unit) {
                    $.getJSON(`download-record.php?course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`, (data) => {
                        setAttendanceData(data);
                    });
                }
            };

            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-blue-600 text-center">View Attendance</h2>
                    <div className="flex space-x-4">
                        <select className="form-select" value={course} onChange={(e) => { setCourse(e.target.value); fetchAttendance(); }}>
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.courseCode} value={c.courseCode}>{c.name}</option>)}
                        </select>
                        <select className="form-select" value={unit} onChange={(e) => { setUnit(e.target.value); fetchAttendance(); }}>
                            <option value="">Select Unit</option>
                            {units.map(u => <option key={u.unitCode} value={u.unitCode}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Registration No</th>
                                    {attendanceData.dates.map(date => <th key={date}>{date}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceData.students.map(student => (
                                    <tr key={student.studentRegistrationNumber}>
                                        <td>{student.studentRegistrationNumber}</td>
                                        {attendanceData.dates.map(date => (
                                            <td key={date}>{student[date] || 'Absent'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // View Students Component
        function ViewStudents() {
            const [course, setCourse] = useState('');
            const [unit, setUnit] = useState('');
            const [courses, setCourses] = useState([]);
            const [units, setUnits] = useState([]);
            const [students, setStudents] = useState([]);
            const navigate = useNavigate();

            useEffect(() => {
                $.getJSON('get_data.php', { type: 'courses' }, (data) => setCourses(data));
                $.getJSON('get_data.php', { type: 'units' }, (data) => setUnits(data));
            }, []);

            const fetchStudents = () => {
                if (course && unit) {
                    $.getJSON(`view-students.php?course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`, (data) => {
                        setStudents(data);
                    });
                }
            };

            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-blue-600 text-center">View Students</h2>
                    <div className="flex space-x-4">
                        <select className="form-select" value={course} onChange={(e) => { setCourse(e.target.value); fetchStudents(); }}>
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.courseCode} value={c.courseCode}>{c.name}</option>)}
                        </select>
                        <select className="form-select" value={unit} onChange={(e) => { setUnit(e.target.value); fetchStudents(); }}>
                            <option value="">Select Unit</option>
                            {units.map(u => <option key={u.unitCode} value={u.unitCode}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Registration No</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.registrationNumber}>
                                        <td>{student.registrationNumber}</td>
                                        <td>{student.firstName}</td>
                                        <td>{student.lastName}</td>
                                        <td>{student.email}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Download Attendance Component
        function DownloadAttendance() {
            const [course, setCourse] = useState('');
            const [unit, setUnit] = useState('');
            const [courses, setCourses] = useState([]);
            const [units, setUnits] = useState([]);
            const [attendanceData, setAttendanceData] = useState({ dates: [], students: [] });
            const navigate = useNavigate();

            useEffect(() => {
                $.getJSON('get_data.php', { type: 'courses' }, (data) => setCourses(data));
                $.getJSON('get_data.php', { type: 'units' }, (data) => setUnits(data));
            }, []);

            const fetchAttendance = () => {
                if (course && unit) {
                    $.getJSON(`download-record.php?course=${encodeURIComponent(course)}&unit=${encodeURIComponent(unit)}`, (data) => {
                        setAttendanceData(data);
                    });
                }
            };

            const exportToExcel = () => {
                const table = document.createElement('table');
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Registration No</th>
                            ${attendanceData.dates.map(date => `<th>${date}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${attendanceData.students.map(student => `
                            <tr>
                                <td>${student.studentRegistrationNumber}</td>
                                ${attendanceData.dates.map(date => `<td>${student[date] || 'Absent'}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                const wb = XLSX.utils.table_to_book(table, { sheet: 'Attendance' });
                const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });
                const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
                saveAs(blob, `${unit}_on_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
            };

            const s2ab = (s) => {
                const buf = new ArrayBuffer(s.length);
                const view = new Uint8Array(buf);
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            };

            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-blue-600 text-center">Download Attendance</h2>
                    <div className="flex space-x-4">
                        <select className="form-select" value={course} onChange={(e) => { setCourse(e.target.value); fetchAttendance(); }}>
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.courseCode} value={c.courseCode}>{c.name}</option>)}
                        </select>
                        <select className="form-select" value={unit} onChange={(e) => { setUnit(e.target.value); fetchAttendance(); }}>
                            <option value="">Select Unit</option>
                            {units.map(u => <option key={u.unitCode} value={u.unitCode}>{u.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={exportToExcel} disabled={!course || !unit}>Export as Excel</button>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Registration No</th>
                                    {attendanceData.dates.map(date => <th key={date}>{date}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceData.students.map(student => (
                                    <tr key={student.studentRegistrationNumber}>
                                        <td>{student.studentRegistrationNumber}</td>
                                        {attendanceData.dates.map(date => (
                                            <td key={date}>{student[date] || 'Absent'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // Render the App
        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>