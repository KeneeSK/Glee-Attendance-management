import re

with open('src/components/AdminManagerModal.tsx', 'r') as f:
    content = f.read()

# Replace all occurrences of "canManageAdmins: false," with "canManageAdmins: false,\n        canManageInventory: false,"
# But careful, we might have done this already? Let's check what happened.
content = re.sub(r"canManageAdmins: false,\n      \};", "canManageAdmins: false,\n        canManageInventory: false,\n      };", content)
content = re.sub(r"canManageAdmins: false\n      \};", "canManageAdmins: false,\n        canManageInventory: false,\n      };", content)

with open('src/components/AdminManagerModal.tsx', 'w') as f:
    f.write(content)
