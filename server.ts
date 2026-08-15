import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lounge_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default data if file does not exist
const INITIAL_STAFF = [
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

const INITIAL_TABLES = [
  'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'VIP-1', 'VIP-2'
];

const INITIAL_ADMINS = [
  {
    id: 'adm-01',
    username: 'admin',
    password: 'admin123',
    name: 'Super Admin',
    role: 'super',
    permissions: {
      canAccessAttendance: true,
      canAccessLD: true,
      canAccessReport: true,
      canManageStaff: true,
      canManageAdmins: true,
    },
    createdAt: new Date().toISOString(),
  },
];

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      staff: INITIAL_STAFF,
      tables: INITIAL_TABLES,
      attendance: [],
      ldLogs: [],
      admins: INITIAL_ADMINS,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // Auto-update staff if it holds old default data or is missing new roles
    if (!parsed.staff || parsed.staff.length === 0 || parsed.staff.some((s: any) => s.id?.startsWith('st-') || s.name === 'ABBY')) {
      parsed.staff = INITIAL_STAFF;
      writeDB(parsed);
    }
    
    if (!parsed.admins || !Array.isArray(parsed.admins) || parsed.admins.length === 0) {
      parsed.admins = INITIAL_ADMINS;
      writeDB(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading DB file:', err);
    return {
      staff: INITIAL_STAFF,
      tables: INITIAL_TABLES,
      attendance: [],
      ldLogs: [],
      admins: INITIAL_ADMINS,
      updatedAt: new Date().toISOString(),
    };
  }
}

function writeDB(data: any) {
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB file:', err);
    return false;
  }
}

// Helper functions for smart data merging to prevent data loss
function mergeArraysById(existingArr: any[] = [], incomingArr: any[] = []): any[] {
  const map = new Map<string, any>();
  if (Array.isArray(existingArr)) {
    for (const item of existingArr) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
  }
  if (Array.isArray(incomingArr)) {
    for (const item of incomingArr) {
      if (item && item.id) {
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          // Merge properties, preferring non-empty values
          map.set(item.id, { ...existing, ...item });
        }
      }
    }
  }
  return Array.from(map.values());
}

function mergeTables(existingTables: string[] = [], incomingTables: string[] = []): string[] {
  const set = new Set<string>();
  if (Array.isArray(existingTables)) existingTables.forEach((t) => t && set.add(t));
  if (Array.isArray(incomingTables)) incomingTables.forEach((t) => t && set.add(t));
  return Array.from(set);
}

// ==================== SERVER API ROUTES ====================

// Get full server database
app.get('/api/db', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const db = readDB();
  res.json({ success: true, data: db });
});

// Full Smart Sync / Save Database
app.post('/api/db/sync', (req, res) => {
  const { staff, tables, attendance, ldLogs, admins } = req.body;
  const currentDB = readDB();
  
  const updatedDB = {
    staff: Array.isArray(staff) ? staff : currentDB.staff,
    tables: Array.isArray(tables) ? tables : currentDB.tables,
    attendance: Array.isArray(attendance) ? attendance : currentDB.attendance,
    ldLogs: Array.isArray(ldLogs) ? ldLogs : currentDB.ldLogs,
    admins: Array.isArray(admins) ? admins : (currentDB.admins || INITIAL_ADMINS),
    updatedAt: new Date().toISOString(),
  };

  const success = writeDB(updatedDB);
  res.json({ success, data: updatedDB });
});

// Save or Update Attendance Record
app.post('/api/db/attendance', (req, res) => {
  const newRecord = req.body;
  if (!newRecord || !newRecord.date || !newRecord.staffId) {
    return res.status(400).json({ success: false, message: 'Invalid attendance record' });
  }

  const db = readDB();
  const existingIndex = db.attendance.findIndex(
    (a: any) => a.date === newRecord.date && a.staffId === newRecord.staffId
  );

  if (existingIndex >= 0) {
    db.attendance[existingIndex] = { ...db.attendance[existingIndex], ...newRecord };
  } else {
    db.attendance.push(newRecord);
  }

  writeDB(db);
  res.json({ success: true, data: db.attendance });
});

// Add LD Log
app.post('/api/db/ld-log', (req, res) => {
  const newLog = req.body;
  if (!newLog || !newLog.date || !newLog.staffId) {
    return res.status(400).json({ success: false, message: 'Invalid LD log' });
  }

  const db = readDB();
  db.ldLogs.push(newLog);
  writeDB(db);
  res.json({ success: true, data: db.ldLogs });
});

// Delete LD Log
app.delete('/api/db/ld-log/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.ldLogs = db.ldLogs.filter((log: any) => log.id !== id);
  writeDB(db);
  res.json({ success: true, data: db.ldLogs });
});

// Reset Database to Demo Defaults
app.post('/api/db/reset', (req, res) => {
  const defaultData = {
    staff: INITIAL_STAFF,
    tables: INITIAL_TABLES,
    attendance: [],
    ldLogs: [],
    updatedAt: new Date().toISOString(),
  };
  writeDB(defaultData);
  res.json({ success: true, data: defaultData });
});

// ==================== VITE & STATIC SERVING ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server DB running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
