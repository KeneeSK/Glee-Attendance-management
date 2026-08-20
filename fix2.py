import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# 1. Remove firebase imports
content = re.sub(r"import\s*\{\s*signInWithPopup,\s*GoogleAuthProvider,\s*onAuthStateChanged,\s*User,\s*signOut,\s*\}\s*from\s*'firebase/auth';\s*", "", content)
content = re.sub(r"import\s*\{\s*auth\s*\}\s*from\s*'../lib/firebase';\s*", "", content)

# 2. Replace GOOGLE_SHEETS_SCOPES through isSigningIn
part_to_replace = re.compile(r"export const GOOGLE_SHEETS_SCOPES = \[.*?\nlet isSigningIn = false;", re.DOTALL)

replacement_top = """import firebaseConfig from '../../firebase-applet-config.json';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// In-memory token cache as required by workspace-integration skill
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
"""

content = part_to_replace.sub(replacement_top, content)

# 3. Replace initGoogleAuthListener through logoutGoogleAccount
part2_to_replace = re.compile(r"// Authentication Listeners\nexport const initGoogleAuthListener.*?export const logoutGoogleAccount = async \(\): Promise<void> => \{.*?\}\s*catch[^\n]*\n\s*\}\n\};", re.DOTALL)

replacement_auth = """// Authentication Listeners
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
  clearGoogleSheetsConfig();
};"""

content = part2_to_replace.sub(replacement_auth, content)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)
