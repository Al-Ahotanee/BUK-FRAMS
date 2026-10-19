'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Mail,
  User,
  ArrowRight,
  Loader2,
  Layers,
} from 'lucide-react';

interface CourseData {
  unitId: number;
  unitName: string;
  unitCode: string;
  programme: string;
  programmeCode: string;
  lecturerName: string;
  lecturerEmail: string;
  totalLectures: number;
  classesAttended: number;
  attendanceRate: number;
  isEligible: boolean;
}

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setCourses(data.courses || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load courses:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading course units & attendance breakdown...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-buk-gold" />
            <span>My Registered Course Units</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semester course roster, assigned lecturers, and exam clearance benchmarks
          </p>
        </div>

        <Link
          href="/student/excuses"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-buk-navy text-white text-xs font-bold rounded-xl hover:bg-buk-navy-light transition-all shadow-sm"
        >
          <span>Request Absence Waiver</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Course Units Assigned</h3>
          <p className="text-xs text-slate-400 mt-1">
            Contact your department administrator to complete course unit allocation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {courses.map((course) => (
            <div
              key={course.unitId}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Unit Code & Eligibility Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-1 rounded-lg bg-buk-navy/10 text-buk-navy font-mono font-bold text-xs">
                      {course.unitCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2.5 leading-snug">
                      {course.unitName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{course.programme}</p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      course.isEligible
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {course.isEligible ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Eligible ({course.attendanceRate}%)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Defaulter ({course.attendanceRate}%)</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Attendance Progress Bar */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Attendance Ratio</span>
                    <span className={course.isEligible ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {course.classesAttended} / {course.totalLectures} Classes ({course.attendanceRate}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        course.isEligible ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, course.attendanceRate)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>0%</span>
                    <span className="font-semibold text-buk-navy">BUK Threshold: 70%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Lecturer in charge */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-[11px]">{course.lecturerName}</p>
                      <p className="text-[10px] text-slate-400">Course Instructor</p>
                    </div>
                  </div>

                  {course.lecturerEmail && (
                    <a
                      href={`mailto:${course.lecturerEmail}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-buk-navy hover:bg-slate-100 transition-colors"
                      title={course.lecturerEmail}
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/student/attendance?unitCode=${course.unitCode}`}
                  className="text-xs font-semibold text-buk-navy hover:text-buk-gold-dark inline-flex items-center gap-1"
                >
                  <span>Attendance History</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                {!course.isEligible && (
                  <Link
                    href={`/student/excuses?unitId=${course.unitId}`}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Submit Waiver Request
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
