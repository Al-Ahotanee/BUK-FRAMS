'use client';

import React, { useEffect, useState } from 'react';
import { BukLogo } from '@/components/BukLogo';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Calendar,
  GraduationCap,
  Loader2,
} from 'lucide-react';

interface ClearanceData {
  student: {
    id: number;
    name: string;
    registrationNumber: string;
    email: string;
    faculty: string;
    courseCode: string;
    studentImage?: string | null;
  };
  metrics: {
    attendanceRate: number;
    isEligibleForExams: boolean;
  };
}

interface CourseItem {
  unitId: number;
  unitCode: string;
  unitName: string;
  totalLectures: number;
  classesAttended: number;
  attendanceRate: number;
  isEligible: boolean;
}

export default function StudentClearancePage() {
  const [profile, setProfile] = useState<ClearanceData | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/student/dashboard').then((r) => r.json()),
      fetch('/api/student/courses').then((r) => r.json()),
    ])
      .then(([dashData, courseData]) => {
        if (dashData.status === 'success') {
          setProfile(dashData);
        }
        if (courseData.status === 'success') {
          setCourses(courseData.courses || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Generating official BUK examination clearance slip...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl">
        <p className="text-sm font-bold text-slate-700">Unable to generate clearance slip.</p>
      </div>
    );
  }

  const { student, metrics } = profile;
  const isOverallCleared = metrics.isEligibleForExams;
  const verificationHash = `BUK-${student.registrationNumber.replace(/\//g, '')}-${new Date().getFullYear()}-AUTH`;

  return (
    <div className="space-y-6">
      {/* Top Action Header (Hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Official Examination Clearance Slip</h2>
          <p className="text-xs text-slate-500">
            Mandatory credential required for entry into Bayero University Kano Examination Halls
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-buk-navy text-white text-xs font-bold rounded-xl hover:bg-buk-navy-light transition-all shadow-md"
        >
          <Printer className="w-4 h-4" />
          <span>Print Official Slip (PDF)</span>
        </button>
      </div>

      {/* Printable Certificate / Slip Container */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 p-8 sm:p-12 shadow-lg max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans relative overflow-hidden">
        {/* Watermark / BUK background insignia */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/buk-logo.jpg" alt="" className="w-96 h-96 object-contain" />
        </div>

        {/* Institution Header */}
        <div className="border-b-4 border-buk-navy pb-6 text-center relative z-10">
          <div className="flex justify-center mb-3">
            <BukLogo size="xl" showText={false} />
          </div>
          <h1 className="text-2xl font-black text-buk-navy tracking-tight uppercase">
            Bayero University, Kano
          </h1>
          <p className="text-xs font-bold text-buk-gold-dark tracking-wide uppercase mt-0.5">
            Office of the Registrar &bull; Directorate of Academic Planning & Monitoring
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            FACIAL RECOGNITION ATTENDANCE MANAGEMENT SYSTEM (BUK-FRAS)
          </p>
          <div className="mt-3 inline-block px-4 py-1 rounded-full bg-buk-navy text-buk-gold text-xs font-extrabold uppercase tracking-widest">
            Semester Examination Attendance Clearance Pass &bull; 2025/2026 Session
          </div>
        </div>

        {/* Student Bio Details & Passport */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-center border-b border-slate-200 pb-8 relative z-10">
          <div className="flex justify-center md:justify-start">
            <div className="w-32 h-36 rounded-2xl border-2 border-buk-navy overflow-hidden bg-slate-100 shadow-md flex items-center justify-center">
              {student.studentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.studentImage}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-12 h-12 text-slate-400" />
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Full Name:</span>
              <p className="text-base font-bold text-slate-900 uppercase">{student.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-medium">Registration Number:</span>
                <p className="font-mono font-bold text-buk-navy text-sm">{student.registrationNumber}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Degree Programme:</span>
                <p className="font-bold text-slate-800">{student.courseCode}</p>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Faculty:</span>
              <p className="font-semibold text-slate-800">{student.faculty}</p>
            </div>
          </div>

          {/* Official Clearance Stamp */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed text-center">
            {isOverallCleared ? (
              <div className="text-emerald-700">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-600 mb-1" />
                <span className="text-xs font-black uppercase tracking-wider block">
                  CLEARED
                </span>
                <span className="text-[10px] font-bold block mt-0.5">
                  BUK Senate 70% Quota Satisfied
                </span>
              </div>
            ) : (
              <div className="text-rose-700">
                <AlertTriangle className="w-10 h-10 mx-auto text-rose-600 mb-1" />
                <span className="text-xs font-black uppercase tracking-wider block">
                  PROVISIONAL
                </span>
                <span className="text-[10px] font-bold block mt-0.5">
                  Defaulter Quota (&lt; 70%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Registered Course Units Attendance Table */}
        <div className="mt-8 relative z-10">
          <h3 className="text-xs font-black text-buk-navy uppercase tracking-wider mb-3">
            Course Unit Attendance Certification Matrix:
          </h3>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 border-r">Unit Code</th>
                <th className="py-2.5 px-3 border-r">Unit Title</th>
                <th className="py-2.5 px-3 text-center border-r">Lectures Held</th>
                <th className="py-2.5 px-3 text-center border-r">Attended</th>
                <th className="py-2.5 px-3 text-center border-r">Percentage</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courses.map((c) => (
                <tr key={c.unitId} className="border-b">
                  <td className="py-2.5 px-3 font-mono font-bold text-buk-navy border-r">{c.unitCode}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 border-r">{c.unitName}</td>
                  <td className="py-2.5 px-3 text-center font-mono border-r">{c.totalLectures}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold border-r">{c.classesAttended}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold border-r">
                    <span className={c.isEligible ? 'text-emerald-700' : 'text-rose-700 font-black'}>
                      {c.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {c.isEligible ? 'ELIGIBLE' : 'DEFAULTER'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Verification Signature & Security QR Barcode */}
        <div className="mt-10 pt-6 border-t-2 border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-end relative z-10 text-xs">
          <div>
            <div className="flex items-center gap-2 text-slate-700">
              <QrCode className="w-12 h-12 text-slate-800 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-mono">Security Hash:</p>
                <p className="font-mono text-[10px] font-bold text-buk-navy break-all">
                  {verificationHash}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">Scan to verify biometric validity</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="w-40 border-b border-slate-800 mx-auto mb-1"></div>
            <p className="font-bold text-[11px] text-slate-800 uppercase">Faculty Examination Officer</p>
            <p className="text-[10px] text-slate-400">Signature & Date</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400">Generated on:</p>
            <p className="font-bold text-[11px] text-slate-800 font-mono">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Biometrically Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
