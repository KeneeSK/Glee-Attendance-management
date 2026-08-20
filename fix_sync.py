import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# 1. Update syncAllDataToGoogleSheets
# Find the start of staffTablesForDateMap
map_logic = """  // Calculate tables per staff for the attendance sheet
  const staffTablesForDateMap = new Map<string, string[]>();
  const staffLDCountForDateMap = new Map<string, number>();
  allLDLogs.forEach((log) => {
    if (!log.date || !log.staffId) return;
    const key = `${log.date}_${log.staffId}`;
    
    // LD count map
    const currCount = staffLDCountForDateMap.get(key) || 0;
    staffLDCountForDateMap.set(key, currCount + (log.amount || 0));

    // table map
    if (!log.tableNo) return;
    const list = staffTablesForDateMap.get(key) || [];
    if (!list.includes(log.tableNo)) {
      list.push(log.tableNo);
      staffTablesForDateMap.set(key, list);
    }
  });"""

content = re.sub(
    r"  // Calculate tables per staff for the attendance sheet\n  const staffTablesForDateMap = new Map<string, string\[\]>\(\);\n  allLDLogs.forEach\(\(log\) => \{.*?  \}\);\n",
    map_logic + '\n',
    content,
    flags=re.DOTALL
)

# Update attendanceHeaders in syncAllDataToGoogleSheets
new_headers = """  const attendanceHeaders = [
    'Date',
    'Staff ID',
    'Staff Name',
    'Role / Position',
    'Status',
    'Check-In Time',
    'Check-Out Time',
    'Work Duration (HH:MM)',
    'Decimal Hours (for Payroll)',
    'LD Count',
    'Assigned Tables',
    'Manager Note',
    'Record ID',
    'Last Synced Timestamp',
  ];"""

content = re.sub(
    r"  const attendanceHeaders = \[\n    'Date',\n    'Staff ID',\n.*?    'Last Synced Timestamp',\n  \];",
    new_headers,
    content,
    flags=re.DOTALL
)

# Update attendanceRows mapping in syncAllDataToGoogleSheets
new_row_map = """    const assignedTables = staffTablesForDateMap.get(`${rec.date}_${rec.staffId}`) || [];
    const ldCount = staffLDCountForDateMap.get(`${rec.date}_${rec.staffId}`) || 0;

    return [
      rec.date,
      rec.staffId,
      rec.staffName || staff?.name || 'Unknown',
      staff?.role || 'Staff',
      statusText,
      rec.checkInTime || '-',
      rec.checkOutTime || '-',
      workDurationStr,
      decimalHours.toString(),
      ldCount,
      assignedTables.join(', ') || '-',
      rec.note || '',
      rec.id,
      formattedSyncTime,
    ];"""

content = re.sub(
    r"    const assignedTables = staffTablesForDateMap\.get\(.*?\n      rec\.date,.*?\n    \];",
    new_row_map,
    content,
    flags=re.DOTALL
)


# 2. Update generateAllTablesCSV()

# We need to compute ld counts there too
gen_logic_start = """  // 1. Attendance
  const staffLDCountForDateMap = new Map<string, number>();
  allLDLogs.forEach((log) => {
    if (!log.date || !log.staffId) return;
    const key = `${log.date}_${log.staffId}`;
    const currCount = staffLDCountForDateMap.get(key) || 0;
    staffLDCountForDateMap.set(key, currCount + (log.amount || 0));
  });

  const attHeaders = [
    'Date',
    'Staff ID',
    'Staff Name',
    'Role',
    'Status',
    'Check In',
    'Check Out',
    'Worked Hours',
    'LD Count',
    'Notes',
  ];"""

content = re.sub(
    r"  // 1\. Attendance\n  const attHeaders = \[\n    'Date',.*?    'Notes',\n  \];",
    gen_logic_start,
    content,
    flags=re.DOTALL
)

gen_row_map = """    let status = 'Pending';
    if (rec.isDayOff) status = 'Day Off';
    else if (rec.isAbsent) status = 'Absent';
    else if (rec.isSuspended) status = 'Suspended';
    else if (rec.isLate) status = 'Late';
    else if (rec.checkInTime) status = 'Present';

    const ldCount = staffLDCountForDateMap.get(`${rec.date}_${rec.staffId}`) || 0;

    return [
      rec.date,
      rec.staffId,
      staff?.name || rec.staffName || '',
      staff?.role || '',
      status,
      rec.checkInTime || '',
      rec.checkOutTime || '',
      workHours,
      ldCount,
      rec.note || '',
    ];"""

content = re.sub(
    r"    let status = 'Pending';\n    if \(rec\.isDayOff\).*?\n    \];",
    gen_row_map,
    content,
    flags=re.DOTALL
)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)
