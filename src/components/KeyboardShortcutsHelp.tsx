/**
 * KeyboardShortcutsHelp Component
 *
 * Modal die alle beschikbare keyboard shortcuts toont
 * Geopend via ? toets of vanuit menu
 */

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { XIcon } from './Icons';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  roles?: UserRole[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAppContext();

  const shortcuts: { category: string; items: Shortcut[] }[] = [
    {
      category: 'Algemeen',
      items: [
        { keys: ['Cmd', 'K'], description: 'Open Command Palette' },
        { keys: ['Ctrl', 'K'], description: 'Open Command Palette (Windows/Linux)' },
        { keys: ['?'], description: 'Toon deze help' },
        { keys: ['Esc'], description: 'Sluit modals en overlays' },
      ],
    },
    {
      category: 'Navigatie',
      items: [
        { keys: ['H'], description: 'Ga naar Dashboard' },
        { keys: ['M'], description: 'Ga naar Meldingen' },
        { keys: ['P'], description: 'Ga naar Projecten' },
        { keys: ['D'], description: 'Ga naar Dossiers', roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
        { keys: ['U'], description: 'Ga naar Urenregistratie', roles: [UserRole.Beheerder, UserRole.Concierge] },
        { keys: ['S'], description: 'Ga naar Statistieken', roles: [UserRole.Beheerder, UserRole.Viewer] },
        { keys: ['A'], description: 'Ga naar Admin', roles: [UserRole.Beheerder] },
      ],
    },
  ];

  // Filter shortcuts op basis van rol
  const filteredShortcuts = shortcuts.map(section => ({
    ...section,
    items: section.items.filter(shortcut => {
      if (!shortcut.roles) return true;
      return currentUser && shortcut.roles.includes(currentUser.role);
    }),
  })).filter(section => section.items.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              ⌨️ Keyboard Shortcuts
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
              aria-label="Sluiten"
            >
              <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              Gebruik deze sneltoetsen om sneller door de applicatie te navigeren.
            </p>

            <div className="space-y-6">
              {filteredShortcuts.map((section) => (
                <div key={section.category}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {section.category}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                      >
                        <span className="text-gray-700 dark:text-dark-text-primary">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-gray-400 dark:text-gray-500 mx-1">+</span>
                              )}
                              <kbd className="px-2.5 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              💡 Tip: Shortcuts werken niet in invoervelden. Gebruik dan Cmd/Ctrl+K voor de Command Palette.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
