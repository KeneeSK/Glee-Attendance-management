import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# Replace top back to Firebase Auth
replacement_top = """import {
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

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account consent',
});

// In-memory token cache as required by workspace-integration skill
let cachedAccessToken: string | null = null;
let isSigningIn = false;
"""

content = re.sub(
    r"import \{.*?export const GOOGLE_SHEETS_SCOPES = \[.*?\n\];.*?let tokenClient: any = null;.*?return res\.json\(\);\n\};\n",
    replacement_top,
    content,
    flags=re.DOTALL
)

# Replace the auth functions back
auth_replacement = """// Authentication Listeners
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

export const signInWithGoogleAccount = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google OAuth access token. Please verify permissions.');
    }

    cachedAccessToken = credential.accessToken;

    // Save user info to local config
    saveGoogleSheetsConfig({
      userEmail: result.user.email || '',
      userName: result.user.displayName || '',
      userPhoto: result.user.photoURL || '',
    });

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    let msg = error.message || 'Failed to authenticate with Google.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Sign-in popup was closed before completing authorization.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      msg = 'Only one sign-in popup can be opened at a time.';
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
};"""

content = re.sub(
    r"// Authentication Listeners\nexport const initGoogleAuthListener.*?export const logoutGoogleAccount = async \(\): Promise<void> => \{.*?\};\n",
    auth_replacement,
    content,
    flags=re.DOTALL
)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)
