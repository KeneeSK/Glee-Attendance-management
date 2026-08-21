import re

with open('src/components/AdminManagerModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("canManageAdmins: false,\n      },", "canManageAdmins: false,\n        canManageInventory: false,\n      },")
content = content.replace("canManageAdmins: true,\n      };", "canManageAdmins: true,\n        canManageInventory: true,\n      };")

with open('src/components/AdminManagerModal.tsx', 'w') as f:
    f.write(content)
