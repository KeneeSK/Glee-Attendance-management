import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../utils/initialData';
import { 
  subscribeToServerDatabase, 
  fetchServerDatabase,
  getAttendanceForDate, 
  getLDLogsForDate, 
  getChecklistForDate,
  loadInventoryLogForDate,
  loadInventoryItems,
  loadStaffList,
  loadReportPassword,
  saveReportPassword
} from '../utils/storage';
import { 
  Calendar, 
  RefreshCw, 
  Users, 
  Wine, 
  ClipboardCheck, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Coffee, 
  UserX, 
  CalendarDays,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  LogOut,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { AttendanceRecord, LDLogEntry, Staff } from '../types';

export const PublicLiveReport: React.FC = () => {
  // Password Auth State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('lounge_boss_report_unlocked') === 'true';
  });
  const [inputPassword, setInputPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Password Change Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string>('');
  const [changePassSuccess, setChangePassSuccess] = useState<string>('');

  // Report Data States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [staffFilter, setStaffFilter] = useState<'all' | 'working' | 'dayoff' | 'absent'>('all');

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ldLogs, setLdLogs] = useState<LDLogEntry[]>([]);
  const [checklist, setChecklist] = useState<any>(null);
  const [inventoryLog, setInventoryLog] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const refreshData = () => {
    setAttendance(getAttendanceForDate(selectedDate));
    setLdLogs(getLDLogsForDate(selectedDate));
    setChecklist(getChecklistForDate(selectedDate));
    setInventoryLog(loadInventoryLogForDate(selectedDate));
    setInventoryItems(loadInventoryItems());
    setStaffList(loadStaffList());
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate]); 

  useEffect(() => {
    fetchServerDatabase().then(() => {
      refreshData();
      setIsLoading(false);
      setLastUpdate(Date.now());
    });

    const unsub = subscribeToServerDatabase(() => {
      refreshData();
      setLastUpdate(Date.now());
    });
    return () => unsub();
  }, [selectedDate]);

  // Password authentication submit handler
  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPassword = loadReportPassword();
    if (inputPassword.trim() === correctPassword) {
      sessionStorage.setItem('lounge_boss_report_unlocked', 'true');
      setIsUnlocked(true);
      setAuthError('');
      setInputPassword('');
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  // Lock report session handler
  const handleLock = () => {
    sessionStorage.removeItem('lounge_boss_report_unlocked');
    setIsUnlocked(false);
    setInputPassword('');
    setAuthError('');
  };

  // Save new password handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    const correctPassword = loadReportPassword();
    if (currentPassInput.trim() !== correctPassword) {
      setChangePassError('Current password does not match.');
      return;
    }

    if (!newPassInput.trim() || newPassInput.trim().length < 4) {
      setChangePassError('New password must be at least 4 characters or digits.');
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setChangePassError('New password and confirmation do not match.');
      return;
    }

    saveReportPassword(newPassInput.trim());
    setChangePassSuccess('Password updated successfully!');
    setTimeout(() => {
      setIsChangePasswordOpen(false);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setChangePassSuccess('');
      setChangePassError('');
    }, 1200);
  };

  // Quick keypad input helper for PIN pad
  const handleKeypadPress = (val: string) => {
    setAuthError('');
    if (val === 'clear') {
      setInputPassword('');
    } else if (val === 'backspace') {
      setInputPassword(prev => prev.slice(0, -1));
    } else {
      if (inputPassword.length < 12) {
        setInputPassword(prev => prev + val);
      }
    }
  };

  // Computation for staff summaries
  const staffSummary = staffList.map(staff => {
    const att = attendance.find(a => a.staffId === staff.id);
    const staffLogs = ldLogs.filter(l => l.staffId === staff.id);
    const totalLD = staffLogs.reduce((sum, l) => sum + l.amount, 0);
    
    let statusCategory: 'working' | 'dayoff' | 'absent' | 'pending' = 'pending';
    let statusLabel = 'Pending Check-In';
    let statusBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';

    if (att) {
      if (att.isDayOff) {
        statusCategory = 'dayoff';
        statusLabel = 'Day Off';
        statusBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (att.isAbsent) {
        statusCategory = 'absent';
        statusLabel = 'Absent';
        statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      } else if (att.isSuspended) {
        statusCategory = 'absent';
        statusLabel = 'Suspended';
        statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
      } else if (att.checkInTime) {
        statusCategory = 'working';
        if (att.checkOutTime) {
          statusLabel = 'Shift Finished';
          statusBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
        } else {
          statusLabel = att.isLate ? 'On Duty (Late)' : 'On Duty';
          statusBadgeColor = att.isLate 
            ? 'bg-amber-50 text-amber-800 border-amber-300' 
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
      }
    }

    const schedule = att?.schedule || staff.defaultSchedule || 'Not Assigned';
    const checkIn = att?.checkInTime;
    const checkOut = att?.checkOutTime;
    const isLate = att?.isLate;
    const note = att?.note;

    return { 
      staff, 
      att,
      statusCategory, 
      statusLabel, 
      statusBadgeColor,
      totalLD, 
      schedule,
      checkIn,
      checkOut,
      isLate,
      note
    };
  });

  // Filtered staff list
  const filteredStaff = staffSummary.filter(s => {
    if (staffFilter === 'all') return true;
    if (staffFilter === 'working') return s.statusCategory === 'working';
    if (staffFilter === 'dayoff') return s.statusCategory === 'dayoff';
    if (staffFilter === 'absent') return s.statusCategory === 'absent';
    return true;
  }).sort((a, b) => {
    if (a.statusCategory === 'working' && b.statusCategory !== 'working') return -1;
    if (a.statusCategory !== 'working' && b.statusCategory === 'working') return 1;
    return b.totalLD - a.totalLD;
  });

  // Table summary
  const tableSummary = new Map<string, { totalLD: number, staffNames: Set<string> }>();
  ldLogs.forEach(l => {
    if (!l.tableNo) return;
    if (!tableSummary.has(l.tableNo)) tableSummary.set(l.tableNo, { totalLD: 0, staffNames: new Set() });
    const t = tableSummary.get(l.tableNo)!;
    t.totalLD += l.amount;
    if (l.staffName) t.staffNames.add(l.staffName);
  });
  const tables = Array.from(tableSummary.entries()).sort((a, b) => b[1].totalLD - a[1].totalLD);

  // Statistics counters
  const totalWorking = staffSummary.filter(s => s.statusCategory === 'working').length;
  const totalDayOff = staffSummary.filter(s => s.statusCategory === 'dayoff').length;
  const totalAbsent = staffSummary.filter(s => s.statusCategory === 'absent').length;
  const totalLDs = ldLogs.reduce((sum, l) => sum + l.amount, 0);
  const abnormalChecklists = checklist?.abnormalItems || [];
  const checkedCount = checklist?.checkedItems?.length || 0;

  // PASSWORD LOCK SCREEN (No ID required, Password/PIN only)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-purple-500 selection:text-white">
        <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -left-16 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Logo Badge */}
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/50 border border-purple-400/30">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300 text-[11px] font-bold tracking-wider uppercase mb-2">
            <Shield className="w-3 h-3 text-purple-400" />
            Owner & Executive Portal
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-tight">Glee Angels Live Report</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Please enter your access password or PIN to unlock real-time operations.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setAuthError('');
                }}
                placeholder="Enter password / PIN"
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-center text-lg font-bold text-white tracking-widest outline-none transition-all placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-shake">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Quick Virtual Keypad (0-9) for mobile convenience */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:scale-95 text-white font-bold text-base border border-slate-700/50 transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:scale-95 text-white font-bold text-base border border-slate-700/50 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 transition-all cursor-pointer"
              >
                Del
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Report</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-6">
            Default PIN is <span className="font-mono text-purple-400 font-bold">8888</span> if unchanged.
          </p>
        </div>
      </div>
    );
  }

  // UNLOCKED REPORT VIEW (100% English)
  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-20 font-sans selection:bg-purple-200">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-purple-950 rounded-xl flex items-center justify-center shadow-inner">
            <span className="text-white font-black text-sm tracking-wider">GA</span>
          </div>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 leading-tight tracking-tight uppercase">Glee Angels</h1>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <span>Executive Live Report</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-800 outline-none p-0 cursor-pointer w-24"
            />
          </div>

          {/* Change Password Button */}
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
            title="Change Report Access Password"
          >
            <KeyRound className="w-4 h-4 text-purple-600" />
          </button>

          {/* Lock Session Button */}
          <button
            onClick={handleLock}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
            title="Lock Report Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-purple-950 text-purple-100 px-4 py-1.5 text-[11px] font-semibold flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Real-time Live Sync Active</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-purple-300">
          <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Updated {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto space-y-4 mt-1">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total LD */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-purple-600 mb-1">
              <Wine className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total LDs</span>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{totalLDs}</div>
          </div>

          {/* On Duty */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">On Duty</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 leading-none">{totalWorking}</div>
          </div>

          {/* Day Off */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Coffee className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Day Off</span>
            </div>
            <div className="text-2xl font-black text-blue-700 leading-none">{totalDayOff}</div>
          </div>

          {/* Absent / Suspended */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <UserX className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Absent / Suspend</span>
            </div>
            <div className="text-2xl font-black text-rose-700 leading-none">{totalAbsent}</div>
          </div>
        </div>

        {/* Staff Attendance & Schedule Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Staff Attendance & Schedules</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500">{staffSummary.length} Total</span>
          </div>

          {/* Status Filter Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold no-scrollbar">
            <button
              onClick={() => setStaffFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                staffFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({staffSummary.length})
            </button>
            <button
              onClick={() => setStaffFilter('working')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'working' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              On Duty ({totalWorking})
            </button>
            <button
              onClick={() => setStaffFilter('dayoff')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'dayoff' 
                  ? 'bg-blue-700 text-white shadow-sm' 
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Day Off ({totalDayOff})
            </button>
            <button
              onClick={() => setStaffFilter('absent')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'absent' 
                  ? 'bg-rose-700 text-white shadow-sm' 
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Absent / Suspend ({totalAbsent})
            </button>
          </div>

          {/* Staff List */}
          <div className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No staff found matching this filter.</div>
            ) : (
              filteredStaff.map((s, i) => (
                <div key={i} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    {/* Staff info & Status */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">{s.staff.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {s.staff.role}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.statusBadgeColor}`}>
                          {s.statusLabel}
                        </span>
                      </div>

                      {/* Working Schedule info */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1 font-medium bg-slate-100/80 px-2 py-0.5 rounded text-slate-700">
                          <CalendarDays className="w-3 h-3 text-slate-500" />
                          <span>Schedule: <strong className="text-slate-900">{s.schedule}</strong></span>
                        </div>

                        {s.checkIn && (
                          <div className="flex items-center gap-1 font-medium bg-emerald-50 px-2 py-0.5 rounded text-emerald-800 border border-emerald-100">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>
                              In: <strong>{s.checkIn}</strong>
                              {s.isLate && <span className="text-amber-700 font-bold ml-1">(Late)</span>}
                              {s.checkOut && ` ~ Out: ${s.checkOut}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reason / Note if any */}
                      {s.note && (
                        <p className="text-[11px] text-slate-600 bg-amber-50/80 border border-amber-200/70 rounded-lg px-2.5 py-1 mt-1 font-medium">
                          📝 Note: {s.note}
                        </p>
                      )}
                    </div>

                    {/* LD Count Badge */}
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl shadow-sm">
                        <Wine className="w-3.5 h-3.5 text-purple-700" />
                        <span className="text-base font-black text-purple-950 leading-none">{s.totalLD}</span>
                        <span className="text-[9px] font-bold text-purple-700 uppercase">LD</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Sales Summary */}
        {tables.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wine className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Table Sales Summary</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{tables.length} Active Tables</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tables.map(([tableNo, data], i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-slate-900 text-[13px]">{tableNo}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">
                      Staff: {Array.from(data.staffNames).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                    <span className="text-sm font-black text-purple-900">{data.totalLD}</span>
                    <span className="text-[9px] font-bold text-purple-700">LDs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Closing Duty Checklist</h2>
            </div>
            {checkedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {checkedCount} Completed
              </span>
            )}
          </div>
          <div className="p-4">
            {abnormalChecklists.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-rose-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Issues / Irregularities Found</span>
                </div>
                {abnormalChecklists.map((item: string, i: number) => (
                  <div key={i} className="text-[11px] font-bold text-slate-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
                    • {item}
                  </div>
                ))}
              </div>
            ) : checkedCount > 0 ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">All inspected items are normal and verified.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-2">No closing checklist recorded yet for this date.</div>
            )}
            {checklist?.remarks && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Supervisor Remarks / Notes</span>
                <p className="text-xs text-slate-800 font-medium">{checklist.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Daily Inventory Count</h2>
            </div>
            {inventoryLog?.updatedAt && (
              <span className="text-[10px] font-bold text-slate-400">
                Updated: {new Date(inventoryLog.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="p-0">
            {!inventoryLog || Object.keys(inventoryLog.entries || {}).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No inventory logged for this date.</div>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100">
                {inventoryItems.map(item => {
                  const qty = inventoryLog.entries[item.id] || '';
                  if (!qty) return null;
                  return (
                    <div key={item.id} className="p-3 flex justify-between items-center bg-white">
                      <span className="text-[11px] font-bold text-slate-600 line-clamp-1 pr-2">{item.name}</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{qty}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Change Report Password</h3>
              </div>
              <button
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setChangePassError('');
                  setChangePassSuccess('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-600 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Min. 4 characters or digits"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-600 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-600 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium outline-none"
                  required
                />
              </div>

              {changePassError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {changePassError}
                </div>
              )}

              {changePassSuccess && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{changePassSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
