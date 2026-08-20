
import {
  loadStaffList,
  loadAllAttendance,
  loadAllLDLogs,
  normalizeDateStr,
} from './storage';
import { calculateWorkingTime, parseTimeToMinutes } from './time';
import { Staff, AttendanceRecord, LDLogEntry } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

let cachedAccessToken: string | null = null;
let tokenClient: any = null;

const loadGSI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
};

const fetchUserProfile = async (accessToken: string) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
};


const SHEETS_CONFIG_KEY = 'glee_angels_google_sheets_config_v1';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  lastSyncedAt?: string;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  autoSyncEnabled?: boolean;
}

export function loadGoogleSheetsConfig(): GoogleSheetsConfig | null {
  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load Google Sheets config:', err);
    return null;
  }
}

export function saveGoogleSheetsConfig(config: Partial<GoogleSheetsConfig>): GoogleSheetsConfig {
  const existing = loadGoogleSheetsConfig() || {
    spreadsheetId: '',
    spreadsheetUrl: '',
    spreadsheetTitle: 'GLEE ANGELS - Management & Payroll Database',
  };
  const updated: GoogleSheetsConfig = { ...existing, ...config };
  localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGoogleSheetsConfig(): void {
  localStorage.removeItem(SHEETS_CONFIG_KEY);
  cachedAccessToken = null;
}

// Authentication Listeners
export const initGoogleAuthListener = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken && onAuthSuccess) {
    onAuthSuccess({ email: '', displayName: '', photoURL: '' }, cachedAccessToken);
  } else if (onAuthFailure) {
    onAuthFailure();
  }
};

export const signInWithGoogleAccount = async (): Promise<{ user: any; accessToken: string }> => {
  await loadGSI();
  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: GOOGLE_SHEETS_SCOPES.join(' '),
          callback: async (response: any) => {
            if (response.error !== undefined) {
              let msg = response.error;
              if (response.error === 'popup_closed_by_user') {
                msg = 'Sign-in popup was closed before completing authorization.';
              }
              reject(new Error(msg));
              return;
            }
            cachedAccessToken = response.access_token;
            try {
              const profile = await fetchUserProfile(cachedAccessToken!);
              saveGoogleSheetsConfig({
                userEmail: profile.email || '',
                userName: profile.name || '',
                userPhoto: profile.picture || '',
              });
              resolve({ 
                user: { email: profile.email, displayName: profile.name, photoURL: profile.picture, uid: profile.id }, 
                accessToken: cachedAccessToken! 
              });
            } catch (err) {
              reject(err);
            }
          },
        });
      }
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleAccount = async (): Promise<void> => {
  if (cachedAccessToken) {
    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        (window as any).google.accounts.oauth2.revoke(cachedAccessToken, () => {});
      }
    } catch (e) {
      console.warn('Revoke error', e);
    }
  }
  cachedAccessToken = null;
  clearGoogleSheetsConfig();
};// =========================================================================
// GOOGLE SHEETS API OPERATIONS
// =========================================================================

const REQUIRED_SHEET_NAMES = [
  'Attendance & Hours Ledger',
  'LD Sales Audit Trail',
  'Staff Master Database',
  'Payroll & Monthly Summary',
];

/**
 * Creates or retrieves a designated Google Spreadsheet with 4 pre-formatted sheets.
 */
export async function createOrConnectSpreadsheet(
  token: string,
  existingSpreadsheetId?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  // If user provided an existing spreadsheet ID, verify it
  if (existingSpreadsheetId && existingSpreadsheetId.trim() !== '') {
    const cleanId = existingSpreadsheetId.trim();
    const verifyRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      throw new Error(err?.error?.message || `Cannot access spreadsheet with ID ${cleanId}`);
    }

    const data = await verifyRes.json();
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
    
    // Ensure all 4 tabs exist
    const existingSheets = (data.sheets || []).map((s: any) => s.properties.title);
    const missingSheets = REQUIRED_SHEET_NAMES.filter((name) => !existingSheets.includes(name));

    if (missingSheets.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: missingSheets.map((title) => ({
            addSheet: { properties: { title } },
          })),
        }),
      });
    }

    const result = {
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl,
      title: data.properties?.title || 'GLEE ANGELS - Management & Payroll Database',
    };

    saveGoogleSheetsConfig(result);
    return result;
  }

  // Create a brand new Google Spreadsheet
  const title = 'GLEE ANGELS - Management & Payroll Database';
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'en_US',
        timeZone: 'Asia/Seoul',
      },
      sheets: REQUIRED_SHEET_NAMES.map((sheetTitle, index) => ({
        properties: {
          sheetId: index + 100,
          title: sheetTitle,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      })),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err?.error?.message || 'Failed to create Google Spreadsheet.');
  }

  const data = await createRes.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const result = {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };

  saveGoogleSheetsConfig(result);
  return result;
}

/**
 * Calculates decimal work hours from check-in and check-out strings
 */
function getDecimalHours(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inMin = parseTimeToMinutes(checkIn);
  const outMin = parseTimeToMinutes(checkOut);
  if (inMin < 0 || outMin < 0) return 0;
  let diff = outMin - inMin;
  if (diff < 0) diff += 24 * 60; // Next morning cross-midnight
  return Number((diff / 60).toFixed(2));
}

/**
 * Fully synchronizes all app state (Attendance, LD Logs, Staff Master, Payroll Summary)
 * into Google Sheets.
 */
export async function syncAllDataToGoogleSheets(
  token: string,
  spreadsheetId: string,
  onProgress?: (step: string) => void
): Promise<{
  success: boolean;
  spreadsheetUrl: string;
  syncedCounts: {
    attendance: number;
    ldLogs: number;
    staff: number;
    payrollSummaries: number;
  };
  timestamp: string;
}> {
  if (!token) throw new Error('Google OAuth access token is required.');
  if (!spreadsheetId) throw new Error('Target Google Spreadsheet ID is required.');

  const timestamp = new Date().toISOString();
  const formattedSyncTime = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  onProgress?.('Fetching all local database records...');
  const staffList = loadStaffList();
  const allAttendance = loadAllAttendance();
  const allLDLogs = loadAllLDLogs();

  const staffMap = new Map<string, Staff>();
  staffList.forEach((s) => staffMap.set(s.id, s));

  // -------------------------------------------------------------
  // 1. Sheet: "Attendance & Hours Ledger"
  // -------------------------------------------------------------
  onProgress?.('Formatting Attendance & Working Hours Ledger...');
  const attendanceHeaders = [
    'Date',
    'Staff ID',
    'Staff Name',
    'Role / Position',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Work Duration (HH:MM)',
    'Decimal Hours (for Payroll)',
    'LD Count',
    'Assigned Tables',
    'Manager Note',
    'Record ID',
    'Last Synced Timestamp',
  ];

  // Sort attendance records chronologically descending, then by staff ID
  const sortedAttendance = [...allAttendance].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.staffId.localeCompare(b.staffId);
  });

  // Calculate tables per staff for the attendance sheet
  const staffTablesForDateMap = new Map<string, string[]>();
  const staffLDCountForDateMap = new Map<string, number>();
  allLDLogs.forEach((log) => {
    if (!log.date || !log.staffId) return;
    const key = `${log.date}_${log.staffId}`;
    
    // LD count map
    const currCount = staffLDCountForDateMap.get(key) || 0;
    staffLDCountForDateMap.set(key, currCount + (log.amount || 0));

    // table map
    if (!log.tableNo) return;
    const list = staffTablesForDateMap.get(key) || [];
    if (!list.includes(log.tableNo)) {
      list.push(log.tableNo);
      staffTablesForDateMap.set(key, list);
    }
  });

  const attendanceRows = sortedAttendance.map((rec) => {
    const staff = staffMap.get(rec.staffId);
    let statusText = 'Pending';
    if (rec.isDayOff) statusText = 'DAY OFF';
    else if (rec.isAbsent) statusText = 'ABSENT';
    else if (rec.isSuspended) statusText = 'SUSPENDED';
    else if (rec.isLate && rec.checkInTime) statusText = 'LATE';
    else if (rec.checkInTime) statusText = 'ON TIME';
    else statusText = 'UNRECORDED';

    const workDurationStr =
      rec.checkInTime && rec.checkOutTime
        ? calculateWorkingTime(rec.checkInTime, rec.checkOutTime)
        : rec.checkInTime
        ? 'Working'
        : '-';

    const decimalHours =
      rec.checkInTime && rec.checkOutTime
        ? getDecimalHours(rec.checkInTime, rec.checkOutTime)
        : 0;

    const assignedTables = staffTablesForDateMap.get(`${rec.date}_${rec.staffId}`) || [];
    const ldCount = staffLDCountForDateMap.get(`${rec.date}_${rec.staffId}`) || 0;

    return [
      rec.date,
      rec.staffId,
      rec.staffName || staff?.name || 'Unknown',
      staff?.role || 'Staff',
      statusText,
      rec.checkInTime || '-',
      rec.checkOutTime || '-',
      workDurationStr,
      decimalHours.toString(),
      ldCount,
      assignedTables.join(', ') || '-',
      rec.note || '',
      rec.id,
      formattedSyncTime,
    ];
  });

  // -------------------------------------------------------------
  // 2. Sheet: "LD Sales Audit Trail"
  // -------------------------------------------------------------
  onProgress?.('Formatting LD Sales & Drinks Audit Trail...');
  const ldHeaders = [
    'Log ID',
    'Date',
    'Timestamp / Order Time',
    'Staff ID',
    'Staff Name',
    'Role',
    'Table Number',
    'LD Amount (Drinks)',
    'Drink Type',
    'Logged Timestamp',
  ];

  const sortedLDLogs = [...allLDLogs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.timestamp.localeCompare(a.timestamp);
  });

  const ldRows = sortedLDLogs.map((log) => {
    const staff = staffMap.get(log.staffId);
    return [
      log.id,
      log.date,
      log.timestamp,
      log.staffId,
      log.staffName || staff?.name || 'Staff',
      staff?.role || 'Staff',
      log.tableNo,
      log.amount,
      log.drinkType || 'Lady Drink',
      log.createdAt || log.timestamp,
    ];
  });

  // -------------------------------------------------------------
  // 3. Sheet: "Staff Master Database"
  // -------------------------------------------------------------
  onProgress?.('Formatting Staff Master Roster...');
  const staffHeaders = [
    'Staff ID',
    'Full Name',
    'Role / Position',
    'Phone Number',
    'Default Schedule',
    'Status',
    'Last Synced',
  ];

  const staffRows = staffList.map((staff) => [
    staff.id,
    staff.name,
    staff.role,
    staff.phone || '-',
    staff.defaultSchedule || '19:00 - 02:00',
    staff.active === false ? 'INACTIVE' : 'ACTIVE',
    formattedSyncTime,
  ]);

  // -------------------------------------------------------------
  // 4. Sheet: "Payroll & Monthly Summary"
  // -------------------------------------------------------------
  onProgress?.('Aggregating Payroll & Monthly Summary...');
  const payrollHeaders = [
    'Year-Month',
    'Staff ID',
    'Staff Name',
    'Role / Position',
    'Days Worked (Shifts)',
    'Total Hours Worked (HH:MM)',
    'Total Decimal Hours',
    'Day Off Count',
    'Absence Count',
    'Late Count',
    'Total LD Drinks',
    'Calculated At',
  ];

  // Group by (Year-Month + StaffId)
  interface StaffMonthSummary {
    monthStr: string;
    staffId: string;
    staffName: string;
    role: string;
    daysWorked: number;
    totalMinutesWorked: number;
    dayOffs: number;
    absences: number;
    lateCount: number;
    totalLDs: number;
  }

  const summaryMap = new Map<string, StaffMonthSummary>();

  allAttendance.forEach((rec) => {
    if (!rec.date) return;
    const monthStr = rec.date.slice(0, 7); // 'YYYY-MM'
    const key = `${monthStr}_${rec.staffId}`;
    const staff = staffMap.get(rec.staffId);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        monthStr,
        staffId: rec.staffId,
        staffName: rec.staffName || staff?.name || 'Staff',
        role: staff?.role || 'Staff',
        daysWorked: 0,
        totalMinutesWorked: 0,
        dayOffs: 0,
        absences: 0,
        lateCount: 0,
        totalLDs: 0,
      });
    }

    const item = summaryMap.get(key)!;
    if (rec.isDayOff) item.dayOffs += 1;
    else if (rec.isAbsent) item.absences += 1;
    else if (rec.isLate && rec.checkInTime) {
      item.lateCount += 1;
      item.daysWorked += 1;
    } else if (rec.checkInTime) {
      item.daysWorked += 1;
    }

    if (rec.checkInTime && rec.checkOutTime) {
      const inMin = parseTimeToMinutes(rec.checkInTime);
      const outMin = parseTimeToMinutes(rec.checkOutTime);
      if (inMin >= 0 && outMin >= 0) {
        let diff = outMin - inMin;
        if (diff < 0) diff += 24 * 60;
        item.totalMinutesWorked += diff;
      }
    }
  });

  allLDLogs.forEach((log) => {
    if (!log.date) return;
    const monthStr = log.date.slice(0, 7);
    const key = `${monthStr}_${log.staffId}`;
    const staff = staffMap.get(log.staffId);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        monthStr,
        staffId: log.staffId,
        staffName: log.staffName || staff?.name || 'Staff',
        role: staff?.role || 'Staff',
        daysWorked: 0,
        totalMinutesWorked: 0,
        dayOffs: 0,
        absences: 0,
        lateCount: 0,
        totalLDs: 0,
      });
    }

    const item = summaryMap.get(key)!;
    item.totalLDs += log.amount;
  });

  const sortedSummaries = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.monthStr !== b.monthStr) return b.monthStr.localeCompare(a.monthStr);
    return a.staffId.localeCompare(b.staffId);
  });

  const payrollRows = sortedSummaries.map((s) => {
    const hours = Math.floor(s.totalMinutesWorked / 60);
    const mins = s.totalMinutesWorked % 60;
    const formattedHours = `${hours}h ${mins.toString().padStart(2, '0')}m`;
    const decimalHours = Number((s.totalMinutesWorked / 60).toFixed(2));

    return [
      s.monthStr,
      s.staffId,
      s.staffName,
      s.role,
      s.daysWorked,
      formattedHours,
      decimalHours,
      s.dayOffs,
      s.absences,
      s.lateCount,
      s.totalLDs,
      formattedSyncTime,
    ];
  });

  // -------------------------------------------------------------
  // Send Batch Update to Google Sheets API
  // -------------------------------------------------------------
  onProgress?.('Uploading and synchronizing Google Sheets tabs...');
  
  const batchData = [
    {
      range: "'Attendance & Hours Ledger'!A1:Z10000",
      values: [attendanceHeaders, ...attendanceRows],
    },
    {
      range: "'LD Sales Audit Trail'!A1:Z10000",
      values: [ldHeaders, ...ldRows],
    },
    {
      range: "'Staff Master Database'!A1:H1000",
      values: [staffHeaders, ...staffRows],
    },
    {
      range: "'Payroll & Monthly Summary'!A1:L5000",
      values: [payrollHeaders, ...payrollRows],
    },
  ];

  // First, clear old contents on all 4 tabs to prevent lingering rows
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: [
        "'Attendance & Hours Ledger'!A1:Z",
        "'LD Sales Audit Trail'!A1:Z",
        "'Staff Master Database'!A1:Z",
        "'Payroll & Monthly Summary'!A1:Z",
      ],
    }),
  });

  // Write new values
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json();
    throw new Error(err?.error?.message || 'Failed to write batch data to Google Sheets.');
  }

  // Update local config with lastSyncedAt
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  saveGoogleSheetsConfig({
    lastSyncedAt: timestamp,
    spreadsheetId,
    spreadsheetUrl,
  });

  onProgress?.('Sync completed successfully!');

  return {
    success: true,
    spreadsheetUrl,
    syncedCounts: {
      attendance: sortedAttendance.length,
      ldLogs: sortedLDLogs.length,
      staff: staffList.length,
      payrollSummaries: sortedSummaries.length,
    },
    timestamp,
  };
}

// =========================================================================
// INSTANT CSV & GOOGLE SHEETS CLIPBOARD EXPORTERS (ZERO-AUTH REQUIRED)
// =========================================================================

export function generateAllTablesCSV(): {
  attendanceCSV: string;
  ldLogsCSV: string;
  staffCSV: string;
  payrollCSV: string;
} {
  const staffList = loadStaffList();
  const allAttendance = loadAllAttendance();
  const allLDLogs = loadAllLDLogs();

  const staffMap = new Map<string, Staff>();
  staffList.forEach((s) => staffMap.set(s.id, s));

  // 1. Attendance
  const staffLDCountForDateMap = new Map<string, number>();
  allLDLogs.forEach((log) => {
    if (!log.date || !log.staffId) return;
    const key = `${log.date}_${log.staffId}`;
    const currCount = staffLDCountForDateMap.get(key) || 0;
    staffLDCountForDateMap.set(key, currCount + (log.amount || 0));
  });

  const attHeaders = [
    'Date',
    'Staff ID',
    'Staff Name',
    'Role',
    'Status',
    'Check In',
    'Check Out',
    'Worked Hours',
    'LD Count',
    'Notes',
  ];
  const attRows = allAttendance.map((rec) => {
    const staff = staffMap.get(rec.staffId);
    let workHours = '';
    
    if (rec.checkInTime && rec.checkOutTime) {
      workHours = calculateWorkingTime(rec.checkInTime, rec.checkOutTime);
    }
    
    let status = 'Pending';
    if (rec.isDayOff) status = 'Day Off';
    else if (rec.isAbsent) status = 'Absent';
    else if (rec.isSuspended) status = 'Suspended';
    else if (rec.isLate) status = 'Late';
    else if (rec.checkInTime) status = 'Present';

    const ldCount = staffLDCountForDateMap.get(`${rec.date}_${rec.staffId}`) || 0;

    return [
      rec.date,
      rec.staffId,
      staff?.name || rec.staffName || '',
      staff?.role || '',
      status,
      rec.checkInTime || '',
      rec.checkOutTime || '',
      workHours,
      ldCount,
      rec.note || '',
    ];
  });

  // 2. LD Logs
  const ldHeaders = [
    'Date',
    'Time',
    'Staff ID',
    'Staff Name',
    'Role',
    'Category',
    'Quantity',
    'Table',
  ];
  const ldRows = allLDLogs.map((log) => {
    const staff = staffMap.get(log.staffId);
    return [
      log.date,
      log.timestamp || '',
      log.staffId,
      log.staffName || staff?.name || '',
      staff?.role || '',
      log.drinkType || 'Standard',
      log.amount,
      log.tableNo || '',
    ];
  });

  // 3. Staff Master
  const stfHeaders = [
    'Staff ID',
    'Full Name',
    'Role',
    'Status',
    'Default Schedule',
    'Phone',
  ];
  const stfRows = staffList.map((s) => [
    s.id,
    s.name,
    s.role,
    s.active ? 'Active' : 'Inactive',
    s.defaultSchedule || '',
    s.phone || '',
  ]);

  // 4. Payroll Monthly Summary
  const summaryMap = new Map<string, any>();
  allAttendance.forEach((rec) => {
    if (!rec.date) return;
    const monthStr = rec.date.slice(0, 7);
    const key = `${monthStr}_${rec.staffId}`;
    const staff = staffMap.get(rec.staffId);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        monthStr,
        staffId: rec.staffId,
        staffName: staff?.name || rec.staffName || 'Staff',
        role: staff?.role || 'Staff',
        daysWorked: 0,
        totalMinutesWorked: 0,
        dayOffs: 0,
        absences: 0,
        lateCount: 0,
        totalLDs: 0,
      });
    }

    const item = summaryMap.get(key)!;
    if (rec.isDayOff) item.dayOffs += 1;
    else if (rec.isAbsent) item.absences += 1;
    else if (rec.checkInTime) item.daysWorked += 1;
    
    if (rec.isLate) item.lateCount += 1;

    if (rec.checkInTime && rec.checkOutTime) {
      const inMin = parseTimeToMinutes(rec.checkInTime);
      const outMin = parseTimeToMinutes(rec.checkOutTime);
      if (inMin >= 0 && outMin >= 0) {
        let diff = outMin - inMin;
        if (diff < 0) diff += 24 * 60;
        item.totalMinutesWorked += diff;
      }
    }
  });

  allLDLogs.forEach((log) => {
    if (!log.date) return;
    const monthStr = log.date.slice(0, 7);
    const key = `${monthStr}_${log.staffId}`;
    if (summaryMap.has(key)) {
      summaryMap.get(key)!.totalLDs += log.amount;
    }
  });

  const payHeaders = [
    'Month',
    'Staff ID',
    'Staff Name',
    'Role',
    'Days Worked',
    'Total Worked Hours',
    'Decimal Hours',
    'Late Count',
    'Day Offs',
    'Absences',
    'Total LD Drinks',
  ];
  const payRows = Array.from(summaryMap.values()).map((s) => {
    const hours = Math.floor(s.totalMinutesWorked / 60);
    const mins = s.totalMinutesWorked % 60;
    return [
      s.monthStr,
      s.staffId,
      s.staffName,
      s.role,
      s.daysWorked,
      `${hours}h ${mins.toString().padStart(2, '0')}m`,
      Number((s.totalMinutesWorked / 60).toFixed(2)),
      s.lateCount,
      s.dayOffs,
      s.absences,
      s.totalLDs,
    ];
  });

  const toCSV = (headers: string[], rows: (string | number)[][]) => {
    const formatCell = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    return [
      headers.map(formatCell).join(','),
      ...rows.map((r) => r.map(formatCell).join(',')),
    ].join('\n');
  };

  return {
    attendanceCSV: '\uFEFF' + toCSV(attHeaders, attRows),
    ldLogsCSV: '\uFEFF' + toCSV(ldHeaders, ldRows),
    staffCSV: '\uFEFF' + toCSV(stfHeaders, stfRows),
    payrollCSV: '\uFEFF' + toCSV(payHeaders, payRows),
  };
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyTableToClipboard(tableType: 'attendance' | 'ld' | 'staff' | 'payroll'): Promise<boolean> {
  try {
    const csvs = generateAllTablesCSV();
    let csvData = '';
    if (tableType === 'attendance') csvData = csvs.attendanceCSV;
    else if (tableType === 'ld') csvData = csvs.ldLogsCSV;
    else if (tableType === 'staff') csvData = csvs.staffCSV;
    else if (tableType === 'payroll') csvData = csvs.payrollCSV;

    // Convert CSV to Tab-Separated Values (TSV) for direct Google Sheets paste
    const tsvData = csvData
      .replace(/^\uFEFF/, '')
      .split('\n')
      .map((line) => {
        // Simple comma to tab for spreadsheet pasting
        const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        return cells.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')).join('\t');
      })
      .join('\n');

    await navigator.clipboard.writeText(tsvData);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
