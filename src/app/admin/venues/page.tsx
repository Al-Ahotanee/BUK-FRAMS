'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function VenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [capacity, setCapacity] = useState('80');
  const [classification, setClassification] = useState('Lecture Theatre');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [resV, resF] = await Promise.all([
        fetch('/api/admin/venues'),
        fetch('/api/admin/faculties'),
      ]);
      const jsonV = await resV.json();
      const jsonF = await resF.json();

      if (jsonV.status === 'success') setVenues(jsonV.data);
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
      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, facultyId, capacity, classification }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setClassName('');
        setFacultyId('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create venue');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    try {
      const res = await fetch(`/api/admin/venues?id=${id}`, { method: 'DELETE' });
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
        <h2 className="text-xl font-extrabold text-slate-900">Lecture Halls & Venues</h2>
        <p className="text-xs text-slate-500">Configure lecture theatres, auditoriums, and laboratory spaces</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-buk-gold" />
            <span>Add Venue</span>
          </h3>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Venue / Hall Name</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Twin Lecture Theatre 1"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty / Zone</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
              >
                <option value="">General University Venue</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facultyName} ({f.facultyCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capacity (Seats)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="100"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Classification</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
              >
                <option value="Lecture Theatre">Lecture Theatre</option>
                <option value="Auditorium">Auditorium</option>
                <option value="Computer Lab">Computer Lab</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register Venue</span>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-buk-navy" />
            <span>Campus Venues ({venues.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : venues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Venue Name</th>
                    <th className="py-2.5 font-semibold">Faculty</th>
                    <th className="py-2.5 font-semibold">Capacity</th>
                    <th className="py-2.5 font-semibold">Classification</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venues.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">{v.className}</td>
                      <td className="py-3 text-slate-600">{v.facultyCode || 'General'}</td>
                      <td className="py-3 text-slate-600 font-mono">{v.capacity} seats</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                          {v.classification}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          title="Delete Venue"
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
            <p className="text-slate-400 text-xs py-8 text-center">No venues registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
