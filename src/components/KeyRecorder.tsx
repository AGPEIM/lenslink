import React, { useRef, useEffect } from 'react';
import { ResolvedTheme } from '../hooks/useTheme';
import { getDisplayKey } from '../types/shortcuts';

interface KeyRecorderProps {
  currentDisplayKey: string;
  onKeyRecorded: (key: string, displayKey: string) => void;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  theme: ResolvedTheme;
}

const KeyRecorder: React.FC<KeyRecorderProps> = ({
  currentDisplayKey,
  onKeyRecorded,
  onCancel,
  isRecording,
  onStartRecording,
  theme,
}) => {
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRecording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    // 忽略修饰键单独按下
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    // Escape 取消录入
    if (e.key === 'Escape') {
      onCancel();
      return;
    }

    const key = e.key.toLowerCase();
    const displayKey = getDisplayKey(e.key);
    onKeyRecorded(key, displayKey);
  };

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onClick={onStartRecording}
      onKeyDown={handleKeyDown}
      onBlur={() => isRecording && onCancel()}
      className={`
        min-w-[48px] px-2.5 py-1.5 rounded-md text-center font-mono font-bold text-xs
        cursor-pointer transition-all outline-none select-none
        ${
          isRecording
            ? 'ring-2 ring-indigo-500 animate-pulse ' +
              (theme === 'dark'
                ? 'bg-indigo-600/20 text-indigo-300'
                : 'bg-indigo-100 text-indigo-700')
            : theme === 'dark'
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }
      `}
    >
      {isRecording ? '...' : currentDisplayKey || '--'}
    </div>
  );
};

export default KeyRecorder;
