import React from 'react';
import { useAchterpaden } from '../services/firestoreHooks';
import AchterpadenStats from '../components/AchterpadenStats';

const AchterpadenStatistieken: React.FC = () => {
  const { data: registraties, loading, error } = useAchterpaden();

  if (loading) return <div className="max-w-5xl mx-auto p-6">Laden...</div>;
  if (error) return <div className="max-w-5xl mx-auto p-6 text-red-600">Kon gegevens niet laden</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary leading-tight">Statistieken Achterpaden</h1>
      <AchterpadenStats registraties={registraties} />
    </div>
  );
};

export default AchterpadenStatistieken;
