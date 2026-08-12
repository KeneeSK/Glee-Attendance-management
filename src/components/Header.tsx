import React, { useState, useEffect } from 'react';
import { TabType } from '../types';
import { Calendar, Clock, Users, Wine, BarChart3, UserCog, RotateCcw, Music } from 'lucide-react';

interface HeaderProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  totalWorkingStaff: number;
  totalLDToday: number;
  onOpenStaffManager: () => void;
  onResetDemoData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  selectedDate,
  setSelectedDate,
  totalWorkingStaff,
  totalLDToday,
  onOpenStaffManager,
  onResetDemoData,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('ko-KR', {
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
                  LIVE MUSIC LOUNGE
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span className="font-mono text-cyan-300 font-medium">{timeStr}</span>
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-200 via-purple-300 to-cyan-200 bg-clip-text text-transparent">
                Lounge Attendance & LD Tracking
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
            <button
              onClick={onOpenStaffManager}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
              title="Manage Roster"
            >
              <UserCog className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Roster</span>
            </button>

            <button
              onClick={onResetDemoData}
              className="p-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 rounded-lg transition-colors"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 pb-2 overflow-x-auto">
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
        </div>
      </div>
    </header>
  );
};
