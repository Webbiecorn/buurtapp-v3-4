/**
 * useBulkSelection Hook
 *
 * Generieke hook voor multi-select functionaliteit
 *
 * Features:
 * - Select/deselect individuele items
 * - Select all / clear all
 * - Check if item is selected
 * - Get selected count
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   toggleItem,
 *   selectAll,
 *   clearSelection,
 *   isSelected
 * } = useBulkSelection();
 *
 * <Checkbox checked={isSelected(item.id)} onChange={() => toggleItem(item.id)} />
 * ```
 */

import { useState, useCallback } from 'react';

export function useBulkSelection<T extends string = string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggleItem = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: T) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleAll = useCallback((ids: T[]) => {
    if (selectedIds.size === ids.length) {
      clearSelection();
    } else {
      selectAll(ids);
    }
  }, [selectedIds.size, selectAll, clearSelection]);

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleItem,
    selectAll,
    clearSelection,
    isSelected,
    toggleAll,
    hasSelection: selectedIds.size > 0,
  };
}
