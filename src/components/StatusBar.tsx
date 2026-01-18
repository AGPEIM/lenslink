import React from 'react';

interface StatusBarProps {
  theme: 'light' | 'dark';
  t: any;
  stats: {
    total: number;
    picked: number;
    rejected: number;
    orphans: number;
  };
}

export const StatusBar: React.FC<StatusBarProps> = ({ theme, t, stats }) => {
  return (
    <footer className={`h-10 border-t px-6 flex items-center justify-between text-[10px] z-20 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-500' : 'bg-white border-gray-200 text-gray-500'}`}>
      <div className="flex gap-4">
        <span>{stats.total} {t.footer.total}</span>
        <span className="text-emerald-500 font-bold">{stats.picked} {t.footer.picked}</span>
        <span className="text-rose-500 font-bold">{stats.rejected} {t.footer.stagedForTrash}</span>
        <span className="text-amber-500 font-bold">{stats.orphans} {t.footer.orphans}</span>
      </div>
    </footer>
  );
};
