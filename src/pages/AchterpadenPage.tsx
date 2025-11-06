import React, { useState } from 'react';
import AchterpadenRegistratie from './AchterpadenRegistratie';
import AchterpadenOverzicht from './AchterpadenOverzicht';
import AchterpadenKaartOverzicht from './AchterpadenKaartOverzicht';
import AchterpadenStatistieken from './AchterpadenStatistieken';

const tabs = [
  { key: 'registratie', label: 'Registratie' },
  { key: 'kaart', label: 'Kaart Overzicht' },
  { key: 'overzicht', label: 'Detail Overzicht' },
  { key: 'stats', label: 'Statestieken' },
];

const AchterpadenPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registratie' | 'kaart' | 'overzicht' | 'stats'>('registratie');

  return (
    <div>
      <div className="mb-4 flex border-b border-gray-200 dark:border-dark-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-medium border-b-2 transition-colors duration-200 focus:outline-none 
              ${activeTab === tab.key 
                ? 'border-brand-primary text-brand-primary dark:border-brand-primary dark:text-brand-primary' 
                : 'border-transparent text-gray-600 hover:text-brand-primary dark:text-gray-300 dark:hover:text-brand-primary'}
            `}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="dark:text-dark-text-primary">
  {activeTab === 'registratie' && <AchterpadenRegistratie onSuccess={() => setActiveTab('kaart')} />}
  {activeTab === 'kaart' && <AchterpadenKaartOverzicht />}
  {activeTab === 'overzicht' && <AchterpadenOverzicht />}
  {activeTab === 'stats' && <AchterpadenStatistieken />}
      </div>
    </div>
  );
};

export default AchterpadenPage;
