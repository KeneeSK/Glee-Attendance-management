import React, { useState, useEffect } from 'react';
import { DailyChecklist } from '../types';
import { getChecklistForDate, saveChecklistForDate } from '../utils/storage';
import { CHECKLIST_ITEMS } from '../data/checklist';
import { Save, Printer, ClipboardCheck, Edit3, FileDown, FileText, Building2, X } from 'lucide-react';

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
  const [showPrintModal, setShowPrintModal] = useState(false);

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

  const midPoint = Math.ceil(CHECKLIST_ITEMS.length / 2);
  const leftColumnItems = CHECKLIST_ITEMS.slice(0, midPoint);
  const rightColumnItems = CHECKLIST_ITEMS.slice(midPoint);

  const renderPrintTable = (items: string[], startIndex: number) => (
    <table className="w-full text-left border-collapse border border-black">
      <thead>
        <tr className="bg-slate-100 border-b border-black">
          <th className="font-bold text-black border-r border-black py-1 px-4 text-xs">
            Task Description
          </th>
          <th className="font-bold text-center text-black py-1 px-2 text-xs w-16">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black">
        {items.map((item, localIndex) => {
          const actualIndex = startIndex + localIndex;
          const isChecked = checklist.checkedItems.includes(item);
          return (
            <tr key={actualIndex} className="border-b border-black">
              <td className="py-1 px-3 border-r border-black text-black font-medium text-[11px]">
                {item}
              </td>
              <td className="py-1 px-2 text-center">
                {isChecked ? (
                  <span className="text-sm font-bold text-black leading-none">✓</span>
                ) : (
                  <span className="text-slate-400 leading-none">-</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col gap-6">
      <style type="text/css">
        {`
          @media print {
            @page { 
              size: A4 portrait; 
              margin: 10mm; 
            }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
          }
        `}
      </style>
      
      {/* Header and Controls */}
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
            onClick={() => setShowPrintModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30 px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-emerald-950/50"
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>PDF Form Preview</span>
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              isSaved
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Saved!' : 'Save Checklist'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Checklist (Dark Theme) */}
      <div className="lounge-card rounded-xl border border-slate-800 overflow-hidden bg-[#0f172a] print:hidden">
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="py-3 px-4 font-bold text-slate-300">
                    Task Description
                  </th>
                  <th className="py-3 px-4 font-bold text-slate-300 text-center w-32">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {CHECKLIST_ITEMS.map((item, index) => {
                  const isChecked = checklist.checkedItems.includes(item);
                  return (
                    <tr 
                      key={index} 
                      className={`group transition-colors ${isChecked ? 'bg-indigo-900/10' : 'hover:bg-slate-800/30'}`}
                    >
                      <td className="py-3 px-4">
                        <label 
                          htmlFor={`check-${index}`}
                          className="flex items-center gap-3 cursor-pointer select-none"
                        >
                          <span className={`text-sm sm:text-base font-medium ${isChecked ? 'text-indigo-300' : 'text-slate-300'}`}>
                            {item}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            id={`check-${index}`}
                            checked={isChecked}
                            onChange={() => handleToggleItem(item)}
                            className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-200">Remarks</h3>
            </div>
            <textarea
              value={checklist.remarks}
              onChange={handleRemarksChange}
              placeholder="Add any remarks or issues noticed during closing..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px]"
            />
          </div>
        </div>
      </div>

      {/* Formal PDF Report Modal Preview */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
            
            {/* Modal Header Controls (Not Printed) */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    PDF Checklist Preview
                  </h3>
                  <p className="text-xs text-slate-400">
                    Official Printable Checklist Format
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Formatted for crisp paper output & PDF generation) */}
            <div className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto flex-1 font-sans">
              <div className="border-b-2 border-slate-900 pb-2 mb-4">
                <h1 className="text-2xl font-black text-center text-slate-900 uppercase tracking-tight">
                  Checklist (Closing Time)
                </h1>
                <h2 className="text-lg font-bold text-center text-slate-700 mt-1">
                  First Floor / Second Floor
                </h2>
                <div className="mt-4 flex justify-between items-end border-b border-slate-300 pb-1">
                  <div className="text-sm font-bold text-slate-600">
                    DATE: <span className="text-black ml-2 text-base">{dateStr}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Generated via Lounge Management System
                  </div>
                </div>
              </div>

              <div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    {renderPrintTable(leftColumnItems, 0)}
                  </div>
                  <div className="flex-1">
                    {renderPrintTable(rightColumnItems, midPoint)}
                  </div>
                </div>
              </div>

              <div className="mt-4 border border-black">
                <div className="bg-slate-100 border-b border-black p-1">
                  <h3 className="font-bold text-black text-center w-full text-sm uppercase">Remarks</h3>
                </div>
                <div className="p-3 min-h-[60px] text-black whitespace-pre-wrap text-sm">
                  {checklist.remarks || <span className="text-transparent">.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Wrapper (Only visible when printing) */}
      <div className="hidden print:block bg-white text-black font-sans p-0 m-0">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h1 className="text-2xl font-black text-center text-black uppercase tracking-tight">
            Checklist (Closing Time)
          </h1>
          <h2 className="text-lg font-bold text-center text-black mt-1">
            First Floor / Second Floor
          </h2>
          <div className="mt-4 flex justify-between items-end border-b border-black pb-1">
            <div className="text-sm font-bold text-black">
              DATE: <span className="text-black ml-2 text-base">{dateStr}</span>
            </div>
            <div className="text-[10px] text-black font-mono">
              Generated via Lounge Management System
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            {renderPrintTable(leftColumnItems, 0)}
          </div>
          <div className="flex-1">
            {renderPrintTable(rightColumnItems, midPoint)}
          </div>
        </div>

        <div className="mt-4 border border-black">
          <div className="bg-gray-100 border-b border-black p-1">
            <h3 className="font-bold text-black text-center w-full text-sm uppercase">Remarks</h3>
          </div>
          <div className="p-3 min-h-[60px] text-black whitespace-pre-wrap text-sm">
            {checklist.remarks || <span className="text-transparent">.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
