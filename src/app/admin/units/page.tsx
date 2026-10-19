'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [resU, resC] = await Promise.all([
        fetch('/api/admin/units'),
        fetch('/api/admin/courses'),
      ]);
      const jsonU = await resU.json();
      const jsonC = await resC.json();

      if (jsonU.status === 'success') setUnits(jsonU.data);
      if (jsonC.status === 'success') setCourses(jsonC.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, unitCode, courseId }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setName('');
        setUnitCode('');
        setCourseId('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create unit');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course unit?')) return;
    try {
      const res = await fetch(`/api/admin/units?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') fetchData();
      else alert(data.message || 'Delete failed');
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Curriculum Course Units</h2>
        <p className="text-xs text-slate-500">Manage semester course units, codes, and credit assignments</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-buk-gold" />
            <span>Add Course Unit</span>
          </h3>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Artificial Intelligence"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Code</label>
              <input
                type="text"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                placeholder="e.g. CSC 4201"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parent Programme</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
              >
                <option value="">Select Programme</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.courseCode})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register Unit</span>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-buk-navy" />
            <span>Registered Course Units ({units.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : units.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Unit Code</th>
                    <th className="py-2.5 font-semibold">Unit Title</th>
                    <th className="py-2.5 font-semibold">Programme</th>
                    <th className="py-2.5 font-semibold">Lecturers</th>
                    <th className="py-2.5 font-semibold">Students</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-buk-navy">{u.unitCode}</td>
                      <td className="py-3 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-3 text-slate-600">{u.course?.courseCode || '-'}</td>
                      <td className="py-3 text-slate-600">{u._count?.lecturerAssignments ?? 0}</td>
                      <td className="py-3 text-slate-600">{u._count?.studentAssignments ?? 0}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(u.id)}
                          title="Delete Unit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 text-xs py-8 text-center">No units registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
