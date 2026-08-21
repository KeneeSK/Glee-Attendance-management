import React, { useState, useEffect, useMemo } from 'react';
import { InventoryCategory, InventoryItem, DailyInventoryLog, AdminUser } from '../types';
import { 
  loadInventoryCategories, 
  loadInventoryItems, 
  loadInventoryLogForDate, 
  updateInventoryLog,
  normalizeDateStr 
} from '../utils/storage';
import { getTodayDateString } from '../utils/initialData';
import { Save, Calendar } from 'lucide-react';

interface InventoryTabProps {
  currentAdmin: AdminUser | null;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ currentAdmin }) => {
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [log, setLog] = useState<DailyInventoryLog | null>(null);
  
  // Input tracking
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setCategories(loadInventoryCategories().sort((a, b) => a.order - b.order));
    setItems(loadInventoryItems().sort((a, b) => a.order - b.order));
  }, []);

  useEffect(() => {
    const loadedLog = loadInventoryLogForDate(currentDate);
    if (loadedLog) {
      setLog(loadedLog);
      setEntries(loadedLog.entries || {});
    } else {
      setLog(null);
      setEntries({});
    }
    setSaveMessage('');
  }, [currentDate]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach(item => {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, []);
      }
      map.get(item.categoryId)!.push(item);
    });
    return map;
  }, [items]);

  const handleEntryChange = (itemId: string, val: string) => {
    setEntries(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  const handleSave = () => {
    if (!currentAdmin) return;
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const newLog: DailyInventoryLog = {
        id: log?.id || `inv_${currentDate}_${Date.now()}`,
        date: normalizeDateStr(currentDate),
        entries,
        updatedAt: new Date().toISOString(),
        updatedBy: currentAdmin.username
      };
      updateInventoryLog(newLog);
      setLog(newLog);
      setSaveMessage('Inventory saved successfully.');
    } catch (e) {
      setSaveMessage('Failed to save.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (!currentAdmin?.permissions.canManageInventory && currentAdmin?.role !== 'super') {
    return (
      <div className="p-8 text-center bg-slate-800 rounded-2xl shadow-xl mt-6 border border-slate-700">
        <h2 className="text-xl font-bold text-slate-300">Access Denied</h2>
        <p className="text-slate-400 mt-2">You do not have permission to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
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
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Log'}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
          saveMessage.includes('success') 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {saveMessage}
        </div>
      )}

      {log?.updatedBy && (
        <div className="mb-6 px-4 text-sm text-slate-400">
          Last updated by <span className="text-indigo-300">{log.updatedBy}</span> at{' '}
          {new Date(log.updatedAt).toLocaleString('en-US', { timeStyle: 'short', dateStyle: 'medium' })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const catItems = itemsByCategory.get(cat.id) || [];
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-200 tracking-wide">{cat.name}</h3>
                <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                  {catItems.length} items
                </span>
              </div>
              <div className="p-4 space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/30 transition-colors group">
                    <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                      {item.name}
                    </span>
                    <input
                      type="text"
                      placeholder="Qty"
                      value={entries[item.id] || ''}
                      onChange={(e) => handleEntryChange(item.id, e.target.value)}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-right focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
