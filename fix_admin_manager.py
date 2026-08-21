import re

with open('src/components/AdminManagerModal.tsx', 'r') as f:
    content = f.read()

# Add Inventory to permissions
perm_ui = """                <label className="flex items-center space-x-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingAdmin.permissions.canManageInventory}
                    onChange={(e) =>
                      setEditingAdmin({
                        ...editingAdmin,
                        permissions: { ...editingAdmin.permissions, canManageInventory: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500/30"
                  />
                  <span>Manage Inventory</span>
                </label>
                <label className="flex items-center space-x-3 text-sm text-slate-300">
"""

content = re.sub(
    r"                <label className=\"flex items-center space-x-3 text-sm text-slate-300\">\n                  <input\n                    type=\"checkbox\"\n                    checked=\{editingAdmin.permissions.canManageStaff\}",
    perm_ui + """                  <input
                    type="checkbox"
                    checked={editingAdmin.permissions.canManageStaff}""",
    content
)

with open('src/components/AdminManagerModal.tsx', 'w') as f:
    f.write(content)
