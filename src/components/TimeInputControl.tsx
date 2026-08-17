import React, { useState, useEffect } from 'react';

interface Props {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder: string;
  buttonText: string;
  disabled: boolean;
  buttonClass: string;
  inputClass: string;
  wrapperClass?: string;
}

export const TimeInputControl: React.FC<Props> = ({
  initialValue,
  onSave,
  placeholder,
  buttonText,
  disabled,
  buttonClass,
  inputClass,
  wrapperClass = ''
}) => {
  const [val, setVal] = useState(initialValue);
  
  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    let finalVal = val;
    if (!finalVal) {
      const now = new Date();
      finalVal = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setVal(finalVal);
    }
    onSave(finalVal);
  };

  const isChanged = val !== initialValue;
  const needsInitialSave = !initialValue;

  return (
    <div className={`flex items-center gap-1 bg-slate-900/50 p-1 rounded border border-slate-800 ${wrapperClass}`}>
      <input
        type="time"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={disabled}
        className={`bg-transparent text-xs w-20 focus:outline-none disabled:opacity-40 font-mono ${inputClass}`}
      />
      {(needsInitialSave || isChanged) && (
        <button
          onClick={handleSave}
          disabled={disabled}
          className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-30 ${buttonClass}`}
          title={needsInitialSave ? placeholder : "Save Changes"}
        >
          {needsInitialSave ? buttonText : "Save"}
        </button>
      )}
    </div>
  );
};
