import React, { useState } from 'react';
import { AttendanceRecord, LDLogEntry, Staff } from '../types';
import { downloadDailyReportCSV } from '../utils/storage';
import { calculateWorkingTime } from '../utils/time';
import {
  FileSpreadsheet,
  Calendar,
  Wine,
  Users,
  Award,
  Printer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  BarChart3,
  PieChart as PieIcon,
  X,
  FileText,
  Building2,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface DailyReportTabProps {
  dateStr: string;
  setDateStr: (date: string) => void;
  attendanceRecords: AttendanceRecord[];
  ldLogs: LDLogEntry[];
  staffList: Staff[];
}

export const DailyReportTab: React.FC<DailyReportTabProps> = ({
  dateStr,
  setDateStr,
  attendanceRecords,
  ldLogs,
  staffList,
}) => {
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Aggregate data per staff member
  const staffSummaryList = staffList.map((staff) => {
    const att = attendanceRecords.find((a) => a.staffId === staff.id);
    const staffLDLogs = ldLogs.filter((l) => l.staffId === staff.id);
    const totalLD = staffLDLogs.reduce((sum, l) => sum + l.amount, 0);

    const tablesSet = new Set<string>();
    staffLDLogs.forEach((l) => {
      if (l.tableNo) tablesSet.add(l.tableNo);
    });

    let statusType: 'present' | 'late' | 'absent' | 'dayoff' | 'suspended' | 'unregistered' | 'pending' = 'pending';
    if (att) {
      if (att.isAbsent) statusType = 'absent';
      else if (att.isSuspended) statusType = 'suspended';
      else if (att.isDayOff) statusType = 'dayoff';
      else if (att.isLate) statusType = 'late';
      else if (att.checkInTime) statusType = 'present';
      else statusType = 'pending';
    } else {
      statusType = 'unregistered';
    }

    return {
      staff,
      att,
      totalLD,
      assignedTables: Array.from(tablesSet),
      statusType,
    };
  });

  const groupedStaffSummary = Array.from(
    staffSummaryList.reduce((acc, item) => {
      const role = item.staff.role || 'Unassigned';
      if (!acc.has(role)) acc.set(role, []);
      acc.get(role)!.push(item);
      return acc;
    }, new Map<string, typeof staffSummaryList>())
  );

  // Calculate Overall Key Metrics
  const totalLDCount = ldLogs.reduce((sum, l) => sum + l.amount, 0);
  const lateCount = staffSummaryList.filter((s) => s.statusType === 'late').length;
  const absentCount = staffSummaryList.filter((s) => s.statusType === 'absent').length;
  const dayOffCount = staffSummaryList.filter((s) => s.statusType === 'dayoff').length;
  const suspendedCount = staffSummaryList.filter((s) => s.statusType === 'suspended').length;
  const presentCount = staffSummaryList.filter((s) => s.statusType === 'present').length;
  const workingStaffCount = presentCount + lateCount;

  // Top Seller
  const topSeller = [...staffSummaryList].sort((a, b) => b.totalLD - a.totalLD)[0];

  // Table-wise summary
  const tableSummaryMap = new Map<string, { totalLD: number; staffNames: Set<string> }>();
  ldLogs.forEach((log) => {
    const existing = tableSummaryMap.get(log.tableNo) || { totalLD: 0, staffNames: new Set<string>() };
    existing.totalLD += log.amount;
    existing.staffNames.add(log.staffName);
    tableSummaryMap.set(log.tableNo, existing);
  });

  // Chart Data Preparation
  const staffChartData = [...staffSummaryList]
    .map((s) => ({
      name: s.staff.name,
      drinks: s.totalLD,
      role: s.staff.role,
    }))
    .filter((s) => s.drinks > 0)
    .sort((a, b) => b.drinks - a.drinks);

  const pendingCount = staffSummaryList.filter((s) => s.statusType === 'pending').length;

  const attendancePieData = [
    { name: 'On Time', value: presentCount, color: '#10b981' },
    { name: 'Late', value: lateCount, color: '#f59e0b' },
    { name: 'Absent', value: absentCount, color: '#f43f5e' },
    { name: 'Day Off', value: dayOffCount, color: '#0284c7' },
    { name: 'Suspended', value: suspendedCount, color: '#f97316' },
    { name: 'Pending', value: pendingCount, color: '#94a3b8' },
  ].filter((item) => item.value > 0);

  const handleExportCSV = () => {
    downloadDailyReportCSV(dateStr);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Export Bar */}
      <div className="lounge-card rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-pink-900/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-950/80 text-pink-300 border border-pink-800/60 rounded">
              LOUNGE DAILY REPORT
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <span>Daily Report ({dateStr})</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">
            Staff Attendance &amp; Cumulative LD Sales Summary
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/80 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Export to CSV</span>
          </button>

          {/* Formal PDF Report Modal Preview Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/80 border border-purple-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-200" />
            <span>PDF Form Preview</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total LD */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total LD Sold</span>
            <Wine className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-cyan-300 font-mono">
            {totalLDCount} <span className="text-xs font-normal">drinks</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">Cumulative sales</div>
        </div>

        {/* Working Staff */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Working Staff</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-purple-300 font-mono">
            {workingStaffCount} <span className="text-xs font-normal">staff</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">On Time + Late</div>
        </div>

        {/* Top Seller */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Top Sales</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-amber-300 truncate">
            {topSeller && topSeller.totalLD > 0 ? topSeller.staff.name : '-'}
          </div>
          <div className="mt-1 text-[11px] text-amber-400/80 font-mono">
            {topSeller && topSeller.totalLD > 0 ? `${topSeller.totalLD} drinks` : 'No sales'}
          </div>
        </div>

        {/* Absent */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Absent</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-rose-300 font-mono">
            {absentCount} <span className="text-xs font-normal">staff</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-400/80 truncate">Unexcused absence</div>
        </div>

        {/* Day Off */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Day Off</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-sky-300 font-mono">
            {dayOffCount} <span className="text-xs font-normal">staff</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-400/80 truncate">Scheduled rest</div>
        </div>

        {/* Suspended */}
        <div className="lounge-card rounded-xl p-3.5 sm:p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Suspended</span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-orange-300 font-mono">
            {suspendedCount} <span className="text-xs font-normal">staff</span>
          </div>
          <div className="mt-1 text-[11px] text-orange-400/80 truncate">Work suspended</div>
        </div>
      </div>

      {/* Visual Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Staff LD Performance Ranking */}
        <div className="lg:col-span-2 lounge-card rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Staff LD Sales Ranking Chart
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Date: {dateStr}</span>
          </div>
          
          <div className="w-full pt-2 overflow-y-auto custom-scrollbar" style={{ height: '300px' }}>
            {staffChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(250, staffChartData.length * 40)}>
                <BarChart 
                  data={staffChartData} 
                  layout="vertical" 
                  margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} interval={0} />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} drinks`, 'LD Sales']}
                  />
                  <Bar dataKey="drinks" fill="#a855f7" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No LD sales recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Attendance Status Distribution */}
        <div className="lounge-card rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Attendance Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{staffSummaryList.length} Total</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {attendancePieData.length === 0 ? (
              <span className="text-slate-500 text-xs italic">No status data</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#475569',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Primary Auto-Summarized Table */}
      <div className="lounge-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-pink-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-400" />
            <span>1. Staff Attendance &amp; Total LD Summary ({dateStr})</span>
          </h3>
          <span className="text-xs text-slate-400">
            {staffSummaryList.length} staff total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-In/Out</th>
                <th className="px-4 py-3 text-center">Working Hours</th>
                <th className="px-4 py-3 text-center bg-purple-950/40 border-x border-purple-900/30">
                  Total LD
                </th>
                <th className="px-4 py-3">Assigned Tables</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {groupedStaffSummary.map(([role, roleRecords]) => (
                <React.Fragment key={role}>
                  <tr className="bg-slate-900 border-b border-slate-700">
                    <td colSpan={7} className="px-4 py-2 text-sm font-bold text-slate-300 uppercase tracking-widest border-l-2 border-purple-500">
                      {role}
                    </td>
                  </tr>
                  {roleRecords.map((item) => {
                    const { staff, att, totalLD, assignedTables, statusType } = item;

                return (
                  <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* ID */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {staff.id}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{staff.name}</span>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                      {att?.schedule || staff.defaultSchedule}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusType === 'absent' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                          <XCircle className="w-3 h-3" /> Absent
                        </span>
                      ) : statusType === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-950 text-orange-300 border border-orange-800">
                          <ShieldAlert className="w-3 h-3" /> Suspended
                        </span>
                      ) : statusType === 'dayoff' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950 text-sky-300 border border-sky-800">
                          <CheckCircle2 className="w-3 h-3" /> Day Off
                        </span>
                      ) : statusType === 'late' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Late
                        </span>
                      ) : statusType === 'present' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> On Time
                        </span>
                      ) : statusType === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Unregistered
                        </span>
                      )}
                    </td>

                    {/* CheckIn / Out */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                      {att?.checkInTime ? `${att.checkInTime} ~ ${att.checkOutTime || 'Working'}` : '-'}
                    </td>

                    {/* Working Hours */}
                    <td className="px-4 py-3 text-center whitespace-nowrap font-mono font-bold text-slate-300">
                      {(att?.checkInTime && att?.checkOutTime) ? calculateWorkingTime(att.checkInTime, att.checkOutTime) : '-'}
                    </td>

                    {/* Total LD (Highlighted) */}
                    <td className="px-4 py-3 text-center font-mono font-bold text-cyan-300 text-sm bg-purple-950/20 border-x border-purple-900/30 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 inline-block shadow-sm">
                        {totalLD} drinks
                      </span>
                    </td>

                    {/* Assigned Tables */}
                    <td className="px-4 py-3">
                      {assignedTables.length === 0 ? (
                        <span className="text-slate-600 text-[11px]">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedTables.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 text-slate-400 italic text-[11px]">
                      {att?.note || '-'}
                    </td>
                  </tr>
                );
              })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table-wise Breakdown Table */}
      <div className="lounge-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
            <Wine className="w-4 h-4 text-cyan-400" />
            <span>2. Table-wise LD Sales Breakdown</span>
          </h3>
        </div>

        {tableSummaryMap.size === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No table LD records for this date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Table No</th>
                  <th className="px-4 py-3 text-center">Total LD Sold</th>
                  <th className="px-4 py-3">Assigned Servers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Array.from(tableSummaryMap.entries()).map(([tableNo, val]) => (
                  <tr key={tableNo} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-cyan-300 font-mono whitespace-nowrap">
                      {tableNo}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-purple-300 text-sm whitespace-nowrap">
                      {val.totalLD} drinks
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(val.staffNames).map((name) => (
                          <span
                            key={name}
                            className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-200 border border-purple-800/50 text-[11px]"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formal PDF Report Modal Preview */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
            {/* Modal Header Controls (Not Printed) */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    PDF Document Form Preview
                  </h3>
                  <p className="text-xs text-slate-400">
                    Official Executive Daily Report Printable Format
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-950"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Formatted for crisp paper output & PDF generation) */}
            <div className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto flex-1 space-y-6 font-sans">
              {/* Document Header & Logo */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Wine className="w-6 h-6 text-purple-700" />
                    <h1 className="text-xl font-extrabold tracking-wider text-slate-900 uppercase">
                      GLEE ANGELS MUSIC LOUNGE
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">
                    OFFICIAL DAILY ATTENDANCE &amp; LD SALES REPORT
                  </p>
                </div>

                <div className="text-right sm:text-right text-xs text-slate-700 space-y-0.5 border-l-2 sm:border-l-0 pl-3 sm:pl-0 border-slate-300">
                  <div><strong className="text-slate-900">Report Date:</strong> {dateStr}</div>
                  <div><strong className="text-slate-900">Doc ID:</strong> GAR-{dateStr.replace(/-/g, '')}-01</div>
                  <div><strong className="text-slate-900">Generated:</strong> {new Date().toLocaleTimeString('ko-KR')}</div>
                </div>
              </div>

              {/* Executive Summary Cards in PDF */}
              <div className="grid grid-cols-6 gap-2 text-center border border-slate-300 rounded-lg p-2.5 bg-slate-50">
                <div className="border-r border-slate-300 pr-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Total LD Sales</div>
                  <div className="text-base font-black text-slate-900 font-mono">{totalLDCount}</div>
                </div>
                <div className="border-r border-slate-300 px-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Working</div>
                  <div className="text-base font-black text-slate-900 font-mono">{workingStaffCount}</div>
                </div>
                <div className="border-r border-slate-300 px-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Late</div>
                  <div className="text-base font-black text-amber-800 font-mono">{lateCount}</div>
                </div>
                <div className="border-r border-slate-300 px-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Absent</div>
                  <div className="text-base font-black text-rose-800 font-mono">{absentCount}</div>
                </div>
                <div className="border-r border-slate-300 px-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Day Off</div>
                  <div className="text-base font-black text-sky-800 font-mono">{dayOffCount}</div>
                </div>
                <div className="pl-1">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Suspended</div>
                  <div className="text-base font-black text-orange-800 font-mono">{suspendedCount}</div>
                </div>
              </div>

              {/* Section 1: Staff Attendance Matrix */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>1. Staff Attendance &amp; LD Sales Summary</span>
                </h3>

                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300">Staff ID</th>
                      <th className="p-2 border border-slate-300">Name</th>
                      <th className="p-2 border border-slate-300">Status</th>
                      <th className="p-2 border border-slate-300 whitespace-nowrap">Working Time</th>
                      <th className="p-2 border border-slate-300 text-center bg-purple-50 font-black">Total LD</th>
                      <th className="p-2 border border-slate-300">Assigned Tables</th>
                      <th className="p-2 border border-slate-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {groupedStaffSummary.map(([role, roleRecords]) => (
                      <React.Fragment key={role}>
                        <tr className="bg-slate-100">
                          <td colSpan={7} className="p-2 border border-slate-300 font-bold text-slate-800 uppercase text-[11px] bg-slate-100">
                            {role}
                          </td>
                        </tr>
                        {roleRecords.map((item) => (
                      <tr key={item.staff.id} className="text-slate-800">
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">{item.staff.id}</td>
                        <td className="p-2 border border-slate-300 font-bold">{item.staff.name}</td>
                        <td className="p-2 border border-slate-300">
                          {item.statusType === 'suspended' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-900 border border-orange-300 uppercase">
                              Suspended
                            </span>
                          ) : item.statusType === 'dayoff' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-900 border border-sky-300 uppercase">
                              Day Off
                            </span>
                          ) : item.statusType === 'absent' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-300 uppercase">
                              Absent
                            </span>
                          ) : item.statusType === 'late' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                              Late
                            </span>
                          ) : item.statusType === 'present' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                              On Time
                            </span>
                          ) : item.statusType === 'pending' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 uppercase">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 uppercase">
                              Unregistered
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {item.att?.checkInTime ? (
                            <>
                              {item.att.checkInTime} ~ {item.att.checkOutTime || 'Working'}
                              {item.att.checkOutTime && (
                                <span className="ml-1 text-slate-500">
                                  ({calculateWorkingTime(item.att.checkInTime, item.att.checkOutTime)})
                                </span>
                              )}
                            </>
                          ) : '-'}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold font-mono bg-purple-50 text-purple-900">
                          {item.totalLD}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">
                          {item.assignedTables.length > 0 ? item.assignedTables.join(', ') : '-'}
                        </td>
                        <td className="p-2 border border-slate-300 text-[11px] text-slate-700 italic">
                          {item.att?.note || '-'}
                        </td>
                      </tr>
                    ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 2: Table Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-1.5">
                  <Wine className="w-4 h-4 text-cyan-700" />
                  <span>2. Table LD Breakdown</span>
                </h3>

                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300">Table No</th>
                      <th className="p-2 border border-slate-300 text-center font-black">LD Count</th>
                      <th className="p-2 border border-slate-300">Assigned Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.from(tableSummaryMap.entries()).map(([tableNo, val]) => (
                      <tr key={tableNo} className="text-slate-800">
                        <td className="p-2 border border-slate-300 font-bold font-mono">{tableNo}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold font-mono">{val.totalLD} drinks</td>
                        <td className="p-2 border border-slate-300">{Array.from(val.staffNames).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Approval Block */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
                <div>
                  <p className="font-bold text-slate-900 mb-8">Prepared By (Supervisor):</p>
                  <div className="border-b border-slate-400 w-3/4"></div>
                  <p className="text-[10px] text-slate-500 mt-1">Signature &amp; Date</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-8">Approved By (Manager / Owner):</p>
                  <div className="border-b border-slate-400 w-3/4"></div>
                  <p className="text-[10px] text-slate-500 mt-1">Signature &amp; Date</p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 no-print">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
