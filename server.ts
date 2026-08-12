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
  { id: 'st-1', name: 'ABBY', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-2', name: 'BELLA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-3', name: 'CHLOE', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-4', name: 'DAISY', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-5', name: 'EMMA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-6', name: 'FIONA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-7', name: 'GRACE', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-8', name: 'HANNAH', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-9', name: 'IRIS', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-10', name: 'JENNY', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-11', name: 'KATE', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-12', name: 'LISA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-13', name: 'MIA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-14', name: 'NINA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
  { id: 'st-15', name: 'OLIVIA', role: 'Staff', schedule: '18:00 - 02:00', active: true },
];

const INITIAL_TABLES = [
  'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'VIP-1', 'VIP-2'
];

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      staff: INITIAL_STAFF,
      tables: INITIAL_TABLES,
      attendance: [],
      ldLogs: [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB file:', err);
    return {
      staff: INITIAL_STAFF,
      tables: INITIAL_TABLES,
      attendance: [],
      ldLogs: [],
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

// ==================== SERVER API ROUTES ====================

// Get full server database
app.get('/api/db', (req, res) => {
  const db = readDB();
  res.json({ success: true, data: db });
});

// Full Sync / Save Database
app.post('/api/db/sync', (req, res) => {
  const { staff, tables, attendance, ldLogs } = req.body;
  const currentDB = readDB();
  
  const updatedDB = {
    staff: staff || currentDB.staff,
    tables: tables || currentDB.tables,
    attendance: attendance || currentDB.attendance,
    ldLogs: ldLogs || currentDB.ldLogs,
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
