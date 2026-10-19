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
        setFeedbackMsg(`Waiver request successfully marked as ${actionType}.`);
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
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        e.student.registrationNumber.toLowerCase().includes(q) ||
        `${e.student.firstName} ${e.student.lastName}`.toLowerCase().includes(q) ||
        e.unit.unitCode.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [excuses, statusFilter, searchQuery]);

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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-buk-gold" />
            <span>Absence Excuses & Waiver Terminal</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review medical certificates, verify absence reasons, and approve examination eligibility waivers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            {counts.pending} Awaiting Review
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Submissions</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending Review</span>
          <p className="text-xl font-black text-amber-900 mt-0.5">{counts.pending}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Approved Waivers</span>
          <p className="text-xl font-black text-emerald-900 mt-0.5">{counts.approved}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Rejected Requests</span>
          <p className="text-xl font-black text-rose-900 mt-0.5">{counts.rejected}</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, reg no, or unit..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-buk-navy"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy"
          >
            <option value="ALL">All Statuses ({counts.total})</option>
            <option value="PENDING">Pending Review ({counts.pending})</option>
            <option value="APPROVED">Approved ({counts.approved})</option>
            <option value="REJECTED">Rejected ({counts.rejected})</option>
          </select>
        </div>
      </div>

      {/* Excuses Cards / List */}
      <div className="space-y-4">
        {filteredExcuses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No excuse requests match current filter</h4>
          </div>
        ) : (
          filteredExcuses.map((excuse) => (
            <div
              key={excuse.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Student Bio & Request Details */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {excuse.student.studentImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={excuse.student.studentImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        {excuse.student.firstName} {excuse.student.lastName}
                      </h4>
                      <span className="font-mono text-xs font-bold text-buk-navy px-2 py-0.5 rounded bg-slate-100">
                        {excuse.student.registrationNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {excuse.student.faculty} &bull; {excuse.student.courseCode}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-buk-navy/10 text-buk-navy font-bold font-mono text-[11px]">
                        {excuse.unit.unitCode}
                      </span>
                      <span className="font-semibold text-slate-700">{excuse.unit.name}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Missed: {new Date(excuse.dateMissed).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900 block mb-1">
                        Reason: {excuse.reason}
                      </span>
                      <p>{excuse.description}</p>
                    </div>

                    {excuse.documentUrl && (
                      <div className="mt-2.5">
                        <a
                          href={excuse.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-buk-navy hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Uploaded Medical / Official Proof (Cloud Storage)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Decision Action */}
                <div className="flex flex-col sm:items-end justify-between shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      excuse.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : excuse.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {excuse.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : excuse.status === 'REJECTED' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{excuse.status}</span>
                  </span>

                  {excuse.status === 'PENDING' && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedExcuse(excuse);
                          setActionType('APPROVED');
                          setAdminNotes('Medical certificate verified. Full attendance waiver approved.');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Grant Waiver</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedExcuse(excuse);
                          setActionType('REJECTED');
                          setAdminNotes('Insufficient medical documentation provided.');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {excuse.reviewedBy && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      Reviewed by {excuse.reviewedBy}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Confirm Decision */}
      {selectedExcuse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div
              className={`p-5 text-white flex items-center justify-between ${
                actionType === 'APPROVED' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              <h3 className="font-bold text-sm">
                {actionType === 'APPROVED' ? 'Confirm Absence Waiver Approval' : 'Reject Absence Excuse'}
              </h3>
              <button
                onClick={() => setSelectedExcuse(null)}
                className="text-white/80 hover:text-white"
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
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
                  {actionLoading !== null && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionType === 'APPROVED' ? 'Approve Waiver' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
