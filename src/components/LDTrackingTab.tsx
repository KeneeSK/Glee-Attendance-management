import React, { useState } from 'react';
import { LDLogEntry, Staff } from '../types';
import { loadTableList, addTable, renameTable, deleteTable } from '../utils/storage';
import { Plus, Minus, Wine, Users, Sparkles, Trash2, History, Layers, Settings, Edit3, Check, X, AlertCircle } from 'lucide-react';

interface LDTrackingTabProps {
  dateStr: string;
  ldLogs: LDLogEntry[];
  staffList: Staff[];
  onAddLog: (entry: Omit<LDLogEntry, 'id' | 'createdAt'>) => void;
  onDeleteLog: (logId: string) => void;
  onRefreshData?: () => void;
}

export const LDTrackingTab: React.FC<LDTrackingTabProps> = ({
  dateStr,
  ldLogs,
  staffList,
  onAddLog,
  onDeleteLog,
  onRefreshData,
}) => {
  const activeStaffList = staffList.filter((s) => s.active);

  // Master Table List (Persisted in localStorage)
  const [masterTables, setMasterTables] = useState<string[]>(() => loadTableList());

  // Re-sync master tables when data refreshes
  React.useEffect(() => {
    const currentStored = loadTableList();
    setMasterTables(currentStored);
    setActiveTables((prev) => prev.filter((t) => currentStored.includes(t)));
  }, [ldLogs]);

  // Start with clean initial view (no tables open by default)
  const existingTablesInLogs: string[] = Array.from(new Set(ldLogs.map((l) => l.tableNo)));
  const [activeTables, setActiveTables] = useState<string[]>([]);
  const [selectedStaffForTable, setSelectedStaffForTable] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingTablesInLogs.forEach((t) => {
      const logsForTable = ldLogs.filter((l) => l.tableNo === t);
      if (logsForTable.length > 0) {
        map[t] = logsForTable[logsForTable.length - 1].staffId;
      }
    });
    return map;
  });

  const [newTableName, setNewTableName] = useState('');
  const [pendingLD, setPendingLD] = useState<{tableNo: string, staffId: string, amount: number, staffName: string} | null>(null);

  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 2200);
  };

  const handleDirectAddLD = (tableNo: string, staffId: string, amount: number) => {
    const staffObj = staffList.find((s) => s.id === staffId) || activeStaffList[0];
    if (!staffObj || !tableNo) return;

    const nowTime = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    onAddLog({
      date: dateStr,
      tableNo: tableNo.trim().toUpperCase(),
      staffId: staffObj.id,
      staffName: staffObj.name,
      amount: amount,
      drinkType: 'Standard LD',
      timestamp: nowTime,
    });

    if (!activeTables.includes(tableNo)) {
      setActiveTables((prev) => [...prev, tableNo]);
    }

    const sign = amount > 0 ? `+${amount}` : `${amount}`;
    showToast(`✅ [${tableNo}] ${staffObj.name}: ${sign} LD recorded!`);
  };

  // Table Manager Modal state
  const [showTableManager, setShowTableManager] = useState(false);
  const [managerNewTableInput, setManagerNewTableInput] = useState('');
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deletingTableConfirm, setDeletingTableConfirm] = useState<string | null>(null);

  // Inline edit state for card
  const [cardEditingTable, setCardEditingTable] = useState<string | null>(null);
  const [cardRenameInput, setCardRenameInput] = useState('');

  // Add a new table to master list
  const handleAddMasterTable = (tableName: string) => {
    const clean = tableName.trim().toUpperCase();
    if (!clean) return;
    const updated = addTable(clean);
    setMasterTables(updated);
    if (!activeTables.includes(clean)) {
      setActiveTables((prev) => [...prev, clean]);
    }
    setNewTableName('');
    setManagerNewTableInput('');
  };

  // Rename a table across master list, active cards, and existing logs
  const handleRenameMasterTable = (oldName: string, newName: string) => {
    const clean = newName.trim().toUpperCase();
    if (!clean || clean === oldName) {
      setEditingTable(null);
      setCardEditingTable(null);
      return;
    }
    const updated = renameTable(oldName, clean);
    setMasterTables(updated);
    setActiveTables((prev) => prev.map((t) => (t === oldName ? clean : t)));
    setSelectedStaffForTable((prev) => {
      const copy = { ...prev };
      if (copy[oldName]) {
        copy[clean] = copy[oldName];
        delete copy[oldName];
      }
      return copy;
    });
    setEditingTable(null);
    setCardEditingTable(null);
    if (onRefreshData) onRefreshData();
  };

  // Delete a table from master list and active view
  const handleDeleteMasterTable = (tableName: string) => {
    const updated = deleteTable(tableName);
    setMasterTables(updated);
    setActiveTables((prev) => prev.filter((t) => t !== tableName));
    setDeletingTableConfirm(null);
    if (onRefreshData) onRefreshData();
  };

  // Compute aggregated LD count per table and staff
  const getTableStaffSummary = (tableNo: string) => {
    const tableLogs = ldLogs.filter((l) => l.tableNo === tableNo);
    const totalLD = tableLogs.reduce((acc, curr) => acc + curr.amount, 0);

    const staffBreakdown = new Map<string, { staffName: string; count: number }>();
    tableLogs.forEach((log) => {
      const curr = staffBreakdown.get(log.staffId) || { staffName: log.staffName, count: 0 };
      curr.count += log.amount;
      staffBreakdown.set(log.staffId, curr);
    });

    return { totalLD, staffBreakdown, tableLogs };
  };

  const handleAddLDClick = (tableNo: string, staffId: string, amount: number = 1) => {
    const staffObj = staffList.find((s) => s.id === staffId) || activeStaffList[0];
    if (!staffObj) return;
    setPendingLD({ tableNo, staffId: staffObj.id, amount, staffName: staffObj.name });
  };

  const handleConfirmAddLD = () => {
    if (!pendingLD) return;

    const nowTime = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    onAddLog({
      date: dateStr,
      tableNo: pendingLD.tableNo,
      staffId: pendingLD.staffId,
      staffName: pendingLD.staffName,
      amount: pendingLD.amount,
      drinkType: 'Standard LD',
      timestamp: nowTime,
    });
    setPendingLD(null);
  };

  const handleCancelAddLD = () => {
    setPendingLD(null);
  };

  const handleAddTableCard = (tableName: string) => {
    const nameToUse = tableName.trim().toUpperCase();
    if (!nameToUse) return;
    handleAddMasterTable(nameToUse);
  };

  const handleRemoveTableCardFromView = (tableNo: string) => {
    setActiveTables(activeTables.filter((t) => t !== tableNo));
  };

  const renderTallyMarks = (count: number) => {
    if (count <= 0) return <span className="text-slate-600 text-xs">No records</span>;
    const groupsOfFive = Math.floor(count / 5);
    const remainder = count % 5;

    let tallyText = '';
    for (let i = 0; i < groupsOfFive; i++) {
      tallyText += '卌 ';
    }
    if (remainder === 1) tallyText += '|';
    if (remainder === 2) tallyText += '||';
    if (remainder === 3) tallyText += '|||';
    if (remainder === 4) tallyText += '||||';

    return (
      <span className="font-mono font-bold tracking-widest text-cyan-300 text-sm">
        {tallyText} <span className="text-xs text-purple-300 ml-1 font-sans">({count} drinks)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-full shadow-2xl border-2 border-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Top Controls: Table Preset Picker & Quick Add Table */}
      <div className="lounge-card rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Live Table LD Counter Cards
            </h2>
            <span className="text-xs text-slate-400">
              (Track Ladies Drink quantities per table in real-time)
            </span>
          </div>

          <button
            onClick={() => setShowTableManager(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700/60 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-purple-300" />
            <span>Manage Table Names</span>
          </button>
        </div>

        {/* Quick Open Preset Tables */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 mr-1 font-medium">Quick Open Table:</span>
          {masterTables.map((tableNo) => {
            const isAdded = activeTables.includes(tableNo);
            return (
              <button
                key={tableNo}
                onClick={() => handleAddTableCard(tableNo)}
                disabled={isAdded}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  isAdded
                    ? 'bg-slate-800/50 text-slate-600 border border-slate-800/80 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-purple-950/80 text-purple-300 border border-purple-800/40 hover:border-purple-500'
                }`}
              >
                + {tableNo}
              </button>
            );
          })}

          {/* Custom Table Input */}
          <div className="flex items-center gap-1 ml-auto w-full sm:w-auto mt-2 sm:mt-0">
            <input
              type="text"
              placeholder="Table name (e.g. T-7)"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTableCard(newTableName);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
            />
            <button
              onClick={() => handleAddTableCard(newTableName)}
              className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded text-xs font-semibold transition-colors"
            >
              Add Table
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout: Active Table Cards */}
      {activeTables.length === 0 ? (
        <div className="lounge-card rounded-2xl p-8 text-center space-y-3 border border-slate-800/80 my-2">
          <Wine className="w-10 h-10 text-purple-400/60 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">Track Table LDs</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click any table button above (e.g. <span className="text-purple-300 font-semibold">+ T-1</span>) to open a live counter card when needed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTables.map((tableNo) => {
            const { totalLD, staffBreakdown } = getTableStaffSummary(tableNo);
            const currentAssignedStaffId =
              selectedStaffForTable[tableNo] || (activeStaffList[0]?.id ?? '');
            const isCardEditing = cardEditingTable === tableNo;

            return (
              <div
                key={tableNo}
                className="postit-card rounded-xl p-4 shadow-xl border border-slate-800 flex flex-col justify-between space-y-4 transition-transform hover:-translate-y-0.5"
              >
                {/* Table Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {isCardEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={cardRenameInput}
                        onChange={(e) => setCardRenameInput(e.target.value)}
                        className="bg-slate-900 border border-purple-500 text-cyan-300 font-bold px-2 py-0.5 rounded text-sm w-28 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameMasterTable(tableNo, cardRenameInput)}
                        className="p-1 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 hover:bg-emerald-900"
                        title="Save Name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCardEditingTable(null)}
                        className="p-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl font-extrabold text-cyan-300 tracking-wider">
                        {tableNo}
                      </span>
                      <button
                        onClick={() => {
                          setCardEditingTable(tableNo);
                          setCardRenameInput(tableNo);
                        }}
                        className="text-slate-500 hover:text-purple-300 p-0.5 rounded transition-colors"
                        title="Rename Table"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live assigned staff &amp; LD counter
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRemoveTableCardFromView(tableNo)}
                    className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800/80 transition-colors"
                    title="Close table card view"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Staff Selector */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <label className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider block">
                  Assign Server Staff:
                </label>
                <select
                  value={currentAssignedStaffId}
                  onChange={(e) =>
                    setSelectedStaffForTable({
                      ...selectedStaffForTable,
                      [tableNo]: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-purple-500"
                >
                  {activeStaffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Large Tally Display & Big Buttons */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-purple-900/30 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Wine className="w-5 h-5 text-cyan-400 animate-bounce" />
                  <span className="text-3xl font-extrabold text-slate-100 neon-glow-text-cyan">
                    {totalLD}
                  </span>
                  <span className="text-xs font-semibold text-cyan-300">drinks</span>
                </div>

                {/* Post-it Tally Mark Visualizer */}
                <div className="py-1 px-2 bg-slate-900/90 rounded border border-slate-800/80">
                  {renderTallyMarks(totalLD)}
                </div>

                {/* Big (+ / -) Tally Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <button
                    onClick={() => handleDirectAddLD(tableNo, currentAssignedStaffId, -1)}
                    disabled={totalLD <= 0}
                    className="w-12 h-12 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 rounded-xl font-bold text-base flex items-center justify-center active:scale-95 transition-all disabled:opacity-30 shadow-md shrink-0"
                    title="Decrease LD (-1)"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex flex-1 gap-1.5">
                    <button
                      onClick={() => handleDirectAddLD(tableNo, currentAssignedStaffId, 1)}
                      className="flex-1 h-12 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/40 rounded-xl font-black text-base flex items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-purple-950/80"
                      title="Add 1 Drink (+1)"
                    >
                      <Plus className="w-4 h-4" /> +1
                    </button>
                    <button
                      onClick={() => handleDirectAddLD(tableNo, currentAssignedStaffId, 2)}
                      className="px-3 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 rounded-xl font-black text-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all shadow-lg shadow-cyan-950/80 shrink-0"
                      title="Add 2 Drinks (+2)"
                    >
                      <Plus className="w-3.5 h-3.5" /> +2
                    </button>
                  </div>
                </div>
              </div>

              {/* Staff Breakdown List on Table */}
              <div className="border-t border-slate-800/80 pt-2 text-xs space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Breakdown by Staff:</span>
                {Array.from(staffBreakdown.entries()).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No entries yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(staffBreakdown.entries()).map(([sId, item]) => (
                      <span
                        key={sId}
                        className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1"
                      >
                        <span className="font-semibold text-purple-300">{item.staffName}:</span>
                        <strong className="text-cyan-300">{item.count} drinks</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Live Recent Activity Log Timeline */}
      <div className="lounge-card rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Live LD Entry Timeline ({dateStr})</span>
          </h3>
          <span className="text-xs text-slate-400">Total {ldLogs.length} entries</span>
        </div>

        {ldLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No LD drinks recorded today yet. Click the + button on any table card above to log drinks!
          </div>
        ) : (
          <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
            {ldLogs
              .slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {log.timestamp}
                    </span>
                    <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {log.tableNo}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {log.staffName}
                    </span>
                    <span className="text-slate-400">
                      {log.drinkType || 'Standard LD'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                        log.amount > 0
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/50'
                      }`}
                    >
                      {log.amount > 0 ? `+${log.amount} LD` : `${log.amount} LD`}
                    </span>

                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Delete log / Undo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Adding LD */}
      {pendingLD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Confirm LD Input</h3>
            <p className="text-slate-300 text-sm mb-6">
              Add <strong className="text-purple-400">{pendingLD.amount > 0 ? `+${pendingLD.amount}` : pendingLD.amount} LD</strong> to table <strong className="text-cyan-400">{pendingLD.tableNo}</strong> for staff <strong className="text-slate-100">{pendingLD.staffName}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelAddLD}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddLD}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/50 transition-all active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Management Modal (등록, 수정, 삭제) */}
      {showTableManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">
                  테이블 등록 및 관리 (Table Management)
                </h3>
              </div>
              <button
                onClick={() => setShowTableManager(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Register New Table Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  새 테이블 등록 (Register New Table)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: T-8, VIP-4"
                    value={managerNewTableInput}
                    onChange={(e) => setManagerNewTableInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddMasterTable(managerNewTableInput);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleAddMasterTable(managerNewTableInput)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>등록</span>
                  </button>
                </div>
              </div>

              {/* Table List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-400 block">
                  등록된 테이블 목록 ({masterTables.length}개)
                </label>

                {masterTables.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center italic">
                    등록된 테이블이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {masterTables.map((tName) => {
                      const isEditing = editingTable === tName;
                      return (
                        <div
                          key={tName}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <input
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                className="bg-slate-900 border border-purple-500 text-cyan-300 font-bold px-2.5 py-1 rounded text-xs flex-1 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameMasterTable(tName, renameInput)}
                                className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-semibold text-xs hover:bg-emerald-900"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setEditingTable(null)}
                                className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs hover:bg-slate-700"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-cyan-300 text-sm">
                                  {tName}
                                </span>
                                {activeTables.includes(tName) && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                                    열림
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTable(tName);
                                    setRenameInput(tName);
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-purple-950 text-slate-300 hover:text-purple-300 rounded border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>수정</span>
                                </button>
                                <button
                                  onClick={() => setDeletingTableConfirm(tName)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 rounded border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>삭제</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowTableManager(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                닫기 (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Table Modal */}
      {deletingTableConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-900/60 p-6 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center gap-2 text-rose-400 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-100">테이블 삭제 확인</h3>
            </div>
            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
              테이블 <strong className="text-cyan-400">{deletingTableConfirm}</strong>을(를) 삭제하시겠습니까? 등록된 테이블 목록에서 제거됩니다.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingTableConfirm(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteMasterTable(deletingTableConfirm)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
