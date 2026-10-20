'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck2,
  Filter,
  Search,
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  FileQuestion,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AttendanceLog {
  id: number;
  studentRegistrationNumber: string;
  courseCode: string;
  unitCode: string;
  venue: string | null;
  attendanceStatus: string;
  timeMarked: string | null;
  dateMarked: string;
  unit?: {
    name: string;
  };
}

function AttendanceLedgerContent() {
  const searchParams = useSearchParams();
  const initialUnit = searchParams.get('unitCode') || '';

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState(initialUnit);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    fetch('/api/student/attendance')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setLogs(data.logs || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load attendance logs:', err);
        setLoading(false);
      });
  }, []);

  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.unitCode));
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesUnit = unitFilter === '' || log.unitCode === unitFilter;
      const matchesStatus = statusFilter === 'ALL' || log.attendanceStatus === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        log.unitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.unit?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.venue || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesUnit && matchesStatus && matchesSearch;
    });
  }, [logs, unitFilter, statusFilter, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [unitFilter, statusFilter, searchQuery, pageSize]);

  const totalRecords = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Fetching facial recognition attendance ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-buk-gold" />
            <span>Attendance Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically logged biometric presence and absence records
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-buk-navy/5 border border-buk-navy/20 text-xs font-semibold text-buk-navy">
          <Camera className="w-4 h-4 text-buk-gold" />
          <span>Verified via Neural Facial Recognition</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit, venue, or lecture..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-buk-navy text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-buk-navy"
          >
            <option value="">All Units</option>
            {uniqueUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-buk-navy"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Excused">Excused (Waiver)</option>
            <option value="Absent">Absent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">No matching attendance records</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Unit Code & Name</th>
                  <th className="py-3 px-4">Lecture Venue</th>
                  <th className="py-3 px-4">Date Recorded</th>
                  <th className="py-3 px-4">Time Scanned</th>
                  <th className="py-3 px-5 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 font-mono">{log.unitCode}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {log.unit?.name || log.courseCode}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.venue || 'BUK Central Lecture Theatre'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {new Date(log.dateMarked).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.timeMarked || '09:00 AM'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                          log.attendanceStatus === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.attendanceStatus === 'Excused'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.attendanceStatus === 'Present' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{log.attendanceStatus}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Navigation Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-slate-900 font-bold">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                  <strong className="text-slate-900 font-bold">{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
                  <strong className="text-slate-900 font-bold">{totalRecords}</strong> records
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
        )}
      </div>
    </div>
  );
}

export default function StudentAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        </div>
      }
    >
      <AttendanceLedgerContent />
    </Suspense>
  );
}
