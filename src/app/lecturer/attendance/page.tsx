'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  MapPin, 
  BookOpen, 
  Loader2, 
  Play, 
  Square, 
  Save, 
  Volume2, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

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

  // Live Camera & Recognition Loop
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRecognized, setLastRecognized] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);

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

        // Build FaceMatcher from stored 128-d vector embeddings
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
  const startScanning = async () => {
    if (!selectedVenue) {
      alert('Please specify the Lecture Venue / Theatre before scanning.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);
      setSessionSuccess(null);

      // Start recognition loop
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !faceMatcher) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.paused || video.ended) return;

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

          const results = resizedDetections.map((d: any) => faceMatcher.findBestMatch(d.descriptor));

          results.forEach((result: any, i: number) => {
            const box = resizedDetections[i].detection.box;
            const isMatch = result.label !== 'unknown';
            const labelText = isMatch ? result.label : 'Unrecognized Student';

            // Draw bounding box
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: labelText,
              boxColor: isMatch ? '#006837' : '#EF4444',
            });
            drawBox.draw(canvas);

            // Automatically mark student as Present
            if (isMatch) {
              const regNo = result.label;
              setStudents((prev) =>
                prev.map((s) => {
                  if (s.registrationNumber === regNo && s.status !== 'Present') {
                    const time = new Date().toLocaleTimeString();
                    setLastRecognized(`${s.name} (${regNo})`);
                    return { ...s, status: 'Present', timeMarked: time };
                  }
                  return s;
                })
              );
            }
          });
        } catch (e) {
          console.warn('Recognition frame skip:', e);
        }
      }, 700);
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
        const presentCount = students.filter((s) => s.status === 'Present').length;
        setSessionSuccess(
          `Attendance successfully archived for ${selectedUnit}! (${presentCount} of ${students.length} students marked present)`
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Facial Recognition Attendance Terminal
          </h2>
          <p className="text-xs text-slate-500">
            High-speed real-time biometric identity verification for Bayero University Kano
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
              {savingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Commit & Save Attendance</span>
            </button>
          </div>
        )}
      </div>

      {sessionSuccess && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-900 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Roster & Vectors...</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>Load Enrolled Students</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {studentsLoaded && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Live Webcam Scanner */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-buk-navy" />
                  <h3 className="text-sm font-bold text-slate-900">Webcam Scanner Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isScanning ? 'bg-buk-green animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-[11px] font-mono text-slate-500">
                    {isScanning ? 'LIVE AI RECOGNITION' : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Video with Canvas Overlay */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border-2 border-slate-800 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 pointer-events-none w-full h-full ${
                    isScanning ? 'block' : 'hidden'
                  }`}
                />

                {!isScanning && (
                  <div className="text-center p-6 text-slate-400">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Webcam Terminal Ready</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Click Start Attendance Scanner below. Students should face camera directly for automated verification.
                    </p>
                  </div>
                )}
              </div>

              {/* Control Buttons & Last Recognized notification */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    disabled={!modelsReady}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-buk-gold hover:bg-buk-gold-dark text-buk-navy transition-all shadow-md flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Attendance Scanner</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    <span>Pause Scanner</span>
                  </button>
                )}

                {lastRecognized && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recognized: {lastRecognized}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Attendance Presence Table */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-buk-navy" />
                  <h3 className="text-sm font-bold text-slate-900">Enrolled Students Roster</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {presentCount} Present &bull; {students.length - presentCount} Absent
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3 font-semibold">Student Name</th>
                      <th className="py-2.5 px-3 font-semibold">Reg Number</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Time Marked</th>
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
                            isPresent ? 'bg-green-50/50' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {s.name}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] font-bold text-buk-navy">
                            {s.registrationNumber}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPresent
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isPresent ? <CheckCircle2 className="w-3 h-3" /> : null}
                              <span>{s.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {s.timeMarked || '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => toggleStudentStatus(s.registrationNumber)}
                              className="text-[10px] font-bold text-buk-navy hover:text-buk-gold-dark underline"
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
              <span>Manual overrides recorded immediately</span>
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
