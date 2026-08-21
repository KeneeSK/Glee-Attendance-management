import re

with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

old_cols = """  const collections = [
    { id: 'admins', key: KEYS.ADMINS },
    { id: 'tables', key: KEYS.TABLES },
    { id: 'staff', key: KEYS.STAFF },
    { id: 'attendance', key: KEYS.ATTENDANCE },
    { id: 'ldLogs', key: KEYS.LD_LOGS },
    { id: 'checklists', key: KEYS.CHECKLISTS },
  ];"""

new_cols = """  const collections = [
    { id: 'admins', key: KEYS.ADMINS },
    { id: 'tables', key: KEYS.TABLES },
    { id: 'staff', key: KEYS.STAFF },
    { id: 'attendance', key: KEYS.ATTENDANCE },
    { id: 'ldLogs', key: KEYS.LD_LOGS },
    { id: 'checklists', key: KEYS.CHECKLISTS },
    { id: 'inventoryCategories', key: KEYS.INVENTORY_CATEGORIES },
    { id: 'inventoryItems', key: KEYS.INVENTORY_ITEMS },
    { id: 'inventoryLogs', key: KEYS.INVENTORY_LOGS },
  ];"""

content = content.replace(old_cols, new_cols)

# We also need to fix the merging logic for checklists/inventory
old_merge = """                } else if (c.id === 'checklists') {
                  const map = new Map<string, DailyChecklist>();
                  localParsed.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  data.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  finalData = Array.from(map.values());
                }"""

new_merge = """                } else if (c.id === 'checklists') {
                  const map = new Map<string, DailyChecklist>();
                  localParsed.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  data.forEach((item: DailyChecklist) => item?.date && map.set(item.date, item));
                  finalData = Array.from(map.values());
                } else if (c.id === 'inventoryLogs') {
                  const map = new Map<string, DailyInventoryLog>();
                  localParsed.forEach((item: DailyInventoryLog) => item?.date && map.set(item.date, item));
                  data.forEach((item: DailyInventoryLog) => item?.date && map.set(item.date, item));
                  finalData = Array.from(map.values());
                }"""

content = content.replace(old_merge, new_merge)

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)
