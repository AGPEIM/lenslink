
import React, { useState } from 'react';
import { PhotoGroup, ExportOperation } from '../types';
import { getTranslations, Language } from '../i18n';

interface ConfirmationModalProps {
  groups: PhotoGroup[];
  onConfirm: (operation?: ExportOperation) => void;
  onCancel: () => void;
  type: 'delete' | 'export';
  theme: 'light' | 'dark';
  language?: Language;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ groups, onConfirm, onCancel, type, theme, language = 'zh' }) => {
  const t = getTranslations(language);
  const [operation, setOperation] = useState<ExportOperation>('COPY');
  
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
      <div className={`border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <i className={`fa-solid ${type === 'delete' ? 'fa-triangle-exclamation text-rose-500' : 'fa-download text-emerald-500'}`}></i>
            {type === 'delete' ? t.confirmationModal.delete.title : t.confirmationModal.export.title}
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'}`}>
            {type === 'delete' ? t.confirmationModal.delete.youAreAboutToMoveToTrash : t.confirmationModal.export.youAreAboutToExport} {groups.length} {type === 'delete' ? t.confirmationModal.delete.description : t.confirmationModal.export.description}{groups.reduce((acc, g) => acc + (g.jpg ? 1 : 0) + (g.raw ? 1 : 0), 0)} {type === 'delete' ? t.confirmationModal.delete.individualFiles : t.confirmationModal.export.individualFiles}{type === 'delete' ? '' : ''}
          </p>
          
          {type === 'export' && (
            <div className="mt-4 space-y-2">
              <label className={`text-xs uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>{t.confirmationModal.export.operationType}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOperation('COPY')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                    operation === 'COPY'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : (theme === 'dark' ? 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600' : 'border-gray-300 bg-gray-100/30 text-gray-600 hover:border-gray-400')
                  }`}
                >
                  <i className="fa-solid fa-copy mr-2"></i>
                  {t.confirmationModal.export.copyFiles}
                </button>
                <button
                  onClick={() => setOperation('MOVE')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                    operation === 'MOVE'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : (theme === 'dark' ? 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600' : 'border-gray-300 bg-gray-100/30 text-gray-600 hover:border-gray-400')
                  }`}
                >
                  <i className="fa-solid fa-arrows-turn-right mr-2"></i>
                  {t.confirmationModal.export.moveFiles}
                </button>
              </div>
              <p className={`text-xs italic ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
                {operation === 'COPY' ? t.confirmationModal.export.copyDescription : t.confirmationModal.export.moveDescription}
              </p>
            </div>
          )}
        </div>
        
        <div className={`flex-1 overflow-y-auto p-2 ${theme === 'dark' ? 'bg-zinc-950/50' : 'bg-gray-50'}`}>
          <div className="grid grid-cols-2 gap-2 p-4">
             {groups.slice(0, 20).map(g => (
               <div key={g.id} className={`text-[10px] font-mono p-1.5 rounded truncate border ${theme === 'dark' ? 'text-zinc-400 bg-zinc-800/50 border-zinc-700/30' : 'text-gray-600 bg-white border-gray-200'}`}>
                 {g.id}
               </div>
             ))}
             {groups.length > 20 && (
               <div className={`col-span-2 text-[10px] italic text-center py-2 ${theme === 'dark' ? 'text-zinc-600' : 'text-gray-500'}`}>
                 {t.confirmationModal.andMore} {groups.length - 20} {t.confirmationModal.more}
               </div>
             )}
          </div>
        </div>

        <div className={`p-6 border-t flex gap-3 justify-end ${theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'}`}>
          <button 
            onClick={onCancel}
            className={`px-6 py-2 rounded-xl transition-colors text-sm font-bold ${theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {t.confirmationModal.buttons.cancel}
          </button>
          <button 
            onClick={() => onConfirm(type === 'export' ? operation : undefined)}
            className={`px-8 py-2 rounded-xl text-white shadow-xl transition-all text-sm font-bold ${
              type === 'delete' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {type === 'export' ? `${operation === 'COPY' ? t.confirmationModal.export.copy : t.confirmationModal.export.move} ${language === 'zh' ? '文件' : 'Files'}` : t.confirmationModal.delete.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
