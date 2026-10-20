'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Building2, 
  MapPin, 
  Download, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert,
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalStudents: number;
    totalUnits: number;
    totalAttendanceCount: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    overallRate: number;
    defaulterCount: number;
  };
  trend: Array<{
    date: string;
    total: number;
    present: number;
    absent: number;
    rate: number;
  }>;
  facultyMetrics: Array<{
    id: number;
    name: string;
    code: string;
    studentsCount: number;
    sessionsCount: number;
    presentCount: number;
    attendanceRate: number;
  }>;
  defaulters: Array<{
    id: number;
    registrationNumber: string;
    name: string;
    email: string;
    faculty: string;
    courseCode: string;
    totalSessions: number;
    attendedSessions: number;
    attendanceRate: number;
    isDefaulter: boolean;
  }>;
  venueUsage: Array<{
    id: number;
    name: string;
    capacity: number;
    totalSessions: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Export Defaulters to CSV
  const handleExportDefaulters = () => {
    if (!data?.defaulters || data.defaulters.length === 0) {
      alert('No students currently in the defaulter category.');
      return;
    }

    const headers = [
      'Registration Number',
      'Student Name',
      'Email',
      'Faculty',
      'Programme',
      'Total Sessions',
      'Attended Sessions',
      'Attendance Percentage',
      'BUK Exam Clearance Status',
    ];

    const rows = data.defaulters.map((d) => [
      d.registrationNumber,
      d.name,
      d.email,
      d.faculty,
      d.courseCode || 'N/A',
      d.totalSessions,
      d.attendedSessions,
      `${d.attendanceRate}%`,
      'DISQUALIFIED (< 70% BUK Regulation)',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `BUK_Exam_Disqualification_Defaulters_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Generating institutional attendance intelligence...</p>
      </div>
    );
  }

  const summary = data?.summary;
  const maxTrendTotal = Math.max(...(data?.trend.map((t) => t.total) || [10]), 10);

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-buk-navy text-white text-[10px] font-bold tracking-wider uppercase">
              Executive Analytics
            </span>
            <span className="text-xs text-slate-400 font-semibold">&bull; First Semester 2025/2026</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-buk-navy" />
            <span>Institutional Attendance Intelligence & Reporting</span>
          </h2>
          <p className="text-xs text-slate-500">
            Bayero University Kano aggregate metrics, faculty compliance rates, and examination clearance eligibility
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalytics}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportDefaulters}
            disabled={!data?.defaulters?.length}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-white" />
            <span className="text-white">Export Defaulters ({data?.defaulters?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Institutional Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{summary?.overallRate ?? 0}%</p>
            <p className="text-[11px] font-medium text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Above 70% university requirement</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Attendance Logs</span>
            <Users className="w-4 h-4 text-buk-navy" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{summary?.totalAttendanceCount ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.presentCount ?? 0} Present &bull; {summary?.excusedCount ?? 0} Excused
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold">Defaulters Risk (&lt;70%)</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-rose-900">{summary?.defaulterCount ?? 0}</p>
            <p className="text-[11px] font-medium text-rose-700 mt-1">
              At risk of exam disqualification
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Active Faculties</span>
            <Building2 className="w-4 h-4 text-buk-gold" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900">{data?.facultyMetrics?.length ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {summary?.totalStudents ?? 0} Students registered
            </p>
          </div>
        </div>
      </div>

      {/* 14-Day Attendance Progression Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-buk-navy" />
              <span>14-Day Attendance Volume & Compliance Trend</span>
            </h3>
            <p className="text-xs text-slate-500">
              Daily lecture verification activity across Bayero University campuses
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-buk-navy" />
              <span>Present</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-rose-400" />
              <span>Absent</span>
            </span>
          </div>
        </div>

        {/* SVG / Bar Progression Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 sm:gap-3 items-end min-h-[220px]">
            {data?.trend.map((day) => {
              const presentHeight = maxTrendTotal > 0 ? (day.present / maxTrendTotal) * 160 : 0;
              const absentHeight = maxTrendTotal > 0 ? (day.absent / maxTrendTotal) * 160 : 0;
              const totalHeight = Math.max(12, presentHeight + absentHeight);

              return (
                <div key={day.date} className="flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    <p className="font-bold">{day.date}</p>
                    <p>{day.present} Present &bull; {day.absent} Absent ({day.rate}%)</p>
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${totalHeight}px` }}
                    className="w-full max-w-[28px] rounded-lg overflow-hidden flex flex-col justify-end bg-slate-100 shadow-inner transition-all hover:scale-105"
                  >
                    {day.absent > 0 && (
                      <div
                        style={{ height: `${absentHeight}px` }}
                        className="w-full bg-rose-400/80"
                      />
                    )}
                    {day.present > 0 && (
                      <div
                        style={{ height: `${presentHeight}px` }}
                        className="w-full bg-buk-navy"
                      />
                    )}
                  </div>

                  {/* Day Label */}
                  <span className="text-[10px] font-mono text-slate-500 transform -rotate-45 sm:rotate-0 mt-1">
                    {day.date.split('-').slice(1).join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Section: Faculty Performance & Venue Utilization */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Faculty Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-buk-navy" />
              <span>Faculty Attendance Compliance Ranking</span>
            </h3>
            <p className="text-xs text-slate-500">
              Comparative biometric attendance ratios by academic faculties
            </p>
          </div>

          <div className="space-y-4">
            {data?.facultyMetrics.map((fac) => {
              const isGood = fac.attendanceRate >= 70;
              return (
                <div
                  key={fac.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{fac.name}</span>
                      <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        {fac.code}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black ${
                        isGood ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {fac.attendanceRate}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${fac.attendanceRate}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isGood ? 'bg-buk-green' : 'bg-rose-500'
                      }`}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{fac.studentsCount} Students registered</span>
                    <span>{fac.presentCount} of {fac.sessionsCount} sessions attended</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Venue Utilization */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-buk-gold" />
              <span>Lecture Theatres & Venues</span>
            </h3>
            <p className="text-xs text-slate-500">
              Capacity allocation and attendance logging frequency
            </p>
          </div>

          <div className="space-y-3">
            {data?.venueUsage.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{v.name}</p>
                  <p className="text-[11px] text-slate-500">{v.capacity} Seat Capacity</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-buk-navy/10 text-buk-navy text-[11px] font-bold">
                    {v.totalSessions} Sessions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Defaulter Risk Watchlist Table (< 70% threshold) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Examination Disqualification Watchlist (&lt; 70% Threshold)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Students falling below Bayero University Kano&apos;s mandatory 70% attendance quota
            </p>
          </div>

          {data?.defaulters && data.defaulters.length > 0 && (
            <button
              onClick={handleExportDefaulters}
              className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official Disqualification Report</span>
            </button>
          )}
        </div>

        {data?.defaulters && data.defaulters.length > 0 ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3.5">Registration Number</th>
                    <th className="py-3 px-3.5">Student Name</th>
                    <th className="py-3 px-3.5">Faculty</th>
                    <th className="py-3 px-3.5">Programme</th>
                    <th className="py-3 px-3.5">Total Sessions</th>
                    <th className="py-3 px-3.5">Attended</th>
                    <th className="py-3 px-3.5">Rate</th>
                    <th className="py-3 px-3.5 text-right">Clearance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.defaulters.map((s) => (
                    <tr key={s.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-buk-navy">
                        {s.registrationNumber}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {s.faculty}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">
                        {s.courseCode || 'Undergraduate'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-600">
                        {s.totalSessions}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-600">
                        {s.attendedSessions}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-black text-rose-600 text-xs">
                          {s.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Defaulter &bull; Disqualified</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">Zero Defaulters Detected</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All active students currently meet or exceed the 70% attendance quota.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
