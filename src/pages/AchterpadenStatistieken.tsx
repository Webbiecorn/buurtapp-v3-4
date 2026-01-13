import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import AchterpadenStats from '../components/AchterpadenStats';

const AchterpadenStatistieken: React.FC = () => {
  const [registraties, setRegistraties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'achterpaden'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRegistraties(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading achterpaden:', err);
        setError('Kon gegevens niet laden');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto p-6">Laden...</div>;
  if (error) return <div className="max-w-5xl mx-auto p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary leading-tight">Statistieken Achterpaden</h1>
      <AchterpadenStats registraties={registraties} />
    </div>
  );
};

export default AchterpadenStatistieken;
