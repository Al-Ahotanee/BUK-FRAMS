'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileQuestion,
  Plus,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ExcuseItem {
  id: number;
  reason: string;
  description: string;
  documentUrl: string | null;
  dateMissed: string;
  status: string; // PENDING, APPROVED, REJECTED
  adminNotes: string | null;
  reviewedBy: string | null;
  createdAt: string;
  unit: {
    unitCode: string;
    name: string;
  };
}

interface EnrolledCourse {
  unitId: number;
  unitCode: string;
  unitName: string;
}

export default function StudentExcusesPage() {
  const [excuses, setExcuses] = useState<ExcuseItem[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [unitId, setUnitId] = useState('');
  const [reason, setReason] = useState('Medical Illness');
  const [description, setDescription] = useState('');
  const [dateMissed, setDateMissed] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const [excuseRes, courseRes] = await Promise.all([
        fetch('/api/student/excuses'),
        fetch('/api/student/courses'),
      ]);

      const excuseData = await excuseRes.json();
      const courseData = await courseRes.json();

      if (excuseData.status === 'success') {
        setExcuses(excuseData.excuses || []);
      }
      if (courseData.status === 'success') {
        setCourses(courseData.courses || []);
        if (courseData.courses.length > 0 && !unitId) {
          setUnitId(String(courseData.courses[0].unitId));
        }
      }
    } catch (err) {
      console.error('Failed to load excuse data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      let documentUrl: string | null = null;

      // 1. Upload file to S3 / Cloud storage if provided
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'medical_excuses');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.status === 'success') {
          documentUrl = uploadData.url;
        } else {
          setErrorMsg(uploadData.message || 'Failed to upload supporting document.');
          setSubmitting(false);
          return;
        }
      }

      // 2. Submit excuse request
      const res = await fetch('/api/student/excuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: Number(unitId),
          reason,
          description,
          documentUrl,
          dateMissed,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        setErrorMsg(data.message || 'Submission failed. Please check the form.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Absence excuse and waiver request submitted successfully!');
      setShowModal(false);
      setDescription('');
      setFile(null);
      await loadData();
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
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
            <span>Absence Excuses & Waiver Requests</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit medical proofs, official leave notices, and request academic attendance waivers
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-buk-navy text-white text-xs font-bold rounded-xl hover:bg-buk-navy-light transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Excuse Request</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Filed</span>
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
          <span className="text-[11px] font-semibold text-rose-700 uppercase">Rejected</span>
          <p className="text-xl font-black text-rose-900 mt-0.5">{counts.rejected}</p>
        </div>
      </div>

      {/* Excuses History List */}
      <div className="space-y-4">
        {excuses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Excuse Requests Filed</h3>
            <p className="text-xs text-slate-400 mt-1">
              If you have missed or will miss a mandatory lecture due to illness or university duty,
              click &quot;New Excuse Request&quot; above.
            </p>
          </div>
        ) : (
          excuses.map((excuse) => (
            <div
              key={excuse.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-buk-navy/10 font-mono font-bold text-xs text-buk-navy">
                      {excuse.unit.unitCode}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{excuse.reason}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Missed: {new Date(excuse.dateMissed).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{excuse.unit.name}</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {excuse.description}
                  </p>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 sm:text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
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
                  <p className="text-[10px] text-slate-400 mt-1">
                    Filed on {new Date(excuse.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Document Link & Admin Review Notes */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {excuse.documentUrl ? (
                  <a
                    href={excuse.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-buk-navy font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Attached Proof (Stored in Cloud Storage)</span>
                  </a>
                ) : (
                  <span className="text-slate-400">No medical certificate attached</span>
                )}

                {excuse.adminNotes && (
                  <div className="text-[11px] text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                    <span className="font-bold text-slate-700">Reviewer Note: </span>
                    <span>{excuse.adminNotes}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Excuse Request */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-buk-navy text-white flex items-center justify-between border-b-2 border-buk-gold">
              <div>
                <h3 className="font-bold text-sm">Request Absence Waiver</h3>
                <p className="text-[11px] text-slate-300">Bayero University Kano Academic Board</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Select Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Unit Missed *
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy"
                >
                  {courses.map((c) => (
                    <option key={c.unitId} value={c.unitId}>
                      {c.unitCode} - {c.unitName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Missed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Missed Lecture *
                  </label>
                  <input
                    type="date"
                    value={dateMissed}
                    onChange={(e) => setDateMissed(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason Category *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy"
                  >
                    <option value="Medical Illness">Medical Illness (Hospitalized)</option>
                    <option value="Compassionate / Bereavement">Compassionate / Family Emergency</option>
                    <option value="University Representation">Official University Duty/Sports</option>
                    <option value="Examination Clash">Examination Clash</option>
                    <option value="Other Valid Reason">Other Academic Reason</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Explanation *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="State the circumstances of your absence, medical facility name, or official engagement details..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy text-slate-800"
                />
              </div>

              {/* File Upload to S3 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Supporting Proof (Medical Certificate / Official Letter)
                </label>
                <div className="mt-1 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-buk-navy transition-colors bg-slate-50">
                  <input
                    type="file"
                    id="docUpload"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="docUpload" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-buk-navy mx-auto mb-1.5" />
                    {file ? (
                      <p className="text-xs font-bold text-buk-navy">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-700">
                          Click to upload document or drag and drop
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          PDF, PNG, JPG up to 10MB &bull; Stored in S3 Object Storage
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-buk-gold text-buk-navy font-bold text-xs hover:bg-buk-gold-dark transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Uploading to S3...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
