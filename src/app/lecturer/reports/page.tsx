'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers
} from 'lucide-react';

interface AttendanceRecord {
  id: number;
  studentRegistrationNumber: string;
  courseCode: string;
  unitCode: string;
  venue?: string;
  attendanceStatus: 'Present' | 'Absent' | 'Excused';
  dateMarked: string;
  timeMarked?: string;
  student?: {
    firstName: string;
    lastName: string;
    email: string;
    studentImage?: string;
  };
}

export default function LecturerReportsPage() {
  const [coursesData, setCoursesData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/lecturer/courses');
        const json = await res.json();
        if (json.status === 'success') {
          setCoursesData(json.data);
          if (json.data.units?.[0]) {
            setSelectedUnit(json.data.units[0].unitCode);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadInitial();
  }, []);

  const fetchRecords = async () => {
    if (!selectedUnit) return;
    setLoading(true);

    try {
      let url = `/api/lecturer/attendance?unitCode=${encodeURIComponent(selectedUnit)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        setRecords(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      fetchRecords();
    }
  }, [selectedUnit]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const studentName = r.student ? `${r.student.firstName} ${r.student.lastName}`.toLowerCase() : '';
      const matchesSearch =
        q === '' ||
        r.studentRegistrationNumber.toLowerCase().includes(q) ||
        studentName.includes(q) ||
        (r.venue && r.venue.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || r.attendanceStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize, selectedUnit]);

  // Pagination slice
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.attendanceStatus === 'Present').length;
    const absent = records.filter((r) => r.attendanceStatus === 'Absent').length;
    const excused = records.filter((r) => r.attendanceStatus === 'Excused').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, excused, rate };
  }, [records]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Student Name', 'Registration Number', 'Unit Code', 'Course Code', 'Venue', 'Status', 'Date Marked', 'Time Marked'];
    const rows = filteredRecords.map((r) => [
      r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentRegistrationNumber,
      r.studentRegistrationNumber,
      r.unitCode,
      r.courseCode,
      r.venue || 'N/A',
      r.attendanceStatus,
      new Date(r.dateMarked).toLocaleDateString(),
      r.timeMarked || 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BUK_Attendance_${selectedUnit}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-buk-navy" />
            <span>Attendance Reports & Archival Audit</span>
          </h2>
          <p className="text-xs text-slate-500">
            Historical biometric attendance records, session timestamps, and institutional CSV exports
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredRecords.length} Filtered)</span>
          </button>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Logs</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Present</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{stats.present}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Absent</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{stats.absent}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-700 uppercase">Excused</span>
          <p className="text-2xl font-black text-blue-900 mt-1">{stats.excused}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Attendance Rate</span>
          <p className="text-2xl font-black text-buk-navy mt-1">{stats.rate}%</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-buk-navy" />
              <span>Course Unit</span>
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white text-slate-800"
            >
              {coursesData?.units?.map((u: any) => (
                <option key={u.id} value={u.unitCode}>
                  {u.unitCode} - {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>End Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <button
              onClick={fetchRecords}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Filter className="w-3.5 h-3.5 text-white" />
              <span className="text-white">Apply Date Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results High-Density Table with Pagination */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        {/* Table Filter Subheader */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or reg number..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-buk-navy text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            >
              <option value="ALL">All Statuses ({records.length})</option>
              <option value="Present">Present Only ({stats.present})</option>
              <option value="Absent">Absent Only ({stats.absent})</option>
              <option value="Excused">Excused Only ({stats.excused})</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-buk-navy" />
              <p className="text-xs font-semibold text-slate-500 mt-2">Loading attendance logs...</p>
            </div>
          ) : paginatedRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3.5">Student Name</th>
                    <th className="py-3 px-3.5">Registration Number</th>
                    <th className="py-3 px-3.5">Unit Code</th>
                    <th className="py-3 px-3.5">Lecture Venue</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Date Marked</th>
                    <th className="py-3 px-3.5 text-right">Time Marked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((r) => {
                    const isPresent = r.attendanceStatus === 'Present';
                    const isExcused = r.attendanceStatus === 'Excused';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                          {r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentRegistrationNumber}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-buk-navy">
                          {r.studentRegistrationNumber}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-700">
                          {r.unitCode}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {r.venue || 'Lecture Theatre'}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-800'
                                : isExcused
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPresent ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            ) : isExcused ? (
                              <Clock className="w-3 h-3 text-blue-700" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-700" />
                            )}
                            <span>{r.attendanceStatus}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {new Date(r.dateMarked).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px] text-right">
                          {r.timeMarked || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700">No attendance logs found matching this criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting a different course unit or adjusting your date range.</p>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900 font-bold">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalRecords}</strong> session records
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-500">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 text-xs">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
