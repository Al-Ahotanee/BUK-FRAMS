'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, BookOpen, Users, Clock, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LecturerDashboardPage() {
  const [coursesData, setCoursesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/lecturer/courses');
        const json = await res.json();
        if (json.status === 'success') {
          setCoursesData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-buk-navy via-buk-navy-light to-slate-900 rounded-3xl p-6 sm:p-8 text-white border-2 border-buk-gold/60 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-buk-gold uppercase tracking-wider">
              Teaching Faculty Portal
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
              Welcome back, Dr. Mark Ibrahim
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Conduct live biometric face attendance for your assigned course units, monitor attendance compliance, and export reports.
            </p>
          </div>

          <Link
            href="/lecturer/attendance"
            className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold text-sm px-6 py-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0"
          >
            <Camera className="w-5 h-5" />
            <span>Launch Live Face Scanner</span>
          </Link>
        </div>
      </div>

      {/* Allocated Units Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Assigned Course Units</h3>
            <p className="text-xs text-slate-500">Units currently allocated to your teaching schedule</p>
          </div>
          <Link
            href="/lecturer/attendance"
            className="text-xs font-bold text-buk-navy hover:text-buk-gold-dark inline-flex items-center gap-1"
          >
            <span>Scan Attendance</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : coursesData?.units && coursesData.units.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesData.units.map((u: any) => (
              <div
                key={u.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-buk-navy text-white">
                      {u.unitCode}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{u.enrolledStudents} Students</span>
                    </span>
                  </div>

                  <h4 className="mt-4 text-base font-bold text-slate-900 leading-snug">
                    {u.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{u.courseName}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/lecturer/attendance?unit=${encodeURIComponent(u.unitCode)}`}
                    className="text-xs font-bold text-buk-navy hover:text-buk-gold-dark inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-buk-gold" />
                    <span>Start Attendance Session</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">No course units allocated yet.</p>
            <p className="text-[11px] mt-1 text-slate-500">
              Please contact the central BUK Administrator to assign course units to your profile.
            </p>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/lecturer/reports"
          className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="p-3.5 rounded-2xl bg-amber-50 text-buk-gold shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Attendance Records & Export</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Review historical sign-in timestamps for your units and download authenticated spreadsheet sheets.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-buk-navy mt-3">
              <span>Access Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>

        <Link
          href="/lecturer/notifications"
          className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Attendance Defaulter Warning</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Filter students falling below the mandatory BUK 70% attendance quota and dispatch warning notices.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 mt-3">
              <span>View Defaulters</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
