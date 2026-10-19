'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  BookOpen, 
  Layers, 
  MapPin, 
  Activity, 
  Camera, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';

interface StatsData {
  students: number;
  lecturers: number;
  units: number;
  courses: number;
  venues: number;
  attendanceRate: number;
  totalRecords: number;
  recentAttendances: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.status === 'success') {
        setStats(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-buk-navy via-buk-navy-light to-slate-900 rounded-3xl p-6 sm:p-8 text-white border-2 border-buk-gold/60 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-buk-gold uppercase tracking-wider">
              Bayero University Kano
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
              Administrator Central Overview
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Biometric attendance records, faculty curriculum coverage, and automated student identification across BUK campuses.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/students/enroll"
              className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Enroll Student Face</span>
            </Link>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Students</span>
            <Users className="w-4 h-4 text-buk-navy" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats?.students ?? '-'}</p>
          <span className="text-[10px] text-slate-400 mt-1">Enrolled records</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Lecturers</span>
            <UserCheck className="w-4 h-4 text-buk-gold" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats?.lecturers ?? '-'}</p>
          <span className="text-[10px] text-slate-400 mt-1">Teaching staff</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Programmes</span>
            <BookOpen className="w-4 h-4 text-buk-green" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats?.courses ?? '-'}</p>
          <span className="text-[10px] text-slate-400 mt-1">Courses of study</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Course Units</span>
            <Layers className="w-4 h-4 text-buk-navy" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats?.units ?? '-'}</p>
          <span className="text-[10px] text-slate-400 mt-1">Active units</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Venues</span>
            <MapPin className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{stats?.venues ?? '-'}</p>
          <span className="text-[10px] text-slate-400 mt-1">Halls & Theatres</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Compliance</span>
            <Activity className="w-4 h-4 text-buk-green" />
          </div>
          <p className="text-2xl font-black text-buk-green mt-3">{stats?.attendanceRate ?? 100}%</p>
          <span className="text-[10px] text-slate-400 mt-1">Overall present</span>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Quick Action Cards */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Attendance Logs */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Attendance Logs</h3>
              <p className="text-xs text-slate-500">Real-time facial matches logged across lecture halls</p>
            </div>
            <Link
              href="/admin/students"
              className="text-xs font-bold text-buk-navy hover:text-buk-gold-dark inline-flex items-center gap-1"
            >
              <span>View All Students</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats?.recentAttendances && stats.recentAttendances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Student Name</th>
                    <th className="py-2.5 font-semibold">Reg Number</th>
                    <th className="py-2.5 font-semibold">Unit Code</th>
                    <th className="py-2.5 font-semibold">Venue</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentAttendances.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">
                        {rec.student ? `${rec.student.firstName} ${rec.student.lastName}` : rec.studentRegistrationNumber}
                      </td>
                      <td className="py-3 font-mono text-slate-600">{rec.studentRegistrationNumber}</td>
                      <td className="py-3 text-buk-navy font-bold">{rec.unitCode}</td>
                      <td className="py-3 text-slate-600">{rec.venue || 'Classroom'}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{rec.attendanceStatus}</span>
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {rec.timeMarked || new Date(rec.dateMarked).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No recent attendance scans recorded yet.</p>
              <p className="mt-1">Launch a session from the Lecturer Terminal to record live attendance.</p>
            </div>
          )}
        </div>

        {/* Quick Management Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Administrative Actions</h3>
            <p className="text-xs text-slate-500 mb-4">Quick shortcuts to core curriculum & enrollment functions</p>

            <div className="space-y-3 text-xs font-semibold">
              <Link
                href="/admin/students/enroll"
                className="p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 text-amber-900 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-buk-gold text-buk-navy">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Biometric Face Enrollment</p>
                    <p className="text-[10px] text-amber-700/80 font-normal">Capture 5 camera angles & extract embeddings</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-700" />
              </Link>

              <Link
                href="/admin/assignments"
                className="p-3.5 rounded-2xl bg-buk-navy/5 hover:bg-buk-navy/10 border border-buk-navy/15 text-buk-navy flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-buk-navy text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Course Assignments</p>
                    <p className="text-[10px] text-slate-500 font-normal">Assign units to lecturers & students</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-buk-navy" />
              </Link>

              <Link
                href="/admin/lecturers"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-200 text-slate-800">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Teaching Faculty</p>
                    <p className="text-[10px] text-slate-500 font-normal">Manage lecturer accounts & credentials</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
