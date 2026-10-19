'use client';

import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2, Loader2, AlertCircle, Phone, Mail } from 'lucide-react';

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('@lecturer_');
  const [phoneNo, setPhoneNo] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [resL, resF] = await Promise.all([
        fetch('/api/admin/lecturers'),
        fetch('/api/admin/faculties'),
      ]);
      const jsonL = await resL.json();
      const jsonF = await resF.json();

      if (jsonL.status === 'success') setLecturers(jsonL.data);
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
      const res = await fetch('/api/admin/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, phoneNo, facultyId }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhoneNo('');
        setFacultyId('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create lecturer');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lecturer?')) return;
    try {
      const res = await fetch(`/api/admin/lecturers?id=${id}`, { method: 'DELETE' });
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
        <h2 className="text-xl font-extrabold text-slate-900">Academic Teaching Staff</h2>
        <p className="text-xs text-slate-500">Manage lecturer profiles, faculty departments, and portal credentials</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-buk-gold" />
            <span>Add Teaching Staff</span>
          </h3>

          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Dr. Mark"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Ibrahim"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lecturer@buk.edu.ng"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="@lecturer_"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="+234 803 123 4567"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-buk-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register Staff</span>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-buk-navy" />
            <span>Enrolled Lecturers ({lecturers.length})</span>
          </h3>

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : lecturers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Staff Name</th>
                    <th className="py-2.5 font-semibold">Email</th>
                    <th className="py-2.5 font-semibold">Faculty</th>
                    <th className="py-2.5 font-semibold">Assigned Units</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lecturers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">
                        {l.firstName} {l.lastName}
                      </td>
                      <td className="py-3 text-slate-600 font-mono text-[11px]">{l.email}</td>
                      <td className="py-3 text-slate-600">{l.facultyCode || '-'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {l.unitAssignments && l.unitAssignments.length > 0 ? (
                            l.unitAssignments.map((ua: any) => (
                              <span
                                key={ua.id}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-buk-navy/10 text-buk-navy"
                              >
                                {ua.unit.unitCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(l.id)}
                          title="Delete Lecturer"
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
            <p className="text-slate-400 text-xs py-8 text-center">No lecturers registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
