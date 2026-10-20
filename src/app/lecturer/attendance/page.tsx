'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  XCircle,
  Users, 
  MapPin, 
  BookOpen, 
  Loader2, 
  Play, 
  Square, 
  Save, 
  Volume2, 
  VolumeX,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Sparkles,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { 
  playSuccessChime, 
  playAlreadyMarkedTone, 
  playErrorBuzz, 
  isSoundMuted, 
  setSoundMuted 
} from '@/lib/audio';

declare const faceapi: any;

interface EnrolledStudent {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  registrationNumber: string;
  email: string;
  studentImage?: string;
  faceDescriptors?: number[][];
  hasFaceEnrolled: boolean;
  status: 'Absent' | 'Present';
  timeMarked?: string;
}

interface HudFeedback {
  type: 'success' | 'already' | 'unknown';
  title: string;
  subtitle: string;
  timestamp: number;
}

function AttendanceScannerContent() {
  const searchParams = useSearchParams();
  const preselectedUnit = searchParams.get('unit') || '';

  // Selector state
  const [coursesData, setCoursesData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState(preselectedUnit);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Student & AI State
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<any>(null);

  // Camera settings
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Feedback HUD & Debouncing
  const [hudNotice, setHudNotice] = useState<HudFeedback | null>(null);
  const lastChimeRef = useRef<{ [key: string]: number }>({});
  const studentsRef = useRef<EnrolledStudent[]>([]);
  studentsRef.current = students;

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);

  // Sound preference init
  useEffect(() => {
    setSoundEnabled(!isSoundMuted());
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundMuted(!next);
  };

  // Load lecturer's courses and venues
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/lecturer/courses');
        const json = await res.json();
        if (json.status === 'success') {
          setCoursesData(json.data);
          if (!selectedUnit && json.data.units?.[0]) {
            setSelectedUnit(json.data.units[0].unitCode);
          }
          if (json.data.venues?.[0]) {
            setSelectedVenue(json.data.venues[0].className);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadInitial();
  }, [selectedUnit]);

  // Load face-api.js neural models
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initFaceApi = async () => {
      if (typeof faceapi === 'undefined') return;

      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsReady(true);
        if (checkInterval) clearInterval(checkInterval);
      } catch (err: any) {
        console.error('Error loading face-api models:', err);
      }
    };

    if (typeof faceapi !== 'undefined') {
      initFaceApi();
    } else {
      checkInterval = setInterval(() => {
        if (typeof faceapi !== 'undefined') {
          clearInterval(checkInterval);
          initFaceApi();
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      stopScanning();
    };
  }, []);

  // Fetch enrolled students and initialize FaceMatcher
  const handleLoadStudents = async () => {
    if (!selectedUnit) return;
    setLoadingStudents(true);
    setSessionSuccess(null);
    setHudNotice(null);

    try {
      const res = await fetch(`/api/lecturer/students?unitCode=${encodeURIComponent(selectedUnit)}`);
      const json = await res.json();

      if (json.status === 'success') {
        const list: EnrolledStudent[] = json.data.map((s: any) => ({
          ...s,
          status: 'Absent',
        }));
        setStudents(list);
        setStudentsLoaded(true);

        if (typeof faceapi !== 'undefined') {
          const labeledDescriptors: any[] = [];

          for (const student of list) {
            if (student.faceDescriptors && Array.isArray(student.faceDescriptors) && student.faceDescriptors.length > 0) {
              const floatVectors = student.faceDescriptors.map((desc: number[]) => new Float32Array(desc));
              labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(student.registrationNumber, floatVectors));
            }
          }

          if (labeledDescriptors.length > 0) {
            const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
            setFaceMatcher(matcher);
          } else {
            setFaceMatcher(null);
          }
        }
      } else {
        alert(json.message || 'Failed to load students');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching enrolled students');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Start Webcam and Recognition Loop
  const startScanning = async (overrideFacing?: 'user' | 'environment') => {
    if (!selectedVenue) {
      alert('Please specify the Lecture Venue / Theatre before scanning.');
      return;
    }

    const currentFacing = overrideFacing || facingMode;

    try {
      // Stop any existing stream first
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: currentFacing 
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);
      setSessionSuccess(null);

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      // Recognition loop running every 650ms
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !faceMatcher) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.paused || video.ended || video.readyState < 2) return;

        const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
        faceapi.matchDimensions(canvas, displaySize);

        try {
          const detections = await faceapi
            .detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (resizedDetections.length === 0) {
            return;
          }

          const results = resizedDetections.map((d: any) => faceMatcher.findBestMatch(d.descriptor));

          results.forEach((result: any, i: number) => {
            const box = resizedDetections[i].detection.box;
            const isMatch = result.label !== 'unknown';
            const regNo = result.label;
            const now = Date.now();

            // Draw clean bounding box
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: isMatch ? regNo : 'Unrecognized Face',
              boxColor: isMatch ? '#006837' : '#DC2626',
              lineWidth: 3,
            });
            drawBox.draw(canvas);

            if (isMatch) {
              const currentList = studentsRef.current;
              const matchedStudent = currentList.find((s) => s.registrationNumber === regNo);

              if (matchedStudent) {
                if (matchedStudent.status !== 'Present') {
                  // NEW ATTENDANCE RECORDED
                  const time = new Date().toLocaleTimeString();
                  playSuccessChime();
                  lastChimeRef.current[regNo] = now;

                  setHudNotice({
                    type: 'success',
                    title: 'ATTENDANCE RECORDED',
                    subtitle: `${matchedStudent.name} (${regNo}) marked Present at ${time}`,
                    timestamp: now,
                  });

                  setStudents((prev) =>
                    prev.map((s) =>
                      s.registrationNumber === regNo
                        ? { ...s, status: 'Present', timeMarked: time }
                        : s
                    )
                  );
                } else {
                  // ALREADY RECORDED - DEBOUNCED WARNING
                  const lastChimeTime = lastChimeRef.current[regNo] || 0;
                  if (now - lastChimeTime > 7000) {
                    playAlreadyMarkedTone();
                    lastChimeRef.current[regNo] = now;

                    setHudNotice({
                      type: 'already',
                      title: 'ALREADY RECORDED — PLEASE STEP ASIDE',
                      subtitle: `${matchedStudent.name} (${regNo}) was marked at ${matchedStudent.timeMarked || 'earlier'}`,
                      timestamp: now,
                    });
                  }
                }
              }
            } else {
              // UNRECOGNIZED FACE
              const lastUnknownTime = lastChimeRef.current['unknown'] || 0;
              if (now - lastUnknownTime > 6000) {
                playErrorBuzz();
                lastChimeRef.current['unknown'] = now;

                setHudNotice({
                  type: 'unknown',
                  title: 'UNRECOGNIZED FACE',
                  subtitle: 'Student face is not enrolled in BUK database. Please visit Admin for biometric registration.',
                  timestamp: now,
                });
              }
            }
          });
        } catch (e) {
          console.warn('Recognition frame skip:', e);
        }
      }, 650);
    } catch (err: any) {
      console.error('Webcam scan error:', err);
      alert('Could not start webcam scanner: ' + err.message);
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsScanning(false);
  };

  // Toggle front/rear camera
  const handleToggleCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (isScanning) {
      await startScanning(nextFacing);
    }
  };

  // Toggle present status manually
  const toggleStudentStatus = (regNo: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.registrationNumber === regNo) {
          const nextStatus = s.status === 'Present' ? 'Absent' : 'Present';
          return {
            ...s,
            status: nextStatus,
            timeMarked: nextStatus === 'Present' ? new Date().toLocaleTimeString() : undefined,
          };
        }
        return s;
      })
    );
  };

  // Save session attendance batch to database
  const handleSaveAttendance = async () => {
    if (students.length === 0) return;

    setSavingAttendance(true);
    try {
      const records = students.map((s) => ({
        studentRegistrationNumber: s.registrationNumber,
        status: s.status,
        time: s.timeMarked || null,
      }));

      const res = await fetch('/api/lecturer/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: selectedUnit,
          venue: selectedVenue,
          records,
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        stopScanning();
        if (isKioskMode) setIsKioskMode(false);
        const presentCnt = students.filter((s) => s.status === 'Present').length;
        setSessionSuccess(
          `Attendance successfully archived for ${selectedUnit}! (${presentCnt} of ${students.length} students marked present)`
        );
      } else {
        alert(data.message || 'Error saving attendance');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving attendance records');
    } finally {
      setSavingAttendance(false);
    }
  };

  const presentCount = students.filter((s) => s.status === 'Present').length;
  const attendancePercentage = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  // Auto-hide HUD after 5 seconds if no new event
  useEffect(() => {
    if (!hudNotice) return;
    const timer = setTimeout(() => {
      setHudNotice(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [hudNotice]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-buk-navy" />
            <span>Facial Recognition Attendance Terminal</span>
          </h2>
          <p className="text-xs text-slate-500">
            High-speed real-time biometric identity verification with acoustic feedback for Bayero University Kano
          </p>
        </div>

        {studentsLoaded && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700">Present Ratio:</span>
              <p className="text-lg font-black text-buk-green leading-none">
                {presentCount} / {students.length} ({attendancePercentage}%)
              </p>
            </div>
            <button
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="bg-buk-green hover:bg-buk-green-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span className="text-white">Commit & Save Attendance</span>
            </button>
          </div>
        )}
      </div>

      {sessionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{sessionSuccess}</span>
        </div>
      )}

      {/* Session Configuration Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-buk-navy" />
              <span>Target Course Unit</span>
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setStudentsLoaded(false);
                stopScanning();
              }}
              disabled={isScanning}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white text-slate-800"
            >
              <option value="">Select Allocated Unit</option>
              {coursesData?.units?.map((u: any) => (
                <option key={u.id} value={u.unitCode}>
                  {u.unitCode} - {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-buk-gold" />
              <span>Lecture Hall / Venue</span>
            </label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              disabled={isScanning}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white text-slate-800"
            >
              <option value="">Select Venue</option>
              {coursesData?.venues?.map((v: any) => (
                <option key={v.id} value={v.className}>
                  {v.className} ({v.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={handleLoadStudents}
              disabled={loadingStudents || !selectedUnit || isScanning}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingStudents ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">Loading Roster & Vectors...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-white" />
                  <span className="text-white">Load Enrolled Students ({selectedUnit || 'Select Unit'})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {studentsLoaded && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Live Webcam Scanner Feed */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              {/* Camera Header with Sound & Lens Controls */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-buk-navy" />
                  <h3 className="text-sm font-bold text-slate-900">Live Biometric Viewfinder</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sound Mute/Unmute */}
                  <button
                    onClick={toggleSound}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      soundEnabled 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}
                    title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    <span className="text-[11px] font-bold">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
                  </button>

                  {/* Switch Front/Rear Camera */}
                  <button
                    onClick={handleToggleCamera}
                    className="p-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5"
                    title="Switch Front / Rear Camera"
                  >
                    <FlipHorizontal className="w-4 h-4 text-slate-700" />
                    <span className="text-[11px] font-bold">{facingMode === 'user' ? 'Front' : 'Rear'}</span>
                  </button>

                  {/* Fullscreen / Kiosk Mode Button */}
                  <button
                    onClick={() => setIsKioskMode(true)}
                    className="p-2 rounded-xl text-xs font-semibold bg-buk-navy hover:bg-buk-navy-light text-white transition-all flex items-center gap-1.5 shadow-sm"
                    title="Launch Full-Screen Kiosk Viewfinder"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                    <span className="text-[11px] font-bold text-white">Full Screen Kiosk</span>
                  </button>
                </div>
              </div>

              {/* Viewfinder Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[380px] sm:min-h-[460px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover min-h-[380px] sm:min-h-[460px] ${isScanning ? 'block' : 'hidden'}`}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 pointer-events-none w-full h-full ${
                    isScanning ? 'block' : 'hidden'
                  }`}
                />

                {/* Standby UI */}
                {!isScanning && (
                  <div className="text-center p-8 text-slate-400 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-buk-gold/50 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Camera className="w-8 h-8 text-buk-gold" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Biometric Viewfinder Ready</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Click <strong className="text-buk-gold font-bold">Start Attendance Scanner</strong>. Students should face camera directly for instantaneous recognition.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-white">
                      <Sparkles className="w-3.5 h-3.5 text-buk-gold" />
                      <span>{students.length} students enrolled in {selectedUnit}</span>
                    </div>
                  </div>
                )}

                {/* HUD STATUS OVERLAY BANNER */}
                {isScanning && hudNotice && (
                  <div className="absolute top-4 inset-x-4 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
                    {hudNotice.type === 'success' && (
                      <div className="p-4 rounded-2xl bg-emerald-600/95 text-white backdrop-blur-md shadow-2xl border-2 border-emerald-400 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
                            <span>{hudNotice.title}</span>
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          </p>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">
                            {hudNotice.subtitle}
                          </p>
                        </div>
                      </div>
                    )}

                    {hudNotice.type === 'already' && (
                      <div className="p-4 rounded-2xl bg-amber-600/95 text-white backdrop-blur-md shadow-2xl border-2 border-amber-400 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-wider text-white uppercase">
                            {hudNotice.title}
                          </p>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">
                            {hudNotice.subtitle}
                          </p>
                        </div>
                      </div>
                    )}

                    {hudNotice.type === 'unknown' && (
                      <div className="p-4 rounded-2xl bg-rose-700/95 text-white backdrop-blur-md shadow-2xl border-2 border-rose-400 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <XCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black tracking-wider text-white uppercase">
                            {hudNotice.title}
                          </p>
                          <p className="text-xs font-bold text-white mt-0.5">
                            {hudNotice.subtitle}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Viewfinder Alignment Guide Ring */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-buk-gold/60 rounded-[80px] shadow-[0_0_20px_rgba(202,138,4,0.2)] flex flex-col items-center justify-between p-4">
                      <span className="text-[10px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        ALIGN FACE HERE
                      </span>
                      <span className="text-[10px] font-semibold text-white/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        BUK BIOMETRIC AI
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Bottom Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isScanning ? (
                    <button
                      onClick={() => startScanning()}
                      disabled={!modelsReady}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-buk-gold hover:bg-buk-gold-dark text-buk-navy transition-all shadow-md flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-buk-navy" />
                      <span>Start Attendance Scanner</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md flex items-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-white text-white" />
                      <span className="text-white">Pause Scanner</span>
                    </button>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                      isScanning ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{isScanning ? 'AI RECOGNIZING' : 'STANDBY'}</span>
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Models: <strong className={modelsReady ? 'text-emerald-700 font-bold' : 'text-amber-700'}>{modelsReady ? 'Ready' : 'Loading...'}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Attendance Status & Roster */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-buk-navy" />
                  <h3 className="text-sm font-bold text-slate-900">Live Attendance Roster</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-bold">
                  {presentCount} Present &bull; {students.length - presentCount} Absent
                </span>
              </div>

              {/* Scrollable Student Presence Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[440px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-slate-500 uppercase text-[10px]">
                      <th className="py-2.5 px-3 font-semibold">Student</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Time</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => {
                      const isPresent = s.status === 'Present';
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isPresent ? 'bg-emerald-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800 leading-tight">{s.name}</p>
                            <p className="font-mono text-[10px] font-bold text-buk-navy mt-0.5">{s.registrationNumber}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPresent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isPresent ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : null}
                              <span>{s.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {s.timeMarked || '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => toggleStudentStatus(s.registrationNumber)}
                              className="text-[10px] font-bold text-buk-navy hover:text-buk-gold underline"
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Manual overrides saved immediately</span>
              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="font-bold text-buk-green hover:text-buk-green-dark inline-flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN KIOSK OVERLAY FOR MOBILE & CLASSROOMS */}
      {isKioskMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-white">
          {/* Kiosk Top Bar */}
          <div className="p-4 bg-buk-navy/95 border-b border-buk-gold/60 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  BUK-FRAS KIOSK SCANNER &bull; {selectedUnit}
                </h3>
                <p className="text-[11px] text-white/80">
                  Venue: {selectedVenue} &bull; Ratio: {presentCount}/{students.length} ({attendancePercentage}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5"
                title={soundEnabled ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-white/60" />}
                <span className="text-xs font-bold text-white hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
              </button>

              {/* Camera Switch */}
              <button
                onClick={handleToggleCamera}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5"
                title="Switch Front / Rear Camera"
              >
                <FlipHorizontal className="w-5 h-5 text-white" />
                <span className="text-xs font-bold text-white hidden sm:inline">{facingMode === 'user' ? 'Front' : 'Rear'}</span>
              </button>

              {/* Commit & Save */}
              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
                <span className="text-white hidden sm:inline">Save</span>
              </button>

              {/* Exit Kiosk Mode */}
              <button
                onClick={() => setIsKioskMode(false)}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-1"
                title="Exit Full-Screen Kiosk Mode"
              >
                <Minimize2 className="w-5 h-5 text-white" />
                <span className="text-xs font-bold text-white hidden sm:inline">Exit Kiosk</span>
              </button>
            </div>
          </div>

          {/* Kiosk Full-Bleed Video & Canvas */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none w-full h-full"
            />

            {/* KIOSK HUD FEEDBACK BANNER */}
            {hudNotice && (
              <div className="absolute top-6 inset-x-6 sm:inset-x-24 z-20 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-6">
                {hudNotice.type === 'success' && (
                  <div className="p-5 rounded-3xl bg-emerald-600/95 text-white backdrop-blur-xl shadow-2xl border-4 border-emerald-400 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
                        <span>{hudNotice.title}</span>
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      </h4>
                      <p className="text-sm sm:text-base font-bold text-white mt-1">
                        {hudNotice.subtitle}
                      </p>
                    </div>
                  </div>
                )}

                {hudNotice.type === 'already' && (
                  <div className="p-5 rounded-3xl bg-amber-600/95 text-white backdrop-blur-xl shadow-2xl border-4 border-amber-400 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                        {hudNotice.title}
                      </h4>
                      <p className="text-sm sm:text-base font-bold text-white mt-1">
                        {hudNotice.subtitle}
                      </p>
                    </div>
                  </div>
                )}

                {hudNotice.type === 'unknown' && (
                  <div className="p-5 rounded-3xl bg-rose-700/95 text-white backdrop-blur-xl shadow-2xl border-4 border-rose-400 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <XCircle className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                        {hudNotice.title}
                      </h4>
                      <p className="text-sm sm:text-base font-bold text-white mt-1">
                        {hudNotice.subtitle}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target Alignment Oval */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-96 sm:w-80 sm:h-[440px] border-4 border-dashed border-buk-gold/70 rounded-[120px] shadow-[0_0_40px_rgba(202,138,4,0.3)] flex flex-col items-center justify-between p-6">
                <span className="text-xs font-black text-white bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  CENTER FACE WITHIN OVAL
                </span>
                <span className="text-xs font-bold text-white bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  BAYERO UNIVERSITY KANO
                </span>
              </div>
            </div>

            {/* Live Bottom Ticker in Kiosk */}
            <div className="absolute bottom-4 inset-x-4 bg-slate-900/90 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-buk-gold" />
                <span className="font-bold text-white">
                  Present: {presentCount} / {students.length} ({attendancePercentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={isScanning ? stopScanning : () => startScanning()}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                    isScanning ? 'bg-rose-600 text-white' : 'bg-buk-gold text-buk-navy'
                  }`}
                >
                  {isScanning ? <Square className="w-3.5 h-3.5 fill-white text-white" /> : <Play className="w-3.5 h-3.5 fill-buk-navy" />}
                  <span>{isScanning ? 'Pause' : 'Resume'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LecturerAttendanceScanner() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Attendance Terminal...</div>}>
      <AttendanceScannerContent />
    </Suspense>
  );
}
