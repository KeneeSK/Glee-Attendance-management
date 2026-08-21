import re

with open('src/components/GoogleSheetsSyncModal.tsx', 'r') as f:
    content = f.read()

# Add to type
content = content.replace(
    "      payrollSummaries: number;\n    };",
    "      payrollSummaries: number;\n      checklists: number;\n      inventoryLogs: number;\n    };"
)

# Add to render
new_render = """                    <div>Staff Roster: <strong className="text-white">{syncResult.counts.staff}</strong></div>
                    <div>Payroll Mths: <strong className="text-white">{syncResult.counts.payrollSummaries}</strong></div>
                    <div>Checklists: <strong className="text-white">{syncResult.counts.checklists}</strong></div>
                    <div>Inventory: <strong className="text-white">{syncResult.counts.inventoryLogs}</strong></div>"""

content = content.replace(
    "                    <div>Staff Roster: <strong className=\"text-white\">{syncResult.counts.staff}</strong></div>\n                    <div>Payroll Mths: <strong className=\"text-white\">{syncResult.counts.payrollSummaries}</strong></div>",
    new_render
)

with open('src/components/GoogleSheetsSyncModal.tsx', 'w') as f:
    f.write(content)
