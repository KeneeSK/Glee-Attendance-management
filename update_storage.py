import re

with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

# 1. Update imports
content = re.sub(
    r"import \{ Staff, AttendanceRecord, LDLogEntry, AdminUser, DailyChecklist \} from '\.\./types';",
    "import { Staff, AttendanceRecord, LDLogEntry, AdminUser, DailyChecklist, InventoryCategory, InventoryItem, DailyInventoryLog } from '../types';",
    content
)

# 2. Add Keys
content = re.sub(
    r"  CHECKLISTS: 'lounge_checklists_v2',\n\};",
    "  CHECKLISTS: 'lounge_checklists_v2',\n  INVENTORY_CATEGORIES: 'lounge_inventory_categories_v1',\n  INVENTORY_ITEMS: 'lounge_inventory_items_v1',\n  INVENTORY_LOGS: 'lounge_inventory_logs_v1',\n};",
    content
)

# 3. Add to collections in fetchServerDatabase
content = re.sub(
    r"      \{ id: 'checklists', key: KEYS\.CHECKLISTS \},\n    \];",
    "      { id: 'checklists', key: KEYS.CHECKLISTS },\n      { id: 'inventoryCategories', key: KEYS.INVENTORY_CATEGORIES },\n      { id: 'inventoryItems', key: KEYS.INVENTORY_ITEMS },\n      { id: 'inventoryLogs', key: KEYS.INVENTORY_LOGS },\n    ];",
    content
)

# 4. Add initial seed data check
seed_logic = """
export function loadInventoryCategories(): InventoryCategory[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory categories:', err);
  }
  // Initialize with defaults if empty based on user request image
  const defaultCats: InventoryCategory[] = [
    { id: 'cat-1', name: 'Drinks/Beverages', order: 1 },
    { id: 'cat-2', name: 'Beers', order: 2 },
    { id: 'cat-3', name: 'Soju', order: 3 },
    { id: 'cat-4', name: 'Liquor', order: 4 },
    { id: 'cat-5', name: 'Mixers & Others', order: 5 },
    { id: 'cat-6', name: 'Cigarettes / Misc', order: 6 },
  ];
  saveInventoryCategories(defaultCats);
  return defaultCats;
}

export function saveInventoryCategories(cats: InventoryCategory[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_CATEGORIES, JSON.stringify(cats));
    syncToFirestore('inventoryCategories', cats);
  } catch (err) {
    console.error('Failed to save inventory categories:', err);
  }
}

export function loadInventoryItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_ITEMS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory items:', err);
  }
  
  const defaultItems: InventoryItem[] = [
    { id: 'item-1', categoryId: 'cat-1', name: 'Coke in can', order: 1 },
    { id: 'item-2', categoryId: 'cat-1', name: 'Coke Zero in can', order: 2 },
    { id: 'item-3', categoryId: 'cat-1', name: 'Sprite in can', order: 3 },
    { id: 'item-4', categoryId: 'cat-1', name: 'Gatorade', order: 4 },
    { id: 'item-5', categoryId: 'cat-1', name: 'Mineral', order: 5 },
    { id: 'item-6', categoryId: 'cat-1', name: 'Mango Juice', order: 6 },
    { id: 'item-7', categoryId: 'cat-1', name: 'Pineapple Juice', order: 7 },
    { id: 'item-8', categoryId: 'cat-1', name: 'Redbull', order: 8 },
    { id: 'item-9', categoryId: 'cat-1', name: 'Soda Water in can', order: 9 },
    { id: 'item-10', categoryId: 'cat-1', name: 'Tonic Water in can', order: 10 },
    { id: 'item-11', categoryId: 'cat-1', name: 'Royal in can', order: 11 },
    
    { id: 'item-12', categoryId: 'cat-2', name: 'Corona', order: 1 },
    { id: 'item-13', categoryId: 'cat-2', name: 'Heineken', order: 2 },
    { id: 'item-14', categoryId: 'cat-2', name: 'Smirnoff Mule', order: 3 },
    
    { id: 'item-15', categoryId: 'cat-3', name: 'Chamisul', order: 1 },
    { id: 'item-16', categoryId: 'cat-3', name: 'Chumchurum', order: 2 },
    { id: 'item-17', categoryId: 'cat-3', name: 'Soju Is back', order: 3 },
    
    { id: 'item-18', categoryId: 'cat-4', name: 'SMA', order: 1 },
    { id: 'item-19', categoryId: 'cat-4', name: 'SMB', order: 2 },
    { id: 'item-20', categoryId: 'cat-4', name: 'SML', order: 3 },
    { id: 'item-21', categoryId: 'cat-4', name: 'STALLION', order: 4 },
    
    { id: 'item-22', categoryId: 'cat-5', name: 'Coke 1.5', order: 1 },
    { id: 'item-23', categoryId: 'cat-5', name: 'Sprite 1.5', order: 2 },
    { id: 'item-24', categoryId: 'cat-5', name: 'Cranberry Juice', order: 3 },
    { id: 'item-25', categoryId: 'cat-5', name: 'Fresh Milk', order: 4 },
    
    { id: 'item-26', categoryId: 'cat-6', name: 'Marlboro', order: 1 },
    { id: 'item-27', categoryId: 'cat-6', name: 'Esse Pop', order: 2 },
    { id: 'item-28', categoryId: 'cat-6', name: 'Mevius', order: 3 },
    { id: 'item-29', categoryId: 'cat-6', name: 'Lighter', order: 4 },
  ];
  saveInventoryItems(defaultItems);
  return defaultItems;
}

export function saveInventoryItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_ITEMS, JSON.stringify(items));
    syncToFirestore('inventoryItems', items);
  } catch (err) {
    console.error('Failed to save inventory items:', err);
  }
}

export function loadAllInventoryLogs(): DailyInventoryLog[] {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load inventory logs:', err);
  }
  return [];
}

export function saveAllInventoryLogs(logs: DailyInventoryLog[]): void {
  try {
    localStorage.setItem(KEYS.INVENTORY_LOGS, JSON.stringify(logs));
    syncToFirestore('inventoryLogs', logs);
  } catch (err) {
    console.error('Failed to save inventory logs:', err);
  }
}

export function loadInventoryLogForDate(date: string): DailyInventoryLog | null {
  const normDate = normalizeDateStr(date);
  const logs = loadAllInventoryLogs();
  return logs.find(l => l.date === normDate) || null;
}

export function updateInventoryLog(log: DailyInventoryLog): void {
  const logs = loadAllInventoryLogs();
  const idx = logs.findIndex(l => l.date === log.date);
  if (idx >= 0) {
    logs[idx] = log;
  } else {
    logs.push(log);
  }
  saveAllInventoryLogs(logs);
}
"""

content += "\n" + seed_logic

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)
