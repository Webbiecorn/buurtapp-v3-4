/**
 * useDebounce Hook
 * 
 * Debounce een waarde met configureerbare delay.
 * Voorkomt te veel API calls of expensive operations bij snelle input.
 * 
 * @param value - De waarde om te debounce
 * @param delay - Delay in milliseconden (default: 300ms)
 * @returns Debounced waarde
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   if (debouncedSearch.length >= 3) {
 *     performSearch(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout om de waarde te updaten na delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel timeout als value of delay verandert
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useSearchDebounce Hook
 * 
 * Gespecialiseerde versie voor search queries.
 * - 300ms delay
 * - Min 3 karakters requirement
 * - Returns object met debounced value + isSearching state
 * 
 * @param searchTerm - De search term om te debounce
 * @returns Object met debouncedTerm en isSearching flag
 * 
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const { debouncedTerm, isSearching } = useSearchDebounce(query);
 * 
 * useEffect(() => {
 *   if (debouncedTerm) {
 *     performSearch(debouncedTerm);
 *   }
 * }, [debouncedTerm]);
 * ```
 */
export function useSearchDebounce(searchTerm: string) {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    // Zet isSearching op true zodra user begint te typen
    if (searchTerm !== debouncedTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedTerm]);

  return {
    debouncedTerm: debouncedTerm.length >= 3 ? debouncedTerm : '',
    isSearching,
    hasMinLength: debouncedTerm.length >= 3,
  };
}
