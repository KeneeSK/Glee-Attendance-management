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
import { 
  Calendar, 
  RefreshCw, 
  Users, 
  Wine, 
  ClipboardCheck, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Coffee, 
  UserX, 
  Ban,
  CalendarDays
} from 'lucide-react';
import { AttendanceRecord, LDLogEntry, Staff } from '../types';

export const PublicLiveReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [staffFilter, setStaffFilter] = useState<'all' | 'working' | 'dayoff' | 'absent'>('all');

  // Data states
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [ldLogs, setLdLogs] = useState<LDLogEntry[]>([]);
  const [checklist, setChecklist] = useState<any>(null);
  const [inventoryLog, setInventoryLog] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

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

  // Computation for staff summaries
  const staffSummary = staffList.map(staff => {
    const att = attendance.find(a => a.staffId === staff.id);
    const staffLogs = ldLogs.filter(l => l.staffId === staff.id);
    const totalLD = staffLogs.reduce((sum, l) => sum + l.amount, 0);
    
    let statusCategory: 'working' | 'dayoff' | 'absent' | 'pending' = 'pending';
    let statusLabel = '출근 대기 (Pending)';
    let statusBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';

    if (att) {
      if (att.isDayOff) {
        statusCategory = 'dayoff';
        statusLabel = '휴무 (Day Off)';
        statusBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (att.isAbsent) {
        statusCategory = 'absent';
        statusLabel = '결근 (Absent)';
        statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      } else if (att.isSuspended) {
        statusCategory = 'absent';
        statusLabel = '서스펜션 (Suspended)';
        statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
      } else if (att.checkInTime) {
        statusCategory = 'working';
        if (att.checkOutTime) {
          statusLabel = '퇴근 완료 (Finished)';
          statusBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
        } else {
          statusLabel = att.isLate ? '근무 중 (지각)' : '근무 중 (On Duty)';
          statusBadgeColor = att.isLate 
            ? 'bg-amber-50 text-amber-700 border-amber-200' 
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
      }
    }

    const schedule = att?.schedule || staff.defaultSchedule || '미지정';
    const checkIn = att?.checkInTime;
    const checkOut = att?.checkOutTime;
    const isLate = att?.isLate;
    const note = att?.note;

    return { 
      staff, 
      att,
      statusCategory, 
      statusLabel, 
      statusBadgeColor,
      totalLD, 
      schedule,
      checkIn,
      checkOut,
      isLate,
      note
    };
  });

  // Filtered staff list
  const filteredStaff = staffSummary.filter(s => {
    if (staffFilter === 'all') return true;
    if (staffFilter === 'working') return s.statusCategory === 'working';
    if (staffFilter === 'dayoff') return s.statusCategory === 'dayoff';
    if (staffFilter === 'absent') return s.statusCategory === 'absent';
    return true;
  }).sort((a, b) => {
    // Sort working & highest LD first
    if (a.statusCategory === 'working' && b.statusCategory !== 'working') return -1;
    if (a.statusCategory !== 'working' && b.statusCategory === 'working') return 1;
    return b.totalLD - a.totalLD;
  });

  // Table summary
  const tableSummary = new Map<string, { totalLD: number, staffNames: Set<string> }>();
  ldLogs.forEach(l => {
    if (!l.tableNo) return;
    if (!tableSummary.has(l.tableNo)) tableSummary.set(l.tableNo, { totalLD: 0, staffNames: new Set() });
    const t = tableSummary.get(l.tableNo)!;
    t.totalLD += l.amount;
    if (l.staffName) t.staffNames.add(l.staffName);
  });
  const tables = Array.from(tableSummary.entries()).sort((a, b) => b[1].totalLD - a[1].totalLD);

  // Statistics counters
  const totalWorking = staffSummary.filter(s => s.statusCategory === 'working').length;
  const totalDayOff = staffSummary.filter(s => s.statusCategory === 'dayoff').length;
  const totalAbsent = staffSummary.filter(s => s.statusCategory === 'absent').length;
  const totalLDs = ldLogs.reduce((sum, l) => sum + l.amount, 0);
  const abnormalChecklists = checklist?.abnormalItems || [];
  const checkedCount = checklist?.checkedItems?.length || 0;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-20 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
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
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
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

      <div className="p-4 max-w-lg mx-auto space-y-4 mt-1">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total LD */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-purple-600 mb-1">
              <Wine className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total LDs</span>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none">{totalLDs}</div>
          </div>

          {/* Working */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">근무 (On Duty)</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 leading-none">{totalWorking}</div>
          </div>

          {/* Day Off */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <Coffee className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">휴무 (Day Off)</span>
            </div>
            <div className="text-2xl font-black text-blue-700 leading-none">{totalDayOff}</div>
          </div>

          {/* Absent / Suspended */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <UserX className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">결근/서스펜션</span>
            </div>
            <div className="text-2xl font-black text-rose-700 leading-none">{totalAbsent}</div>
          </div>
        </div>

        {/* Staff Attendance & Schedule Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/60 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">직원 근태 & 스케줄 현황</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500">{staffSummary.length}명</span>
          </div>

          {/* Status Filter Chips */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold no-scrollbar">
            <button
              onClick={() => setStaffFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                staffFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              전체 ({staffSummary.length})
            </button>
            <button
              onClick={() => setStaffFilter('working')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'working' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              근무중 ({totalWorking})
            </button>
            <button
              onClick={() => setStaffFilter('dayoff')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'dayoff' 
                  ? 'bg-blue-700 text-white shadow-sm' 
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              휴무 ({totalDayOff})
            </button>
            <button
              onClick={() => setStaffFilter('absent')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                staffFilter === 'absent' 
                  ? 'bg-rose-700 text-white shadow-sm' 
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              결근/징계 ({totalAbsent})
            </button>
          </div>

          {/* Staff List */}
          <div className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">해당 조건의 직원 기록이 없습니다.</div>
            ) : (
              filteredStaff.map((s, i) => (
                <div key={i} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    {/* Staff info & Status */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">{s.staff.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {s.staff.role}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.statusBadgeColor}`}>
                          {s.statusLabel}
                        </span>
                      </div>

                      {/* Working Schedule info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1 font-medium bg-slate-100/80 px-2 py-0.5 rounded text-slate-700">
                          <CalendarDays className="w-3 h-3 text-slate-500" />
                          <span>스케줄: <strong className="text-slate-900">{s.schedule}</strong></span>
                        </div>

                        {s.checkIn && (
                          <div className="flex items-center gap-1 font-medium bg-emerald-50 px-2 py-0.5 rounded text-emerald-800 border border-emerald-100">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>
                              출근: <strong>{s.checkIn}</strong>
                              {s.isLate && <span className="text-amber-600 font-bold ml-1">(지각)</span>}
                              {s.checkOut && ` ~ 퇴근: ${s.checkOut}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Note if any */}
                      {s.note && (
                        <p className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/60 rounded px-2 py-1 mt-1 font-medium">
                          📝 사유/메모: {s.note}
                        </p>
                      )}
                    </div>

                    {/* LD Count Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-xl">
                        <Wine className="w-3.5 h-3.5 text-purple-700" />
                        <span className="text-base font-black text-purple-950 leading-none">{s.totalLD}</span>
                        <span className="text-[9px] font-bold text-purple-700 uppercase">LD</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Sales Summary */}
        {tables.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100/60 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wine className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">테이블별 매출 (Table Sales)</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{tables.length}개 테이블</span>
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
                  <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200/80">
                    <span className="text-sm font-black text-purple-900">{data.totalLD}</span>
                    <span className="text-[9px] font-bold text-purple-700">LD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/60 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">마감 체크리스트 (Closing Checklist)</h2>
            </div>
            {checkedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {checkedCount}개 완료
              </span>
            )}
          </div>
          <div className="p-4">
            {abnormalChecklists.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-rose-600 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">특이사항 발견</span>
                </div>
                {abnormalChecklists.map((item: string, i: number) => (
                  <div key={i} className="text-[11px] font-bold text-slate-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
                    • {item}
                  </div>
                ))}
              </div>
            ) : checkedCount > 0 ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">모든 점검 항목이 정상입니다.</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-2">아직 기록된 체크리스트가 없습니다.</div>
            )}
            {checklist?.remarks && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">비고 / 메모 (Remarks)</span>
                <p className="text-xs text-slate-800 font-medium">{checklist.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100/60 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">재고 현황 (Inventory)</h2>
            </div>
            {inventoryLog?.updatedAt && (
              <span className="text-[10px] font-bold text-slate-400">
                업데이트: {new Date(inventoryLog.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="p-0">
            {!inventoryLog || Object.keys(inventoryLog.entries || {}).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">해당 일자의 재고 기록이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100">
                {inventoryItems.map(item => {
                  const qty = inventoryLog.entries[item.id] || '';
                  if (!qty) return null;
                  return (
                    <div key={item.id} className="p-3 flex justify-between items-center bg-white">
                      <span className="text-[11px] font-bold text-slate-600 line-clamp-1 pr-2">{item.name}</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{qty}</span>
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
