import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "{activeTab === 'inventory' && <InventoryTab currentAdmin={currentAdmin} />}",
    "{currentTab === 'inventory' && <InventoryTab currentAdmin={currentUser} />}"
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
