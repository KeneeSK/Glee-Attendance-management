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
  { id: 'STF-01', name: 'SIR KENEE', role: 'Chief, Daily Operations', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-02', name: 'RICHAEL', role: 'Chief Financial & Logistic Operations', defaultSchedule: '5:00 PM - 4:00 AM', active: true },
  { id: 'STF-03', name: 'MARIA', role: 'Head Wait Staff', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-04', name: 'RICHARD', role: 'DJ / Sound Technician', defaultSchedule: '6:00 PM - 3:00 AM', active: true },
  { id: 'STF-05', name: 'DJ LYSKEE', role: 'DJ / Sound Technician', defaultSchedule: '6:00 PM - 3:00 AM', active: true },
  { id: 'STF-06', name: 'RYAN', role: 'Head Chef', defaultSchedule: '5:00 PM - 2:00 AM', active: true },
  { id: 'STF-07', name: 'JOLANDS', role: 'Kitchen Staff', defaultSchedule: '6:00 PM - 3:00 AM', active: true },
  { id: 'STF-08', name: 'JR', role: 'Kitchen Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-09', name: 'CAMILLE', role: 'Cashier', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-10', name: 'NESDY', role: 'Wait Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-11', name: 'JHOANNA', role: 'Wait Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-12', name: 'MICA', role: 'Wait Staff', defaultSchedule: '6:00 PM - 4:00 AM', active: true },
  { id: 'STF-13', name: 'MARIVIC', role: 'Wait Staff', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-14', name: 'PRECY', role: 'Wait Staff', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-15', name: 'NORA', role: 'Wait Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-16', name: 'YHENG', role: 'Wait Staff', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-17', name: 'KATH', role: 'Wait Staff', defaultSchedule: '4:30 PM - 1:30 AM', active: true },
  { id: 'STF-18', name: 'GILLI', role: 'Wait Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-19', name: 'AGA', role: 'Wait Staff', defaultSchedule: '7:00 PM - 4:00 AM', active: true },
  { id: 'STF-20', name: 'JOHN', role: 'Utility', defaultSchedule: '4:30 PM - 4:00 AM', active: true },
  { id: 'STF-21', name: 'JONATHAN', role: 'Doorman', defaultSchedule: '4:30 PM - 4:00 AM', active: true },
];

export const PRESET_TABLES = [
  'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9', 'T-10', 'T-11', 'T-12', 'T-13', 'T-14', 'T-15', 'T-16', 'T-17'
];

export function getTodayDateString(): string {
  const now = new Date();
  
  // If the current time is before 5:00 AM, consider it the previous business day.
  if (now.getHours() < 5) {
    now.setDate(now.getDate() - 1);
  }

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
