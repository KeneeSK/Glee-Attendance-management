import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Award,
  Crown,
  Layers
} from 'lucide-react';
import { AttendanceRecord, LDLogEntry, Staff } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';

// Organizational Hierarchy Rank according to Official Org Chart
const getStaffOrgRank = (name: string, role: string): number => {
  const n = (name || '').toUpperCase().trim();
  const r = (role || '').toUpperCase().trim();

  // 1. CHIEF, DAILY OPERATIONS (SIR KENEE)
  if (n.includes('KENEE') || r.includes('DAILY OPERATIONS')) return 1;

  // 2. DEPARTMENT HEADS & CHIEFS
  if (n.includes('RICHAEL') || r.includes('FINANCIAL & LOGISTIC') || r.includes('LOGISTICS')) return 2;
  if (n.includes('MARIA') || r.includes('HEAD WAIT')) return 3;
  if (n.includes('RICHARD') && (r.includes('DJ') || r.includes('SOUND'))) return 4;

  // 3. SPECIALISTS & CHEF
  if (n.includes('LYSKEE') || (r.includes('DJ') && !n.includes('RICHARD'))) return 5;
  if (n.includes('RYAN') || r.includes('HEAD CHEF')) return 6;

  // 4. KITCHEN TEAM
  if (n.includes('JOLANDS')) return 7;
  if (n.includes('JR')) return 8;
  if (r.includes('KITCHEN')) return 8.5;

  // 5. CASHIER & WAIT TEAM
  if (n.includes('CAMILLE') || r.includes('CASHIER')) return 9;
  if (n.includes('NESDY')) return 10;
  if (n.includes('JHOANNA')) return 11;
  if (n.includes('MICA')) return 12;
  if (n.includes('MARIVIC')) return 13;
  if (n.includes('PRECY')) return 14;
  if (n.includes('NORA')) return 15;
  if (n.includes('YHENG')) return 16;
  if (n.includes('KATH')) return 17;
  if (n.includes('GILLI')) return 18;
  if (n.includes('AGA')) return 19;
  if (r.includes('WAIT')) return 20;

  // 6. UTILITY & DOORMAN
  if (n.includes('JOHN') || r.includes('UTILITY')) return 21;
  if (n.includes('JONATHAN') || r.includes('DOORMAN')) return 22;

  return 50;
};

// Department Badge Colors & Category
const getDepartmentInfo = (name: string, role: string) => {
  const rank = getStaffOrgRank(name, role);
  if (rank === 1) return { label: 'Daily Operations', color: 'bg-purple-950 text-purple-200 border-purple-800' };
  if (rank === 2) return { label: 'Finance & Logistics', color: 'bg-blue-950 text-blue-200 border-blue-800' };
  if (rank === 3) return { label: 'Head of Service', color: 'bg-amber-950 text-amber-200 border-amber-800' };
  if (rank === 4 || rank === 5) return { label: 'DJ / Sound & Light', color: 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-800' };
  if (rank >= 6 && rank <= 8.5) return { label: 'Kitchen Team', color: 'bg-emerald-950 text-emerald-200 border-emerald-800' };
  if (rank === 9) return { label: 'Cashier Desk', color: 'bg-cyan-950 text-cyan-200 border-cyan-800' };
  if (rank >= 10 && rank <= 20) return { label: 'Wait Staff', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  if (rank >= 21) return { label: 'Facility & Security', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
  return { label: 'Operations', color: 'bg-slate-100 text-slate-700 border-slate-300' };
};

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
  const [activeChartTab, setActiveChartTab] = useState<'sales' | 'tables' | 'attendance' | 'hourly'>('sales');

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
      setAuthError('Incorrect PIN or password. Please try again.');
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

  // Virtual Keypad helper
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

  // Computation for staff summaries with Organizational Hierarchy Ranking
  const staffSummary = useMemo(() => {
    return staffList.map(staff => {
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
      const orgRank = getStaffOrgRank(staff.name, staff.role);
      const dept = getDepartmentInfo(staff.name, staff.role);

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
        note,
        orgRank,
        dept
      };
    }).sort((a, b) => a.orgRank - b.orgRank); // Strict Organizational Hierarchy Sort
  }, [staffList, attendance, ldLogs]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffSummary.filter(s => {
      if (staffFilter === 'all') return true;
      if (staffFilter === 'working') return s.statusCategory === 'working';
      if (staffFilter === 'dayoff') return s.statusCategory === 'dayoff';
      if (staffFilter === 'absent') return s.statusCategory === 'absent';
      return true;
    });
  }, [staffSummary, staffFilter]);

  // Table summary
  const tableSummary = useMemo(() => {
    const map = new Map<string, { totalLD: number, staffNames: Set<string> }>();
    ldLogs.forEach(l => {
      if (!l.tableNo) return;
      if (!map.has(l.tableNo)) map.set(l.tableNo, { totalLD: 0, staffNames: new Set() });
      const t = map.get(l.tableNo)!;
      t.totalLD += l.amount;
      if (l.staffName) t.staffNames.add(l.staffName);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].totalLD - a[1].totalLD);
  }, [ldLogs]);

  // Statistics counters
  const totalWorking = staffSummary.filter(s => s.statusCategory === 'working').length;
  const totalDayOff = staffSummary.filter(s => s.statusCategory === 'dayoff').length;
  const totalAbsent = staffSummary.filter(s => s.statusCategory === 'absent').length;
  const totalPending = staffSummary.filter(s => s.statusCategory === 'pending').length;
  const totalLDs = ldLogs.reduce((sum, l) => sum + l.amount, 0);
  const abnormalChecklists = checklist?.abnormalItems || [];
  const checkedCount = checklist?.checkedItems?.length || 0;

  // Chart Data Computations
  const staffSalesChartData = useMemo(() => {
    return staffSummary
      .filter(s => s.totalLD > 0)
      .sort((a, b) => b.totalLD - a.totalLD)
      .slice(0, 10)
      .map(s => ({
        name: s.staff.name,
        role: s.staff.role,
        LDs: s.totalLD
      }));
  }, [staffSummary]);

  const tableSalesChartData = useMemo(() => {
    return tableSummary.slice(0, 8).map(([tbl, data]) => ({
      table: tbl,
      LDs: data.totalLD
    }));
  }, [tableSummary]);

  const attendancePieData = useMemo(() => {
    const data = [
      { name: 'On Duty', value: totalWorking, color: '#10b981' },
      { name: 'Day Off', value: totalDayOff, color: '#3b82f6' },
      { name: 'Absent/Suspend', value: totalAbsent, color: '#ef4444' },
      { name: 'Pending', value: totalPending, color: '#94a3b8' }
    ];
    return data.filter(d => d.value > 0);
  }, [totalWorking, totalDayOff, totalAbsent, totalPending]);

  const hourlyActivityData = useMemo(() => {
    const hours = [
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
      '00:00', '01:00', '02:00', '03:00', '04:00'
    ];
    const hourMap: { [key: string]: number } = {};
    hours.forEach(h => { hourMap[h] = 0; });

    ldLogs.forEach(log => {
      if (!log.time) return;
      const hStr = log.time.split(':')[0] + ':00';
      if (hourMap[hStr] !== undefined) {
        hourMap[hStr] += log.amount;
      } else {
        const nearest = hours.find(h => h.startsWith(log.time.split(':')[0])) || '21:00';
        hourMap[nearest] = (hourMap[nearest] || 0) + log.amount;
      }
    });

    return hours.map(hour => ({
      hour,
      LDs: hourMap[hour] || 0
    }));
  }, [ldLogs]);

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
            Executive & Owner Portal
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-tight">Glee Angels Live Report</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Enter your secure access PIN or password to unlock real-time operations.
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
                placeholder="Enter PIN / Password"
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-center text-lg font-bold text-white tracking-widest outline-none transition-all placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
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

          {/* Developer & System Architect Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/70 flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Engineered & Developed by <strong className="text-white font-black tracking-wide">KENEE</strong></span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
              Glee Angels Operations Management System
            </p>
          </div>
        </div>
      </div>
    );
  }

  // UNLOCKED REPORT VIEW (100% English & Hierarchical Staff Order)
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
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            title="Change Report Access Password"
          >
            <KeyRound className="w-4 h-4 text-purple-600" />
          </button>

          {/* Lock Session Button */}
          <button
            onClick={handleLock}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
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

        {/* VISUAL ANALYTICS & CHARTS SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-black uppercase tracking-wider">Executive Performance Analytics</h2>
            </div>
            <span className="text-[10px] font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800">
              Visual Charts
            </span>
          </div>

          {/* Chart Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-bold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveChartTab('sales')}
              className={`px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeChartTab === 'sales'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Top LD Performers</span>
            </button>
            <button
              onClick={() => setActiveChartTab('tables')}
              className={`px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeChartTab === 'tables'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wine className="w-3.5 h-3.5" />
              <span>Table Sales</span>
            </button>
            <button
              onClick={() => setActiveChartTab('attendance')}
              className={`px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeChartTab === 'attendance'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Team Breakdown</span>
            </button>
            <button
              onClick={() => setActiveChartTab('hourly')}
              className={`px-3 py-2.5 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                activeChartTab === 'hourly'
                  ? 'border-purple-600 text-purple-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Hourly Pace</span>
            </button>
          </div>

          {/* Chart Content Body */}
          <div className="p-4">
            {/* 1. Top Staff Performers Chart */}
            {activeChartTab === 'sales' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Individual LD Achievement Leaders
                  </span>
                  <span className="text-[10px] font-extrabold text-purple-700">
                    {staffSalesChartData.length} Staff Contributing
                  </span>
                </div>
                {staffSalesChartData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No LD sales logged for this date yet.</div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffSalesChartData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} width={75} />
                        <Tooltip 
                          formatter={(value: any) => [`${value} LDs`, 'Total LDs']} 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                        />
                        <Bar dataKey="LDs" radius={[0, 8, 8, 0]}>
                          {staffSalesChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#7e22ce' : index === 1 ? '#9333ea' : index === 2 ? '#a855f7' : '#c084fc'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* 2. Table Breakdown Chart */}
            {activeChartTab === 'tables' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Sales Volume by Table (LDs)
                  </span>
                  <span className="text-[10px] font-extrabold text-indigo-700">
                    {tableSalesChartData.length} Active Tables
                  </span>
                </div>
                {tableSalesChartData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No table logs recorded for this date.</div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tableSalesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="table" tick={{ fontSize: 10, fontWeight: 700, fill: '#1e293b' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip 
                          formatter={(value: any) => [`${value} LDs`, 'Volume']} 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                        />
                        <Bar dataKey="LDs" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* 3. Team Status Breakdown */}
            {activeChartTab === 'attendance' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Staff Attendance Allocation ({staffSummary.length} Staff)
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-56">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendancePieData}
                          innerRadius={38}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {attendancePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val: any, name: any) => [`${val} Staff`, name]}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold w-full max-w-xs">
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-700">On Duty: <strong className="text-emerald-800">{totalWorking}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-slate-700">Day Off: <strong className="text-blue-800">{totalDayOff}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-slate-700">Absent: <strong className="text-rose-800">{totalAbsent}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border border-slate-300">
                      <div className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-slate-700">Pending: <strong className="text-slate-800">{totalPending}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Hourly Pace Trend */}
            {activeChartTab === 'hourly' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Nighttime LD Velocity (Timeline)
                  </span>
                  <span className="text-[10px] font-extrabold text-fuchsia-700">
                    Peak Hours Insight
                  </span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyActivityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hourlyColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        formatter={(val: any) => [`${val} LDs`, 'Hourly Count']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} 
                      />
                      <Area type="monotone" dataKey="LDs" stroke="#9333ea" strokeWidth={2.5} fillOpacity={1} fill="url(#hourlyColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Staff Attendance & Schedule Section (Sorted by Organizational Hierarchy) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Staff Attendance & Schedules</h2>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              <Layers className="w-3 h-3" />
              <span>Org Hierarchy Order</span>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold no-scrollbar">
            <button
              onClick={() => setStaffFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                staffFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({staffSummary.length})
            </button>
            <button
              onClick={() => setStaffFilter('working')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                staffFilter === 'working' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              On Duty ({totalWorking})
            </button>
            <button
              onClick={() => setStaffFilter('dayoff')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                staffFilter === 'dayoff' 
                  ? 'bg-blue-700 text-white shadow-sm' 
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Day Off ({totalDayOff})
            </button>
            <button
              onClick={() => setStaffFilter('absent')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                staffFilter === 'absent' 
                  ? 'bg-rose-700 text-white shadow-sm' 
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Absent / Suspend ({totalAbsent})
            </button>
          </div>

          {/* Staff List with Hierarchical Badges */}
          <div className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No staff found matching this filter.</div>
            ) : (
              filteredStaff.map((s, i) => (
                <div key={i} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    {/* Staff info & Status */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Org Rank Crown for Top Exec */}
                        {s.orgRank === 1 && (
                          <span className="p-1 rounded bg-amber-400 text-amber-950 shadow-xs" title="Chief Daily Operations">
                            <Crown className="w-3 h-3" />
                          </span>
                        )}

                        <span className="font-extrabold text-slate-900 text-sm">{s.staff.name}</span>
                        
                        {/* Department / Org Tag */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${s.dept.color}`}>
                          {s.staff.role}
                        </span>

                        {/* Status Label */}
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
        {tableSummary.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wine className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Table Sales Summary</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{tableSummary.length} Active Tables</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tableSummary.map(([tableNo, data], i) => (
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

        {/* Developer & Executive Footer Tag */}
        <div className="mt-8 pt-4 pb-2 border-t border-slate-200 text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-purple-950 font-bold bg-purple-100/80 px-3 py-1 rounded-full border border-purple-200">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Engineered & Developed by <strong className="text-purple-900 font-black">KENEE</strong></span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Glee Angels Management System • Executive Live Portal
          </p>
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
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-900/20 transition-all cursor-pointer"
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
