import { Staff, AttendanceRecord, LDLogEntry } from '../types';
import { DEFAULT_STAFF_LIST, PRESET_TABLES, generateInitialAttendance, generateInitialLDLogs, getTodayDateString } from './initialData';

const KEYS = {
  STAFF: 'lounge_staff_v2',
  ATTENDANCE: 'lounge_attendance_v2',
  LD_LOGS: 'lounge_ld_logs_v2',
  TABLES: 'lounge_tables_v2',
};

export function loadTableList(): string[] {
  try {
    const data = localStorage.getItem(KEYS.TABLES);
    if (!data) {
      saveTableList(PRESET_TABLES);
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
    // Asynchronously push to server DB
    fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables }),
    }).catch((err) => console.warn('Server DB sync warning:', err));
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
      saveStaffList(DEFAULT_STAFF_LIST);
      return DEFAULT_STAFF_LIST;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load staff list from localStorage:', err);
    return DEFAULT_STAFF_LIST;
  }
}

export function saveStaffList(staffList: Staff[]): void {
  try {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
    fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff: staffList }),
    }).catch((err) => console.warn('Server DB sync warning:', err));
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
      saveAllAttendance(initial);
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
    fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance: records }),
    }).catch((err) => console.warn('Server DB sync warning:', err));
  } catch (err) {
    console.error('Failed to save attendance:', err);
  }
}

export function getAttendanceForDate(dateStr: string): AttendanceRecord[] {
  const all = loadAllAttendance();
  const filtered = all.filter((r) => r.date === dateStr);
  
  // If no attendance records exist for this date yet, initialize from active staff list
  if (filtered.length === 0) {
    const staffList = loadStaffList().filter((s) => s.active);
    const newRecords: AttendanceRecord[] = staffList.map((staff) => ({
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
    }));
    
    saveAllAttendance([...all, ...newRecords]);
    return newRecords;
  }
  
  return filtered;
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
      saveAllLDLogs(initial);
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
    fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ldLogs: logs }),
    }).catch((err) => console.warn('Server DB sync warning:', err));
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

// Fetch database from Express server API and hydrate client state with smart merge
export async function fetchServerDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/db');
    if (!res.ok) return false;
    const json = await res.json();
    if (json.success && json.data) {
      const { staff: serverStaff, tables: serverTables, attendance: serverAttendance, ldLogs: serverLdLogs } = json.data;

      // Load current local data
      const localStaff = loadStaffList();
      const localTables = loadTableList();
      const localAttendance = loadAllAttendance();
      const localLdLogs = loadAllLDLogs();

      // Smart Merge Staff
      const mergedStaff = mergeClientAndServerById(localStaff, Array.isArray(serverStaff) ? serverStaff : []);
      localStorage.setItem(KEYS.STAFF, JSON.stringify(mergedStaff));

      // Smart Merge Tables
      const tablesSet = new Set<string>([...localTables, ...(Array.isArray(serverTables) ? serverTables : [])]);
      const mergedTables = Array.from(tablesSet);
      localStorage.setItem(KEYS.TABLES, JSON.stringify(mergedTables));

      // Smart Merge Attendance
      const mergedAttendance = mergeClientAndServerById(localAttendance, Array.isArray(serverAttendance) ? serverAttendance : []);
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(mergedAttendance));

      // Smart Merge LD Logs
      const mergedLdLogs = mergeClientAndServerById(localLdLogs, Array.isArray(serverLdLogs) ? serverLdLogs : []);
      localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(mergedLdLogs));

      // Push merged back to server if local had items server didn't have
      if (
        (localAttendance.length > 0 && (!serverAttendance || serverAttendance.length < localAttendance.length)) ||
        (localLdLogs.length > 0 && (!serverLdLogs || serverLdLogs.length < localLdLogs.length))
      ) {
        fetch('/api/db/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff: mergedStaff,
            tables: mergedTables,
            attendance: mergedAttendance,
            ldLogs: mergedLdLogs,
          }),
        }).catch(() => {});
      }

      return true;
    }
  } catch (err) {
    console.warn('Could not fetch server database (running offline or standalone):', err);
  }
  return false;
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

    return true;
  } catch (err) {
    console.error('Failed to import database JSON:', err);
    return false;
  }
}

// CSV Export Generator with UTF-8 BOM
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
  lines.push('"Staff ID","Staff Name","Role","Schedule","Status","Is Late","Is Absent","Is Day Off","Is Suspended","Check In","Check Out","Total LD Drinks","Assigned Tables","Notes"');

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

    lines.push(
      `"${staff.id}","${staff.name}","${staff.role}","${att?.schedule || staff.defaultSchedule}","${statusStr}","${isLateStr}","${isAbsentStr}","${isDayOffStr}","${isSuspendedStr}","${checkIn}","${checkOut}","${ldInfo.totalLD}","${tablesStr}","${note}"`
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
