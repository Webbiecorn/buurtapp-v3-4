import React, { useState } from "react";
import { useAppContext } from '../context/AppContext';
import { WoningDossier } from "../types";

const DossierPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dossier, setDossier] = useState<WoningDossier | null>(null);
  const [searchedAdres, setSearchedAdres] = useState<string>("");
  const [note, setNote] = useState("");
  const [important, setImportant] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const { getDossier, createNewDossier, addDossierNotitie, meldingen, currentUser } = useAppContext();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const searchAdres = search.trim();
    setSearchedAdres(searchAdres);
    setDossier(null); 

    let dossierResult = await getDossier(searchAdres);

    if (!dossierResult) {
      console.log(`Dossier voor ${searchAdres} niet gevonden, nieuwe wordt aangemaakt.`);
      dossierResult = await createNewDossier(searchAdres);
    }
    
    setDossier(dossierResult);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || !currentUser || !dossier) return;
    setAdding(true);
    try {
      await addDossierNotitie(dossier.id, { 
        text: note, 
        isBelangrijk: important,
        reacties: [],
       });
      setNote("");
      setImportant(false);
      const updated = await getDossier(dossier.id);
      setDossier(updated);
    } finally {
      setAdding(false);
    }
  };

  // Aanname: Meldingen worden gekoppeld via het adres in de 'locatie' property.
  // Pas dit aan als de koppeling anders is.
  const gerelateerdeMeldingen = dossier ? meldingen.filter(m => m.locatie?.adres === dossier.id) : [];

  const DossierHeader = ({ dossier }: { dossier: WoningDossier }) => (
    <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow mb-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{dossier.id}</h1>
      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1">
          Status: <span className="font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">{dossier.status}</span>
        </span>
        <span className="flex items-center gap-1">
          Labels: {dossier.labels.map(label => (
            <span key={label} className="font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{label}</span>
          ))}
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Woningdossiers</h1>
      <form className="flex mb-8" onSubmit={handleSearch}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek op adres..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white bg-white dark:bg-dark-surface"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-brand-primary text-white rounded-r-md hover:bg-brand-secondary transition-colors"
        >
          Zoek
        </button>
      </form>

      {dossier && (
        <>
          <DossierHeader dossier={dossier} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Notities Kaart */}
            <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Notities & Contactmomenten</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {dossier.notities && dossier.notities.length > 0 ? (
                  dossier.notities.map((n) => (
                    <div key={n.id} className={`p-3 rounded-md ${n.isBelangrijk ? 'bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500' : 'bg-gray-50 dark:bg-dark-card'}`}>
                      <p className="text-gray-800 dark:text-gray-200">{n.text}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex justify-between items-center">
                        <span>{new Date(n.timestamp).toLocaleString()}</span>
                        {n.isBelangrijk && <span className="font-bold text-yellow-600 dark:text-yellow-400">Belangrijk</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">Geen notities gevonden voor dit adres.</p>
                )}
              </div>
              
              <form className="mt-6 border-t dark:border-gray-700 pt-4" onSubmit={handleAddNote}>
                <h3 className="font-semibold mb-2">Nieuwe Notitie Toevoegen</h3>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Typ een nieuwe notitie..."
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white bg-white dark:bg-dark-surface mb-2"
                  rows={3}
                />
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"/>
                    <span className="text-sm font-medium">Belangrijk</span>
                  </label>
                  <button type="submit" disabled={adding || !note.trim()} className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors disabled:bg-gray-400">
                    {adding ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </form>
            </div>

            {/* Gerelateerde Meldingen & Bewoners Kaarten */}
            <div className="space-y-6">
              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Gerelateerde Meldingen</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {gerelateerdeMeldingen.length > 0 ? (
                    gerelateerdeMeldingen.map((m) => (
                      <div key={m.id} className="p-3 bg-gray-50 dark:bg-dark-card rounded-md">
                        <p className="font-semibold">{m.titel}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{m.omschrijving}</p>
                        <span className={`mt-2 inline-block px-2 py-1 text-xs rounded-full ${
                          m.status === 'Afgerond' ? 'bg-green-100 text-green-800' : 
                          m.status === 'In behandeling' ? 'bg-blue-100 text-blue-800' : 
                          'bg-orange-100 text-orange-800'
                        }`}>{m.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Geen meldingen gevonden voor dit adres.</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Bewonersinformatie</h2>
                <div className="space-y-3">
                  {dossier.bewoners && dossier.bewoners.length > 0 ? (
                    dossier.bewoners.map(b => (
                      <div key={b.id} className="p-3 bg-gray-50 dark:bg-dark-card rounded-md">
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Contact: {b.contact}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Verbleef van {new Date(b.from).toLocaleDateString()} tot {b.to ? new Date(b.to).toLocaleDateString() : 'heden'}</p>
                      </div>
                    ))
                  ) : (
                     <p className="text-gray-500 dark:text-gray-400">Geen bewonersinformatie beschikbaar.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!dossier && searchedAdres && (
        <p className="text-center text-gray-500 mt-8">Dossier voor "{searchedAdres}" wordt geladen of aangemaakt...</p>
      )}
    </div>
  );
};

export default DossierPage;
