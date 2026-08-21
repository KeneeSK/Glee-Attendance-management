import re

with open('src/components/InventoryTab.tsx', 'r') as f:
    content = f.read()

# Update imports
content = content.replace("import { Save, Calendar } from 'lucide-react';", "import { Save, Calendar, Printer, X, ClipboardList } from 'lucide-react';")

# Add state
state_injection = """  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePrint = () => {
    window.print();
  };"""

content = content.replace("  const [isSaving, setIsSaving] = useState(false);\n  const [saveMessage, setSaveMessage] = useState('');", state_injection)

# Add renderPrintableSheet
print_func = """
  const renderPrintableSheet = () => {
    const generatedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const docId = `INV-${currentDate.replace(/-/g, '')}`;

    return (
      <div className="space-y-6 print:space-y-0 select-text">
        <div className="daily-report-print-page bg-white text-slate-900 font-sans p-6 sm:p-7 flex flex-col justify-between w-full max-w-[210mm] mx-auto box-border shadow-md print:shadow-none">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-end shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white border border-indigo-700 shadow-sm">
                <ClipboardList className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase leading-none">
                  GLEE ANGELS
                </h1>
                <p className="text-xs text-slate-700 font-bold tracking-wide uppercase mt-1">
                  Official Daily Inventory Log
                </p>
              </div>
            </div>
            
            <div className="text-right text-[11px] text-slate-700 space-y-0.5 border-l-2 pl-3 border-slate-300 font-medium">
              <div><strong className="text-slate-900">Date:</strong> <span className="font-mono font-bold text-slate-900 text-xs">{currentDate}</span></div>
              <div><strong className="text-slate-900">Doc ID:</strong> <span className="font-mono">{docId}</span></div>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[9.5px] text-slate-500 font-mono">Generated: {generatedTime}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-6">
            {categories.map(cat => {
               const catItems = itemsByCategory.get(cat.id) || [];
               if (catItems.length === 0) return null;
               return (
                 <div key={cat.id} className="mb-2 break-inside-avoid">
                   <h3 className="font-black text-sm text-indigo-900 uppercase border-b-2 border-indigo-200 pb-1.5 mb-2">{cat.name}</h3>
                   <table className="w-full text-xs sm:text-sm">
                     <tbody>
                       {catItems.map(item => (
                         <tr key={item.id} className="border-b border-slate-200 last:border-0">
                           <td className="py-1.5 font-medium text-slate-800">{item.name}</td>
                           <td className="py-1.5 text-right font-mono font-bold text-slate-900 w-20">
                             {entries[item.id] || ''}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )
            })}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8">
            <div className="border-t border-slate-400 grid grid-cols-3 gap-8 text-center pt-8">
              <div>
                <div className="h-10 border-b border-slate-400 mx-4"></div>
                <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Prepared By (Bar)</div>
              </div>
              <div>
                <div className="h-10 border-b border-slate-400 mx-4"></div>
                <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Checked By (Manager)</div>
              </div>
              <div>
                <div className="h-10 border-b border-slate-400 mx-4"></div>
                <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Approved By (Admin)</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };
"""

content = content.replace("  const handleSave = () => {", print_func + "\n  const handleSave = () => {")

# Update main render wrapper to hide on print, and add print button
main_render = """  return (
    <>
      <div className="animate-fade-in pb-20 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 shadow-xl mb-6 gap-4 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Daily Inventory Check</h2>
            <p className="text-slate-400 text-sm mt-1">Manage and track daily stock counts</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-indigo-400" />
              </div>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all font-medium"
              />
            </div>
            
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all shadow-lg active:scale-95 font-medium border border-slate-600"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Preview & Print</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Log'}</span>
            </button>
          </div>
        </div>"""

content = re.sub(
    r"  return \(\n    <div className=\"animate-fade-in pb-20\">\n      <div className=\"flex flex-col md:flex-row md:items-center justify-between bg-slate-800/80 p-5 rounded-2xl border border-slate-700/50 shadow-xl mb-6 gap-4 backdrop-blur-sm\">\n        <div>.*?</div>\n\n        <div className=\"flex items-center gap-3\">\n          <div className=\"relative\">\n            <div className=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none\">\n              <Calendar className=\"h-5 w-5 text-indigo-400\" />\n            </div>\n            <input\n              type=\"date\"\n              value=\{currentDate\}\n              onChange=\{\(e\) => setCurrentDate\(e\.target\.value\)\}\n              className=\"pl-10 pr-4 py-2\.5 bg-slate-900 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all font-medium\"\n            />\n          </div>\n          <button\n            onClick=\{handleSave\}\n            disabled=\{isSaving\}\n            className=\"flex items-center gap-2 px-5 py-2\.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium\"\n          >\n            <Save className=\"w-4 h-4\" />\n            <span>\{isSaving \? 'Saving\.\.\.' : 'Save Log'\}</span>\n          </button>\n        </div>\n      </div>",
    main_render,
    content,
    flags=re.DOTALL
)

# Replace the closing div of the main render and add the Modal and Print view
modal_and_print_html = """      </div>

      {/* PDF / Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center print:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowPrintModal(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden m-4 animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Printer className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Document Preview</h3>
                  <p className="text-xs text-slate-400">A4 Portrait format • Optimized for printing</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - PDF Preview Area */}
            <div className="p-4 sm:p-6 bg-slate-300 overflow-y-auto flex-1 flex flex-col items-center gap-6">
              <div className="w-full max-w-[210mm]">
                {renderPrintableSheet()}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Hidden Print Page Container (Only visible during @media print) */}
      <div className="hidden print:block w-full p-0 m-0">
        {renderPrintableSheet()}
      </div>
    </>
  );
};
"""

content = re.sub(r"      </div>\n    </div>\n  \);\n};\n$", modal_and_print_html, content)

with open('src/components/InventoryTab.tsx', 'w') as f:
    f.write(content)

