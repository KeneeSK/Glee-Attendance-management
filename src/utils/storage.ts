
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { calculateWorkingTime } from './time';
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

export function normalizeDateStr(d: string): string {
  if (!d) return '';
  const trimmed = d.split('T')[0].trim();
  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return trimmed;
}

export function isAttendanceRecordPopulated(r: AttendanceRecord): boolean {
  if (!r) return false;
  return Boolean(
    (r.checkInTime && r.checkInTime.trim() !== '') ||
    (r.checkOutTime && r.checkOutTime.trim() !== '') ||
    r.isLate ||
    r.isAbsent ||
    r.isDayOff ||
    r.isSuspended ||
    (r.note && r.note.trim() !== '')
  );
}

export function mergeAttendanceRecords(listA: AttendanceRecord[], listB: AttendanceRecord[]): AttendanceRecord[] {
  const map = new Map<string, AttendanceRecord>();

  const processRecord = (r: AttendanceRecord) => {
    if (!r || !r.staffId) return;
    const normDate = normalizeDateStr(r.date);
    const key = `${normDate}_${r.staffId}`;
    const normalizedRec: AttendanceRecord = {
      ...r,
      date: normDate,
      id: r.id || `att_${normDate}_${r.staffId}`,
    };
    const existing = map.get(key);

    if (!existing) {
      map.set(key, normalizedRec);
      return;
    }

    const existingPopulated = isAttendanceRecordPopulated(existing);
    const newPopulated = isAttendanceRecordPopulated(normalizedRec);

    if (newPopulated && !existingPopulated) {
      map.set(key, { ...existing, ...normalizedRec });
    } else if (!newPopulated && existingPopulated) {
      map.set(key, { ...normalizedRec, ...existing, staffName: normalizedRec.staffName || existing.staffName });
    } else if (newPopulated && existingPopulated) {
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const newTime = normalizedRec.updatedAt ? new Date(normalizedRec.updatedAt).getTime() : 0;
      if (newTime >= existingTime) {
        map.set(key, {
          ...existing,
          ...normalizedRec,
          checkInTime: normalizedRec.checkInTime || existing.checkInTime,
          checkOutTime: normalizedRec.checkOutTime || existing.checkOutTime,
          note: normalizedRec.note || existing.note,
        });
      } else {
        map.set(key, {
          ...normalizedRec,
          ...existing,
          checkInTime: existing.checkInTime || normalizedRec.checkInTime,
          checkOutTime: existing.checkOutTime || normalizedRec.checkOutTime,
          note: existing.note || normalizedRec.note,
        });
      }
    } else {
      map.set(key, { ...existing, ...normalizedRec });
    }
  };

  if (Array.isArray(listA)) listA.forEach(processRecord);
  if (Array.isArray(listB)) listB.forEach(processRecord);

  return Array.from(map.values());
}

export function mergeLDLogs(listA: LDLogEntry[], listB: LDLogEntry[]): LDLogEntry[] {
  const map = new Map<string, LDLogEntry>();
  const addLog = (log: LDLogEntry) => {
    if (!log) return;
    const normDate = normalizeDateStr(log.date);
    const id = log.id || `ld_${normDate}_${log.staffId}_${log.timestamp}_${log.tableNo}`;
    if (!map.has(id)) {
      map.set(id, { ...log, id, date: normDate });
    }
  };
  if (Array.isArray(listA)) listA.forEach(addLog);
  if (Array.isArray(listB)) listB.forEach(addLog);
  return Array.from(map.values());
}

async function syncToFirestore(collectionName: string, data: any) {
  try {
    if (collectionName === 'attendance' && Array.isArray(data)) {
      try {
        const snap = await getDoc(doc(db, 'loungeData', 'attendance'));
        if (snap.exists()) {
          const serverData = snap.data()?.data;
          if (Array.isArray(serverData)) {
            const merged = mergeAttendanceRecords(serverData, data);
            await setDoc(doc(db, 'loungeData', 'attendance'), { data: merged, updatedAt: new Date().toISOString() });
            localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(merged));
            return;
          }
        }
      } catch (e) {
        console.warn('Firestore attendance merge check:', e);
      }
    } else if (collectionName === 'ldLogs' && Array.isArray(data)) {
      try {
        const snap = await getDoc(doc(db, 'loungeData', 'ldLogs'));
        if (snap.exists()) {
          const serverData = snap.data()?.data;
          if (Array.isArray(serverData)) {
            const merged = mergeLDLogs(serverData, data);
            await setDoc(doc(db, 'loungeData', 'ldLogs'), { data: merged, updatedAt: new Date().toISOString() });
            localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(merged));
            return;
          }
        }
      } catch (e) {
        console.warn('Firestore ldLogs merge check:', e);
      }
    }

    await setDoc(doc(db, 'loungeData', collectionName), { data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Firestore sync warning for ' + collectionName + ':', err);
  }
}

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
    let allRecords: AttendanceRecord[] = [];

    // 1. Primary key
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          allRecords = mergeAttendanceRecords(allRecords, parsed);
        }
      } catch (e) {
        console.error('Parse primary attendance error:', e);
      }
    }

    // 2. Auto backup
    const autoBackup = localStorage.getItem('lounge_auto_backup_v1');
    if (autoBackup) {
      try {
        const parsedBackup = JSON.parse(autoBackup);
        if (Array.isArray(parsedBackup?.attendance)) {
          allRecords = mergeAttendanceRecords(allRecords, parsedBackup.attendance);
        }
      } catch (e) {
        console.error('Parse auto backup attendance error:', e);
      }
    }

    // 3. Legacy v1 key
    const v1Data = localStorage.getItem('lounge_attendance_v1');
    if (v1Data) {
      try {
        const parsedV1 = JSON.parse(v1Data);
        if (Array.isArray(parsedV1)) {
          allRecords = mergeAttendanceRecords(allRecords, parsedV1);
        }
      } catch (e) {
        console.error('Parse v1 attendance error:', e);
      }
    }

    // If completely empty, generate today's initial skeleton
    if (allRecords.length === 0) {
      const today = getTodayDateString();
      const staff = loadStaffList();
      const initial = generateInitialAttendance(today, staff);
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(initial));
      return initial;
    }

    return allRecords;
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
  const normTargetDate = normalizeDateStr(dateStr);
  const all = loadAllAttendance();

  // Find existing records matching this target date (handling multiple date string variations)
  const dateRecords = all.filter((r) => {
    const normRecordDate = normalizeDateStr(r.date);
    return normRecordDate === normTargetDate || r.id?.startsWith(`att_${normTargetDate}_`);
  });

  const activeStaff = loadStaffList().filter((s) => s.active);
  const activeStaffMap = new Map<string, Staff>(activeStaff.map((s) => [s.id, s]));

  const resultMap = new Map<string, AttendanceRecord>();

  // Filter existing records for this date
  dateRecords.forEach((rec) => {
    if (activeStaffMap.has(rec.staffId)) {
      resultMap.set(rec.staffId, {
        ...rec,
        date: normTargetDate,
        staffName: activeStaffMap.get(rec.staffId)!.name,
      });
    }
  });

  // Provide transient default records for any active staff not yet entered for this date
  const currentActiveDateRecords = activeStaff.map((staff) => {
    if (resultMap.has(staff.id)) {
      return resultMap.get(staff.id)!;
    }
    return {
      id: `att_${normTargetDate}_${staff.id}`,
      date: normTargetDate,
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
  });

  return currentActiveDateRecords;
}

export function updateAttendanceRecord(updatedRecord: AttendanceRecord): void {
  const normDate = normalizeDateStr(updatedRecord.date);
  const normalized: AttendanceRecord = {
    ...updatedRecord,
    date: normDate,
    id: updatedRecord.id || `att_${normDate}_${updatedRecord.staffId}`,
    updatedAt: new Date().toISOString(),
  };

  const all = loadAllAttendance();
  const index = all.findIndex(
    (r) => r.id === normalized.id || (normalizeDateStr(r.date) === normDate && r.staffId === normalized.staffId)
  );

  let updatedAll: AttendanceRecord[];
  if (index >= 0) {
    updatedAll = [...all];
    updatedAll[index] = normalized;
  } else {
    updatedAll = [...all, normalized];
  }

  saveAllAttendance(updatedAll);
}

export function loadAllLDLogs(): LDLogEntry[] {
  try {
    let allLogs: LDLogEntry[] = [];

    // 1. Primary key
    const data = localStorage.getItem(KEYS.LD_LOGS);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          allLogs = mergeLDLogs(allLogs, parsed);
        }
      } catch (e) {
        console.error('Parse primary LD logs error:', e);
      }
    }

    // 2. Auto backup
    const autoBackup = localStorage.getItem('lounge_auto_backup_v1');
    if (autoBackup) {
      try {
        const parsedBackup = JSON.parse(autoBackup);
        if (Array.isArray(parsedBackup?.ldLogs)) {
          allLogs = mergeLDLogs(allLogs, parsedBackup.ldLogs);
        }
      } catch (e) {
        console.error('Parse backup LD logs error:', e);
      }
    }

    // 3. Legacy v1 key
    const v1Data = localStorage.getItem('lounge_ld_logs_v1');
    if (v1Data) {
      try {
        const parsedV1 = JSON.parse(v1Data);
        if (Array.isArray(parsedV1)) {
          allLogs = mergeLDLogs(allLogs, parsedV1);
        }
      } catch (e) {
        console.error('Parse v1 LD logs error:', e);
      }
    }

    if (allLogs.length === 0) {
      const today = getTodayDateString();
      const staff = loadStaffList();
      const initial = generateInitialLDLogs(today, staff);
      localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(initial));
      return initial;
    }

    return allLogs;
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

// Fetch database from Firestore and smart merge client state
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
          const currentData = localStorage.getItem(c.key);
          let mergedData = data;
          if (currentData) {
            try {
              const localParsed = JSON.parse(currentData);
              if (Array.isArray(localParsed)) {
                if (c.id === 'attendance') {
                  mergedData = mergeAttendanceRecords(localParsed, data);
                } else if (c.id === 'ldLogs') {
                  mergedData = mergeLDLogs(localParsed, data);
                } else if (c.id === 'checklists') {
                  const map = new Map<string, DailyChecklist>();
                  localParsed.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  data.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  mergedData = Array.from(map.values());
                }
              }
            } catch (e) {
              console.warn('Merge local error:', e);
            }
          }
          localStorage.setItem(c.key, JSON.stringify(mergedData));
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
    { id: 'checklists', key: KEYS.CHECKLISTS },
  ];

  const unsubscribes = collections.map(c => {
    return onSnapshot(doc(db, 'loungeData', c.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data().data;
        if (Array.isArray(data)) {
          const currentData = localStorage.getItem(c.key);
          let finalData = data;

          if (currentData) {
            try {
              const localParsed = JSON.parse(currentData);
              if (Array.isArray(localParsed)) {
                if (c.id === 'attendance') {
                  finalData = mergeAttendanceRecords(localParsed, data);
                } else if (c.id === 'ldLogs') {
                  finalData = mergeLDLogs(localParsed, data);
                } else if (c.id === 'checklists') {
                  const map = new Map<string, DailyChecklist>();
                  localParsed.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  data.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  finalData = Array.from(map.values());
                }
              }
            } catch (e) {
              console.warn('Subscription merge error:', e);
            }
          }

          const newDataStr = JSON.stringify(finalData);
          if (currentData !== newDataStr) {
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
  link.download = `Glee_Angels_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
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
  lines.push(`"=== GLEE ANGELS Daily Report (${dateStr}) ==="`);
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
  link.setAttribute('download', `GLEE_ANGELS_Daily_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
