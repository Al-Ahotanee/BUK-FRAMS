'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [resC, resF] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/faculties'),
      ]);
      const jsonC = await resC.json();
      const jsonF = await resF.json();

      if (jsonC.status === 'success') setCourses(jsonC.data);
      if (jsonF.status === 'success') setFaculties(jsonF.data);
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
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, courseCode, facultyId }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setName('');
        setCourseCode('');
        setFacultyId('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create programme');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this programme?')) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
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
        <h2 className="text-xl font-extrabold text-slate-900">Academic Programmes</h2>
        <p className="text-xs text-slate-500">Degree programmes offered across Bayero University faculties</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-buk-gold" />
            <span>Add New Programme</span>
          </h3>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Programme Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. B.Sc. Computer Science"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Programme Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. B.Sc. CSC"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parent Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
              >
                <option value="">Select Faculty</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facultyName} ({f.facultyCode})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register Programme</span>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-buk-navy" />
            <span>Enrolled Programmes ({courses.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : courses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Programme Title</th>
                    <th className="py-2.5 font-semibold">Code</th>
                    <th className="py-2.5 font-semibold">Faculty</th>
                    <th className="py-2.5 font-semibold">Units</th>
                    <th className="py-2.5 font-semibold">Students</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">{c.name}</td>
                      <td className="py-3 font-mono font-bold text-buk-navy">{c.courseCode}</td>
                      <td className="py-3 text-slate-600">{c.faculty?.facultyCode || '-'}</td>
                      <td className="py-3 text-slate-600">{c._count?.units ?? 0}</td>
                      <td className="py-3 text-slate-600">{c._count?.students ?? 0}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Delete Programme"
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
            <p className="text-slate-400 text-xs py-8 text-center">No programmes registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
