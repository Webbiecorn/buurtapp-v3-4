import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from '../context/AppContext';
import { DossierBewoner, DossierStatus, WoningDossier } from "../types";
import { fetchDossierMeta, type DossierMeta } from '../services/dossierMeta';

const DossierPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dossier, setDossier] = useState<WoningDossier | null>(null);
  const [searchedAdres, setSearchedAdres] = useState<string>("");
  const [note, setNote] = useState("");
  const [important, setImportant] = useState(false);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string }>>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const suggestBoxRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<DossierMeta | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [bewonerNaam, setBewonerNaam] = useState('');
  const [bewonerTelefoon, setBewonerTelefoon] = useState('');
  const [bewonerEmail, setBewonerEmail] = useState('');
  const [bewonerExtraInfo, setBewonerExtraInfo] = useState('');
  
  const { getDossier, createNewDossier, addDossierNotitie, uploadDossierDocument, addDossierBewoner, updateDossierStatus, updateDossierBewoner, removeDossierBewoner, meldingen, currentUser } = useAppContext();
  const [editBewonerId, setEditBewonerId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editExtra, setEditExtra] = useState('');

  // helpers to parse/compose contact string
  const parseContact = (contact?: string) => {
    const res = { tel: '', email: '' };
    if (!contact) return res;
    const parts = contact.split('|').map(s => s.trim());
    for (const p of parts) {
      if (p.toLowerCase().startsWith('tel:')) res.tel = p.split(':')[1]?.trim() || '';
      if (p.toLowerCase().startsWith('email:')) res.email = p.split(':')[1]?.trim() || '';
    }
    return res;
  };
  const composeContact = (tel: string, email: string) => {
    const parts: string[] = [];
    if (tel.trim()) parts.push(`tel: ${tel.trim()}`);
    if (email.trim()) parts.push(`email: ${email.trim()}`);
    return parts.join(' | ');
  };

  const doSearch = async (searchAdres: string) => {
    if (!searchAdres.trim()) return;
    setSearchedAdres(searchAdres);
    setDossier(null); 

    let dossierResult = await getDossier(searchAdres);

    if (!dossierResult) {
      console.log(`Dossier voor ${searchAdres} niet gevonden, nieuwe wordt aangemaakt.`);
      dossierResult = await createNewDossier(searchAdres);
    }
    
    setDossier(dossierResult);
    // Meta-info (niet-blokkerend)
    try {
      const m = await fetchDossierMeta(searchAdres);
      setMeta(m);
    } catch (e) {
      setMeta(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    await doSearch(search.trim());
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
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <select
            value={dossier.status}
            onChange={async (e) => {
              const s = e.target.value as DossierStatus;
              setStatusUpdating(true);
              try {
                await updateDossierStatus(dossier.id, s);
                const updated = await getDossier(dossier.id);
                setDossier(updated);
              } finally {
                setStatusUpdating(false);
              }
            }}
            disabled={statusUpdating}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
          >
            <option value="actief">Actief</option>
            <option value="afgesloten">Afgesloten</option>
            <option value="in onderzoek">In onderzoek</option>
          </select>
        </div>
        <span className="flex items-center gap-1">
          Labels: {dossier.labels.map(label => (
            <span key={label} className="font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{label}</span>
          ))}
        </span>
        {meta && (
          <span className="flex items-center gap-2">
            {meta.woningType && <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">{meta.woningType}</span>}
            {meta.energieLabel && <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">Label {meta.energieLabel}</span>}
          </span>
        )}
      </div>
    </div>
  );

  // Debounced BAG suggest (PDOK Locatieserver)
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }
    // debounce
    const handle = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsSuggestLoading(true);
        // PDOK suggest endpoint for addresses
        const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(q)}&fq=type:adres`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
        const data = await res.json();
        const docs: Array<any> = data?.response?.docs || [];
        const items = docs.map((d) => ({
          id: d.id || d.weergavenaam,
          label: d.weergavenaam || d.suggest || d.id,
        })).slice(0, 10);
        setSuggestions(items);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          console.warn('BAG suggest error', e);
        }
      } finally {
        setIsSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  // Close suggest on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!suggestBoxRef.current) return;
      if (!suggestBoxRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    if (showSuggest) {
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [showSuggest]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Woningdossiers</h1>
      <form className="mb-8" onSubmit={handleSearch}>
        <div className="relative flex">
          <input
            type="text"
            value={search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            placeholder="Zoek op adres..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-dark-surface"
            aria-autocomplete="list"
            aria-expanded={showSuggest}
            aria-controls="bag-suggest-list"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-brand-primary text-white rounded-r-md hover:bg-brand-secondary transition-colors"
          >
            Zoek
          </button>

          {showSuggest && (suggestions.length > 0 || isSuggestLoading) && (
            <div ref={suggestBoxRef} id="bag-suggest-list" className="absolute z-20 left-0 right-24 top-full mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-auto">
              {isSuggestLoading && (
                <div className="px-3 py-2 text-sm text-gray-500">Zoeken...</div>
              )}
              {!isSuggestLoading && suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSearch(s.label);
                    setShowSuggest(false);
                    setSuggestions([]);
                    void doSearch(s.label);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {dossier && (
        <>
          <DossierHeader dossier={dossier} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Notities Kaart */}
            <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Notities</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {dossier.notities && dossier.notities.length > 0 ? (
                  dossier.notities.map((n) => (
                    <div key={n.id} className={`p-3 rounded-md ${n.isBelangrijk ? 'bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
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
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-dark-surface mb-2"
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
                      <div key={m.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
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
                      <div key={b.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {editBewonerId === b.id ? (
                          <div className="space-y-2">
                            <input value={editNaam} onChange={e=>setEditNaam(e.target.value)} placeholder="Naam" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                              if (!dossier) return; await updateDossierBewoner(dossier.id, b.id, { name: editNaam.trim() || b.name });
                            }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { name: editNaam.trim() || b.name }); }}} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input value={editTel} onChange={e=>setEditTel(e.target.value)} placeholder="Telefoonnummer" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                                if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined });
                              }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined }); }}} />
                              <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                                if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined });
                              }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined }); }}} />
                            </div>
                            <input value={editExtra} onChange={e=>setEditExtra(e.target.value)} placeholder="Extra info" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                              if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { extraInfo: editExtra.trim() || undefined });
                            }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { extraInfo: editExtra.trim() || undefined }); }}} />
                            <div className="flex gap-2 justify-end">
                              <button type="button" className="px-3 py-1 rounded bg-gray-600 text-white" onClick={() => { setEditBewonerId(null); }}>Annuleren</button>
                              <button type="button" className="px-3 py-1 rounded bg-brand-primary text-white" onClick={async () => {
                                if (!dossier) return;
                                await updateDossierBewoner(dossier.id, b.id, { name: editNaam.trim() || b.name, contact: composeContact(editTel, editEmail) || undefined, extraInfo: editExtra.trim() || undefined });
                                const updated = await getDossier(dossier.id);
                                setDossier(updated);
                                setEditBewonerId(null);
                              }}>Opslaan</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold">{b.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Contact: {b.contact || '—'}</p>
                            {b.extraInfo && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Extra info: {b.extraInfo}</p>
                            )}
                            {(b.from || b.to) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Verbleef van {b.from ? new Date(b.from).toLocaleDateString() : '-'} tot {b.to ? new Date(b.to).toLocaleDateString() : 'heden'}</p>
                            )}
                            <div className="mt-2 flex gap-2 justify-end">
                              <button type="button" className="px-3 py-1 rounded bg-gray-600 text-white" onClick={() => { 
                                setEditBewonerId(b.id); 
                                setEditNaam(b.name); 
                                const parsed = parseContact(b.contact);
                                setEditTel(parsed.tel);
                                setEditEmail(parsed.email);
                                setEditExtra(b.extraInfo || ''); 
                              }}>Bewerken</button>
                              <button type="button" className="px-3 py-1 rounded bg-red-600 text-white" onClick={async () => {
                                if (!confirm('Weet je zeker dat je deze bewoner wilt verwijderen?')) return;
                                await removeDossierBewoner(dossier.id, b.id);
                                const updated = await getDossier(dossier.id);
                                setDossier(updated);
                              }}>Verwijderen</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                     <p className="text-gray-500 dark:text-gray-400">Geen bewonersinformatie beschikbaar.</p>
                  )}
                </div>

                <form className="mt-6 border-t dark:border-gray-700 pt-4" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!bewonerNaam.trim()) return;
                  const parts = [] as string[];
                  if (bewonerTelefoon.trim()) parts.push(`tel: ${bewonerTelefoon.trim()}`);
                  if (bewonerEmail.trim()) parts.push(`email: ${bewonerEmail.trim()}`);
                  const contact = parts.join(' | ');
                  const bew: Omit<DossierBewoner, 'id'> = {
                    name: bewonerNaam.trim(),
                    contact,
                    from: new Date(),
                    to: undefined,
                    extraInfo: bewonerExtraInfo.trim() || undefined,
                  };
                  // Optimistische update: toon direct boven de velden
                  const tempId = `bewoner-${Date.now()}`;
                  const optimistic = { id: tempId, ...bew } as DossierBewoner;
                  setDossier(prev => prev ? { ...prev, bewoners: [ ...(prev.bewoners || []), optimistic ] } : prev);
                  try {
                    await addDossierBewoner(dossier.id, bew);
                  } finally {
                    const updated = await getDossier(dossier.id);
                    setDossier(updated);
                  }
                  setBewonerNaam('');
                  setBewonerTelefoon('');
                  setBewonerEmail('');
                  setBewonerExtraInfo('');
                }}>
                  <h3 className="font-semibold mb-2">Bewoner toevoegen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input value={bewonerNaam} onChange={e=>setBewonerNaam(e.target.value)} placeholder="Naam" className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    <input value={bewonerTelefoon} onChange={e=>setBewonerTelefoon(e.target.value)} placeholder="Telefoonnummer" className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    <input type="email" value={bewonerEmail} onChange={e=>setBewonerEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    <input value={bewonerExtraInfo} onChange={e=>setBewonerExtraInfo(e.target.value)} placeholder="Extra info" className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary">Toevoegen</button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Documenten</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {dossier.documenten && dossier.documenten.length > 0 ? (
                    dossier.documenten.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">{doc.name}</a>
                        <span className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Nog geen documenten.</p>
                  )}
                </div>
                <form className="mt-4" onSubmit={(e)=>e.preventDefault()}>
                  <label className="block">
                    <span className="sr-only">Upload document</span>
                    <input type="file" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingDoc(true);
                      try {
                        await uploadDossierDocument(dossier.id, file);
                        const updated = await getDossier(dossier.id);
                        setDossier(updated);
                      } finally {
                        setUploadingDoc(false);
                        e.currentTarget.value = '';
                      }
                    }} className="block w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-dark-surface rounded border border-gray-300 dark:border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary" />
                  </label>
                  {uploadingDoc && <p className="text-sm text-gray-500 mt-2">Uploaden...</p>}
                </form>
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
