import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# Remove firebase imports
content = re.sub(r"import\s*\{\s*signInWithPopup,\s*GoogleAuthProvider,\s*onAuthStateChanged,\s*User,\s*signOut,\s*\}\s*from\s*'firebase/auth';\s*import\s*\{\s*auth\s*\}\s*from\s*'../lib/firebase';", "", content)

# Add custom type and GSI loading logic at the top
replacement_top = """import firebaseConfig from '../../firebase-applet-config.json';
import {
  loadStaffList,
  loadAllAttendance,
  loadAllLDLogs,
  normalizeDateStr,
} from './storage';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

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
"""

content = re.sub(r"import \{\s*loadStaffList,\s*loadAllAttendance,\s*loadAllLDLogs,\s*normalizeDateStr,\s*\} from './storage';\n\nimport \{ calculateWorkingTime, parseTimeToMinutes \} from './time';\nimport \{ Staff, AttendanceRecord, LDLogEntry \} from '../types';\n\nexport const GOOGLE_SHEETS_SCOPES = \[\n  'https://www.googleapis.com/auth/spreadsheets',\n  'https://www.googleapis.com/auth/drive\.file',\n\];\n\nconst provider = new GoogleAuthProvider\(\);\nGOOGLE_SHEETS_SCOPES\.forEach\(\(scope\) => provider\.addScope\(scope\)\);\nprovider\.setCustomParameters\(\{\n  prompt: 'select_account consent',\n\}\);", replacement_top + "\nimport { calculateWorkingTime, parseTimeToMinutes } from './time';\nimport { Staff, AttendanceRecord, LDLogEntry } from '../types';", content, flags=re.MULTILINE)

auth_replacement = """// Authentication Listeners
export const initGoogleAuthListener = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // GSI does not have a persistent listener like Firebase.
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
                user: { email: profile.email, displayName: profile.name, photoURL: profile.picture }, 
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
};
"""

# Replace the authentication section
content = re.sub(r"// Authentication Listeners.*export const logoutGoogleAccount = async \(\): Promise<void> => \{.*?\};\s*\}\s*catch.*?\n\}\n\};", auth_replacement, content, flags=re.DOTALL)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)
