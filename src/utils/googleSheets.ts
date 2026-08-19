import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  loadStaffList,
  loadAllAttendance,
  loadAllLDLogs,
  normalizeDateStr,
} from './storage';
import { calculateWorkingTime, parseTimeToMinutes } from './time';
import { Staff, AttendanceRecord, LDLogEntry } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any; error_description?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const GOOGLE_OAUTH_CLIENT_ID =
  '698676305111-7pqscu2mtjf9ho8va80g9bvq4quedjbj.apps.googleusercontent.com';

const provider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token cache as required by workspace-integration skill
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const SHEETS_CONFIG_KEY = 'glee_angels_google_sheets_config_v1';

export interface GoogleUserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
}

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

// Function to ensure Google Identity Services (GSI) SDK script is loaded
function ensureGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services SDK')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });
}

// Prompt direct GSI OAuth token flow (avoids Firebase auth/unauthorized-domain errors on dynamic preview domains)
function requestTokenWithGsi(): Promise<{ token: string; user: GoogleUserProfile }> {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureGsiScript();
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services client is not available');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_SHEETS_SCOPES.join(' '),
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (!tokenResponse.access_token) {
            reject(new Error('No access token received from Google Identity Services.'));
            return;
          }
          const accessToken = tokenResponse.access_token;
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            let userInfo: any = {};
            if (res.ok) {
              userInfo = await res.json();
            }
            resolve({
              token: accessToken,
              user: {
                displayName: userInfo.name || userInfo.email?.split('@')[0] || 'Authorized Google User',
                email: userInfo.email || '',
                photoURL: userInfo.picture || '',
              },
            });
          } catch {
            resolve({
              token: accessToken,
              user: {
                displayName: 'Authorized Google User',
                email: '',
              },
            });
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google authorization was cancelled.'));
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

// Authentication Listeners
export const initGoogleAuthListener = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleAccount = async (): Promise<{ user: GoogleUserProfile; accessToken: string }> => {
  try {
    isSigningIn = true;
    let token: string | null = null;
    let userProfile: GoogleUserProfile = { displayName: '', email: '' };

    // Primary: Use Google Identity Services (GSI) Token Client
    // GSI uses Google's standard OAuth2 popup and works across all cloud run subdomains
    try {
      const gsiResult = await requestTokenWithGsi();
      token = gsiResult.token;
      userProfile = gsiResult.user;
    } catch (gsiErr: any) {
      console.warn('GSI Token request failed, falling back to Firebase Auth:', gsiErr);

      // Fallback: Firebase Auth signInWithPopup
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Could not obtain Google OAuth access token. Please check permissions.');
      }
      token = credential.accessToken;
      userProfile = {
        displayName: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
      };
    }

    if (!token) {
      throw new Error('Failed to obtain Google access token.');
    }

    cachedAccessToken = token;

    // Save user info to local config
    saveGoogleSheetsConfig({
      userEmail: userProfile.email || '',
      userName: userProfile.displayName || '',
      userPhoto: userProfile.photoURL || '',
    });

    return { user: userProfile, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    let msg = error.message || 'Failed to authenticate with Google.';
    if (error.code === 'auth/unauthorized-domain') {
      msg = 'Domain authorization updated. Please click Sign In with Google again.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Sign-in window was closed.';
    }
    throw new Error(msg);
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleAccount = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut warning:', e);
  }
  clearGoogleSheetsConfig();
};

// =========================================================================
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
  allLDLogs.forEach((log) => {
    if (!log.date || !log.staffId || !log.tableNo) return;
    const key = `${log.date}_${log.staffId}`;
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

    return [
      rec.date,
      rec.staffId,
      rec.staffName || staff?.name || 'Unknown',
      staff?.role || 'Staff',
      statusText,
      rec.checkInTime || '-',
      rec.checkOutTime || '-',
      workDurationStr,
      decimalHours,
      assignedTables.join(', ') || '-',
      rec.note || '',
      rec.id || `att_${rec.date}_${rec.staffId}`,
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
      range: "'Attendance & Hours Ledger'!A1:M10000",
      values: [attendanceHeaders, ...attendanceRows],
    },
    {
      range: "'LD Sales Audit Trail'!A1:J10000",
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
