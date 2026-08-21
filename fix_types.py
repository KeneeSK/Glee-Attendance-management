import re

with open('src/types.ts', 'r') as f:
    content = f.read()

# Update TabType
content = re.sub(
    r"export type TabType = 'attendance' \| 'ld' \| 'report' \| 'checklist';",
    "export type TabType = 'attendance' | 'ld' | 'report' | 'checklist' | 'inventory';",
    content
)

# Update AdminRoleType
content = re.sub(
    r"export type AdminRoleType = 'super' \| 'attendance_only' \| 'ld_only' \| 'report_only' \| 'custom';",
    "export type AdminRoleType = 'super' | 'attendance_only' | 'ld_only' | 'report_only' | 'inventory_only' | 'custom';",
    content
)

# Update AdminPermissions
content = re.sub(
    r"  canManageAdmins: boolean;\n\}",
    "  canManageAdmins: boolean;\n  canManageInventory: boolean;\n}",
    content
)

# Add Inventory types
content += """
export interface InventoryCategory {
  id: string;
  name: string;
  order: number;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

export interface DailyInventoryLog {
  id: string;
  date: string; // YYYY-MM-DD
  entries: Record<string, string>; // itemId -> quantity
  updatedAt: string;
  updatedBy: string;
}
"""

with open('src/types.ts', 'w') as f:
    f.write(content)
