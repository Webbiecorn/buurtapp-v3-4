import React from 'react';

export type TabKey = string;

export interface TabItem {
  key: TabKey;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  current: TabKey;
  onChange: (key: TabKey) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, current, onChange, className }) => {
  const idx = Math.max(0, tabs.findIndex((t) => t.key === current));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(idx + dir + tabs.length) % tabs.length];
      if (next) onChange(next.key);
    }
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label="Tabs" className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={onKeyDown}
              className={`px-3 py-2 rounded-t-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-white dark:bg-dark-surface text-brand-primary border border-b-0 border-gray-200 dark:border-gray-700'
                  : 'text-gray-600 dark:text-gray-300 hover:text-brand-primary'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t.icon}
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700">
                    {t.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const TabPanel: React.FC<{ tabKey: TabKey; current: TabKey; className?: string } & React.PropsWithChildren> = ({
  tabKey,
  current,
  className,
  children,
}) => {
  if (tabKey !== current) return null;
  return (
    <div id={`panel-${tabKey}`} role="tabpanel" aria-labelledby={tabKey} className={className}>
      {children}
    </div>
  );
};
