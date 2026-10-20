'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  RotateCcw, 
  Sparkles,
  ShieldCheck,
  FlipHorizontal,
  Volume2,
  VolumeX,
  UserCheck
} from 'lucide-react';
import { playSampleChime, playErrorBuzz, playSuccessChime, isSoundMuted, setSoundMuted } from '@/lib/audio';

declare const faceapi: any;

export default function StudentEnrollPage() {
  const router = useRouter();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [faculties, setFaculties] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Camera & Face AI State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [capturedSamples, setCapturedSamples] = useState<Array<{ image: string; descriptor: number[] }>>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'danger' }>({
    text: 'Initializing Face Recognition Engine...',
    type: 'info',
  });
  const [submitting, setSubmitting] = useState(false);

  // Audio preference
  useEffect(() => {
    setSoundEnabled(!isSoundMuted());
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundMuted(!next);
  };

  // Load BUK metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [resF, resC] = await Promise.all([
          fetch('/api/admin/faculties'),
          fetch('/api/admin/courses'),
        ]);
        const jsonF = await resF.json();
        const jsonC = await resC.json();
        if (jsonF.status === 'success') setFaculties(jsonF.data);
        if (jsonC.status === 'success') setCourses(jsonC.data);
      } catch (e) {
        console.error('Metadata load error:', e);
      }
    }
    loadMetadata();
  }, []);

  // Initialize face-api.js neural models
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initFaceApi = async () => {
      if (typeof faceapi === 'undefined') {
        setStatusMessage({ text: 'Loading Neural Network weights...', type: 'info' });
        return;
      }

      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
        setStatusMessage({ text: 'Neural weights ready. Start webcam to begin enrollment.', type: 'success' });
        if (checkInterval) clearInterval(checkInterval);
      } catch (err: any) {
        console.error('Model loading error:', err);
        setStatusMessage({ text: 'Error loading models: ' + err.message, type: 'danger' });
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
      stopWebcam();
    };
  }, []);

  // Start webcam
  const startWebcam = async (overrideFacing?: 'user' | 'environment') => {
    const facing = overrideFacing || facingMode;
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: facing 
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setStatusMessage({ text: 'Camera active. Position student within frame and click Capture.', type: 'info' });
    } catch (err: any) {
      console.error('Camera error:', err);
      setStatusMessage({ text: 'Unable to access camera: ' + err.message, type: 'danger' });
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleToggleCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (cameraActive) {
      await startWebcam(next);
    }
  };

  // Capture face snapshot & compute 128-d descriptor
  const handleCaptureSample = async () => {
    if (!videoRef.current || !modelsLoaded || capturedSamples.length >= 5 || capturing) return;

    setCapturing(true);
    setStatusMessage({ text: 'Detecting face & extracting 128-dimensional biometric vector...', type: 'info' });

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);

      // Run face detection on the captured frame
      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        playErrorBuzz();
        setStatusMessage({
          text: 'No face detected in frame. Please face the camera directly in good lighting.',
          type: 'danger',
        });
        setCapturing(false);
        return;
      }

      // Convert Float32Array to standard array for JSON serialization
      const descriptorArray: number[] = Array.from(detection.descriptor) as number[];

      const newSamples: Array<{ image: string; descriptor: number[] }> = [
        ...capturedSamples,
        { image: imageData, descriptor: descriptorArray },
      ];
      setCapturedSamples(newSamples);

      if (newSamples.length < 5) {
        playSampleChime();
        setStatusMessage({
          text: `Sample ${newSamples.length} of 5 captured successfully! Take next angle.`,
          type: 'success',
        });
      } else {
        playSuccessChime();
        setStatusMessage({
          text: 'All 5 facial angles captured! Ready to complete enrollment.',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Capture error:', err);
      playErrorBuzz();
      setStatusMessage({ text: 'Capture error: ' + err.message, type: 'danger' });
    } finally {
      setCapturing(false);
    }
  };

  const handleResetSamples = () => {
    setCapturedSamples([]);
    setStatusMessage({ text: 'Samples cleared. Position student to capture fresh angles.', type: 'info' });
  };

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (capturedSamples.length === 0) {
      alert('Please capture at least 1 facial sample before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedFaculty = faculties.find((f) => String(f.id) === facultyId);
      const selectedCourse = courses.find((c) => String(c.id) === courseId);

      // Extract all 128-d descriptors from samples
      const descriptors = capturedSamples.map((s) => s.descriptor);
      const primaryPhoto = capturedSamples[0].image;

      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          registrationNumber: registrationNumber.toUpperCase(),
          email,
          faculty: selectedFaculty?.facultyCode || 'FCSIT',
          courseCode: selectedCourse?.courseCode || 'B.Sc. CSC',
          courseId: courseId ? Number(courseId) : null,
          studentImage: primaryPhoto,
          faceDescriptors: descriptors,
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        stopWebcam();
        router.push('/admin/students');
      } else {
        alert(data.message || 'Enrollment failed');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during submission: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/students"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-buk-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-buk-navy" />
            <span>Biometric Face Enrollment Terminal</span>
          </h2>
          <p className="text-xs text-slate-500">
            Guided 5-angle neural vector extraction for Bayero University Kano students
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Bio-Data Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-buk-navy" />
            <span>Student Bio-Data</span>
          </h3>

          <form onSubmit={handleSubmitEnrollment} id="enrollForm" className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Amina"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Suleiman"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">BUK Registration Number</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. CST/21/COM/00101"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">University Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amina.suleiman@buk.edu.ng"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white text-slate-800"
              >
                <option value="">Select Faculty</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facultyName} ({f.facultyCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Degree Programme</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white text-slate-800"
              >
                <option value="">Select Programme</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.courseCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || capturedSamples.length === 0}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-buk-gold hover:bg-buk-gold-dark text-buk-navy shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-buk-navy" />
                    <span>Registering Biometric Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-buk-navy" />
                    <span>Complete Enrollment ({capturedSamples.length}/5 Captured)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Camera & Vector Extraction Terminal */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-buk-navy" />
                <h3 className="text-sm font-bold text-slate-900">Live Face Scanner</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    soundEnabled 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                      : 'bg-slate-100 border-slate-300 text-slate-500'
                  }`}
                  title={soundEnabled ? 'Sound ON' : 'Muted'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  <span className="text-[11px] font-bold">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
                </button>

                {/* Switch Front/Rear */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="p-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5"
                  title="Switch Front / Rear Camera"
                >
                  <FlipHorizontal className="w-4 h-4 text-slate-700" />
                  <span className="text-[11px] font-bold">{facingMode === 'user' ? 'Front' : 'Rear'}</span>
                </button>

                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  128-D CNN
                </span>
              </div>
            </div>

            {/* Status Alert Banner */}
            <div
              className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'danger'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : statusMessage.type === 'danger' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
              )}
              <span className="font-semibold">{statusMessage.text}</span>
            </div>

            {/* Large Responsive Viewfinder Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 min-h-[340px] sm:min-h-[420px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover min-h-[340px] sm:min-h-[420px] ${cameraActive ? 'block' : 'hidden'}`}
              />

              {!cameraActive && (
                <div className="text-center p-8 text-slate-400 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-buk-gold/50 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Camera className="w-8 h-8 text-buk-gold" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Enrollment Camera Standby</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Click <strong className="text-buk-gold font-bold">Start Camera</strong> below to begin capturing biometric face angles.
                  </p>
                </div>
              )}

              {/* Face Guide Target Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-buk-gold/80 rounded-[80px] shadow-[0_0_30px_rgba(202,138,4,0.25)] flex flex-col items-center justify-between p-4">
                    <span className="text-[10px] font-black text-white bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                      POSITION FACE HERE
                    </span>
                    <span className="text-[10px] font-bold text-white bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                      SAMPLES: {capturedSamples.length} / 5
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Control Buttons */}
            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => startWebcam()}
                    disabled={!modelsLoaded}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-buk-navy text-white hover:bg-buk-navy-light transition-colors disabled:opacity-50"
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Pause Camera
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCaptureSample}
                  disabled={!cameraActive || capturedSamples.length >= 5 || capturing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-buk-gold hover:bg-buk-gold-dark text-buk-navy transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {capturing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting Vector...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Capture Sample ({capturedSamples.length}/5)</span>
                    </>
                  )}
                </button>
              </div>

              {capturedSamples.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetSamples}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Samples</span>
                </button>
              )}
            </div>
          </div>

          {/* Captured Samples Strip */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Captured Biometric Angle Samples</span>
              <span className="text-[10px] text-slate-500 font-semibold">1 minimum required (5 recommended for peak accuracy)</span>
            </h4>

            <div className="grid grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((index) => {
                const sample = capturedSamples[index];
                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center border-2 ${
                      sample ? 'border-emerald-500 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'
                    }`}
                  >
                    {sample ? (
                      <>
                        <img
                          src={sample.image}
                          alt={`Sample ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">
                        Angle {index + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
