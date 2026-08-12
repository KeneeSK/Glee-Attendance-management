import { Staff, AttendanceRecord, LDLogEntry } from '../types';

export const SCHEDULE_OPTIONS = [
  '4:30 PM - 1:30 AM',
  '4:30 PM - 3:00 AM',
  '4:30 PM - 4:00 AM',
  '5:00 PM - 2:00 AM',
  '5:00 PM - 4:00 AM',
  '6:00 PM - 3:00 AM',
  '6:00 PM - 4:00 AM',
  '7:00 PM - 4:00 AM',
];

export const DEFAULT_STAFF_LIST: Staff[] = [
  { id: 'STF-01', name: 'ABBY', role: 'Server', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-02', name: 'SIR KENEE', role: 'Manager', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-03', name: 'RICHAEL', role: 'Server', defaultSchedule: '5:00 PM - 4:00 AM', active: true },
  { id: 'STF-04', name: 'CAMILLE', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-05', name: 'MARIVIC', role: 'Server', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-06', name: 'NORA', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-07', name: 'KATH', role: 'Server', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-08', name: 'YENG', role: 'Server', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-09', name: 'MARIA', role: 'Server', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-10', name: 'JHOANNA', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-11', name: 'PRECY', role: 'Server', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-12', name: 'MELORICA', role: 'Server', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-13', name: 'NESDY', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-14', name: 'AGA', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-15', name: 'GILLI', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-16', name: 'K RYAN', role: 'Server', defaultSchedule: '5:00 PM - 2:00 AM', active: true },
  { id: 'STF-17', name: 'K JAY R', role: 'Server', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-18', name: 'K JOLAND', role: 'Server', defaultSchedule: '6:00 PM - 3:00 AM', active: true },
  { id: 'STF-19', name: 'JHON', role: 'Server', defaultSchedule: '4:30 PM - 4:00 AM', active: true },
  { id: 'STF-20', name: 'JONATHAN', role: 'Server', defaultSchedule: '4:30 PM - 4:00 AM', active: true },
  { id: 'STF-21', name: 'RICHARD', role: 'Server', defaultSchedule: '6:00 PM - 3:00 AM', active: true },
];

export const PRESET_TABLES = [
  'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9', 'T-10', 'T-11', 'T-12', 'T-13', 'T-14', 'T-15', 'T-16', 'T-17'
];

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateInitialAttendance(dateStr: string, staffList: Staff[]): AttendanceRecord[] {
  return staffList.map((staff) => {
    return {
      id: `att_${dateStr}_${staff.id}`,
      date: dateStr,
      staffId: staff.id,
      staffName: staff.name,
      schedule: staff.defaultSchedule,
      checkInTime: '',
      checkOutTime: '',
      isLate: false,
      isAbsent: false,
      isDayOff: false,
      isSuspended: false,
      note: '',
      updatedAt: new Date().toISOString(),
    };
  });
}

export function generateInitialLDLogs(dateStr: string, staffList: Staff[]): LDLogEntry[] {
  return [];
}
