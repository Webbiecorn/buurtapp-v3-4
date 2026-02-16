/**
 * BulkActionsToolbar Component
 *
 * Toolbar die verschijnt wanneer items geselecteerd zijn
 * Toont aantal geselecteerde items en beschikbare acties
 *
 * @example
 * ```tsx
 * <BulkActionsToolbar
 *   selectedCount={5}
 *   onClear={() => clearSelection()}
 *   actions={[
 *     { label: 'Status wijzigen', icon: <EditIcon />, onClick: handleBulkStatus },
 *     { label: 'Verwijderen', icon: <TrashIcon />, onClick: handleBulkDelete, danger: true }
 *   ]}
 * />
 * ```
 */

import React from 'react';
import { XIcon } from './Icons';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  itemName?: string; // e.g. "melding", "project"
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClear,
  actions,
  itemName = 'item',
}) => {
  if (selectedCount === 0) return null;

  const itemText = selectedCount === 1
    ? `1 ${itemName}`
    : `${selectedCount} ${itemName}${itemName.endsWith('e') ? 'n' : 's'}`;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-brand-primary dark:bg-brand-secondary text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
            {selectedCount}
          </div>
          <span className="font-medium">
            {itemText} geselecteerd
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                flex items-center gap-2
                ${action.danger
                  ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50'
                  : 'bg-white/20 hover:bg-white/30 disabled:bg-white/10'
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {action.icon && <span className="w-4 h-4">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>

        {/* Clear Button */}
        <button
          onClick={onClear}
          className="ml-2 p-2 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Selectie wissen"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Slide-up animation for toolbar
 */
const styles = `
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'bulk-actions-toolbar-styles';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
  }
}
