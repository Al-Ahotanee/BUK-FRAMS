'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Camera, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

interface StudentRecord {
  id: number;
  firstName: string;
  lastName: string;
  registrationNumber: string;
  email: string;
  faculty: string;
  courseCode: string;
  studentImage?: string | null;
  faceDescriptors?: any;
  course?: {
    name: string;
    courseCode: string;
    faculty?: { facultyName: string; facultyCode: string };
  };
  unitAssignments?: Array<{ unit: { unitCode: string; name: string } }>;
  _count?: { attendances: number };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [faceFilter, setFaceFilter] = useState<'ALL' | 'ENROLLED' | 'MISSING'>('ALL');
  const [sortField, setSortField] = useState<'regNo' | 'name'>('regNo');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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
    if (!confirm(`Are you sure you want to delete student ${regNo}? All attendance logs and biometric vectors will be permanently removed.`)) return;

    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchStudents();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Network error while deleting student');
    }
  };

  // Extract unique faculties
  const faculties = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const fac = s.course?.faculty?.facultyCode || s.faculty;
      if (fac) set.add(fac);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered & Sorted Records
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        s.registrationNumber.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.courseCode && s.courseCode.toLowerCase().includes(q));

      const fac = s.course?.faculty?.facultyCode || s.faculty || '';
      const matchesFaculty = facultyFilter === 'ALL' || fac === facultyFilter;

      const hasFace = Boolean(
        s.faceDescriptors && 
        (Array.isArray(s.faceDescriptors) ? s.faceDescriptors.length > 0 : true)
      );
      const matchesFace =
        faceFilter === 'ALL' ||
        (faceFilter === 'ENROLLED' && hasFace) ||
        (faceFilter === 'MISSING' && !hasFace);

      return matchesSearch && matchesFaculty && matchesFace;
    }).sort((a, b) => {
      if (sortField === 'regNo') {
        return sortAsc
          ? a.registrationNumber.localeCompare(b.registrationNumber)
          : b.registrationNumber.localeCompare(a.registrationNumber);
      } else {
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
    });
  }, [students, searchQuery, facultyFilter, faceFilter, sortField, sortAsc]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, facultyFilter, faceFilter, pageSize]);

  // Pagination Slice
  const totalRecords = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;

    const headers = [
      'Registration Number',
      'First Name',
      'Last Name',
      'Email',
      'Faculty',
      'Programme',
      'Face Vector Status',
      'Enrolled Units Count',
      'Attendance Count',
    ];

    const rows = filteredStudents.map((s) => {
      const hasFace = Boolean(s.faceDescriptors);
      return [
        s.registrationNumber,
        s.firstName,
        s.lastName,
        s.email,
        s.course?.faculty?.facultyCode || s.faculty || 'BUK',
        s.courseCode || s.course?.courseCode || 'N/A',
        hasFace ? 'Enrolled (128-d)' : 'Not Enrolled',
        s.unitAssignments?.length || 0,
        s._count?.attendances || 0,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `BUK_Student_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const enrolledCount = students.filter((s) => Boolean(s.faceDescriptors)).length;
  const missingCount = students.length - enrolledCount;

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-buk-navy" />
            <span>Bayero University Kano Student Registry</span>
          </h2>
          <p className="text-xs text-slate-500">
            Institutional student directory, 128-dimensional facial biometric status, and curriculum allocations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredStudents.length === 0}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV ({filteredStudents.length})</span>
          </button>

          <Link
            href="/admin/students/enroll"
            className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Enroll Student Face AI</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Students</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{students.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Biometrics Active</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{enrolledCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Missing Face AI</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{missingCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Faculties Represented</span>
          <p className="text-2xl font-black text-buk-navy mt-1">{faculties.length}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Reg No, Name, Email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-buk-navy text-slate-800 focus:outline-none"
            />
          </div>

          {/* Faculty Filter */}
          <div>
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            >
              <option value="ALL">All Faculties ({faculties.length})</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  Faculty of {f}
                </option>
              ))}
            </select>
          </div>

          {/* Biometric Status Filter */}
          <div>
            <select
              value={faceFilter}
              onChange={(e) => setFaceFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            >
              <option value="ALL">All Biometric Statuses</option>
              <option value="ENROLLED">Enrolled with 128-D Vector ({enrolledCount})</option>
              <option value="MISSING">Missing Biometrics ({missingCount})</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy focus:outline-none"
            >
              <option value="regNo">Sort: Reg Number</option>
              <option value="name">Sort: Student Name</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title={sortAsc ? 'Ascending Order' : 'Descending Order'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* High-Density Enterprise Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-buk-navy" />
              <p className="text-xs font-semibold text-slate-500 mt-2">Loading BUK student directory...</p>
            </div>
          ) : paginatedStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3.5">Photo</th>
                    <th className="py-3 px-3.5">Registration Number</th>
                    <th className="py-3 px-3.5">Student Name</th>
                    <th className="py-3 px-3.5">University Email</th>
                    <th className="py-3 px-3.5">Faculty & Programme</th>
                    <th className="py-3 px-3.5">Face Biometric Status</th>
                    <th className="py-3 px-3.5">Allocated Units</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((s) => {
                    const hasFace = Boolean(
                      s.faceDescriptors && 
                      (Array.isArray(s.faceDescriptors) ? s.faceDescriptors.length > 0 : true)
                    );
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3.5">
                          {s.studentImage ? (
                            <img
                              src={s.studentImage}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-buk-navy/10 text-buk-navy flex items-center justify-center font-bold text-xs border border-buk-navy/20">
                              {s.firstName?.[0]}
                              {s.lastName?.[0]}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-buk-navy">
                          {s.registrationNumber}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                          {s.email}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-semibold text-slate-800">{s.courseCode || s.course?.courseCode || '-'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Faculty: {s.course?.faculty?.facultyCode || s.faculty || 'BUK'}
                          </p>
                        </td>
                        <td className="py-2.5 px-3.5">
                          {hasFace ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>128-D Enrolled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Missing Face</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {s.unitAssignments?.length || 0} Units
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            onClick={() => handleDelete(s.id, s.registrationNumber)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Student"
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
            <div className="py-12 text-center text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700">No students found matching your criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search keywords</p>
            </div>
          )}

          {/* Pagination Navigation Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900 font-bold">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(totalRecords, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalRecords}</strong> students
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-500">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 text-xs">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
