import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# Replace the top imports
content = re.sub(
    r"import \{\s*signInWithPopup.*?\nlet isSigningIn = false;\n",
    """import {
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
""", content, flags=re.DOTALL)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)
