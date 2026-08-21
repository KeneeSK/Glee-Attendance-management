import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "ClipboardCheck, FileSpreadsheet } from 'lucide-react';",
    "ClipboardCheck, FileSpreadsheet, Package } from 'lucide-react';"
)

nav_tabs = """        {canAccessLD && (
          <button
            onClick={() => onTabChange('ld')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === 'ld' 
                ? 'bg-slate-700 text-white shadow-inner' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Wine size={18} className={activeTab === 'ld' ? 'text-rose-400' : ''} />
            <span className="font-medium">LD Tracking</span>
          </button>
        )}
        
        {(currentAdmin.role === 'super' || currentAdmin.permissions?.canManageInventory) && (
          <button
            onClick={() => onTabChange('inventory')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              activeTab === 'inventory' 
                ? 'bg-slate-700 text-white shadow-inner' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Package size={18} className={activeTab === 'inventory' ? 'text-indigo-400' : ''} />
            <span className="font-medium">Inventory</span>
          </button>
        )}"""

content = re.sub(
    r"        \{canAccessLD && \(\n          <button\n            onClick=\{\(\) => onTabChange\('ld'\)\}.*?</button>\n        \)\}",
    nav_tabs,
    content,
    flags=re.DOTALL
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)
