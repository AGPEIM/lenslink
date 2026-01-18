import React from 'react';

interface EmptyStateProps {
  theme: 'light' | 'dark';
  t: any;
  filter: 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS';
  hasPhotos: boolean;
  onImportFolder: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  theme,
  t,
  filter,
  hasPhotos,
  onImportFolder,
}) => {
  if (!hasPhotos) {
    // No photos at all - show import prompt
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-20 text-center ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100 to-gray-50'}`}>
        <button
          onClick={onImportFolder}
          className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border shadow-2xl relative transition-all hover:scale-105 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 hover:border-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-400'}`}
        >
          <i className={`fa-solid fa-images text-4xl ${theme === 'dark' ? 'text-zinc-700' : 'text-gray-300'}`}></i>
          <div className={`absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white border-4 ${theme === 'dark' ? 'border-zinc-950' : 'border-gray-50'}`}>
            <i className="fa-solid fa-plus text-sm"></i>
          </div>
        </button>
        <h2 className={`text-3xl font-black mb-3 tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.emptyState.all.title}</h2>
        <p className={`max-w-md text-lg font-medium leading-snug ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
          {t.emptyState.all.description}
        </p>
      </div>
    );
  }

  // Has photos but filtered view is empty
  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-20 text-center ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100 to-gray-50'}`}>
      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border shadow-2xl ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <i className={`fa-solid fa-images text-4xl ${theme === 'dark' ? 'text-zinc-700' : 'text-gray-300'}`}></i>
      </div>
      <h2 className={`text-3xl font-black mb-3 tracking-tighter uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {filter === 'PICKED' && t.emptyState.picked.title}
        {filter === 'REJECTED' && t.emptyState.rejected.title}
        {filter === 'UNMARKED' && t.emptyState.unmarked.title}
        {filter === 'ORPHANS' && t.emptyState.orphans.title}
      </h2>
      <p className={`max-w-md text-lg font-medium leading-snug ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
        {filter === 'PICKED' && t.emptyState.picked.description}
        {filter === 'REJECTED' && t.emptyState.rejected.description}
        {filter === 'UNMARKED' && t.emptyState.unmarked.description}
        {filter === 'ORPHANS' && t.emptyState.orphans.description}
      </p>
    </div>
  );
};
