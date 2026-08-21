import re

with open('src/utils/googleSheets.ts', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "  loadAllLDLogs,\n  normalizeDateStr,",
    "  loadAllLDLogs,\n  loadAllChecklists,\n  loadAllInventoryLogs,\n  loadInventoryItems,\n  loadInventoryCategories,\n  normalizeDateStr,"
)

# 2. Update REQUIRED_SHEET_NAMES
content = content.replace(
    "  'Payroll & Monthly Summary',\n];",
    "  'Payroll & Monthly Summary',\n  'Daily Checklists',\n  'Inventory Logs',\n];"
)

# 3. Update syncAllDataToGoogleSheets

# Replace syncedCounts interface
content = content.replace(
    "    payrollSummaries: number;\n  };\n  timestamp: string;",
    "    payrollSummaries: number;\n    checklists: number;\n    inventoryLogs: number;\n  };\n  timestamp: string;"
)

# load data
load_injection = """  const allLDLogs = loadAllLDLogs();
  const allChecklists = loadAllChecklists();
  const allInventoryLogs = loadAllInventoryLogs();
  const inventoryItems = loadInventoryItems();
  const inventoryCategories = loadInventoryCategories();"""

content = content.replace("  const allLDLogs = loadAllLDLogs();", load_injection)

# 4. Generate new rows
new_tabs = """
  // -------------------------------------------------------------
  // 5. Sheet: "Daily Checklists"
  // -------------------------------------------------------------
  onProgress?.('Formatting Daily Checklists...');
  const checklistHeaders = [
    'Date',
    'Normal Checked Items Count',
    'Abnormal Items Count',
    'Abnormal Items Detail',
    'Remarks',
    'Last Updated',
  ];

  const sortedChecklists = [...allChecklists].sort((a, b) => b.date.localeCompare(a.date));
  const checklistRows = sortedChecklists.map((c) => {
    return [
      c.date,
      c.checkedItems.length.toString(),
      (c.abnormalItems?.length || 0).toString(),
      (c.abnormalItems || []).join(', '),
      c.remarks || '',
      c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '',
    ];
  });

  // -------------------------------------------------------------
  // 6. Sheet: "Inventory Logs"
  // -------------------------------------------------------------
  onProgress?.('Formatting Inventory Logs...');
  
  // We want to pivot inventory items as columns, or just dump them as JSON?
  // Better to dump them in a readable way. Let's make columns: Date, Updated By, Updated At, Item 1, Item 2...
  
  const sortedInvItems = [...inventoryItems].sort((a, b) => a.order - b.order);
  const invHeaders = [
    'Date',
    'Updated By',
    'Last Updated',
    ...sortedInvItems.map(item => item.name)
  ];

  const sortedInvLogs = [...allInventoryLogs].sort((a, b) => b.date.localeCompare(a.date));
  const invRows = sortedInvLogs.map((log) => {
    const row = [
      log.date,
      log.updatedBy || 'Unknown',
      log.updatedAt ? new Date(log.updatedAt).toLocaleString() : '',
    ];
    // Add amounts for each item
    sortedInvItems.forEach(item => {
      row.push(log.entries[item.id] || '');
    });
    return row;
  });

  // -------------------------------------------------------------
  // Send Batch Update to Google Sheets API
"""

content = content.replace(
    "  // -------------------------------------------------------------\n  // Send Batch Update to Google Sheets API",
    new_tabs
)

# 5. Add to batchData
batch_data_update = """    {
      range: "'Payroll & Monthly Summary'!A1:L5000",
      values: [payrollHeaders, ...payrollRows],
    },
    {
      range: "'Daily Checklists'!A1:Z5000",
      values: [checklistHeaders, ...checklistRows],
    },
    {
      range: "'Inventory Logs'!A1:ZZ5000",
      values: [invHeaders, ...invRows],
    },"""

content = content.replace(
    "    {\n      range: \"'Payroll & Monthly Summary'!A1:L5000\",\n      values: [payrollHeaders, ...payrollRows],\n    },",
    batch_data_update
)

# 6. Add to batchClear
batch_clear_update = """        "'Attendance & Hours Ledger'!A1:Z",
        "'LD Sales Audit Trail'!A1:Z",
        "'Staff Master Database'!A1:Z",
        "'Payroll & Monthly Summary'!A1:Z",
        "'Daily Checklists'!A1:Z",
        "'Inventory Logs'!A1:ZZ",
      ],"""

content = content.replace(
    "        \"'Attendance & Hours Ledger'!A1:Z\",\n        \"'LD Sales Audit Trail'!A1:Z\",\n        \"'Staff Master Database'!A1:Z\",\n        \"'Payroll & Monthly Summary'!A1:Z\",\n      ],",
    batch_clear_update
)

# 7. Update return syncedCounts
return_counts = """    syncedCounts: {
      attendance: sortedAttendance.length,
      ldLogs: sortedLDLogs.length,
      staff: staffList.length,
      payrollSummaries: sortedSummaries.length,
      checklists: sortedChecklists.length,
      inventoryLogs: sortedInvLogs.length,
    },"""

content = content.replace(
    "    syncedCounts: {\n      attendance: sortedAttendance.length,\n      ldLogs: sortedLDLogs.length,\n      staff: staffList.length,\n      payrollSummaries: sortedSummaries.length,\n    },",
    return_counts
)

with open('src/utils/googleSheets.ts', 'w') as f:
    f.write(content)

