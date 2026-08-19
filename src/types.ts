export interface Staff {
  id: string; // e.g. "STF-01"
  name: string;
  role: string; // e.g. "Server", "Manager", "Bartender"
  defaultSchedule: string; // e.g. "18:00 - 04:00"
  phone?: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  staffName: string;
  schedule: string;
  checkInTime?: string;
  checkOutTime?: string;
  isLate: boolean;
  isAbsent: boolean;
  isDayOff?: boolean;
  isSuspended?: boolean;
  note?: string;
  updatedAt: string;
}

export interface LDLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  tableNo: string; // e.g. "T-2"
  staffId: string;
  staffName: string;
  amount: number; // +1 or -1 or custom delta
  drinkType?: string; // e.g. "Standard LD", "VIP Shot"
  timestamp: string; // HH:mm:ss
  createdAt: string;
}

export interface TableSummary {
  tableNo: string;
  totalLD: number;
  assignedStaff: { staffId: string; staffName: string; count: number }[];
}

export type TabType = 'attendance' | 'ld' | 'report' | 'checklist';

export type AdminRoleType = 'super' | 'attendance_only' | 'ld_only' | 'report_only' | 'custom';

export interface DailyChecklist {
  date: string; // YYYY-MM-DD
  checkedItems: string[]; // Array of checked item labels (Normal)
  abnormalItems?: string[]; // Array of abnormal item labels
  remarks: string;
  updatedAt: string;
}

export interface AdminPermissions {
  canAccessAttendance: boolean;
  canAccessLD: boolean;
  canAccessReport: boolean;
  canManageStaff: boolean;
  canManageAdmins: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: AdminRoleType;
  permissions: AdminPermissions;
  createdAt: string;
}
