/**
 * useKeyboardShortcuts Hook
 * 
 * Globale keyboard shortcuts voor de hele applicatie
 * 
 * Shortcuts:
 * - Cmd/Ctrl + K: Command Palette
 * - M: Meldingen
 * - P: Projecten
 * - D: Dossiers
 * - S: Statistieken
 * - U: Urenregistratie
 * - A: Admin (alleen beheerders)
 * - ?: Help modal met shortcuts
 * 
 * Shortcuts werken alleen als geen input/textarea/select focus heeft.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { logger } from '../services/logger';

interface UseKeyboardShortcutsProps {
  onCommandPalette: () => void;
  onHelp?: () => void;
}

export function useKeyboardShortcuts({ onCommandPalette, onHelp }: UseKeyboardShortcutsProps) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts als user in input field typt
      const target = e.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.isContentEditable;
      
      if (isInputField || isContentEditable) {
        // Allow Cmd/Ctrl+K even in input fields
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          onCommandPalette();
          logger.debug('Command palette opened via Cmd+K');
        }
        return;
      }

      // Prevent default voor shortcuts met modifier keys
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;

      // Command Palette: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandPalette();
        logger.debug('Command palette opened via Cmd+K');
        return;
      }

      // Help: ?
      if (e.key === '?' && !hasModifier && onHelp) {
        e.preventDefault();
        onHelp();
        logger.debug('Help modal opened via ?');
        return;
      }

      // Navigation shortcuts (alleen zonder modifiers)
      if (hasModifier) return;

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          navigate('/issues');
          logger.debug('Navigated to Issues via M shortcut');
          break;

        case 'p':
          e.preventDefault();
          navigate('/projects');
          logger.debug('Navigated to Projects via P shortcut');
          break;

        case 'd':
          if (currentUser && [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer].includes(currentUser.role)) {
            e.preventDefault();
            navigate('/dossiers');
            logger.debug('Navigated to Dossiers via D shortcut');
          }
          break;

        case 's':
          if (currentUser && [UserRole.Beheerder, UserRole.Viewer].includes(currentUser.role)) {
            e.preventDefault();
            navigate('/statistics');
            logger.debug('Navigated to Statistics via S shortcut');
          }
          break;

        case 'u':
          if (currentUser && [UserRole.Beheerder, UserRole.Concierge].includes(currentUser.role)) {
            e.preventDefault();
            navigate('/time-tracking');
            logger.debug('Navigated to Time Tracking via U shortcut');
          }
          break;

        case 'a':
          if (currentUser?.role === UserRole.Beheerder) {
            e.preventDefault();
            navigate('/admin');
            logger.debug('Navigated to Admin via A shortcut');
          }
          break;

        case 'h':
          e.preventDefault();
          navigate('/');
          logger.debug('Navigated to Dashboard via H shortcut');
          break;

        default:
          // No action for other keys
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, currentUser, onCommandPalette, onHelp]);
}
