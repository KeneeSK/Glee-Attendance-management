import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Download,
  Upload,
  Database,
  Users,
  Clock,
  Wine,
  Sparkles,
  Link as LinkIcon,
  LogOut,
  X,
} from 'lucide-react';
import {
  signInWithGoogleAccount,
  getGoogleAccessToken,
  createOrConnectSpreadsheet,
  syncAllDataToGoogleSheets,
  loadGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  logoutGoogleAccount,
  GoogleSheetsConfig,
} from '../utils/googleSheets';
import {
  loadStaffList,
  loadAllAttendance,
  loadAllLDLogs,
  exportDatabaseJSON,
  importDatabaseJSON,
} from '../utils/storage';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(() => loadGoogleSheetsConfig());
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; photo?: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    counts?: {
      attendance: number;
      ldLogs: number;
      staff: number;
      payrollSummaries: number;
    };
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [customSheetId, setCustomSheetId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Health stats
  const [dbStats, setDbStats] = useState<{
    staffCount: number;
    attCount: number;
    ldCount: number;
  }>({ staffCount: 0, attCount: 0, ldCount: 0 });

  useEffect(() => {
    if (isOpen) {
      const currentConfig = loadGoogleSheetsConfig();
      setConfig(currentConfig);
      if (currentConfig?.userEmail) {
        setIsSignedIn(true);
        setUserProfile({
          name: currentConfig.userName,
          email: currentConfig.userEmail,
          photo: currentConfig.userPhoto,
        });
      }

      // Check live database stats
      const staff = loadStaffList();
      const att = loadAllAttendance();
      const ld = loadAllLDLogs();
      setDbStats({
        staffCount: staff.length,
        attCount: att.length,
        ldCount: ld.length,
      });
      setErrorMessage('');
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignInAndConnect = async () => {
    setIsConnecting(true);
    setErrorMessage('');
    try {
      const { user, accessToken } = await signInWithGoogleAccount();
      setIsSignedIn(true);
      setUserProfile({
        name: user.displayName || '',
        email: user.email || '',
        photo: user.photoURL || '',
      });

      // Automatically create or connect spreadsheet
      const existingId = config?.spreadsheetId || customSheetId;
      const sheetInfo = await createOrConnectSpreadsheet(accessToken, existingId);
      setConfig(loadGoogleSheetsConfig());
    } catch (err: any) {
      console.error('Google connect error:', err);
      setErrorMessage(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    setErrorMessage('');
    setSyncResult(null);
    setSyncProgress('Preparing Google OAuth connection...');

    try {
      let token = await getGoogleAccessToken();
      if (!token) {
        setSyncProgress('Authenticating with Google Account...');
        const authRes = await signInWithGoogleAccount();
        token = authRes.accessToken;
        setIsSignedIn(true);
        setUserProfile({
          name: authRes.user.displayName || '',
          email: authRes.user.email || '',
          photo: authRes.user.photoURL || '',
        });
      }

      // Ensure spreadsheet is linked
      let currentSpreadsheetId = config?.spreadsheetId;
      if (!currentSpreadsheetId) {
        setSyncProgress('Creating dedicated Google Spreadsheet...');
        const sheetInfo = await createOrConnectSpreadsheet(token, customSheetId);
        currentSpreadsheetId = sheetInfo.spreadsheetId;
        setConfig(loadGoogleSheetsConfig());
      }

      const res = await syncAllDataToGoogleSheets(
        token,
        currentSpreadsheetId,
        (progressMsg) => setSyncProgress(progressMsg)
      );

      setConfig(loadGoogleSheetsConfig());
      setSyncResult({
        success: true,
        message: 'All Attendance, Working Hours, LD Logs, and Payroll Summaries synced to Google Sheets!',
        counts: res.syncedCounts,
      });

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Sync error:', err);
      setErrorMessage(err?.message || 'Failed to synchronize data with Google Sheets.');
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Disconnect Google account from this session? Your data in Google Sheets will remain safe.')) {
      await logoutGoogleAccount();
      setIsSignedIn(false);
      setUserProfile(null);
      saveGoogleSheetsConfig({ userEmail: '', userName: '', userPhoto: '' });
      setConfig(loadGoogleSheetsConfig());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = importDatabaseJSON(content);
      if (res.success) {
        alert(
          `Database restored successfully!\n` +
          `• Staff: ${res.counts?.staff || 0}\n` +
          `• Attendance Records: ${res.counts?.attendance || 0}\n` +
          `• LD Sales Logs: ${res.counts?.ldLogs || 0}\n` +
          `• Checklists: ${res.counts?.checklists || 0}`
        );
        if (onRefreshData) onRefreshData();
        // Refresh local stats
        setDbStats({
          staffCount: loadStaffList().length,
          attCount: loadAllAttendance().length,
          ldCount: loadAllLDLogs().length,
        });
      } else {
        alert(`Restore failed: ${res.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets Sync &amp; Database Backup
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Payroll Safety
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Secure real-time cloud synchronization for staff hours &amp; LD ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[75vh]">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-semibold">Synchronization Alert:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {syncResult?.success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-semibold">Google Sheets Synced Successfully!</strong>
                <p className="mt-0.5 text-emerald-200/90">{syncResult.message}</p>
                {syncResult.counts && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                    <div>Attendance: <strong className="text-white">{syncResult.counts.attendance}</strong></div>
                    <div>LD Logs: <strong className="text-white">{syncResult.counts.ldLogs}</strong></div>
                    <div>Staff Roster: <strong className="text-white">{syncResult.counts.staff}</strong></div>
                    <div>Payroll Mths: <strong className="text-white">{syncResult.counts.payrollSummaries}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Google Account Connection Card */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                Google Workspace Connection
              </span>
              {isSignedIn ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Not Connected
                </span>
              )}
            </div>

            {isSignedIn && userProfile ? (
              <div className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-700/80 rounded-lg">
                <div className="flex items-center gap-3">
                  {userProfile.photo ? (
                    <img
                      src={userProfile.photo}
                      alt={userProfile.name || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full border border-slate-600"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {userProfile.name?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">{userProfile.name || 'Google User'}</div>
                    <div className="text-xs text-slate-400">{userProfile.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-700/80 rounded-lg">
                <div className="text-xs text-slate-300">
                  Connect your Google account with permission to create and sync payroll spreadsheets in your Google Drive.
                </div>
                <button
                  onClick={handleSignInAndConnect}
                  disabled={isConnecting}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-lg shadow transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Connected Spreadsheet Card */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Dedicated Payroll &amp; Attendance Spreadsheet
              </span>
              {config?.lastSyncedAt && (
                <span className="text-[10px] text-slate-400">
                  Last Synced: <strong className="text-slate-200">{new Date(config.lastSyncedAt).toLocaleTimeString()}</strong>
                </span>
              )}
            </div>

            {config?.spreadsheetUrl ? (
              <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GLEE ANGELS - Management &amp; Payroll Database</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {config.spreadsheetId}
                  </div>
                </div>
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/50 border border-dashed border-slate-700 rounded-lg text-xs text-slate-400">
                Clicking the sync button below will automatically create a dedicated 4-sheet spreadsheet formatted with:
                <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    1. Attendance &amp; Hours Ledger
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    2. LD Sales Audit Trail
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    3. Staff Master Database
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    4. Payroll &amp; Monthly Summary
                  </div>
                </div>
              </div>
            )}

            {/* Sync Action Button */}
            <div className="pt-2">
              <button
                onClick={handleSyncToSheets}
                disabled={isSyncing}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{syncProgress || 'Synchronizing with Google Sheets...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>1-Click Sync Entire Database to Google Sheets</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Database Health & File Backup Verification */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                Live Database Integrity &amp; Backup
              </span>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                Central Firestore DB Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400">Registered Staff</div>
                <div className="text-base font-bold text-indigo-400 font-mono">{dbStats.staffCount}</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400">Attendance Records</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{dbStats.attCount}</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400">LD Drinks Logged</div>
                <div className="text-base font-bold text-purple-400 font-mono">{dbStats.ldCount}</div>
              </div>
            </div>

            {/* Direct JSON Backup & Restore Tools */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={exportDatabaseJSON}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON Backup File</span>
              </button>

              <label className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted cloud synchronization • Safe for payroll audits</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
