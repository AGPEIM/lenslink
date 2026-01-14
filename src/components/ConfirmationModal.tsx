
import React, { useState } from 'react';
import { PhotoGroup, ExportOperation } from '../types';

interface ConfirmationModalProps {
  title: string;
  groups: PhotoGroup[];
  confirmLabel: string;
  onConfirm: (operation?: ExportOperation) => void;
  onCancel: () => void;
  type: 'delete' | 'export';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, groups, confirmLabel, onConfirm, onCancel, type }) => {
  const [operation, setOperation] = useState<ExportOperation>('COPY');
  
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <i className={`fa-solid ${type === 'delete' ? 'fa-triangle-exclamation text-rose-500' : 'fa-download text-emerald-500'}`}></i>
            {title}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            You are about to {type === 'delete' ? 'move to trash' : 'export'} {groups.length} photo groups ({groups.reduce((acc, g) => acc + (g.jpg ? 1 : 0) + (g.raw ? 1 : 0), 0)} individual files).{type === 'delete' ? ' Files will be moved to the recycle bin and can be restored.' : ''}
          </p>
          
          {type === 'export' && (
            <div className="mt-4 space-y-2">
              <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Operation Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOperation('COPY')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                    operation === 'COPY'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <i className="fa-solid fa-copy mr-2"></i>
                  Copy Files
                </button>
                <button
                  onClick={() => setOperation('MOVE')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                    operation === 'MOVE'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <i className="fa-solid fa-arrows-turn-right mr-2"></i>
                  Move Files
                </button>
              </div>
              <p className="text-xs text-zinc-500 italic">
                {operation === 'COPY' ? 'Original files will remain in their current location' : 'Original files will be moved from their current location'}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 bg-zinc-950/50">
          <div className="grid grid-cols-2 gap-2 p-4">
             {groups.slice(0, 20).map(g => (
               <div key={g.id} className="text-[10px] text-zinc-400 font-mono bg-zinc-800/50 p-1.5 rounded truncate border border-zinc-700/30">
                 {g.id}
               </div>
             ))}
             {groups.length > 20 && (
               <div className="col-span-2 text-[10px] text-zinc-600 italic text-center py-2">
                 ... and {groups.length - 20} more
               </div>
             )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-bold"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(type === 'export' ? operation : undefined)}
            className={`px-8 py-2 rounded-xl text-white shadow-xl transition-all text-sm font-bold ${
              type === 'delete' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {type === 'export' ? `${operation === 'COPY' ? 'Copy' : 'Move'} Files` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
