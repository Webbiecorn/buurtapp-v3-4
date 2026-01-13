/**
 * Status color utilities for consistent styling
 * Consolidated from multiple duplicate implementations
 */

import type { MeldingStatus } from '../types';

/**
 * Get Tailwind CSS classes for melding status badges
 */
export function getMeldingStatusColor(status: MeldingStatus): string {
  switch (status) {
    case 'nieuw':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'in_behandeling':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'afgerond':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'doorgestuurd':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

// Alias for backward compatibility with existing code
export const getStatusColor = getMeldingStatusColor;

/**
 * Get hex color for achterpad status (for map markers, charts)
 */
export function getAchterpadStatusColor(staat: string): string {
  switch (staat?.toLowerCase()) {
    case 'goed':
      return '#22c55e'; // green-500
    case 'matig':
      return '#f59e0b'; // amber-500
    case 'slecht':
      return '#ef4444'; // red-500
    case 'onbekend':
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get Tailwind CSS classes for achterpad status badges
 */
export function getAchterpadStatusClasses(staat: string): string {
  switch (staat?.toLowerCase()) {
    case 'goed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'matig':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'slecht':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'onbekend':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

/**
 * Get hex color for project status
 */
export function getProjectStatusColor(status: string): string {
  switch (status) {
    case 'actief':
      return '#22c55e'; // green-500
    case 'planning':
      return '#3b82f6'; // blue-500
    case 'voltooid':
      return '#6b7280'; // gray-500
    case 'gepauzeerd':
      return '#f59e0b'; // amber-500
    default:
      return '#6b7280'; // gray-500
  }
}
