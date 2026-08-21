import re

with open('src/components/AdminManagerModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<option value="report_only">Reports Only</option>',
    '<option value="report_only">Reports Only</option>\n                      <option value="inventory_only">Inventory Only</option>'
)

preset_logic = """    } else if (finalAdmin.role === 'inventory_only') {
      finalAdmin.permissions = {
        canAccessAttendance: false,
        canAccessLD: false,
        canAccessReport: false,
        canManageStaff: false,
        canManageAdmins: false,
        canManageInventory: true,
      };
    } else if (finalAdmin.role === 'custom') {"""

content = content.replace("    } else if (finalAdmin.role === 'custom') {", preset_logic)

with open('src/components/AdminManagerModal.tsx', 'w') as f:
    f.write(content)
