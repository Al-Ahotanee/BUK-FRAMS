'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileQuestion,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Filter,
  Search,
  GraduationCap,
  Loader2,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText
} from 'lucide-react';

interface ExcuseData {
  id: number;
  reason: string;
  description: string;
  documentUrl: string | null;
  dateMissed: string;
  status: string;
  adminNotes: string | null;
  reviewedBy: string | null;
  createdAt: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
    faculty: string;
    courseCode: string;
    studentImage: string | null;
  };
  unit: {
    id: number;
    name: string;
    unitCode: string;
  };
}

export default function AdminExcusesPage() {
  const [excuses, setExcuses] = useState<ExcuseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedExcuse, setSelectedExcuse] = useState<ExcuseData | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadExcuses = async () => {
    try {
      const res = await fetch('/api/admin/excuses');
      const data = await res.json();
      if (data.status === 'success') {
        setExcuses(data.excuses || []);
      }
    } catch (err) {
      console.error('Failed to load excuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExcuses();
  }, []);

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExcuse) return;

    setActionLoading(selectedExcuse.id);
    setFeedbackMsg('');

    try {
      const res = await fetch('/api/admin/excuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedExcuse.id,
          status: actionType,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setFeedbackMsg(`Absence excuse #${selectedExcuse.id} successfully marked as ${actionType}.`);
        setSelectedExcuse(null);
        setAdminNotes('');
        await loadExcuses();
      }
    } catch (err) {
      console.error('Decision error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const counts = useMemo(() => {
    return {
      total: excuses.length,
      pending: excuses.filter((e) => e.status === 'PENDING').length,
      approved: excuses.filter((e) => e.status === 'APPROVED').length,
      rejected: excuses.filter((e) => e.status === 'REJECTED').length,
    };
  }, [excuses]);

  const filteredExcuses = useMemo(() => {
    return excuses.filter((e) => {
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        e.student.registrationNumber.toLowerCase().includes(q) ||
        `${e.student.firstName} ${e.student.lastName}`.toLowerCase().includes(q) ||
        e.unit.unitCode.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [excuses, statusFilter, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  // Pagination Slice
  const totalRecords = filteredExcuses.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedExcuses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExcuses.slice(start, start + pageSize);
  }, [filteredExcuses, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading absence waiver requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-buk-navy" />
            <span>Absence Excuses & Examination Waiver Terminal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional verification of medical notes, official excuses, and 70% threshold compliance waivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {counts.pending} Awaiting Decision
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Submissions</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending Review</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{counts.pending}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Approved Waivers</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{counts.approved}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Rejected Requests</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{counts.rejected}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, reg no, unit, reason..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-buk-navy text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy focus:outline-none"
              >
                <option value="ALL">All Statuses ({counts.total})</option>
                <option value="PENDING">Pending Review ({counts.pending})</option>
                <option value="APPROVED">Approved Waivers ({counts.approved})</option>
                <option value="REJECTED">Rejected Requests ({counts.rejected})</option>
              </select>
            </div>
          </div>
        </div>

        {/* High-Density Scalable Data Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          {paginatedExcuses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3.5">Student</th>
                    <th className="py-3 px-3.5">Registration No</th>
                    <th className="py-3 px-3.5">Course Unit</th>
                    <th className="py-3 px-3.5">Category & Reason</th>
                    <th className="py-3 px-3.5">Date Missed</th>
                    <th className="py-3 px-3.5">Submitted</th>
                    <th className="py-3 px-3.5">Proof File</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExcuses.map((excuse) => (
                    <tr key={excuse.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {excuse.student.studentImage ? (
                            <img
                              src={excuse.student.studentImage}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-buk-navy/10 text-buk-navy flex items-center justify-center font-bold text-xs shrink-0">
                              {excuse.student.firstName?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {excuse.student.firstName} {excuse.student.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Faculty of {excuse.student.faculty}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 font-mono font-bold text-buk-navy">
                        {excuse.student.registrationNumber}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-slate-800">{excuse.unit.unitCode}</span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{excuse.unit.name}</p>
                      </td>

                      <td className="py-2.5 px-3.5 max-w-[180px]">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] mb-0.5">
                          {excuse.reason}
                        </span>
                        <p className="text-[11px] text-slate-600 truncate" title={excuse.description}>
                          {excuse.description}
                        </p>
                      </td>

                      <td className="py-2.5 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(excuse.dateMissed).toLocaleDateString()}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                        {new Date(excuse.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {excuse.documentUrl ? (
                          <a
                            href={excuse.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Proof</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None attached</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            excuse.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : excuse.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {excuse.status === 'APPROVED' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : excuse.status === 'REJECTED' ? (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{excuse.status}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {excuse.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedExcuse(excuse);
                                setActionType('APPROVED');
                                setAdminNotes('Medical certificate verified. Full attendance waiver approved.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExcuse(excuse);
                                setActionType('REJECTED');
                                setAdminNotes('Insufficient medical documentation provided.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {excuse.reviewedBy ? `By ${excuse.reviewedBy}` : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No excuse requests match current filter</h4>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or changing the status selector.</p>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900 font-bold">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalRecords}</strong> requests
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-500">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
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
      </div>

      {/* Decision Confirmation Modal */}
      {selectedExcuse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                actionType === 'APPROVED' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <h3 className="font-bold text-sm text-white">
                {actionType === 'APPROVED' ? 'Confirm Absence Waiver Approval' : 'Reject Absence Excuse'}
              </h3>
              <button
                onClick={() => setSelectedExcuse(null)}
                className="text-white hover:text-white/80 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDecision} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Student:{' '}
                  <span className="font-bold text-slate-900">
                    {selectedExcuse.student.firstName} {selectedExcuse.student.lastName} (
                    {selectedExcuse.student.registrationNumber})
                  </span>
                  <br />
                  Unit: <span className="font-bold text-slate-900">{selectedExcuse.unit.unitCode}</span>
                </p>
                {actionType === 'APPROVED' && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    Approving this request will automatically record an &quot;Excused&quot; attendance record, restoring the student&apos;s 70% exam clearance status.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Review Notes:
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-buk-navy text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedExcuse(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 ${
                    actionType === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading !== null && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span className="text-white">{actionType === 'APPROVED' ? 'Approve Waiver' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
