'use client';

import React, { useEffect, useState } from 'react';
import { Link2, UserCheck, GraduationCap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function AssignmentsPage() {
  const [tab, setTab] = useState<'lecturer' | 'student'>('lecturer');
  const [units, setUnits] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  const fetchData = async () => {
    try {
      const [resU, resL, resS] = await Promise.all([
        fetch('/api/admin/units'),
        fetch('/api/admin/lecturers'),
        fetch('/api/admin/students'),
      ]);
      const jsonU = await resU.json();
      const jsonL = await resL.json();
      const jsonS = await resS.json();

      if (jsonU.status === 'success') setUnits(jsonU.data);
      if (jsonL.status === 'success') setLecturers(jsonL.data);
      if (jsonS.status === 'success') setStudents(jsonS.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLecturerAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lecturer',
          unitId: selectedUnit,
          lecturerId: selectedLecturer,
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setMessage({ text: data.message || 'Unit assigned successfully!', type: 'success' });
        fetchData();
      } else {
        setMessage({ text: data.message || 'Assignment failed', type: 'danger' });
      }
    } catch {
      setMessage({ text: 'Network communication error', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'students',
          unitId: selectedUnit,
          studentIds: selectedStudentIds,
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setMessage({ text: data.message || 'Students enrolled successfully!', type: 'success' });
        setSelectedStudentIds([]);
        fetchData();
      } else {
        setMessage({ text: data.message || 'Assignment failed', type: 'danger' });
      }
    } catch {
      setMessage({ text: 'Network communication error', type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStudent = (id: number) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Curriculum Assignments</h2>
        <p className="text-xs text-slate-500">
          Assign course units to academic lecturers and enroll students for attendance tracking
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
        <button
          onClick={() => { setTab('lecturer'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'lecturer' ? 'bg-white text-buk-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-buk-gold" />
          <span>Assign Units to Lecturers</span>
        </button>

        <button
          onClick={() => { setTab('student'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'student' ? 'bg-white text-buk-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-buk-navy" />
          <span>Enroll Students into Units</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {tab === 'lecturer' ? (
        /* Lecturer Assignment View */
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-buk-gold" />
              <span>Assign Unit to Lecturer</span>
            </h3>

            <form onSubmit={handleLecturerAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Lecturer</label>
                <select
                  value={selectedLecturer}
                  onChange={(e) => setSelectedLecturer(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
                >
                  <option value="">Select Lecturer</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} ({l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Course Unit</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
                >
                  <option value="">Select Course Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitCode} - {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Assignment</span>}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-buk-navy" />
              <span>Current Lecturer Assignments</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 font-semibold">Staff Member</th>
                    <th className="py-2 font-semibold">Allocated Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lecturers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">
                        {l.firstName} {l.lastName}
                        <p className="text-[10px] text-slate-400 font-mono font-normal">{l.email}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {l.unitAssignments && l.unitAssignments.length > 0 ? (
                            l.unitAssignments.map((ua: any) => (
                              <span
                                key={ua.id}
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-buk-navy text-white"
                              >
                                {ua.unit.unitCode} &bull; {ua.unit.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">No units assigned</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Student Unit Enrollment View */
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <form onSubmit={handleStudentAssign} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Course Unit for Enrollment
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
                >
                  <option value="">Choose Unit...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitCode} - {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting || selectedStudentIds.length === 0 || !selectedUnit}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-buk-gold hover:bg-buk-gold-dark text-buk-navy transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Enroll Selected ({selectedStudentIds.length}) into Unit</span>
                  )}
                </button>
              </div>
            </div>

            {/* Student Checkbox Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Select Students to Enroll ({selectedStudentIds.length} of {students.length} selected)
                </span>
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="text-xs font-bold text-buk-navy hover:text-buk-gold-dark"
                >
                  {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All Students'}
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-4 w-10"></th>
                      <th className="py-2.5 font-semibold">Student Name</th>
                      <th className="py-2.5 font-semibold">Reg Number</th>
                      <th className="py-2.5 font-semibold">Programme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => {
                      const checked = selectedStudentIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleStudent(s.id)}
                          className={`cursor-pointer hover:bg-slate-50 ${checked ? 'bg-buk-gold/10' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-buk-navy focus:ring-buk-navy"
                            />
                          </td>
                          <td className="py-3 font-semibold text-slate-800">
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="py-3 font-mono font-bold text-buk-navy">{s.registrationNumber}</td>
                          <td className="py-3 text-slate-600">{s.courseCode || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
