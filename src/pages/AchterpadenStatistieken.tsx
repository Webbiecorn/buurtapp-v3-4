import React from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import AchterpadenStats from '../components/AchterpadenStats';

const AchterpadenStatistieken: React.FC = () => {
  const [registraties, setRegistraties] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'achterpaden');
  const unsub = onSnapshot(colRef, (snap) => {
      setRegistraties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
  }, () => {
      setError('Kon gegevens niet laden');
      setLoading(false);
    });
    return () => unsub();
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
