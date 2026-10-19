'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, Send, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

export default function LecturerNotificationsPage() {
  const [coursesData, setCoursesData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch('/api/lecturer/courses');
        const json = await res.json();
        if (json.status === 'success') {
          setCoursesData(json.data);
          if (json.data.units?.[0]) {
            setSelectedUnit(json.data.units[0].unitCode);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadInitial();
  }, []);

  const fetchDefaulters = async () => {
    if (!selectedUnit) return;
    setLoading(true);
    setSentMessage(null);

    try {
      const res = await fetch(`/api/lecturer/notify?unitCode=${encodeURIComponent(selectedUnit)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setDefaulters(json.defaulters);
        setTotalSessions(json.totalSessions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      fetchDefaulters();
    }
  }, [selectedUnit]);

  const handleSendWarnings = async () => {
    if (defaulters.length === 0) return;
    setSending(true);

    try {
      const res = await fetch('/api/lecturer/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: selectedUnit,
          students: defaulters,
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setSentMessage(data.message || 'Warning notices dispatched successfully!');
      } else {
        alert(data.message || 'Error sending notices');
      }
    } catch (err) {
      console.error(err);
      alert('Communication error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Attendance Defaulter Warning System</h2>
          <p className="text-xs text-slate-500">
            Automated monitoring for students falling below the mandatory BUK 70% threshold
          </p>
        </div>

        {defaulters.length > 0 && (
          <button
            onClick={handleSendWarnings}
            disabled={sending}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Dispatch Notices to Defaulters ({defaulters.length})</span>
          </button>
        )}
      </div>

      {sentMessage && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-900 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
          <span>{sentMessage}</span>
        </div>
      )}

      {/* Selector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="max-w-md">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Course Unit</label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
          >
            {coursesData?.units?.map((u: any) => (
              <option key={u.id} value={u.unitCode}>
                {u.unitCode} - {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Defaulter Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Students Below 70% Threshold ({defaulters.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Total Sessions Held: {totalSessions}
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : defaulters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 font-semibold">Student Name</th>
                  <th className="py-2.5 font-semibold">Reg Number</th>
                  <th className="py-2.5 font-semibold">Email</th>
                  <th className="py-2.5 font-semibold">Sessions Present</th>
                  <th className="py-2.5 font-semibold">Attendance Rate</th>
                  <th className="py-2.5 font-semibold">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.map((d) => (
                  <tr key={d.id} className="hover:bg-red-50/40">
                    <td className="py-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-3 font-mono font-bold text-buk-navy">{d.registrationNumber}</td>
                    <td className="py-3 font-mono text-slate-500 text-[11px]">{d.email}</td>
                    <td className="py-3 text-slate-700">
                      {d.presentCount} of {d.totalSessions} sessions
                    </td>
                    <td className="py-3 font-extrabold text-red-600 font-mono text-sm">
                      {d.percentage}%
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Examination Bar Risk</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-buk-green opacity-70" />
            <p className="font-semibold text-slate-700">All Students Meeting Attendance Quota!</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Every enrolled student currently maintains 70% or higher attendance in this unit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
