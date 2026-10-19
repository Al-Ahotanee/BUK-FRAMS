'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Filter, Loader2, CheckCircle2 } from 'lucide-react';

export default function LecturerReportsPage() {
  const [coursesData, setCoursesData] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchRecords = async () => {
    if (!selectedUnit) return;
    setLoading(true);

    try {
      let url = `/api/lecturer/attendance?unitCode=${encodeURIComponent(selectedUnit)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        setRecords(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      fetchRecords();
    }
  }, [selectedUnit]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (records.length === 0) return;

    const headers = ['Student Name', 'Registration Number', 'Unit Code', 'Course Code', 'Venue', 'Status', 'Date Marked', 'Time Marked'];
    const rows = records.map((r) => [
      r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentRegistrationNumber,
      r.studentRegistrationNumber,
      r.unitCode,
      r.courseCode,
      r.venue || 'N/A',
      r.attendanceStatus,
      new Date(r.dateMarked).toLocaleDateString(),
      r.timeMarked || 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BUK_Attendance_${selectedUnit}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Attendance Reports & Exports</h2>
          <p className="text-xs text-slate-500">
            Historical attendance records across lecture sessions and CSV export
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel / CSV ({records.length} Records)</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="grid sm:grid-cols-4 gap-4 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Course Unit</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-buk-navy focus:outline-none bg-white"
            >
              {coursesData?.units?.map((u: any) => (
                <option key={u.id} value={u.unitCode}>
                  {u.unitCode} - {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            />
          </div>

          <div>
            <button
              onClick={fetchRecords}
              className="w-full py-2 px-4 rounded-xl font-bold bg-buk-navy hover:bg-buk-navy-light text-white transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-buk-navy" />
          <span>Attendance Sessions Log ({records.length})</span>
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 font-semibold">Student Name</th>
                  <th className="py-2.5 font-semibold">Reg Number</th>
                  <th className="py-2.5 font-semibold">Unit Code</th>
                  <th className="py-2.5 font-semibold">Venue</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Date</th>
                  <th className="py-2.5 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-800">
                      {r.student ? `${r.student.firstName} ${r.student.lastName}` : r.studentRegistrationNumber}
                    </td>
                    <td className="py-3 font-mono font-bold text-buk-navy">{r.studentRegistrationNumber}</td>
                    <td className="py-3 font-bold text-slate-700">{r.unitCode}</td>
                    <td className="py-3 text-slate-600">{r.venue || 'Classroom'}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{r.attendanceStatus}</span>
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(r.dateMarked).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {r.timeMarked || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-xs py-8 text-center">No attendance logs found for this filter criteria.</p>
        )}
      </div>
    </div>
  );
}
