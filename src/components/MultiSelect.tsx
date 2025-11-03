import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, XIcon } from './Icons';

interface MultiSelectProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedOptions,
  onChange,
  placeholder = 'Selecteer opties...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter(o => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const toggleAll = () => {
    if (selectedOptions.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const removeOption = (option: string) => {
    onChange(selectedOptions.filter(o => o !== option));
  };

  const isAllSelected = options.length > 0 && selectedOptions.length === options.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
        {label}
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-sm px-3 py-2 cursor-pointer hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-500 dark:text-dark-text-secondary text-sm">
                {placeholder}
              </span>
            ) : (
              selectedOptions.map(option => (
                <span
                  key={option}
                  className="inline-flex items-center gap-1 bg-brand-primary text-white text-xs px-2 py-1 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(option);
                  }}
                >
                  {option}
                  <XIcon className="h-3 w-3 hover:text-gray-200" />
                </span>
              ))
            )}
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-lg max-h-60 overflow-auto">
          <div
            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-border cursor-pointer flex items-center justify-between border-b border-gray-200 dark:border-dark-border font-medium"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
          >
            <span className="text-sm text-gray-900 dark:text-dark-text-primary">
              {isAllSelected ? 'Deselecteer alles' : 'Selecteer alles'}
            </span>
            {isAllSelected && (
              <CheckIcon className="h-4 w-4 text-brand-primary" />
            )}
          </div>
          
          {options.map(option => {
            const isSelected = selectedOptions.includes(option);
            return (
              <div
                key={option}
                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-border cursor-pointer flex items-center justify-between"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(option);
                }}
              >
                <span className={`text-sm ${isSelected ? 'text-brand-primary font-medium' : 'text-gray-700 dark:text-dark-text-primary'}`}>
                  {option}
                </span>
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-brand-primary" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
