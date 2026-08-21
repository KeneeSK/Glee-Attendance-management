
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { calculateWorkingTime } from './time';
import { Staff, AttendanceRecord, LDLogEntry, AdminUser, DailyChecklist, InventoryCategory, InventoryItem, DailyInventoryLog } from '../types';
import { DEFAULT_STAFF_LIST, PRESET_TABLES, generateInitialAttendance, generateInitialLDLogs, getTodayDateString } from './initialData';

const KEYS = {
  STAFF: 'lounge_staff_v2',
  ATTENDANCE: 'lounge_attendance_v2',
  LD_LOGS: 'lounge_ld_logs_v2',
  TABLES: 'lounge_tables_v2',
  ADMINS: 'lounge_admins_v2',
  CHECKLISTS: 'lounge_checklists_v2',
  INVENTORY_CATEGORIES: 'lounge_inventory_categories_v1',
  INVENTORY_ITEMS: 'lounge_inventory_items_v1',
  INVENTORY_LOGS: 'lounge_inventory_logs_v1',
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
    
    // Clean up status conflicts: if Day Off / Absent / Suspended, clear times and late flag
    let cleanRecord = { ...r };
    if (cleanRecord.isDayOff || cleanRecord.isAbsent || cleanRecord.isSuspended) {
      cleanRecord = {
        ...cleanRecord,
        checkInTime: '',
        checkOutTime: '',
        isLate: false,
      };
    }

    const normalizedRec: AttendanceRecord = {
      ...cleanRecord,
      date: normDate,
      id: cleanRecord.id || `att_${normDate}_${cleanRecord.staffId}`,
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
        });
      } else {
        map.set(key, {
          ...normalizedRec,
          ...existing,
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
    canManageInventory: true,
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
    // 1. Primary key
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeAttendanceRecords([], parsed);
        }
      } catch (e) {
        console.error('Parse primary attendance error:', e);
      }
    }

    // 2. Auto backup fallback (only if primary is empty)
    const autoBackup = localStorage.getItem('lounge_auto_backup_v1');
    if (autoBackup) {
      try {
        const parsedBackup = JSON.parse(autoBackup);
        if (Array.isArray(parsedBackup?.attendance) && parsedBackup.attendance.length > 0) {
          const res = mergeAttendanceRecords([], parsedBackup.attendance);
          localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(res));
          return res;
        }
      } catch (e) {
        console.error('Parse auto backup attendance error:', e);
      }
    }

    // 3. Legacy v1 key fallback
    const v1Data = localStorage.getItem('lounge_attendance_v1');
    if (v1Data) {
      try {
        const parsedV1 = JSON.parse(v1Data);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          const res = mergeAttendanceRecords([], parsedV1);
          localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(res));
          return res;
        }
      } catch (e) {
        console.error('Parse v1 attendance error:', e);
      }
    }

    // If completely empty, generate today's initial skeleton
    const today = getTodayDateString();
    const staff = loadStaffList();
    const initial = generateInitialAttendance(today, staff);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(initial));
    return initial;
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
  let clean = { ...updatedRecord };
  if (clean.isDayOff || clean.isAbsent || clean.isSuspended) {
    clean = { ...clean, checkInTime: '', checkOutTime: '', isLate: false };
  }
  const normalized: AttendanceRecord = {
    ...clean,
    date: normDate,
    id: clean.id || `att_${normDate}_${clean.staffId}`,
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

export function batchUpdateAttendanceRecords(recordsToUpdate: AttendanceRecord[]): void {
  if (!Array.isArray(recordsToUpdate) || recordsToUpdate.length === 0) return;
  const nowStr = new Date().toISOString();
  const normalizedList: AttendanceRecord[] = recordsToUpdate.map((r) => {
    const normDate = normalizeDateStr(r.date);
    let clean = { ...r };
    if (clean.isDayOff || clean.isAbsent || clean.isSuspended) {
      clean = { ...clean, checkInTime: '', checkOutTime: '', isLate: false };
    }
    return {
      ...clean,
      date: normDate,
      id: clean.id || `att_${normDate}_${clean.staffId}`,
      updatedAt: nowStr,
    };
  });

  const all = loadAllAttendance();
  const merged = mergeAttendanceRecords(all, normalizedList);
  saveAllAttendance(merged);
}

export function loadAllLDLogs(): LDLogEntry[] {
  try {
    // 1. Primary key
    const data = localStorage.getItem(KEYS.LD_LOGS);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeLDLogs([], parsed);
        }
      } catch (e) {
        console.error('Parse primary LD logs error:', e);
      }
    }

    // 2. Auto backup fallback
    const autoBackup = localStorage.getItem('lounge_auto_backup_v1');
    if (autoBackup) {
      try {
        const parsedBackup = JSON.parse(autoBackup);
        if (Array.isArray(parsedBackup?.ldLogs) && parsedBackup.ldLogs.length > 0) {
          const res = mergeLDLogs([], parsedBackup.ldLogs);
          localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(res));
          return res;
        }
      } catch (e) {
        console.error('Parse backup LD logs error:', e);
      }
    }

    // 3. Legacy v1 key fallback
    const v1Data = localStorage.getItem('lounge_ld_logs_v1');
    if (v1Data) {
      try {
        const parsedV1 = JSON.parse(v1Data);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          const res = mergeLDLogs([], parsedV1);
          localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(res));
          return res;
        }
      } catch (e) {
        console.error('Parse v1 LD logs error:', e);
      }
    }

    const today = getTodayDateString();
    const staff = loadStaffList();
    const initial = generateInitialLDLogs(today, staff);
    localStorage.setItem(KEYS.LD_LOGS, JSON.stringify(initial));
    return initial;
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
      { id: 'inventoryCategories', key: KEYS.INVENTORY_CATEGORIES },
      { id: 'inventoryItems', key: KEYS.INVENTORY_ITEMS },
      { id: 'inventoryLogs', key: KEYS.INVENTORY_LOGS },
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
  const staff = loadStaffList();
  const attendance = loadAllAttendance();
  const ldLogs = loadAllLDLogs();
  const tables = loadTableList();
  const admins = loadAdmins();
  const checklists = loadAllChecklists();

  const data = {
    system: 'GLEE ANGELS Management System',
    author: 'KENEE',
    schemaVersion: '2.0',
    exportedAt: new Date().toISOString(),
    databaseId: 'ai-studio-gleeangelsmusicl-0f06ef10-f1df-484b-84e4-1ca2d14c8925',
    summary: {
      totalStaff: staff.length,
      totalAttendanceRecords: attendance.length,
      totalLDLogs: ldLogs.length,
      totalTables: tables.length,
      totalAdmins: admins.length,
      totalChecklists: checklists.length,
    },
    staff,
    attendance,
    ldLogs,
    tables,
    admins,
    checklists,
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `GLEE_ANGELS_DB_BACKUP_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface DatabaseImportResult {
  success: boolean;
  message: string;
  counts?: {
    staff: number;
    attendance: number;
    ldLogs: number;
    tables: number;
    admins: number;
    checklists: number;
  };
  error?: string;
}

// Import complete data from JSON string with strict validation
export function importDatabaseJSON(jsonString: string): DatabaseImportResult {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON structure or file is corrupted.' };
    }

    // Create a safety backup of existing data first
    backupAllDataToLocalStorage();

    let staffCount = 0;
    let attCount = 0;
    let ldCount = 0;
    let tableCount = 0;
    let adminCount = 0;
    let checklistCount = 0;

    if (Array.isArray(parsed.staff) && parsed.staff.length > 0) {
      saveStaffList(parsed.staff);
      staffCount = parsed.staff.length;
    }
    if (Array.isArray(parsed.attendance)) {
      const sanitized = mergeAttendanceRecords([], parsed.attendance);
      saveAllAttendance(sanitized);
      attCount = sanitized.length;
    }
    if (Array.isArray(parsed.ldLogs)) {
      const sanitized = mergeLDLogs([], parsed.ldLogs);
      saveAllLDLogs(sanitized);
      ldCount = sanitized.length;
    }
    if (Array.isArray(parsed.tables) && parsed.tables.length > 0) {
      saveTableList(parsed.tables);
      tableCount = parsed.tables.length;
    }
    if (Array.isArray(parsed.admins) && parsed.admins.length > 0) {
      saveAdmins(parsed.admins);
      adminCount = parsed.admins.length;
    }
    if (Array.isArray(parsed.checklists)) {
      saveAllChecklists(parsed.checklists);
      checklistCount = parsed.checklists.length;
    }

    return {
      success: true,
      message: 'Database restored successfully without data loss.',
      counts: {
        staff: staffCount,
        attendance: attCount,
        ldLogs: ldCount,
        tables: tableCount,
        admins: adminCount,
        checklists: checklistCount,
      },
    };
  } catch (err: any) {
    console.error('Failed to import database JSON:', err);
    return {
      success: false,
      message: 'Failed to parse database backup file. Please verify JSON file format.',
      error: err?.message || String(err),
    };
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


export function loadInventoryCategories(): InventoryCategory[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory categories:', err);
  }
  // Initialize with defaults if empty based on user request image
  const defaultCats: InventoryCategory[] = [
    { id: 'cat-1', name: 'Drinks/Beverages', order: 1 },
    { id: 'cat-2', name: 'Beers', order: 2 },
    { id: 'cat-3', name: 'Soju', order: 3 },
    { id: 'cat-4', name: 'Liquor', order: 4 },
    { id: 'cat-5', name: 'Mixers & Others', order: 5 },
    { id: 'cat-6', name: 'Cigarettes / Misc', order: 6 },
  ];
  saveInventoryCategories(defaultCats);
  return defaultCats;
}

export function saveInventoryCategories(cats: InventoryCategory[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_CATEGORIES, JSON.stringify(cats));
    syncToFirestore('inventoryCategories', cats);
  } catch (err) {
    console.error('Failed to save inventory categories:', err);
  }
}

export function loadInventoryItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_ITEMS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory items:', err);
  }
  
  const defaultItems: InventoryItem[] = [
    { id: 'item-1', categoryId: 'cat-1', name: 'Coke in can', order: 1 },
    { id: 'item-2', categoryId: 'cat-1', name: 'Coke Zero in can', order: 2 },
    { id: 'item-3', categoryId: 'cat-1', name: 'Sprite in can', order: 3 },
    { id: 'item-4', categoryId: 'cat-1', name: 'Gatorade', order: 4 },
    { id: 'item-5', categoryId: 'cat-1', name: 'Mineral', order: 5 },
    { id: 'item-6', categoryId: 'cat-1', name: 'Mango Juice', order: 6 },
    { id: 'item-7', categoryId: 'cat-1', name: 'Pineapple Juice', order: 7 },
    { id: 'item-8', categoryId: 'cat-1', name: 'Redbull', order: 8 },
    { id: 'item-9', categoryId: 'cat-1', name: 'Soda Water in can', order: 9 },
    { id: 'item-10', categoryId: 'cat-1', name: 'Tonic Water in can', order: 10 },
    { id: 'item-11', categoryId: 'cat-1', name: 'Royal in can', order: 11 },
    
    { id: 'item-12', categoryId: 'cat-2', name: 'Corona', order: 1 },
    { id: 'item-13', categoryId: 'cat-2', name: 'Heineken', order: 2 },
    { id: 'item-14', categoryId: 'cat-2', name: 'Smirnoff Mule', order: 3 },
    
    { id: 'item-15', categoryId: 'cat-3', name: 'Chamisul', order: 1 },
    { id: 'item-16', categoryId: 'cat-3', name: 'Chumchurum', order: 2 },
    { id: 'item-17', categoryId: 'cat-3', name: 'Soju Is back', order: 3 },
    
    { id: 'item-18', categoryId: 'cat-4', name: 'SMA', order: 1 },
    { id: 'item-19', categoryId: 'cat-4', name: 'SMB', order: 2 },
    { id: 'item-20', categoryId: 'cat-4', name: 'SML', order: 3 },
    { id: 'item-21', categoryId: 'cat-4', name: 'STALLION', order: 4 },
    
    { id: 'item-22', categoryId: 'cat-5', name: 'Coke 1.5', order: 1 },
    { id: 'item-23', categoryId: 'cat-5', name: 'Sprite 1.5', order: 2 },
    { id: 'item-24', categoryId: 'cat-5', name: 'Cranberry Juice', order: 3 },
    { id: 'item-25', categoryId: 'cat-5', name: 'Fresh Milk', order: 4 },
    
    { id: 'item-26', categoryId: 'cat-6', name: 'Marlboro', order: 1 },
    { id: 'item-27', categoryId: 'cat-6', name: 'Esse Pop', order: 2 },
    { id: 'item-28', categoryId: 'cat-6', name: 'Mevius', order: 3 },
    { id: 'item-29', categoryId: 'cat-6', name: 'Lighter', order: 4 },
  ];
  saveInventoryItems(defaultItems);
  return defaultItems;
}

export function saveInventoryItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_ITEMS, JSON.stringify(items));
    syncToFirestore('inventoryItems', items);
  } catch (err) {
    console.error('Failed to save inventory items:', err);
  }
}

export function loadAllInventoryLogs(): DailyInventoryLog[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory logs:', err);
  }
  return [];
}

export function saveAllInventoryLogs(logs: DailyInventoryLog[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_LOGS, JSON.stringify(logs));
    syncToFirestore('inventoryLogs', logs);
  } catch (err) {
    console.error('Failed to save inventory logs:', err);
  }
}

export function loadInventoryLogForDate(date: string): DailyInventoryLog | null {
  const normDate = normalizeDateStr(date);
  const logs = loadAllInventoryLogs();
  return logs.find(l => l.date === normDate) || null;
}

export function updateInventoryLog(log: DailyInventoryLog): void {
  const logs = loadAllInventoryLogs();
  const idx = logs.findIndex(l => l.date === log.date);
  if (idx >= 0) {
    logs[idx] = log;
  } else {
    logs.push(log);
  }
  saveAllInventoryLogs(logs);
}
