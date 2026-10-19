'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Camera, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      const json = await res.json();
      if (json.status === 'success') {
        setStudents(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id: number, regNo: string) => {
    if (!confirm(`Delete student ${regNo}? All attendance and face data will be removed.`)) return;

    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchStudents();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Enrolled Students</h2>
          <p className="text-xs text-slate-500">
            Registered students, facial recognition status, and enrolled curriculum units
          </p>
        </div>

        <Link
          href="/admin/students/enroll"
          className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>Enroll New Student with Face AI</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-buk-navy" />
          <span>Student Directory ({students.length})</span>
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 font-semibold">Photo</th>
                  <th className="py-2.5 font-semibold">Student Name</th>
                  <th className="py-2.5 font-semibold">Reg Number</th>
                  <th className="py-2.5 font-semibold">Email</th>
                  <th className="py-2.5 font-semibold">Programme</th>
                  <th className="py-2.5 font-semibold">Face AI Status</th>
                  <th className="py-2.5 font-semibold">Enrolled Units</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const hasFace = Boolean(s.faceDescriptors);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3">
                        {s.studentImage ? (
                          <img
                            src={s.studentImage}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {s.firstName?.[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="py-3 font-mono font-bold text-buk-navy">{s.registrationNumber}</td>
                      <td className="py-3 text-slate-600 font-mono text-[11px]">{s.email}</td>
                      <td className="py-3 text-slate-600">{s.courseCode || '-'}</td>
                      <td className="py-3">
                        {hasFace ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>128-d Vector Enrolled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            <span>Needs Face Scan</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">
                        {s.unitAssignments && s.unitAssignments.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium">
                            {s.unitAssignments.length} unit(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(s.id, s.registrationNumber)}
                          title="Delete Student"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-xs py-8 text-center">No students registered yet.</p>
        )}
      </div>
    </div>
  );
}
