'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  CalendarCheck2,
  FileQuestion,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Loader2,
} from 'lucide-react';

interface DashboardData {
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
    totalCourses: number;
    totalClassesAttended: number;
    totalClassesMissed: number;
    attendanceRate: number;
    isEligibleForExams: boolean;
    pendingExcusesCount: number;
  };
  recentAttendance: Array<{
    id: number;
    courseCode: string;
    unitCode: string;
    venue: string | null;
    attendanceStatus: string;
    timeMarked: string | null;
    dateMarked: string;
    unit?: { name: string };
  }>;
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.status === 'success') {
          setData(resData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load student dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading BUK student profile...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">Student Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">Please sign in again to access your dashboard.</p>
        <Link
          href="/login?role=student"
          className="mt-4 inline-block px-4 py-2 bg-buk-navy text-white rounded-xl text-xs font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const { student, metrics, recentAttendance } = data;
  const isEligible = metrics.attendanceRate >= 70;

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-buk-navy via-buk-navy-light to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border-b-4 border-buk-gold">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-buk-gold/60 flex items-center justify-center overflow-hidden shrink-0">
              {student.studentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.studentImage}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-8 h-8 text-buk-gold" />
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-buk-gold/20 border border-buk-gold/40 text-[10px] font-bold text-buk-gold-light uppercase tracking-wider mb-1">
                <span>{student.faculty}</span>
                <span>&bull;</span>
                <span>{student.courseCode}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                Registration No: <span className="text-white font-bold">{student.registrationNumber}</span>
              </p>
            </div>
          </div>

          {/* Exam Clearance Badge */}
          <div className="flex flex-col sm:items-end">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold shadow-md ${
                isEligible
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-rose-500/20 border-rose-400 text-rose-200'
              }`}
            >
              {isEligible ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CLEARED FOR EXAMS ({metrics.attendanceRate}%)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>DEFAULTER RISK ({metrics.attendanceRate}% &lt; 70%)</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {isEligible
                ? 'Meets BUK Senate 70% Attendance Guideline'
                : 'Below minimum attendance requirement. Submit excuse/waiver!'}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Percentage */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Overall Attendance</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black ${
                  isEligible ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {metrics.attendanceRate}%
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Req: 70%</span>
            </div>
            <div className="w-32 bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isEligible ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, metrics.attendanceRate)}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <TrendingUp className="w-6 h-6 text-buk-navy" />
          </div>
        </div>

        {/* Classes Attended */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Classes Attended</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.totalClassesAttended}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              Verified via Facial AI
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Registered Units */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Enrolled Course Units</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.totalCourses} Units
            </div>
            <Link
              href="/student/courses"
              className="text-[11px] text-buk-navy font-semibold hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>View Breakdown</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-buk-navy">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Excuses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Pending Excuses</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.pendingExcusesCount}
            </div>
            <Link
              href="/student/excuses"
              className="text-[11px] text-buk-gold-dark font-semibold hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>Submit Waiver</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <FileQuestion className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Absence & Waiver Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-buk-gold transition-colors flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-buk-gold mb-3">
              <FileQuestion className="w-5 h-5 text-buk-gold-dark" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Missed a Lecture or Clinic?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Submit an official absence waiver request with doctor&apos;s report or bereavement letter.
              Approved excuses restore your examination eligibility status.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Processed by Faculty Board</span>
            <Link
              href="/student/excuses"
              className="px-4 py-2 rounded-xl bg-buk-navy text-white text-xs font-bold hover:bg-buk-navy-light transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Submit Excuse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Examination Clearance Slip Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-buk-gold transition-colors flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Official Exam Attendance Slip</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Generate and print your official Bayero University Kano Examination Clearance Pass with
              verifiable security QR code and course attendance certification.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Required for Hall Entry</span>
            <Link
              href="/student/clearance"
              className="px-4 py-2 rounded-xl bg-buk-gold text-buk-navy text-xs font-bold hover:bg-buk-gold-dark transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Print Clearance Slip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Attendance Stream */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Attendance Logs</h3>
            <p className="text-xs text-slate-500">Live facial recognition scans recorded in class</p>
          </div>
          <Link
            href="/student/attendance"
            className="text-xs font-bold text-buk-navy hover:text-buk-gold-dark inline-flex items-center gap-1"
          >
            <span>View Complete Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAttendance.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No attendance logs found yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Attendance will appear as lecturers conduct camera facial scans in class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Course Unit</th>
                  <th className="pb-3">Venue</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-bold text-slate-800">
                      <div>{item.unitCode}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.unit?.name || item.courseCode}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.venue || 'FCSIT Lecture Theatre'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-[11px]">
                      <div>{new Date(item.dateMarked).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{item.timeMarked || '09:00 AM'}</div>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          item.attendanceStatus === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.attendanceStatus === 'Excused'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
