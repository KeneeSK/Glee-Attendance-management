import React, { useState, useEffect, useRef } from 'react';
import { TabType, AdminUser } from '../types';
import { Calendar, Clock, Users, Wine, BarChart3, UserCog, RotateCcw, Music, LogOut, Download, Upload, ShieldCheck, ClipboardCheck, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  totalWorkingStaff: number;
  totalLDToday: number;
  onOpenStaffManager: () => void;
  onOpenAdminManager: () => void;
  onOpenGoogleSheets: () => void;
  onResetDemoData: () => void;
  onLogout: () => void;
  onBackupData: () => void;
  onRestoreData: (jsonStr: string) => void;
  currentUser: AdminUser;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  selectedDate,
  setSelectedDate,
  totalWorkingStaff,
  totalLDToday,
  onOpenStaffManager,
  onOpenAdminManager,
  onOpenGoogleSheets,
  onResetDemoData,
  onLogout,
  onBackupData,
  onRestoreData,
  currentUser,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onRestoreData(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0e17]/90 backdrop-blur-md border-b border-purple-900/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Lounge Brand Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-purple-800 to-indigo-950 flex items-center justify-center border border-purple-400/40 shadow-lg shadow-purple-900/40">
              <Music className="w-5 h-5 text-purple-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30 rounded">
                  GLEE ANGELS
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span className="font-mono text-cyan-300 font-medium">{timeStr}</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-200 via-purple-300 to-cyan-200 bg-clip-text text-transparent">
                Glee Angels Attendance & LD Tracking
              </h1>
            </div>
          </div>

          {/* Date Selector & Live Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Today's Stats Pills */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>On Duty:</span>
                <span className="font-semibold text-purple-300">{totalWorkingStaff}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Wine className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total LD:</span>
                <span className="font-semibold text-cyan-300">{totalLDToday}</span>
              </div>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-800/50 rounded-lg px-2.5 py-1 text-xs text-purple-200">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-purple-100 font-medium focus:outline-none cursor-pointer"
              />
            </div>

            {/* Management Buttons */}
            {currentUser.permissions.canManageStaff && (
              <button
                onClick={onOpenStaffManager}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
                title="Manage Staff Roster"
              >
                <UserCog className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Roster</span>
              </button>
            )}

            {currentUser.permissions.canManageAdmins && (
              <button
                onClick={onOpenAdminManager}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded-lg transition-colors"
                title="Manage Admins"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Admins</span>
              </button>
            )}

            {/* Google Sheets Sync Button */}
            <button
              onClick={onOpenGoogleSheets}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/70 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Sync & Backup Database to Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets</span>
            </button>

            {/* Backup JSON Button */}
            <button
              onClick={onBackupData}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-800/60 rounded-lg transition-colors"
              title="Save Database Backup (JSON)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Backup</span>
            </button>

            {/* Restore JSON Button */}
            {currentUser.role === 'super' && (
              <label
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-800/60 rounded-lg transition-colors cursor-pointer"
                title="Restore Database from Backup (JSON)"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden md:inline">Restore</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            {currentUser.role === 'super' && (
              <button
                onClick={onResetDemoData}
                className="p-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 rounded-lg transition-colors"
                title="Reset Demo Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Logout / Lock Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/60 rounded-lg transition-colors ml-1"
              title="Logout / Lock Admin Session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 pb-2 overflow-x-auto">
          {currentUser.permissions.canAccessAttendance && (
            <button
              onClick={() => setCurrentTab('attendance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                currentTab === 'attendance'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-md shadow-purple-950/50 neon-border-purple'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className={`w-4 h-4 ${currentTab === 'attendance' ? 'text-purple-400' : ''}`} />
              <span>Attendance</span>
            </button>
          )}

          {currentUser.permissions.canAccessLD && (
            <button
              onClick={() => setCurrentTab('ld')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                currentTab === 'ld'
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-md shadow-cyan-950/50 neon-border-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Wine className={`w-4 h-4 ${currentTab === 'ld' ? 'text-cyan-400' : ''}`} />
              <span>LD Tracking</span>
            </button>
          )}

          {currentUser.permissions.canAccessReport && (
            <button
              onClick={() => setCurrentTab('report')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                currentTab === 'report'
                  ? 'bg-pink-600/30 text-pink-200 border border-pink-500/50 shadow-md shadow-pink-950/50 neon-border-pink'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${currentTab === 'report' ? 'text-pink-400' : ''}`} />
              <span>Daily Report</span>
            </button>
          )}
          {currentUser.permissions.canAccessReport && (
            <button
              onClick={() => setCurrentTab('checklist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                currentTab === 'checklist'
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 shadow-md shadow-emerald-950/50 neon-border-emerald'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ClipboardCheck className={`w-4 h-4 ${currentTab === 'checklist' ? 'text-emerald-400' : ''}`} />
              <span>Checklist</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
