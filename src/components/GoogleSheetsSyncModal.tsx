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
  Copy,
  Table,
  HelpCircle,
} from 'lucide-react';
import {
  signInWithGoogleAccount,
  getGoogleAccessToken,
  createOrConnectSpreadsheet,
  syncAllDataToGoogleSheets,
  loadGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  logoutGoogleAccount,
  generateAllTablesCSV,
  downloadCSV,
  copyTableToClipboard,
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
  const [copiedType, setCopiedType] = useState<string | null>(null);
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
  const [showDomainGuide, setShowDomainGuide] = useState<boolean>(false);

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
      await createOrConnectSpreadsheet(accessToken, existingId);
      setConfig(loadGoogleSheetsConfig());
    } catch (err: any) {
      console.error('Google connect error:', err);
      const msg = err?.message || 'Failed to authenticate with Google.';
      setErrorMessage(msg);
      if (msg.includes('unauthorized-domain') || msg.includes('domain')) {
        setShowDomainGuide(true);
      }
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
      const msg = err?.message || 'Failed to synchronize data with Google Sheets.';
      setErrorMessage(msg);
      if (msg.includes('unauthorized-domain') || msg.includes('domain')) {
        setShowDomainGuide(true);
      }
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

  const handleCopyClipboard = async (type: 'attendance' | 'ld' | 'staff' | 'payroll') => {
    const success = await copyTableToClipboard(type);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      alert('Failed to copy to clipboard.');
    }
  };

  const handleDownloadAllCSV = () => {
    const csvs = generateAllTablesCSV();
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(csvs.attendanceCSV, `GLEE_ANGELS_Attendance_${today}.csv`);
    setTimeout(() => downloadCSV(csvs.ldLogsCSV, `GLEE_ANGELS_LD_Sales_${today}.csv`), 300);
    setTimeout(() => downloadCSV(csvs.staffCSV, `GLEE_ANGELS_Staff_Master_${today}.csv`), 600);
    setTimeout(() => downloadCSV(csvs.payrollCSV, `GLEE_ANGELS_Payroll_Summary_${today}.csv`), 900);
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
              <div className="flex-1 space-y-1">
                <strong className="block font-semibold">Synchronization Alert:</strong>
                <span>{errorMessage}</span>
                {showDomainGuide && (
                  <div className="mt-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-700 text-slate-300 text-[11px] space-y-1">
                    <div className="font-semibold text-amber-300 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Firebase Authorized Domain Notice:</span>
                    </div>
                    <p>
                      In dynamic preview environments, you can use the instant <strong>[Export Google Sheets Ready CSV]</strong> or <strong>[Copy Table for Google Sheets]</strong> buttons below with zero authentication needed, or add <code>asia-southeast1.run.app</code> to Firebase Console Authorized Domains.
                    </p>
                  </div>
                )}
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

          {/* SECTION 1: 1-Click Instant Google Sheets CSV Exporters (Zero-Auth Required) */}
          <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-slate-800/80 to-teal-950/40 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Instant Google Sheets &amp; Excel Exporters (Zero-Auth)
              </span>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1"
              >
                <span>Open sheets.new</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-300">
              Download clean, pre-formatted Google Sheets / Excel CSV tables or copy directly to your clipboard for 1-second pasting (<kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-300">Ctrl + V</kbd>).
            </p>

            {/* Quick Copy to Clipboard Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => handleCopyClipboard('attendance')}
                className="py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-200"
              >
                {copiedType === 'attendance' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copy Attendance</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyClipboard('ld')}
                className="py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-200"
              >
                {copiedType === 'ld' ? (
                  <span className="text-purple-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy LD Logs</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyClipboard('payroll')}
                className="py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-200"
              >
                {copiedType === 'payroll' ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copy Payroll</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyClipboard('staff')}
                className="py-2 px-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 text-slate-200"
              >
                {copiedType === 'staff' ? (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Staff Roster</span>
                  </>
                )}
              </button>
            </div>

            {/* 1-Click Download 4 CSVs Pack */}
            <div className="pt-1">
              <button
                onClick={handleDownloadAllCSV}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 border border-emerald-400/40"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Download All 4 Sheets CSV Package (Attendance, LD, Staff, Payroll)</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: Google Account Cloud Synchronization (OAuth) */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                Google Workspace Live Cloud Sync
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
                  Connect your Google account to automatically create and sync payroll spreadsheets in your Google Drive.
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

            {/* Sync Action Button */}
            <div className="pt-1">
              <button
                onClick={handleSyncToSheets}
                disabled={isSyncing}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl border border-slate-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>{syncProgress || 'Synchronizing with Google Sheets...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>Sync Live to Google Drive Spreadsheet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 3: Live Central Firestore & Encrypted JSON Backup */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                Live Database Integrity &amp; JSON Backup
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
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
