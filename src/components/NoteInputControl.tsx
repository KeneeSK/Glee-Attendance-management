import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Sparkles } from 'lucide-react';

interface Props {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const NoteInputControl: React.FC<Props> = ({
  initialValue,
  onSave,
  placeholder = 'Add note / reason...',
  disabled = false,
  className = '',
}) => {
  const [val, setVal] = useState(initialValue || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const handleCommit = (newVal: string) => {
    if (newVal !== (initialValue || '')) {
      onSave(newVal);
      setSaveStatus('saved');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVal('');
    onSave('');
    setSaveStatus('saved');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  };

  return (
    <div className={`relative flex items-center transition-all ${className}`}>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => handleCommit(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-slate-950/80 border transition-all text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none placeholder-slate-600 disabled:opacity-40 pr-14 ${
          saveStatus === 'saved'
            ? 'border-emerald-500/80 ring-1 ring-emerald-500/40 bg-emerald-950/20'
            : 'border-slate-800 focus:border-purple-500 focus:bg-slate-900/90'
        }`}
      />

      {/* Visual Indicator Container */}
      <div className="absolute right-1.5 flex items-center gap-1">
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-semibold animate-fadeIn">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>저장됨</span>
          </span>
        )}

        {Boolean(val) && !disabled && saveStatus !== 'saved' && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded transition-colors"
            title="내용 지우기"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
