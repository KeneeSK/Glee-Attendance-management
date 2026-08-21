import re

# ChecklistTab
with open('src/components/ChecklistTab.tsx', 'r') as f:
    c = f.read()
if "isPublicView" not in c:
    c = c.replace("interface ChecklistTabProps {", "interface ChecklistTabProps {\n  isPublicView?: boolean;")
    c = c.replace("export function ChecklistTab({ dateStr, lastSyncTime }: ChecklistTabProps) {", "export function ChecklistTab({ dateStr, lastSyncTime, isPublicView }: ChecklistTabProps) {")
    c = c.replace("onClick={handleSave}", "onClick={handleSave} disabled={isPublicView || isSaving}")
    c = c.replace("onClick={() => setShowPrintModal(true)}", "onClick={() => setShowPrintModal(true)} disabled={isPublicView}")
    c = c.replace("<div className=\"animate-fade-in pb-20 print:hidden\">", "<div className={`animate-fade-in pb-20 print:hidden ${isPublicView ? 'hidden' : ''}`}>")
    # Actually, if isPublicView is true, we ONLY want to show the printable view!
    c = c.replace("<div className=\"hidden print:block w-full p-0 m-0\">", "<div className={`w-full p-0 m-0 ${isPublicView ? 'block' : 'hidden print:block'}`}>")
    with open('src/components/ChecklistTab.tsx', 'w') as f:
        f.write(c)

# InventoryTab
with open('src/components/InventoryTab.tsx', 'r') as f:
    c = f.read()
if "isPublicView" not in c:
    c = c.replace("interface InventoryTabProps {", "interface InventoryTabProps {\n  isPublicView?: boolean;")
    c = c.replace("export const InventoryTab: React.FC<InventoryTabProps> = ({ currentAdmin }) => {", "export const InventoryTab: React.FC<InventoryTabProps> = ({ currentAdmin, isPublicView }) => {")
    # Need to override currentAdmin check if isPublicView is true
    c = c.replace("if (!currentAdmin?.permissions.canManageInventory && currentAdmin?.role !== 'super') {", "if (!isPublicView && !currentAdmin?.permissions.canManageInventory && currentAdmin?.role !== 'super') {")
    c = c.replace("<div className=\"animate-fade-in pb-20 print:hidden\">", "<div className={`animate-fade-in pb-20 print:hidden ${isPublicView ? 'hidden' : ''}`}>")
    c = c.replace("<div className=\"hidden print:block w-full p-0 m-0\">", "<div className={`w-full p-0 m-0 ${isPublicView ? 'block' : 'hidden print:block'}`}>")
    with open('src/components/InventoryTab.tsx', 'w') as f:
        f.write(c)

# DailyReportTab
with open('src/components/DailyReportTab.tsx', 'r') as f:
    c = f.read()
if "isPublicView" not in c:
    c = c.replace("export const DailyReportTab: React.FC<DailyReportTabProps> = ({", "export const DailyReportTab: React.FC<DailyReportTabProps> = ({\n  isPublicView,")
    c = c.replace("<div className=\"animate-fade-in pb-20 print:hidden\">", "<div className={`animate-fade-in pb-20 print:hidden ${isPublicView ? 'hidden' : ''}`}>")
    c = c.replace("<div className=\"hidden print:block w-full p-0 m-0\">", "<div className={`w-full p-0 m-0 ${isPublicView ? 'block' : 'hidden print:block'}`}>")
    with open('src/components/DailyReportTab.tsx', 'w') as f:
        f.write(c)

