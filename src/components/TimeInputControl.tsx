import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder: string;
  buttonText: string;
  disabled: boolean;
  buttonClass: string;
  inputClass: string;
  wrapperClass?: string;
  defaultFallbackTime?: string;
}

export const TimeInputControl: React.FC<Props> = ({
  initialValue,
  onSave,
  placeholder,
  buttonText,
  disabled,
  buttonClass,
  inputClass,
  wrapperClass = '',
  defaultFallbackTime,
}) => {
  const [val, setVal] = useState(initialValue || '');
  
  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const handleTimeChange = (newVal: string) => {
    setVal(newVal);
    onSave(newVal);
  };

  const handleQuickAction = () => {
    let finalVal = val;
    if (!finalVal) {
      if (defaultFallbackTime) {
        finalVal = defaultFallbackTime;
      } else {
        const now = new Date();
        finalVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
      setVal(finalVal);
    }
    onSave(finalVal);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVal('');
    onSave('');
  };

  return (
    <div className={`flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 focus-within:border-purple-500/80 transition-all ${wrapperClass}`}>
      <input
        type="time"
        value={val}
        onChange={(e) => handleTimeChange(e.target.value)}
        onBlur={() => {
          if (val !== (initialValue || '')) {
            onSave(val);
          }
        }}
        disabled={disabled}
        className={`bg-transparent text-xs w-20 focus:outline-none disabled:opacity-40 font-mono tracking-tight cursor-pointer ${inputClass}`}
      />
      {!val && !disabled && (
        <button
          type="button"
          onClick={handleQuickAction}
          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shadow-sm active:scale-95 ${buttonClass}`}
          title={placeholder || `Set ${buttonText}`}
        >
          {buttonText}
        </button>
      )}
      {Boolean(val) && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          title="Clear time"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

