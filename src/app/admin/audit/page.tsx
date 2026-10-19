'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  GraduationCap,
  Camera,
  Loader2,
} from 'lucide-react';

interface AuditLogItem {
  id: number;
  actorRole: string;
  actorEmail: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setLogs(data.logs || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Audit load error:', err);
        setLoading(false);
      });
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesRole = roleFilter === 'ALL' || log.actorRole === roleFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [logs, roleFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading enterprise audit trail...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-buk-gold" />
            <span>Enterprise Compliance Audit Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system activity ledger recording administrative actions, logins, and attendance waivers
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <Clock className="w-4 h-4 text-buk-navy" />
          <span>ISO 27001 Audit Ready</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, email, or keyword..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-buk-navy"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-buk-navy"
          >
            <option value="ALL">All Roles ({logs.length})</option>
            <option value="ADMIN">Admin Actions</option>
            <option value="LECTURER">Lecturer Actions</option>
            <option value="STUDENT">Student Actions</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No audit events found</h4>
            <p className="text-xs text-slate-400 mt-1">Actions performed across the portal will be recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-5">Details</th>
                  <th className="py-3 px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            item.actorRole === 'ADMIN'
                              ? 'bg-buk-navy text-buk-gold'
                              : item.actorRole === 'LECTURER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.actorRole === 'ADMIN' ? (
                            <Shield className="w-3.5 h-3.5" />
                          ) : item.actorRole === 'LECTURER' ? (
                            <Camera className="w-3.5 h-3.5" />
                          ) : (
                            <GraduationCap className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">{item.actorEmail}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {item.actorRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-buk-navy text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100">
                        {item.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-slate-600 max-w-md">
                      <p className="text-[11px] leading-relaxed">{item.details || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                      {item.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
