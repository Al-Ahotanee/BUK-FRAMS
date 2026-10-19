'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function FacultiesPage() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchFaculties = async () => {
    try {
      const res = await fetch('/api/admin/faculties');
      const json = await res.json();
      if (json.status === 'success') {
        setFaculties(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/faculties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyName: name, facultyCode: code }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setName('');
        setCode('');
        fetchFaculties();
      } else {
        setError(data.message || 'Failed to create faculty');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this faculty? All associated courses will also be deleted.')) return;

    try {
      const res = await fetch(`/api/admin/faculties?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchFaculties();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">BUK Faculties & Colleges</h2>
        <p className="text-xs text-slate-500">Manage university faculties, acronyms, and departments</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Create Faculty Form */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-buk-gold" />
            <span>Register New Faculty</span>
          </h3>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Faculty of Computer Science & IT"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty Code / Acronym</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. FCSIT"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Add Faculty</span>}
            </button>
          </form>
        </div>

        {/* Faculties Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-buk-navy" />
            <span>Enrolled BUK Faculties ({faculties.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : faculties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Faculty Name</th>
                    <th className="py-2.5 font-semibold">Code</th>
                    <th className="py-2.5 font-semibold">Programmes</th>
                    <th className="py-2.5 font-semibold">Venues</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faculties.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">{f.facultyName}</td>
                      <td className="py-3 font-mono font-bold text-buk-navy">{f.facultyCode}</td>
                      <td className="py-3 text-slate-600">{f._count?.courses ?? 0}</td>
                      <td className="py-3 text-slate-600">{f._count?.venues ?? 0}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(f.id)}
                          title="Delete Faculty"
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
            <p className="text-slate-400 text-xs py-8 text-center">No faculties registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
