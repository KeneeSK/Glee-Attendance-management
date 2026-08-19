
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { calculateWorkingTime } from './time';

async function syncToFirestore(collectionName: string, data: any) {
  try {
    await setDoc(doc(db, 'loungeData', collectionName), { data });
  } catch (err) {
    console.warn('Firestore sync warning:', err);
  }
}

import { Staff, AttendanceRecord, LDLogEntry, AdminUser, DailyChecklist } from '../types';
import { DEFAULT_STAFF_LIST, PRESET_TABLES, generateInitialAttendance, generateInitialLDLogs, getTodayDateString } from './initialData';

const KEYS = {
  STAFF: 'lounge_staff_v2',
  ATTENDANCE: 'lounge_attendance_v2',
  LD_LOGS: 'lounge_ld_logs_v2',
  TABLES: 'lounge_tables_v2',
  ADMINS: 'lounge_admins_v2',
  CHECKLISTS: 'lounge_checklists_v2',
};

const DEFAULT_ADMIN: AdminUser = {
  id: 'adm-01',
  username: 'admin',
  password: 'admin123',
  name: 'Super Admin',
  role: 'super',
  permissions: {
    canAccessAttendance: true,
    canAccessLD: true,
    canAccessReport: true,
    canManageStaff: true,
    canManageAdmins: true,
  },
  createdAt: new Date().toISOString(),
};

export function loadAdmins(): AdminUser[] {
  try {
    const data = localStorage.getItem(KEYS.ADMINS);
    if (!data) {
      localStorage.setItem(KEYS.ADMINS, JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load admins:', err);
    return [DEFAULT_ADMIN];
  }
}

export function saveAdmins(admins: AdminUser[]): void {
  try {
    localStorage.setItem(KEYS.ADMINS, JSON.stringify(admins));
    syncToFirestore('admins', admins);
  } catch (err) {
    console.error('Failed to save admins:', err);
  }
}

export function loadTableList(): string[] {
  try {
    const data = localStorage.getItem(KEYS.TABLES);
    if (!data) {
      localStorage.setItem(KEYS.TABLES, JSON.stringify(PRESET_TABLES));
      return PRESET_TABLES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load table list:', err);
    return PRESET_TABLES;
  }
}

export function saveTableList(tables: string[]): void {
  try {
    localStorage.setItem(KEYS.TABLES, JSON.stringify(tables));
    syncToFirestore('tables', tables);
  } catch (err) {
    console.error('Failed to save table list:', err);
  }
}

export function addTable(tableName: string): string[] {
  const name = tableName.trim().toUpperCase();
  if (!name) return loadTableList();
  const tables = loadTableList();
  if (!tables.includes(name)) {
    const updated = [...tables, name];
    saveTableList(updated);
    return updated;
  }
  return tables;
}

export function renameTable(oldName: string, newName: string): { updatedTables: string[]; logsUpdated: boolean } {
  const trimmedNew = newName.trim().toUpperCase();
  if (!trimmedNew || oldName === trimmedNew) return { updatedTables: loadTableList(), logsUpdated: false };
  
  const tables = loadTableList();
  const index = tables.indexOf(oldName);
  let updatedTables = tables;
  if (index >= 0) {
    updatedTables = [...tables];
    updatedTables[index] = trimmedNew;
    saveTableList(updatedTables);
  } else if (!tables.includes(trimmedNew)) {
    updatedTables = [...tables, trimmedNew];
    saveTableList(updatedTables);
  }

  // Update tableNo in existing LD logs
  const allLogs = loadAllLDLogs();
  let logsUpdated = false;
  const updatedLogs = allLogs.map((log) => {
    if (log.tableNo === oldName) {
      logsUpdated = true;
      return { ...log, tableNo: trimmedNew };
    }
    return log;
  });

  if (logsUpdated) {
    saveAllLDLogs(updatedLogs);
  }

  return { updatedTables, logsUpdated };
}

export function deleteTable(tableName: string): string[] {
  const tables = loadTableList();
  const updated = tables.filter((t) => t !== tableName);
  saveTableList(updated);
  return updated;
}

export function loadStaffList(): Staff[] {
  try {
    const data = localStorage.getItem(KEYS.STAFF);
    if (!data) {
      localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF_LIST));
      return DEFAULT_STAFF_LIST;
    }
    const parsed: Staff[] = JSON.parse(data);
    // Auto-refresh if local storage still has old default staff (e.g., ABBY or old IDs)
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((s) => s.id?.startsWith('st-') || (s.id === 'STF-01' && s.name === 'ABBY'))) {
      localStorage.setItem(KEYS.STAFF, JSON.stringify(DEFAULT_STAFF_LIST));
      return DEFAULT_STAFF_LIST;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load staff list from localStorage:', err);
    return DEFAULT_STAFF_LIST;
  }
}

export function saveStaffList(staffList: Staff[]): void {
  try {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
    syncToFirestore('staff', staffList);
  } catch (err) {
    console.error('Failed to save staff list:', err);
  }
}

export function loadAllAttendance(): AttendanceRecord[] {
  try {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    if (!data) {
      const today = getTodayDateString();
      const staff = loadStaffList();
      const initial = generateInitialAttendance(today, staff);
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load attendance:', err);
    return [];
  }
}

export function saveAllAttendance(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
    syncToFirestore('attendance', records);
  } catch (err) {
    console.error('Failed to save attendance:', err);
  }
}

export function getAttendanceForDate(dateStr: string): AttendanceRecord[] {
  const all = loadAllAttendance();
  const dateRecords = all.filter((r) => r.date === dateStr);
  const activeStaff = loadStaffList().filter((s) => s.active);
  const activeStaffMap = new Map<string, Staff>(activeStaff.map((s) => [s.id, s]));

  let updated = false;
  const resultMap = new Map<string, AttendanceRecord>();

  // Filter existing records for this date to only keep active staff members
  dateRecords.forEach((rec) => {
    if (activeStaffMap.has(rec.staffId)) {
      resultMap.set(rec.staffId, rec);
    }
  });

  // Ensure every active staff member has a valid record for this date
  activeStaff.forEach((staff) => {
    if (!resultMap.has(staff.id)) {
      const newRec: AttendanceRecord = {
        id: `att_${dateStr}_${staff.id}`,
        date: dateStr,
        staffId: staff.id,
        staffName: staff.name,
        schedule: staff.defaultSchedule,
        checkInTime: '',
        checkOutTime: '',
        isLate: false,
        isAbsent: false,
        isDayOff: false,
        isSuspended: false,
        note: '',
        updatedAt: new Date().toISOString(),
      };
      resultMap.set(staff.id, newRec);
      updated = true;
    } else {
      // Just update the staffName to keep it in sync with Staff Manager changes,
      // but DO NOT revert the 'schedule' which might have been manually changed!
      const existing = resultMap.get(staff.id)!;
      if (existing.staffName !== staff.name) {
        existing.staffName = staff.name;
        updated = true;
      }
    }
  });

  const otherDatesRecords = all.filter((r) => r.date !== dateStr);
  const currentActiveDateRecords = activeStaff.map((staff) => resultMap.get(staff.id)!);
  const cleanedAll = [...otherDatesRecords, ...currentActiveDateRecords];

  if (updated || cleanedAll.length !== all.length) {
    saveAllAttendance(cleanedAll);
  }

  return currentActiveDateRecords;
}

export function updateAttendanceRecord(updatedRecord: AttendanceRecord): void {
  const all = loadAllAttendance();
  const index = all.findIndex((r) => r.id === updatedRecord.id);
  if (index >= 0) {
    all[index] = { ...updatedRecord, updatedAt: new Date().toISOString() };
  } else {
    all.push({ ...updatedRecord, updatedAt: new Date().toISOString() });
  }
  saveAllAttendance(all);
}

export function loadAllLDLogs(): LDLogEntry[] {
  try {
    const data = localStorage.getItem(KEYS.LD_LOGS);
    if (!data) {
      const today = getTodayDateString();
      const staff = loadStaffList();
      const initial = generateInitialLDLogs(today, staff);
      localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load LD logs:', err);
    return [];
  }
}

export function saveAllLDLogs(logs: LDLogEntry[]): void {
  try {
    localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(logs));
    syncToFirestore('ldLogs', logs);
  } catch (err) {
    console.error('Failed to save LD logs:', err);
  }
}

function mergeClientAndServerById<T extends { id: string }>(localArr: T[], serverArr: T[]): T[] {
  const map = new Map<string, T>();
  if (Array.isArray(localArr)) {
    for (const item of localArr) {
      if (item && item.id) map.set(item.id, item);
    }
  }
  if (Array.isArray(serverArr)) {
    for (const item of serverArr) {
      if (item && item.id) {
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          map.set(item.id, { ...existing, ...item });
        }
      }
    }
  }
  return Array.from(map.values());
}

// Fetch database from Express server API and hydrate client state

export async function fetchServerDatabase(): Promise<boolean> {
  try {
    const collections = [
      { id: 'admins', key: KEYS.ADMINS },
      { id: 'tables', key: KEYS.TABLES },
      { id: 'staff', key: KEYS.STAFF },
      { id: 'attendance', key: KEYS.ATTENDANCE },
      { id: 'ldLogs', key: KEYS.LD_LOGS },
      { id: 'checklists', key: KEYS.CHECKLISTS },
    ];
    let fetched = false;
    for (const c of collections) {
      const snapshot = await getDoc(doc(db, 'loungeData', c.id));
      if (snapshot.exists()) {
        const data = snapshot.data().data;
        if (Array.isArray(data)) {
          localStorage.setItem(c.key, JSON.stringify(data));
          fetched = true;
        }
      }
    }
    return fetched;
  } catch (err) {
    console.warn('Could not fetch server database:', err);
  }
  return false;
}


export function subscribeToServerDatabase(onUpdate: () => void): () => void {
  const collections = [
    { id: 'admins', key: KEYS.ADMINS },
    { id: 'tables', key: KEYS.TABLES },
    { id: 'staff', key: KEYS.STAFF },
    { id: 'attendance', key: KEYS.ATTENDANCE },
    { id: 'ldLogs', key: KEYS.LD_LOGS },
  ];

  const unsubscribes = collections.map(c => {
    return onSnapshot(doc(db, 'loungeData', c.id), (snapshot) => {
      // Remove the hasPendingWrites return to ensure we ALWAYS sync state correctly
      if (snapshot.exists()) {
        const data = snapshot.data().data;
        if (Array.isArray(data)) {
          const currentData = localStorage.getItem(c.key);
          const newDataStr = JSON.stringify(data);
          
          // Simple deep comparison to prevent infinite loops even if Firestore reorders keys
          const isDifferent = (() => {
            if (!currentData) return true;
            try {
              const parsedCurrent = JSON.parse(currentData);
              // Compare stringified versions of sorted representations, or just stringify the parsed
              // A quick heuristic: if lengths differ greatly, they are different.
              // For a robust check without a library, we can just assume if the stringified versions match, they are identical.
              // If not, we do a JSON.stringify(parsedCurrent) to normalize spacing.
              if (JSON.stringify(parsedCurrent) === newDataStr) return false;
              
              // To handle key reordering:
              const normalize = (obj: any): any => {
                if (Array.isArray(obj)) return obj.map(normalize);
                if (obj !== null && typeof obj === 'object') {
                  return Object.keys(obj).sort().reduce((acc, key) => {
                    acc[key] = normalize(obj[key]);
                    return acc;
                  }, {} as any);
                }
                return obj;
              };
              
              return JSON.stringify(normalize(parsedCurrent)) !== JSON.stringify(normalize(data));
            } catch (e) {
              return true;
            }
          })();

          if (isDifferent) {
            localStorage.setItem(c.key, newDataStr);
            onUpdate();
          }
        }
      }
    }, (error) => {
      console.error(`Firebase snapshot error for ${c.id}:`, error);
    });
  });

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}



export function getLDLogsForDate(dateStr: string): LDLogEntry[] {
  const all = loadAllLDLogs();
  return all.filter((log) => log.date === dateStr);
}

export function addLDLogEntry(entry: Omit<LDLogEntry, 'id' | 'createdAt'>): LDLogEntry {
  const all = loadAllLDLogs();
  const newEntry: LDLogEntry = {
    ...entry,
    id: `ld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  saveAllLDLogs([...all, newEntry]);
  return newEntry;
}

export function resetAllDataToDemo(): void {
  const today = getTodayDateString();
  saveStaffList(DEFAULT_STAFF_LIST);
  const initialAttendance = generateInitialAttendance(today, DEFAULT_STAFF_LIST);
  saveAllAttendance(initialAttendance);
  const initialLDs = generateInitialLDLogs(today, DEFAULT_STAFF_LIST);
  saveAllLDLogs(initialLDs);
  saveAllChecklists([]);
}

// Backup & Snapshot functionality for data protection
export function backupAllDataToLocalStorage(): void {
  try {
    const backupObj = {
      timestamp: new Date().toISOString(),
      staff: loadStaffList(),
      attendance: loadAllAttendance(),
      ldLogs: loadAllLDLogs(),
      tables: loadTableList(),
      admins: loadAdmins(),
      checklists: loadAllChecklists(),
    };
    localStorage.setItem('lounge_auto_backup_v1', JSON.stringify(backupObj));
  } catch (err) {
    console.error('Failed to create auto backup:', err);
  }
}

// Export complete data to JSON file
export function exportDatabaseJSON(): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    staff: loadStaffList(),
    attendance: loadAllAttendance(),
    ldLogs: loadAllLDLogs(),
    tables: loadTableList(),
    admins: loadAdmins(),
    checklists: loadAllChecklists(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Lounge_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import complete data from JSON string
export function importDatabaseJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;

    // Create a safety backup of existing data first
    backupAllDataToLocalStorage();

    if (Array.isArray(parsed.staff)) saveStaffList(parsed.staff);
    if (Array.isArray(parsed.attendance)) saveAllAttendance(parsed.attendance);
    if (Array.isArray(parsed.ldLogs)) saveAllLDLogs(parsed.ldLogs);
    if (Array.isArray(parsed.tables)) saveTableList(parsed.tables);
    if (Array.isArray(parsed.admins)) saveAdmins(parsed.admins);
    if (Array.isArray(parsed.checklists)) saveAllChecklists(parsed.checklists);

    return true;
  } catch (err) {
    console.error('Failed to import database JSON:', err);
    return false;
  }
}

// CSV Export Generator with UTF-8 BOM
export function loadAllChecklists(): DailyChecklist[] {
  try {
    const data = localStorage.getItem(KEYS.CHECKLISTS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load checklists:', err);
    return [];
  }
}

export function saveAllChecklists(checklists: DailyChecklist[]): void {
  try {
    localStorage.setItem(KEYS.CHECKLISTS, JSON.stringify(checklists));
    syncToFirestore('checklists', checklists);
  } catch (err) {
    console.error('Failed to save checklists:', err);
  }
}

export function getChecklistForDate(dateStr: string): DailyChecklist {
  const all = loadAllChecklists();
  return all.find((c) => c.date === dateStr) || { date: dateStr, checkedItems: [], remarks: '', updatedAt: new Date().toISOString() };
}

export function saveChecklistForDate(checklist: DailyChecklist): void {
  const all = loadAllChecklists();
  const index = all.findIndex((c) => c.date === checklist.date);
  
  if (index >= 0) {
    all[index] = checklist;
  } else {
    all.push(checklist);
  }
  
  saveAllChecklists(all);
}

export function downloadDailyReportCSV(dateStr: string) {
  const staffList = loadStaffList();
  const attendanceList = getAttendanceForDate(dateStr);
  const ldLogs = getLDLogsForDate(dateStr);

  // Compute staff LD summaries for this date
  const staffSummaryMap = new Map<string, { totalLD: number; tables: Set<string> }>();
  ldLogs.forEach((log) => {
    const existing = staffSummaryMap.get(log.staffId) || { totalLD: 0, tables: new Set<string>() };
    existing.totalLD += log.amount;
    if (log.tableNo) existing.tables.add(log.tableNo);
    staffSummaryMap.set(log.staffId, existing);
  });

  const lines: string[] = [];

  // Title section
  lines.push(`"=== Live Music Lounge Daily Report (${dateStr}) ==="`);
  lines.push(`"Report Generated At: ${new Date().toLocaleString('en-US')}"`);
  lines.push('');

  // 1. Staff Attendance & LD Summary Section
  lines.push('"1. Staff Attendance & Cumulative LD Sales"');
  lines.push('"Staff ID","Staff Name","Role","Schedule","Status","Is Late","Is Absent","Is Day Off","Is Suspended","Check In","Check Out","Working Hours","Total LD Drinks","Assigned Tables","Notes"');

  staffList.forEach((staff) => {
    const att = attendanceList.find((a) => a.staffId === staff.id);
    const ldInfo = staffSummaryMap.get(staff.id) || { totalLD: 0, tables: new Set<string>() };

    let statusStr = 'Present';
    if (att) {
      if (att.isAbsent) statusStr = 'Absent';
      else if (att.isSuspended) statusStr = 'Suspended';
      else if (att.isDayOff) statusStr = 'Day Off';
      else if (att.isLate) statusStr = 'Late';
    } else {
      statusStr = 'Unregistered';
    }

    const tablesStr = Array.from(ldInfo.tables).join(', ') || '-';
    const isLateStr = att?.isLate ? 'Y' : 'N';
    const isAbsentStr = att?.isAbsent ? 'Y' : 'N';
    const isDayOffStr = att?.isDayOff ? 'Y' : 'N';
    const isSuspendedStr = att?.isSuspended ? 'Y' : 'N';
    const checkIn = att?.checkInTime || '-';
    const checkOut = att?.checkOutTime || '-';
    const note = (att?.note || '').replace(/"/g, '""');

    const workingHours = (att?.checkInTime && att?.checkOutTime) ? calculateWorkingTime(att.checkInTime, att.checkOutTime) : '-';
    lines.push(
      `"${staff.id}","${staff.name}","${staff.role}","${att?.schedule || staff.defaultSchedule}","${statusStr}","${isLateStr}","${isAbsentStr}","${isDayOffStr}","${isSuspendedStr}","${checkIn}","${checkOut}","${workingHours}","${ldInfo.totalLD}","${tablesStr}","${note}"`
    );
  });

  lines.push('');

  // 2. Table Summary Section
  lines.push('"2. Table LD Sales Summary"');
  lines.push('"Table No","Total LD Count","Assigned Staff","Total Entries"');

  const tableMap = new Map<string, { totalLD: number; staffSet: Set<string>; logCount: number }>();
  ldLogs.forEach((log) => {
    const existing = tableMap.get(log.tableNo) || { totalLD: 0, staffSet: new Set<string>(), logCount: 0 };
    existing.totalLD += log.amount;
    existing.staffSet.add(log.staffName);
    existing.logCount += 1;
    tableMap.set(log.tableNo, existing);
  });

  tableMap.forEach((val, tableNo) => {
    const staffNamesStr = Array.from(val.staffSet).join(', ');
    lines.push(`"${tableNo}","${val.totalLD}","${staffNamesStr}","${val.logCount}"`);
  });

  lines.push('');

  // 3. Detailed Timestamp Logs
  lines.push('"3. Timestamped LD Log Timeline"');
  lines.push('"Log ID","Timestamp","Table No","Staff ID","Staff Name","Drink Amount","Drink Type"');

  ldLogs.forEach((log) => {
    lines.push(
      `"${log.id}","${log.timestamp}","${log.tableNo}","${log.staffId}","${log.staffName}","${log.amount > 0 ? '+' + log.amount : log.amount}","${log.drinkType || 'Standard LD'}"`
    );
  });

  // Convert to CSV String with UTF-8 BOM
  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Lounge_Daily_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
