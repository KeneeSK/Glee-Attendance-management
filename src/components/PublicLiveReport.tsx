import React, { useState, useEffect } from 'react';
import { getTodayDateString } from '../utils/initialData';
import { 
  subscribeToServerDatabase, 
  fetchServerDatabase,
  getAttendanceForDate, 
  getLDLogsForDate, 
  getChecklistForDate,
  loadInventoryLogForDate,
  loadInventoryItems,
  loadStaffList
} from '../utils/storage';
import { Calendar, RefreshCw, Users, Wine, ClipboardCheck, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const PublicLiveReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Data states
  const [attendance, setAttendance] = useState<any[]>([]);
  const [ldLogs, setLdLogs] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any>(null);
  const [inventoryLog, setInventoryLog] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const refreshData = () => {
    setAttendance(getAttendanceForDate(selectedDate));
    setLdLogs(getLDLogsForDate(selectedDate));
    setChecklist(getChecklistForDate(selectedDate));
    setInventoryLog(loadInventoryLogForDate(selectedDate));
    setInventoryItems(loadInventoryItems());
    setStaffList(loadStaffList());
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate]); 

  useEffect(() => {
    fetchServerDatabase().then(() => {
      refreshData();
      setIsLoading(false);
      setLastUpdate(Date.now());
    });

    const unsub = subscribeToServerDatabase(() => {
      refreshData();
      setLastUpdate(Date.now());
    });
    return () => unsub();
  }, [selectedDate]);

  // Computation for summary
  const staffSummary = staffList.map(staff => {
    const att = attendance.find(a => a.staffId === staff.id);
    const staffLogs = ldLogs.filter(l => l.staffId === staff.id);
    const totalLD = staffLogs.reduce((sum, l) => sum + l.amount, 0);
    let status = 'Pending';
    if (att) {
      if (att.isDayOff) status = 'Day Off';
      else if (att.isAbsent) status = 'Absent';
      else if (att.isSuspended) status = 'Suspended';
      else if (att.checkInTime) status = att.checkOutTime ? 'Finished' : 'Working';
    }
    return { staff, status, totalLD, isWorking: status === 'Working' || status === 'Finished' };
  }).filter(s => s.isWorking || s.totalLD > 0).sort((a, b) => b.totalLD - a.totalLD);

  const tableSummary = new Map<string, { totalLD: number, staffNames: Set<string> }>();
  ldLogs.forEach(l => {
    if (!l.tableNo) return;
    if (!tableSummary.has(l.tableNo)) tableSummary.set(l.tableNo, { totalLD: 0, staffNames: new Set() });
    const t = tableSummary.get(l.tableNo)!;
    t.totalLD += l.amount;
    if (l.staffName) t.staffNames.add(l.staffName);
  });
  const tables = Array.from(tableSummary.entries()).sort((a, b) => b[1].totalLD - a[1].totalLD);

  const totalWorking = staffSummary.filter(s => s.isWorking).length;
  const totalLDs = ldLogs.reduce((sum, l) => sum + l.amount, 0);
  const abnormalChecklists = checklist?.abnormalItems || [];
  const checkedCount = checklist?.checkedItems?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-purple-950 rounded-lg flex items-center justify-center shadow-inner">
            <span className="text-white font-black text-sm tracking-wider">GA</span>
          </div>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 leading-tight tracking-tight uppercase">Glee Angels</h1>
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Live Boss Report</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-800 outline-none p-0 cursor-pointer w-24"
            />
          </div>
          <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Live Sync On'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 mt-2">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-purple-600 mb-2">
              <Wine className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Total LDs</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{totalLDs}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Staff On Duty</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{totalWorking}</div>
          </div>
        </div>

        {/* Staff Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Staff Performance</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500">{staffSummary.length} Records</span>
          </div>
          <div className="divide-y divide-slate-100">
            {staffSummary.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No staff records for today</div>
            ) : (
              staffSummary.map((s, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-[13px]">{s.staff.name}</span>
                    <span className="text-[10px] font-bold text-slate-500">{s.staff.role} • {s.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-purple-950">{s.totalLD}</span>
                    <span className="text-[9px] font-bold text-purple-600 uppercase">LDs</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Sales Summary */}
        {tables.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wine className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Table Sales</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {tables.map(([tableNo, data], i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-slate-900 text-[13px]">{tableNo}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">
                      {Array.from(data.staffNames).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                    <span className="text-sm font-black text-purple-900">{data.totalLD}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Closing Checklist</h2>
            </div>
            {checkedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {checkedCount} Completed
              </span>
            )}
          </div>
          <div className="p-4">
            {abnormalChecklists.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-red-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Issues Found</span>
                </div>
                {abnormalChecklists.map((item: string, i: number) => (
                  <div key={i} className="text-[11px] font-bold text-slate-700 bg-red-50 px-2.5 py-1.5 rounded border border-red-100">
                    • {item}
                  </div>
                ))}
              </div>
            ) : checkedCount > 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">All checked items are normal.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center">No checklist recorded yet for this date.</div>
            )}
            {checklist?.remarks && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Remarks</span>
                <p className="text-xs text-slate-800">{checklist.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Inventory Status</h2>
            </div>
            {inventoryLog?.updatedAt && (
              <span className="text-[10px] font-bold text-slate-400">
                Updated {new Date(inventoryLog.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="p-0">
            {!inventoryLog || Object.keys(inventoryLog.entries || {}).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No inventory recorded for this date.</div>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100">
                {inventoryItems.map(item => {
                  const qty = inventoryLog.entries[item.id] || '';
                  if (!qty) return null;
                  return (
                    <div key={item.id} className="p-3 flex justify-between items-center bg-white">
                      <span className="text-[11px] font-bold text-slate-600 line-clamp-1 pr-2">{item.name}</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{qty}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
