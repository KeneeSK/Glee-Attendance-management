import React, { useState, useEffect } from 'react';
import { DailyChecklist } from '../types';
import { getChecklistForDate, saveChecklistForDate } from '../utils/storage';
import { CHECKLIST_ITEMS } from '../data/checklist';
import { Save, Printer, ClipboardCheck, Edit3 } from 'lucide-react';

interface ChecklistTabProps {
  dateStr: string;
}

export function ChecklistTab({ dateStr }: ChecklistTabProps) {
  const [checklist, setChecklist] = useState<DailyChecklist>({
    date: dateStr,
    checkedItems: [],
    remarks: '',
    updatedAt: new Date().toISOString(),
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setChecklist(getChecklistForDate(dateStr));
    setIsSaved(false);
  }, [dateStr]);

  const handleToggleItem = (item: string) => {
    setChecklist((prev) => {
      const isChecked = prev.checkedItems.includes(item);
      const newCheckedItems = isChecked
        ? prev.checkedItems.filter((i) => i !== item)
        : [...prev.checkedItems, item];
      return {
        ...prev,
        checkedItems: newCheckedItems,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsSaved(false);
  };

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChecklist((prev) => ({
      ...prev,
      remarks: e.target.value,
      updatedAt: new Date().toISOString(),
    }));
    setIsSaved(false);
  };

  const handleSave = () => {
    saveChecklistForDate(checklist);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-400" />
            Closing Time Checklist
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            First Floor / Second Floor checklist for {dateStr}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Saved!' : 'Save Checklist'}</span>
          </button>
        </div>
      </div>

      <div className="lounge-card rounded-xl border border-slate-800 overflow-hidden bg-[#0f172a] print:border-none print:shadow-none print:bg-white print:text-black">
        <div className="hidden print:block p-8 border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-3xl font-black text-center text-slate-900 uppercase tracking-tight">
            Checklist (Closing Time)
          </h1>
          <h2 className="text-xl font-bold text-center text-slate-700 mt-2">
            First Floor / Second Floor
          </h2>
          <div className="mt-6 flex justify-between items-end border-b border-slate-300 pb-2">
            <div className="text-sm font-bold text-slate-600">
              DATE: <span className="text-black ml-2 text-lg">{dateStr}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Generated via Lounge Management System
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 print:p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse print:border print:border-black">
              <thead>
                <tr className="border-b border-slate-700/50 print:border-black print:bg-slate-100">
                  <th className="py-3 px-4 font-bold text-slate-300 print:text-black print:border-r print:border-black print:py-2">
                    Task Description
                  </th>
                  <th className="py-3 px-4 font-bold text-slate-300 text-center w-32 print:text-black print:py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print:divide-black">
                {CHECKLIST_ITEMS.map((item, index) => {
                  const isChecked = checklist.checkedItems.includes(item);
                  return (
                    <tr 
                      key={index} 
                      className={`group transition-colors print:border-b print:border-black ${isChecked ? 'bg-purple-900/10' : 'hover:bg-slate-800/30'}`}
                    >
                      <td className="py-3 px-4 print:py-2 print:border-r print:border-black">
                        <label 
                          htmlFor={`check-${index}`}
                          className="flex items-center gap-3 cursor-pointer select-none"
                        >
                          <span className={`text-sm sm:text-base print:text-sm font-medium ${isChecked ? 'text-purple-300 print:text-black' : 'text-slate-300 print:text-slate-700'}`}>
                            {item}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-4 text-center print:py-2">
                        <div className="flex justify-center print:hidden">
                          <input
                            type="checkbox"
                            id={`check-${index}`}
                            checked={isChecked}
                            onChange={() => handleToggleItem(item)}
                            className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer"
                          />
                        </div>
                        <div className="hidden print:flex justify-center items-center h-full">
                          {isChecked ? (
                            <span className="text-xl font-bold text-black">✓</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 print:mt-6 print:border print:border-black">
            <div className="flex items-center gap-2 mb-3 print:bg-slate-100 print:border-b print:border-black print:p-2 print:mb-0">
              <Edit3 className="w-5 h-5 text-purple-400 print:hidden" />
              <h3 className="text-lg font-bold text-slate-200 print:text-black print:text-center print:w-full print:uppercase">Remarks</h3>
            </div>
            <textarea
              value={checklist.remarks}
              onChange={handleRemarksChange}
              placeholder="Add any remarks or issues noticed during closing..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y min-h-[120px] print:hidden"
            />
            <div className="hidden print:block p-4 min-h-[100px] text-black whitespace-pre-wrap">
              {checklist.remarks || <span className="text-transparent">.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
