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
    abnormalItems: [],
    remarks: '',
    updatedAt: new Date().toISOString(),
  });
  const [isSaved, setIsSaved] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    setChecklist(getChecklistForDate(dateStr));
    setIsSaved(false);
  }, [dateStr]);

  const handleStatusChange = (item: string, status: 'normal' | 'abnormal' | 'none') => {
    setChecklist((prev) => {
      const newChecked = prev.checkedItems.filter((i) => i !== item);
      const newAbnormal = (prev.abnormalItems || []).filter((i) => i !== item);

      if (status === 'normal') {
        newChecked.push(item);
      } else if (status === 'abnormal') {
        newAbnormal.push(item);
      }

      return {
        ...prev,
        checkedItems: newChecked,
        abnormalItems: newAbnormal,
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
    <table className="w-full text-left border-collapse border-2 border-slate-900 bg-white shadow-sm h-full">
      <thead>
        <tr className="bg-slate-100 border-b-2 border-slate-900">
          <th className="font-bold text-slate-900 border-r-2 border-slate-900 py-2 px-3 text-xs uppercase tracking-wide w-auto">
            Task Description
          </th>
          <th className="font-bold text-center text-slate-900 py-2 px-1 text-xs w-24 uppercase tracking-wide whitespace-nowrap">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-400">
        {items.map((item, localIndex) => {
          const actualIndex = startIndex + localIndex;
          const isNormal = checklist.checkedItems.includes(item);
          const isAbnormal = checklist.abnormalItems?.includes(item);
          
          return (
            <tr key={actualIndex} className="border-b border-slate-400/50 hover:bg-slate-50 transition-colors">
              <td className="py-1.5 px-3 border-r-2 border-slate-900 text-slate-900 font-bold text-[11px] sm:text-xs leading-snug">
                {item}
              </td>
              <td className="py-1.5 px-1 text-center align-middle whitespace-nowrap">
                {isNormal ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] uppercase shadow-sm">
                    ✅
                  </span>
                ) : isAbnormal ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] uppercase shadow-sm">
                    ❌
                  </span>
                ) : (
                  <span className="text-slate-300 text-xs">-</span>
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
            .print-page-container {
              height: 277mm; /* 297mm - 20mm margins */
              display: flex !important;
              flex-direction: column;
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
                  <th className="py-3 px-4 font-bold text-slate-300 w-auto">
                    Task Description
                  </th>
                  <th className="py-3 px-4 font-bold text-slate-300 text-center w-56 whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {CHECKLIST_ITEMS.map((item, index) => {
                  const isNormal = checklist.checkedItems.includes(item);
                  const isAbnormal = checklist.abnormalItems?.includes(item);
                  
                  return (
                    <tr 
                      key={index} 
                      className={`group transition-colors ${
                        isNormal ? 'bg-emerald-900/10' : isAbnormal ? 'bg-red-900/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-3 select-none">
                          <span className={`text-sm sm:text-base font-bold whitespace-nowrap sm:whitespace-normal ${
                            isNormal ? 'text-emerald-400' : isAbnormal ? 'text-red-400' : 'text-slate-300'
                          }`}>
                            {item}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleStatusChange(item, isNormal ? 'none' : 'normal')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                              isNormal
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/50'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleStatusChange(item, isAbnormal ? 'none' : 'abnormal')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                              isAbnormal
                                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/50'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                            ❌
                          </button>
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
            <div className="p-6 sm:p-8 bg-white text-slate-900 overflow-y-auto flex-1 font-sans flex flex-col h-full">
              <div className="border-b-2 border-slate-900 pb-2 mb-4 shrink-0">
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

              <div className="shrink-0">
                <div className="flex gap-4">
                  <div className="flex-1">
                    {renderPrintTable(leftColumnItems, 0)}
                  </div>
                  <div className="flex-1">
                    {renderPrintTable(rightColumnItems, midPoint)}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-2 border-slate-900 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col min-h-[120px]">
                <div className="bg-slate-100 border-b-2 border-slate-900 p-1.5 shrink-0">
                  <h3 className="font-bold text-slate-900 text-center w-full text-xs uppercase tracking-widest">Remarks / Issues</h3>
                </div>
                <div className="p-4 flex-1 text-slate-900 whitespace-pre-wrap text-sm bg-white font-medium leading-relaxed">
                  {checklist.remarks || <span className="text-transparent">.</span>}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-16 px-12 shrink-0 pb-4">
                 <div className="border-t-2 border-slate-900 pt-2 text-center">
                   <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Staff Signature</span>
                 </div>
                 <div className="border-t-2 border-slate-900 pt-2 text-center">
                   <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Manager Signature</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Wrapper (Only visible when printing) */}
      <div className="hidden print-page-container bg-white text-black font-sans p-0 m-0">
        <div className="border-b-2 border-black pb-2 mb-4 shrink-0">
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

        <div className="flex gap-4 shrink-0">
          <div className="flex-1">
            {renderPrintTable(leftColumnItems, 0)}
          </div>
          <div className="flex-1">
            {renderPrintTable(rightColumnItems, midPoint)}
          </div>
        </div>

        <div className="mt-4 border-2 border-slate-900 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
          <div className="bg-slate-100 border-b-2 border-slate-900 p-1.5 shrink-0">
            <h3 className="font-bold text-slate-900 text-center w-full text-xs uppercase tracking-widest">Remarks / Issues</h3>
          </div>
          <div className="p-4 flex-1 text-slate-900 whitespace-pre-wrap text-sm bg-white font-medium leading-relaxed">
            {checklist.remarks || <span className="text-transparent">.</span>}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-16 px-16 shrink-0 pb-8">
           <div className="border-t-2 border-slate-900 pt-2 text-center">
             <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Staff Signature</span>
           </div>
           <div className="border-t-2 border-slate-900 pt-2 text-center">
             <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">Manager Signature</span>
           </div>
        </div>
      </div>
    </div>
  );
}
