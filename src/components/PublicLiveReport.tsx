import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../utils/initialData';
import { 
  subscribeToServerDatabase, 
  loadAllAttendance, 
  loadAllLDLogs, 
  loadStaffList 
} from '../utils/storage';
import { DailyReportTab } from './DailyReportTab';
import { ChecklistTab } from './ChecklistTab';
import { InventoryTab } from './InventoryTab';
import { AttendanceRecord, LDLogEntry, Staff } from '../types';
import { Calendar, RefreshCw } from 'lucide-react';

export const PublicLiveReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [ldLogs, setLdLogs] = useState<LDLogEntry[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const refreshData = () => {
    setAttendanceRecords(loadAllAttendance());
    setLdLogs(loadAllLDLogs());
    setStaffList(loadStaffList());
  };

  useEffect(() => {
    refreshData();
    const unsub = subscribeToServerDatabase(() => {
      refreshData();
      setLastUpdate(Date.now());
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-300 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-900 rounded flex items-center justify-center">
            <span className="text-white font-black text-xs">GA</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight tracking-tight uppercase">Glee Angels</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Daily Report</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-800 outline-none p-0 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 hidden sm:flex">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Content (A4 Pages stacked) */}
      <div className="py-8 px-4 sm:px-8 space-y-8 flex flex-col items-center">
        {/* We use a max-w-[210mm] wrapper internally in the components, so they will look like stacked sheets. */}
        
        {/* 1. Daily Report (Attendance & LD) */}
        <div className="w-full max-w-[210mm] shadow-xl">
          <DailyReportTab
            dateStr={selectedDate}
            setDateStr={setSelectedDate}
            attendanceRecords={attendanceRecords}
            ldLogs={ldLogs}
            staffList={staffList}
            isPublicView={true}
          />
        </div>

        {/* 2. Checklist */}
        <div className="w-full max-w-[210mm] shadow-xl">
          <ChecklistTab
            dateStr={selectedDate}
            lastSyncTime={lastUpdate}
            isPublicView={true}
          />
        </div>

        {/* 3. Inventory */}
        <div className="w-full max-w-[210mm] shadow-xl">
          <InventoryTab
            currentAdmin={null}
            isPublicView={true}
            dateStr={selectedDate}
          />
        </div>

      </div>
    </div>
  );
};
