import re

with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "    canManageAdmins: true,\n  },",
    "    canManageAdmins: true,\n    canManageInventory: true,\n  },"
)

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)
