import React, { useState } from 'react';
import { AttendanceRecord, Staff } from '../types';
import { Users, CheckCircle2, AlertTriangle, XCircle, Search, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { SCHEDULE_OPTIONS } from '../utils/initialData';
import { calculateWorkingTime } from '../utils/time';
import { TimeInputControl } from './TimeInputControl';
import { AttendanceCardList } from './AttendanceCardList';

interface AttendanceTabProps {
  dateStr: string;
  attendanceRecords: AttendanceRecord[];
  staffList: Staff[];
  onUpdateRecord: (updated: AttendanceRecord) => void;
  onRefreshDate: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  dateStr,
  attendanceRecords,
  staffList,
  onUpdateRecord,
  onRefreshDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'dayoff' | 'suspended'>('all');

  // Stats calculation
  const totalStaff = attendanceRecords.length;
  const lateCount = attendanceRecords.filter((r) => r.isLate && !r.isAbsent && !r.isDayOff && !r.isSuspended).length;
  const absentCount = attendanceRecords.filter((r) => r.isAbsent).length;
  const dayOffCount = attendanceRecords.filter((r) => r.isDayOff).length;
  const suspendedCount = attendanceRecords.filter((r) => r.isSuspended).length;
  const presentCount = attendanceRecords.filter((r) => Boolean(r.checkInTime) && !r.isAbsent && !r.isDayOff && !r.isSuspended && !r.isLate).length;

  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchesSearch =
      rec.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.staffId.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'present') return Boolean(rec.checkInTime) && !rec.isAbsent && !rec.isDayOff && !rec.isSuspended && !rec.isLate;
    if (statusFilter === 'late') return rec.isLate && !rec.isAbsent && !rec.isDayOff && !rec.isSuspended;
    if (statusFilter === 'absent') return rec.isAbsent;
    if (statusFilter === 'dayoff') return rec.isDayOff;
    if (statusFilter === 'suspended') return rec.isSuspended;

    return true;
  });

  const groupedFilteredRecords = Array.from(
    filteredRecords.reduce((acc, rec) => {
      const staffObj = staffList.find((s) => s.id === rec.staffId);
      const role = staffObj?.role || 'Unassigned';
      if (!acc.has(role)) acc.set(role, []);
      acc.get(role)!.push(rec);
      return acc;
    }, new Map<string, typeof filteredRecords>())
  );

  const handleToggleLate = (rec: AttendanceRecord) => {
    const newLate = !rec.isLate;
    onUpdateRecord({
      ...rec,
      isLate: newLate,
      isAbsent: newLate ? false : rec.isAbsent,
      isDayOff: newLate ? false : rec.isDayOff,
      isSuspended: newLate ? false : rec.isSuspended,
    });
  };

  const handleToggleAbsent = (rec: AttendanceRecord) => {
    const newAbsent = !rec.isAbsent;
    onUpdateRecord({
      ...rec,
      isAbsent: newAbsent,
      isLate: newAbsent ? false : rec.isLate,
      isDayOff: newAbsent ? false : rec.isDayOff,
      isSuspended: newAbsent ? false : rec.isSuspended,
      checkInTime: newAbsent ? '' : rec.checkInTime,
      checkOutTime: newAbsent ? '' : rec.checkOutTime,
    });
  };

  const handleToggleDayOff = (rec: AttendanceRecord) => {
    const newDayOff = !rec.isDayOff;
    onUpdateRecord({
      ...rec,
      isDayOff: newDayOff,
      isAbsent: newDayOff ? false : rec.isAbsent,
      isLate: newDayOff ? false : rec.isLate,
      isSuspended: newDayOff ? false : rec.isSuspended,
      checkInTime: newDayOff ? '' : rec.checkInTime,
      checkOutTime: newDayOff ? '' : rec.checkOutTime,
    });
  };

  const handleToggleSuspended = (rec: AttendanceRecord) => {
    const newSuspended = !rec.isSuspended;
    onUpdateRecord({
      ...rec,
      isSuspended: newSuspended,
      isAbsent: newSuspended ? false : rec.isAbsent,
      isDayOff: newSuspended ? false : rec.isDayOff,
      isLate: newSuspended ? false : rec.isLate,
      checkInTime: newSuspended ? '' : rec.checkInTime,
      checkOutTime: newSuspended ? '' : rec.checkOutTime,
    });
  };

  const handleQuickCheckIn = (rec: AttendanceRecord) => {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    onUpdateRecord({
      ...rec,
      checkInTime: nowTime,
      isAbsent: false,
    });
  };

  const handleQuickCheckOut = (rec: AttendanceRecord) => {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    onUpdateRecord({
      ...rec,
      checkOutTime: nowTime,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="lounge-card rounded-xl p-3.5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Staff Roster</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{totalStaff}</div>
          <div className="mt-1 text-[11px] text-slate-400">Scheduled for {dateStr}</div>
        </div>

        <div className="lounge-card rounded-xl p-3.5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>On-Time Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">{presentCount}</div>
          <div className="mt-1 text-[11px] text-emerald-400/80">Working on floor</div>
        </div>

        <div className="lounge-card rounded-xl p-3.5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Late Arrival</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">{lateCount}</div>
          <div className="mt-1 text-[11px] text-amber-400/80">Delayed schedule</div>
        </div>

        <div className="lounge-card rounded-xl p-3.5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Absent / Leave</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-300">{absentCount}</div>
          <div className="mt-1 text-[11px] text-rose-400/80">Off duty today</div>
        </div>

        <div className="lounge-card rounded-xl p-3.5 border-l-4 border-l-orange-500 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Suspended</span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-300">{suspendedCount}</div>
          <div className="mt-1 text-[11px] text-orange-400/80">Suspension duty</div>
        </div>
      </div>

      {/* Control Bar: Search & Quick Actions */}
      <div className="lounge-card rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-1 border border-slate-800 rounded-lg text-xs flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('present')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'present' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              On Time
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'late' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Late
            </button>
            <button
              onClick={() => setStatusFilter('absent')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'absent' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Absent
            </button>
            <button
              onClick={() => setStatusFilter('dayoff')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'dayoff' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Day Off
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'suspended' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suspended
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onRefreshDate}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Attendance Desktop Table / Responsive List */}
      <div className="lounge-card rounded-xl overflow-hidden border border-slate-800">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Attendance Log ({dateStr})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredRecords.length}</strong> records
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No attendance records found for this filter.
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              <AttendanceCardList 
                records={filteredRecords} 
                staffList={staffList} 
                onUpdateRecord={onUpdateRecord} 
              />
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Staff ID / Name</th>
                  <th className="px-4 py-3">Work Schedule</th>
                  <th className="px-4 py-3">Check-In / Check-Out</th>
                  <th className="px-4 py-3 text-center">Working Hours</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Day Off</th>
                  <th className="px-4 py-3 text-center">Suspended</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {groupedFilteredRecords.map(([role, roleRecords]) => (
                  <React.Fragment key={role}>
                    <tr className="bg-slate-900 border-b border-slate-700">
                      <td colSpan={10} className="px-4 py-2 text-sm font-bold text-slate-300 uppercase tracking-widest border-l-2 border-purple-500">
                        {role}
                      </td>
                    </tr>
                    {roleRecords.map((rec) => {
                      const staffObj = staffList.find((s) => s.id === rec.staffId);
                  const isAbsent = rec.isAbsent;
                  const isDayOff = rec.isDayOff;
                  const isSuspended = rec.isSuspended;
                  const isDisabled = isAbsent || isDayOff || isSuspended;
                  const isLate = rec.isLate && !isDisabled;

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isAbsent
                          ? 'bg-rose-950/10 text-slate-500'
                          : isSuspended
                          ? 'bg-orange-950/10 text-slate-400'
                          : isDayOff
                          ? 'bg-sky-950/10'
                          : isLate
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Staff ID & Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            {rec.staffId}
                          </span>
                          <span className={`font-semibold ${isDisabled ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {rec.staffName}
                          </span>
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={rec.schedule || ''}
                          onChange={(e) => onUpdateRecord({ ...rec, schedule: e.target.value })}
                          disabled={isDisabled}
                          className="bg-slate-900/80 border border-slate-700/80 focus:border-purple-500 text-slate-200 text-[11px] px-2 py-1 rounded w-32 focus:outline-none disabled:opacity-40 appearance-none"
                        >
                          {SCHEDULE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>

                      {/* CheckIn / CheckOut Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* In Time */}
                          <TimeInputControl
                            initialValue={rec.checkInTime || ''}
                            onSave={(val) => onUpdateRecord({ ...rec, checkInTime: val, isAbsent: false })}
                            placeholder="Set Check-In"
                            buttonText="IN"
                            disabled={isDisabled}
                            inputClass="text-emerald-300"
                            buttonClass="bg-emerald-950 hover:bg-emerald-900 text-emerald-400"
                          />
                          <span className="text-slate-600 text-[10px]">-</span>
                          {/* Out Time */}
                          <TimeInputControl
                            initialValue={rec.checkOutTime || ''}
                            onSave={(val) => onUpdateRecord({ ...rec, checkOutTime: val })}
                            placeholder="Set Check-Out"
                            buttonText="OUT"
                            disabled={isDisabled || !rec.checkInTime}
                            inputClass="text-slate-300"
                            buttonClass="bg-slate-800 hover:bg-slate-700 text-slate-300"
                          />
                        </div>
                      </td>

                      {/* Working Hours */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-slate-300">
                          {calculateWorkingTime(rec.checkInTime, rec.checkOutTime) || '-'}
                        </span>
                      </td>

                      {/* Late Checkbox */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={rec.isLate}
                            onChange={() => handleToggleLate(rec)}
                            disabled={isDisabled}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                          />
                        </label>
                      </td>

                      {/* Absent Checkbox */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={rec.isAbsent}
                            onChange={() => handleToggleAbsent(rec)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500"
                          />
                        </label>
                      </td>

                      {/* Day Off Checkbox */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={rec.isDayOff}
                            onChange={() => handleToggleDayOff(rec)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500/30 cursor-pointer accent-sky-500"
                          />
                        </label>
                      </td>

                      {/* Suspended Checkbox */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={rec.isSuspended || false}
                            onChange={() => handleToggleSuspended(rec)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500/30 cursor-pointer accent-orange-500"
                          />
                        </label>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                            <XCircle className="w-3 h-3" /> Absent
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/60">
                            <ShieldAlert className="w-3 h-3" /> Suspended
                          </span>
                        ) : isDayOff ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60">
                            <CheckCircle2 className="w-3 h-3" /> Day Off
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Late
                          </span>
                        ) : rec.checkInTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" /> On Time
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Note */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={rec.note || ''}
                          onChange={(e) => onUpdateRecord({ ...rec, note: e.target.value })}
                          placeholder="Enter notes/remarks"
                          className="w-full bg-slate-900/60 border border-slate-700/60 focus:border-purple-500 text-slate-200 text-xs px-2 py-1 rounded focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};
