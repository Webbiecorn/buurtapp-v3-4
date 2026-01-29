import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AchterpadenRegistratie from './AchterpadenRegistratie';
import AchterpadenOverzicht from './AchterpadenOverzicht';
import AchterpadenKaartOverzicht from './AchterpadenKaartOverzicht';
import AchterpadenStatistieken from './AchterpadenStatistieken';
import AchterpadenBeheer from './AchterpadenBeheer';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

const AchterpadenPage: React.FC = () => {
  const { currentUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'registratie' | 'kaart' | 'overzicht' | 'stats' | 'beheer'>('registratie');
  const [selectedAchterpadForEdit, setSelectedAchterpadForEdit] = useState<any | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['registratie', 'kaart', 'overzicht', 'stats', 'beheer'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Dynamic tabs based on user role
  const baseTabs = [
    { key: 'registratie', label: 'Registratie' },
    { key: 'kaart', label: 'Kaart Overzicht' },
    { key: 'overzicht', label: 'Detail Overzicht' },
    { key: 'stats', label: 'Statistieken' },
  ];

  const tabs = currentUser?.role === UserRole.Beheerder
    ? [...baseTabs, { key: 'beheer', label: '⚙️ Beheer' }]
    : baseTabs;

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
  {activeTab === 'kaart' && <AchterpadenKaartOverzicht onEditAchterpad={(achterpad) => {
    setSelectedAchterpadForEdit(achterpad);
    setActiveTab('overzicht');
  }} />}
  {activeTab === 'overzicht' && <AchterpadenOverzicht selectedAchterpadFromKaart={selectedAchterpadForEdit} />}
  {activeTab === 'stats' && <AchterpadenStatistieken />}
  {activeTab === 'beheer' && currentUser?.role === UserRole.Beheerder && <AchterpadenBeheer />}
      </div>
    </div>
  );
};

export default AchterpadenPage;
