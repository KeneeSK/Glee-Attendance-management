import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { ChecklistTab } from './components/ChecklistTab';",
    "import { ChecklistTab } from './components/ChecklistTab';\nimport { InventoryTab } from './components/InventoryTab';"
)

render_logic = """      {activeTab === 'inventory' && <InventoryTab currentAdmin={currentAdmin} />}
    </main>"""

content = content.replace("    </main>", render_logic)

with open('src/App.tsx', 'w') as f:
    f.write(content)
