import React from 'react';
import { AttendanceRecord, Staff } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { SCHEDULE_OPTIONS } from '../utils/initialData';
import { calculateWorkingTime } from '../utils/time';
import { TimeInputControl } from './TimeInputControl';

interface Props {
  records: AttendanceRecord[];
  staffList: Staff[];
  onUpdateRecord: (updated: AttendanceRecord) => void;
}

export const AttendanceCardList: React.FC<Props> = ({ records, staffList, onUpdateRecord }) => {
  const handleQuickCheckIn = (rec: AttendanceRecord) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    onUpdateRecord({ ...rec, checkInTime: timeStr });
  };

  const handleQuickCheckOut = (rec: AttendanceRecord) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    onUpdateRecord({ ...rec, checkOutTime: timeStr });
  };

  const handleToggleLate = (rec: AttendanceRecord) => {
    onUpdateRecord({ ...rec, isLate: !rec.isLate });
  };

  const handleToggleAbsent = (rec: AttendanceRecord) => {
    onUpdateRecord({ ...rec, isAbsent: !rec.isAbsent, isDayOff: false, isSuspended: false, isLate: false, checkInTime: '', checkOutTime: '' });
  };

  const handleToggleDayOff = (rec: AttendanceRecord) => {
    onUpdateRecord({ ...rec, isDayOff: !rec.isDayOff, isAbsent: false, isSuspended: false, isLate: false, checkInTime: '', checkOutTime: '' });
  };

  const handleToggleSuspended = (rec: AttendanceRecord) => {
    onUpdateRecord({ ...rec, isSuspended: !rec.isSuspended, isAbsent: false, isDayOff: false, isLate: false, checkInTime: '', checkOutTime: '' });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {records.map((rec) => {
        const staffObj = staffList.find((s) => s.id === rec.staffId);
        const isAbsent = rec.isAbsent;
        const isDayOff = rec.isDayOff;
        const isSuspended = rec.isSuspended;
        const isDisabled = isAbsent || isDayOff || isSuspended;
        const isLate = rec.isLate && !isDisabled;

        return (
          <div key={rec.id} className={`flex flex-col gap-3 p-3 rounded-xl border ${isAbsent ? 'bg-rose-950/10 border-rose-900/30' : isSuspended ? 'bg-orange-950/10 border-orange-900/30' : isDayOff ? 'bg-sky-950/10 border-sky-900/30' : isLate ? 'bg-amber-950/10 border-amber-900/30' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-base ${isDisabled ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                    {rec.staffName}
                  </span>
                  {staffObj?.role && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                      {staffObj.role}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-500">{rec.staffId}</span>
              </div>
              <div>
                {isAbsent ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    <XCircle className="w-3.5 h-3.5" /> Absent
                  </span>
                ) : isSuspended ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-orange-950/80 text-orange-300 border border-orange-800/60">
                    <ShieldAlert className="w-3.5 h-3.5" /> Suspended
                  </span>
                ) : isDayOff ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-sky-950/80 text-sky-300 border border-sky-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Day Off
                  </span>
                ) : isLate ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    <AlertTriangle className="w-3.5 h-3.5" /> Late
                  </span>
                ) : rec.checkInTime ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> On Time
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Pending
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</label>
                <select
                  value={rec.schedule || ''}
                  onChange={(e) => onUpdateRecord({ ...rec, schedule: e.target.value })}
                  disabled={isDisabled}
                  className="bg-slate-950 border border-slate-700/80 focus:border-purple-500 text-slate-200 text-xs px-2 py-1.5 rounded w-full focus:outline-none disabled:opacity-40 appearance-none"
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Toggles</label>
                <div className="grid grid-cols-4 gap-1.5 items-center">
                  <label className="flex items-center justify-center gap-1 cursor-pointer bg-slate-950 rounded px-1.5 py-1 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={rec.isLate}
                      onChange={() => handleToggleLate(rec)}
                      disabled={isDisabled}
                      className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-300">Late</span>
                  </label>
                  <label className="flex items-center justify-center gap-1 cursor-pointer bg-slate-950 rounded px-1.5 py-1 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={rec.isAbsent}
                      onChange={() => handleToggleAbsent(rec)}
                      className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500/30 cursor-pointer accent-rose-500"
                    />
                    <span className="text-[10px] text-slate-300">Absent</span>
                  </label>
                  <label className="flex items-center justify-center gap-1 cursor-pointer bg-slate-950 rounded px-1.5 py-1 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={rec.isDayOff}
                      onChange={() => handleToggleDayOff(rec)}
                      className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500/30 cursor-pointer accent-sky-500"
                    />
                    <span className="text-[10px] text-slate-300">Off</span>
                  </label>
                  <label className="flex items-center justify-center gap-1 cursor-pointer bg-slate-950 rounded px-1.5 py-1 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={rec.isSuspended || false}
                      onChange={() => handleToggleSuspended(rec)}
                      className="w-3 h-3 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500/30 cursor-pointer accent-orange-500"
                    />
                    <span className="text-[10px] text-slate-300">Susp</span>
                  </label>
                </div>
              </div>
              {rec.checkInTime && rec.checkOutTime && (
                <div className="mt-1.5 flex items-center justify-end bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 mr-2 uppercase font-bold tracking-wider">Working Hours:</span>
                  <span className="text-sm font-black font-mono text-cyan-400 drop-shadow-sm">
                    {calculateWorkingTime(rec.checkInTime, rec.checkOutTime)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Check In / Out</label>
              <div className="flex items-center gap-2">
                <TimeInputControl
                  initialValue={rec.checkInTime || ''}
                  onSave={(val) => onUpdateRecord({ ...rec, checkInTime: val, isAbsent: false })}
                  placeholder="Set Check-In"
                  buttonText="근무시작"
                  disabled={isDisabled}
                  inputClass="text-emerald-400 text-sm w-full"
                  buttonClass="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 px-2 py-1 flex-shrink-0"
                  wrapperClass="flex-1"
                />
                <TimeInputControl
                  initialValue={rec.checkOutTime || ''}
                  onSave={(val) => onUpdateRecord({ ...rec, checkOutTime: val })}
                  placeholder="Set Check-Out"
                  buttonText="퇴근"
                  disabled={isDisabled || !rec.checkInTime}
                  inputClass="text-slate-300 text-sm w-full"
                  buttonClass="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 flex-shrink-0"
                  wrapperClass="flex-1"
                />
              </div>
              {rec.checkInTime && rec.checkOutTime && (
                <div className="mt-1.5 flex items-center justify-end bg-slate-900/50 px-2 py-1.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 mr-2 uppercase font-bold tracking-wider">Working Hours:</span>
                  <span className="text-sm font-black font-mono text-cyan-400 drop-shadow-sm">
                    {calculateWorkingTime(rec.checkInTime, rec.checkOutTime)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notes</label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={rec.note || ''}
                onChange={(e) => onUpdateRecord({ ...rec, note: e.target.value })}
                disabled={isDisabled}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-200 text-xs px-2.5 py-1.5 rounded focus:outline-none"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
