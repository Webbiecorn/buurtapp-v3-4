/**
 * Command Palette Component
 *
 * Snelle navigatie via keyboard (Cmd+K / Ctrl+K)
 * Fuzzy search door beschikbare acties en pagina's
 *
 * Features:
 * - Cmd/Ctrl + K om te openen
 * - ESC om te sluiten
 * - Pijltjestoetsen voor navigatie
 * - Enter om actie uit te voeren
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { SearchIcon } from './Icons';

interface Command {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  action: () => void;
  icon?: string;
  roles?: UserRole[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Definieer alle beschikbare commands
  const allCommands: Command[] = useMemo(() => {
    const commands: Command[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        description: 'Ga naar het dashboard',
        keywords: ['home', 'overzicht'],
        icon: '🏠',
        action: () => {
          navigate('/');
          onClose();
        },
      },
      {
        id: 'nav-issues',
        label: 'Meldingen',
        description: 'Bekijk alle meldingen',
        keywords: ['issues', 'melding', 'problemen'],
        icon: '📋',
        action: () => {
          navigate('/issues');
          onClose();
        },
      },
      {
        id: 'nav-new-issue',
        label: 'Nieuwe Melding',
        description: 'Maak een nieuwe melding aan',
        keywords: ['nieuw', 'aanmaken', 'create'],
        icon: '➕',
        action: () => {
          navigate('/issues/nieuw');
          onClose();
        },
      },
      {
        id: 'nav-projects',
        label: 'Projecten',
        description: 'Bekijk alle projecten',
        keywords: ['project'],
        icon: '📁',
        action: () => {
          navigate('/projects');
          onClose();
        },
      },
      {
        id: 'nav-dossiers',
        label: 'Dossiers',
        description: 'Bekijk woningdossiers',
        keywords: ['dossier', 'woning', 'adres'],
        icon: '📂',
        roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer],
        action: () => {
          navigate('/dossiers');
          onClose();
        },
      },
      {
        id: 'nav-time',
        label: 'Urenregistratie',
        description: 'Registreer je uren',
        keywords: ['uren', 'tijd', 'time', 'hours'],
        icon: '⏰',
        roles: [UserRole.Beheerder, UserRole.Concierge],
        action: () => {
          navigate('/time-tracking');
          onClose();
        },
      },
      {
        id: 'nav-statistics',
        label: 'Statistieken',
        description: 'Bekijk statistieken en analyses',
        keywords: ['stats', 'analyse', 'cijfers', 'rapportage'],
        icon: '📊',
        roles: [UserRole.Beheerder, UserRole.Viewer],
        action: () => {
          navigate('/statistics');
          onClose();
        },
      },
      {
        id: 'nav-achterpaden',
        label: 'Achterpaden',
        description: 'Beheer achterpaden',
        keywords: ['achterpad', 'pad'],
        icon: '🛤️',
        action: () => {
          navigate('/achterpaden');
          onClose();
        },
      },
      {
        id: 'nav-admin',
        label: 'Beheer',
        description: 'Beheerderspaneel',
        keywords: ['admin', 'management', 'gebruikers'],
        icon: '⚙️',
        roles: [UserRole.Beheerder],
        action: () => {
          navigate('/admin');
          onClose();
        },
      },
      {
        id: 'nav-profile',
        label: 'Profiel',
        description: 'Bekijk en bewerk je profiel',
        keywords: ['account', 'instellingen', 'settings'],
        icon: '👤',
        action: () => {
          navigate('/profile');
          onClose();
        },
      },
      {
        id: 'nav-contacten',
        label: 'Contacten',
        description: 'Bekijk je contacten',
        keywords: ['contact', 'mensen'],
        icon: '👥',
        action: () => {
          navigate('/contacten');
          onClose();
        },
      },
      {
        id: 'nav-updates',
        label: 'Updates',
        description: 'Bekijk recente updates',
        keywords: ['nieuws', 'changelog'],
        icon: '📰',
        action: () => {
          navigate('/updates');
          onClose();
        },
      },
    ];

    // Filter commands op basis van rol
    return commands.filter(cmd => {
      if (!cmd.roles) return true;
      return currentUser && cmd.roles.includes(currentUser.role);
    });
  }, [currentUser, navigate, onClose]);

  // Filter commands op basis van query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd => {
      const searchText = [
        cmd.label,
        cmd.description || '',
        ...(cmd.keywords || []),
      ].join(' ').toLowerCase();

      return searchText.includes(lowerQuery);
    });
  }, [allCommands, query]);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-xl shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
            <SearchIcon className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Zoek naar pagina's en acties..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-dark-text-primary placeholder-gray-400"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-bg rounded">
              ESC
            </kbd>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                Geen resultaten gevonden
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-brand-primary/10 dark:bg-brand-primary/20'
                        : 'hover:bg-gray-50 dark:hover:bg-dark-bg'
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Icon */}
                    {cmd.icon && (
                      <span className="text-2xl flex-shrink-0">{cmd.icon}</span>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                          {cmd.description}
                        </div>
                      )}
                    </div>

                    {/* Enter hint */}
                    {index === selectedIndex && (
                      <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-bg rounded">
                        ↵
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-surface rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-surface rounded">↓</kbd>
                navigeren
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-surface rounded">↵</kbd>
                selecteren
              </span>
            </div>
            <span>
              {filteredCommands.length} {filteredCommands.length === 1 ? 'resultaat' : 'resultaten'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
