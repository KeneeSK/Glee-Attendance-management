import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, LDLogEntry, Staff, TabType, AdminUser } from './types';
import {
  loadStaffList,
  saveStaffList,
  getAttendanceForDate,
  updateAttendanceRecord,
  getLDLogsForDate,
  addLDLogEntry,
  saveAllLDLogs,
  loadAllLDLogs,
  resetAllDataToDemo,
  exportDatabaseJSON,
  importDatabaseJSON,
  backupAllDataToLocalStorage,
  subscribeToServerDatabase,
  fetchServerDatabase,
} from './utils/storage';
import { getTodayDateString } from './utils/initialData';
import { Header } from './components/Header';
import { AttendanceTab } from './components/AttendanceTab';
import { LDTrackingTab } from './components/LDTrackingTab';
import { DailyReportTab } from './components/DailyReportTab';
import { ChecklistTab } from './components/ChecklistTab';
import { StaffManagerModal } from './components/StaffManagerModal';
import { AuthScreen } from './components/AuthScreen';
import { AdminManagerModal } from './components/AdminManagerModal';

export default function App() {
  // Persist login state in localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('lounge_admin_session_v1') === 'true'
  );
  
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem('lounge_admin_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [currentTab, setCurrentTab] = useState<TabType>('attendance');

  // Core Data States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [ldLogs, setLdLogs] = useState<LDLogEntry[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Auto-switch to first available tab based on permissions
  useEffect(() => {
    if (currentUser && currentUser.permissions) {
      if (!currentUser.permissions.canAccessAttendance && currentTab === 'attendance') {
        setCurrentTab(currentUser.permissions.canAccessLD ? 'ld' : (currentUser.permissions.canAccessReport ? 'report' : 'attendance'));
      }
    }
  }, [currentUser, currentTab]);

  // Load Data on Initial Render or Date Change
  const refreshData = useCallback(() => {
    const loadedStaff = loadStaffList();
    setStaffList(loadedStaff);

    const loadedAtt = getAttendanceForDate(selectedDate);
    setAttendanceRecords(loadedAtt);

    const loadedLDs = getLDLogsForDate(selectedDate);
    setLdLogs(loadedLDs);

    // Create an auto backup whenever data is loaded/refreshed
    backupAllDataToLocalStorage();
  }, [selectedDate]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
      // Listen to real-time updates from Firestore securely
      const unsubscribe = subscribeToServerDatabase(() => {
        refreshData();
      });

      return () => unsubscribe();
    } else {
      // Unconditionally fetch once to get latest admins (for login)
      fetchServerDatabase();
    }
  }, [refreshData, isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('lounge_admin_session_v1');
    localStorage.removeItem('lounge_admin_current_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleBackupData = () => {
    exportDatabaseJSON();
  };

  const handleRestoreData = (jsonStr: string) => {
    if (window.confirm('기존 데이터를 백업 파일로 복원하시겠습니까? (Restore data from backup file?)')) {
      const success = importDatabaseJSON(jsonStr);
      if (success) {
        alert('데이터 복원이 완료되었습니다.');
        refreshData();
      } else {
        alert('올바르지 않은 백업 파일 형식입니다.');
      }
    }
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <AuthScreen
        onUnlock={(user) => {
          localStorage.setItem('lounge_admin_session_v1', 'true');
          localStorage.setItem('lounge_admin_current_user', JSON.stringify(user));
          setIsAuthenticated(true);
          setCurrentUser(user);
        }}
      />
    );
  }

  // Handlers for Attendance
  const handleUpdateAttendance = (updatedRecord: AttendanceRecord) => {
    updateAttendanceRecord(updatedRecord);
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  // Handlers for LD Tracking
  const handleAddLDLog = (entry: Omit<LDLogEntry, 'id' | 'createdAt'>) => {
    const newEntry = addLDLogEntry(entry);
    setLdLogs((prev) => [...prev, newEntry]);
  };

  const handleDeleteLDLog = (logId: string) => {
    const allLogs = loadAllLDLogs();
    const updated = allLogs.filter((l) => l.id !== logId);
    saveAllLDLogs(updated);
    setLdLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  // Handlers for Staff List
  const handleSaveStaffList = (updatedList: Staff[]) => {
    saveStaffList(updatedList);
    setStaffList(updatedList);
    refreshData();
  };

  // Handler for Resetting Demo Data
  const handleResetDemoData = () => {
    if (window.confirm('Are you sure you want to reset all records to default clean data? This will clear all attendance and LD logs for today.')) {
      resetAllDataToDemo();
      refreshData();
    }
  };

  // Computed total stats for today (On Duty: staff who have actually checked in and are not absent/off/suspended)
  const totalWorkingStaff = attendanceRecords.filter(
    (r) => Boolean(r.checkInTime) && !r.isAbsent && !r.isDayOff && !r.isSuspended
  ).length;
  const totalLDToday = ldLogs.reduce((sum, log) => sum + log.amount, 0);

  return (
    <div className="min-h-screen bg-[#0b0e17] text-slate-100 font-sans flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Header & Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        totalWorkingStaff={totalWorkingStaff}
        totalLDToday={totalLDToday}
        onOpenStaffManager={() => setIsStaffModalOpen(true)}
        onOpenAdminManager={() => setIsAdminModalOpen(true)}
        onResetDemoData={handleResetDemoData}
        onLogout={handleLogout}
        onBackupData={handleBackupData}
        onRestoreData={handleRestoreData}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'attendance' && currentUser.permissions.canAccessAttendance && (
          <AttendanceTab
            dateStr={selectedDate}
            attendanceRecords={attendanceRecords}
            staffList={staffList}
            onUpdateRecord={handleUpdateAttendance}
            onRefreshDate={refreshData}
          />
        )}

        {currentTab === 'ld' && currentUser.permissions.canAccessLD && (
          <LDTrackingTab
            dateStr={selectedDate}
            ldLogs={ldLogs}
            staffList={staffList}
            onAddLog={handleAddLDLog}
            onDeleteLog={handleDeleteLDLog}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'report' && currentUser.permissions.canAccessReport && (
          <DailyReportTab
            dateStr={selectedDate}
            setDateStr={setSelectedDate}
            attendanceRecords={attendanceRecords}
            ldLogs={ldLogs}
            staffList={staffList}
          />
        )}
        {currentTab === 'checklist' && currentUser.permissions.canAccessReport && (
          <ChecklistTab
            dateStr={selectedDate}
          />
        )}
      </main>

      {/* Roster Management Modal */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onSaveStaffList={handleSaveStaffList}
      />

      {/* Admin Management Modal */}
      {isAdminModalOpen && (
        <AdminManagerModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Lounge Footer */}
      <footer className="border-t border-slate-900 bg-[#080a12] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            🎵 Live Music Lounge Staff & LD Electronic Management System
          </span>
          <span className="text-[11px] text-slate-600">
            Data is securely auto-saved to browser LocalStorage.
          </span>
        </div>
      </footer>
    </div>
  );
}
