import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from '../context/AppContext';
import { DossierBewoner, DossierStatus, WoningDossier } from "../types";
import { fetchDossierMeta, type DossierMeta } from '../services/dossierMeta';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const DossierPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditIntentRef = useRef(false);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const adr = qs.get('adres');
    if (adr) {
      // voorkom dubbele triggers voor hetzelfde dossier
      if (!dossier || decodeURIComponent(adr) !== dossier.id) {
        isEditIntentRef.current = true; // kom vanuit overzicht/recents naar bewerken
        setSearch(adr);
        void doSearch(adr);
      }
    } else {
      // Geen adres in de query: keer terug naar beginscherm
      isEditIntentRef.current = false;
      setDossier(null);
      setSearch('');
      setSuggestions([]);
      setShowSuggest(false);
      setMeta(null);
    }
    // Op het moment dat de querystring geen 'adres' meer heeft laten we de pagina zoals hij is
    // (gebruiker blijft in zoek/overzicht staat), geen extra actie nodig.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
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
  const [bewonerToevoegenBusy, setBewonerToevoegenBusy] = useState(false);
  const [bewonerTelefoonError, setBewonerTelefoonError] = useState<string | null>(null);
  const [bewonerEmailError, setBewonerEmailError] = useState<string | null>(null);
  const [allDossiers, setAllDossiers] = useState<Array<{ id: string; status: DossierStatus; woningType?: string | null; updatedAt: number }>>([]);

  const { getDossier, createNewDossier, addDossierNotitie, uploadDossierDocument, addDossierBewoner, updateDossierStatus, updateDossierBewoner, removeDossierBewoner, addDossierAfspraak, removeDossierAfspraak, meldingen, currentUser } = useAppContext();
  const [editBewonerId, setEditBewonerId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editExtra, setEditExtra] = useState('');
  // Afspraken formulier state
  const [newApptStart, setNewApptStart] = useState('');
  const [newApptEnd, setNewApptEnd] = useState('');
  const [newApptDesc, setNewApptDesc] = useState('');
  const [newApptDescTouched, setNewApptDescTouched] = useState(false);
  const descInputRef = useRef<HTMLInputElement | null>(null);
  const [newApptBewonerId, setNewApptBewonerId] = useState('');
  const [addingAppt, setAddingAppt] = useState(false);
  const [editAfspraak, setEditAfspraak] = useState(false);
  const [editAfspraakStart, setEditAfspraakStart] = useState<string>('');
  const [editAfspraakEinde, setEditAfspraakEinde] = useState<string>('');
  const [editAfspraakNotitie, setEditAfspraakNotitie] = useState('');

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

  // simpele validators
  const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidPhone = (v: string) => !v || /^[0-9+()\s-]{6,}$/.test(v);

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
    // Als het dossier al ingevulde info heeft, ga direct naar Overzicht
    try {
      const hasContent = !!dossierResult && (
        (dossierResult.notities && dossierResult.notities.length > 0) ||
        (dossierResult.documenten && dossierResult.documenten.length > 0) ||
        (dossierResult.afspraken && dossierResult.afspraken.length > 0) ||
        (dossierResult.bewoners && dossierResult.bewoners.length > 0)
      );
  if (hasContent && !isEditIntentRef.current) {
        navigate(`/dossier/${encodeURIComponent(dossierResult.id)}`);
        return;
      }
    } catch {}
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
  <Link to={`/dossier/${encodeURIComponent(dossier.id)}`} className="ml-auto px-3 py-1 rounded bg-gray-600 text-white">Overzicht</Link>
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

  // Overzicht ophalen voor snelle stats en recente dossiers
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dossiers'), (snap) => {
      const list: Array<{ id: string; status: DossierStatus; woningType?: string | null; updatedAt: number }> = [];
      snap.forEach(doc => {
        const data = doc.data() as any;
        const status = (data?.status || 'actief') as DossierStatus;
        const wt = (data?.woningType ?? null) as string | null;
        const dates: number[] = [];
        const hist = Array.isArray(data?.historie) ? data.historie : [];
        for (const h of hist) {
          const d = (h?.date && typeof h.date?.toDate === 'function') ? h.date.toDate() : (h?.date ? new Date(h.date) : null);
          if (d && !isNaN(d.getTime())) dates.push(d.getTime());
        }
        const notes = Array.isArray(data?.notities) ? data.notities : [];
        for (const n of notes) {
          const d = (n?.timestamp && typeof n.timestamp?.toDate === 'function') ? n.timestamp.toDate() : (n?.timestamp ? new Date(n.timestamp) : null);
          if (d && !isNaN(d.getTime())) dates.push(d.getTime());
        }
        const updatedAt = dates.length ? Math.max(...dates) : 0;
        list.push({ id: doc.id, status, woningType: wt, updatedAt });
      });
      setAllDossiers(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Woningdossiers</h1>
      {!dossier && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(() => {
            const total = allDossiers.length;
            const actief = allDossiers.filter(d => d.status === 'actief').length;
            const afgesloten = allDossiers.filter(d => d.status === 'afgesloten').length;
            const Card = ({ title, value, color }: { title: string; value: number; color: string }) => (
              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <p className="text-sm text-gray-500 dark:text-gray-300">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            );
            return (
              <>
                <Card title="Totaal dossiers" value={total} color="text-brand-primary" />
                <Card title="Actief" value={actief} color="text-emerald-600" />
                <Card title="Afgesloten" value={afgesloten} color="text-gray-700" />
              </>
            );
          })()}
        </div>
      )}
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

      {!dossier && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Recente dossiers</h2>
          {allDossiers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Nog geen dossiers beschikbaar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allDossiers
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 6)
                .map(d => (
                  <div key={d.id} className="p-3 bg-white dark:bg-dark-surface rounded-lg shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{d.id}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <span className={`px-2 py-0.5 rounded-full ${d.status === 'actief' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : d.status === 'afgesloten' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>{d.status}</span>
                          {d.woningType && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{d.woningType}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/dossier/${encodeURIComponent(d.id)}`} className="px-3 py-1 rounded bg-gray-600 text-white text-sm">Overzicht</Link>
                        <Link to={`/dossiers?adres=${encodeURIComponent(d.id)}`} className="px-3 py-1 rounded bg-brand-primary text-white text-sm">Bewerken</Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {dossier && (
        <>
          <DossierHeader dossier={dossier} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Linkerkolom: Notities + Afspraken */}
            <div className="space-y-6">
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

              {/* Afspraken verplaatst naar linkerkolom, onder Notities */}
              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Afspraken</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                  {dossier.afspraken && dossier.afspraken.length > 0 ? (
                    dossier.afspraken
                      .slice()
                      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                      .map((a) => (
                        <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(a.start).toLocaleString()} {a.end ? `— ${new Date(a.end).toLocaleString()}` : ''}
                            </p>
                            {a.description && <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{a.description}</p>}
                            {a.bewonerNaam && <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Bewoner: {a.bewonerNaam}</p>}
                          </div>
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                              onClick={async () => {
                                if (!confirm('Afspraak verwijderen?')) return;
                                await removeDossierAfspraak(dossier.id, a.id);
                                const updated = await getDossier(dossier.id);
                                setDossier(updated);
                              }}
                            >Verwijderen</button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Nog geen afspraken.</p>
                  )}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newApptStart) return;
                    if (!dossier) return;
                    // Custom inline validation for description
                    if (!newApptDesc.trim()) {
                      setNewApptDescTouched(true);
                      descInputRef.current?.focus();
                      return;
                    }
                    setAddingAppt(true);
                    try {
                      const start = new Date(newApptStart);
                      const end = newApptEnd ? new Date(newApptEnd) : null;
                      const bewoner = dossier.bewoners.find(b => b.id === newApptBewonerId);
                      await addDossierAfspraak(dossier.id, {
                        start,
                        end,
                        description: newApptDesc.trim(),
                        bewonerId: bewoner?.id,
                        bewonerNaam: bewoner?.name,
                      });
                    } finally {
                      const updated = await getDossier(dossier.id);
                      setDossier(updated);
                      setAddingAppt(false);
                      setNewApptStart('');
                      setNewApptEnd('');
                      setNewApptDesc('');
                      setNewApptDescTouched(false);
                      setNewApptBewonerId('');
                    }
                  }}
                >
                  <h3 className="font-semibold mb-2">Afspraak toevoegen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="datetime-local"
                      value={newApptStart}
                      onChange={(e) => setNewApptStart(e.target.value)}
                      placeholder="Startdatum/tijd"
                      className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    />
                    <input
                      type="datetime-local"
                      value={newApptEnd}
                      onChange={(e) => setNewApptEnd(e.target.value)}
                      placeholder="Einddatum/tijd (optioneel)"
                      className="px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Omschrijving <span className="text-red-600">*</span>
                      </label>
                      <input
                        ref={descInputRef}
                        value={newApptDesc}
                        onChange={(e) => setNewApptDesc(e.target.value)}
                        onBlur={() => setNewApptDescTouched(true)}
                        placeholder="Omschrijving"
                        required
                        onInvalid={(ev) => {
                          ev.preventDefault();
                          setNewApptDescTouched(true);
                        }}
                        aria-invalid={newApptDescTouched && !newApptDesc.trim()}
                        className={
                          `w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 ` +
                          (newApptDescTouched && !newApptDesc.trim()
                            ? 'border-red-500 focus:ring-red-500'
                            : 'focus:ring-brand-primary')
                        }
                      />
                      {newApptDescTouched && !newApptDesc.trim() && (
                        <p className="mt-1 text-sm text-red-600">Omschrijving is verplicht.</p>
                      )}
                    </div>
                    <select
                      value={newApptBewonerId}
                      onChange={(e) => setNewApptBewonerId(e.target.value)}
                      className="md:col-span-2 px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                    >
                      <option value="">Koppel aan bewoner (optioneel)</option>
                      {dossier.bewoners.map(b => (
                        <option key={b.id} value={b.id} className="bg-white dark:bg-dark-surface">{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" disabled={addingAppt} className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:opacity-60 disabled:cursor-not-allowed">
                      {addingAppt ? 'Toevoegen…' : 'Toevoegen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Rechterkolom: Bewoners, Documenten en onderaan Gerelateerde Meldingen */}
            <div className="space-y-6">
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

                            <div className="mt-3 p-3 border rounded bg-gray-50 dark:bg-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <input id={`afspraak-${b.id}`} type="checkbox" checked={editAfspraak} onChange={async (e)=>{
                                  setEditAfspraak(e.target.checked);
                                  if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { afspraakGemaakt: e.target.checked });
                                }} />
                                <label htmlFor={`afspraak-${b.id}`} className="text-sm font-medium">Afspraak gemaakt</label>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input type="datetime-local" value={editAfspraakStart} onChange={(e)=>setEditAfspraakStart(e.target.value)} placeholder="Startdatum/tijd" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                                  if(!dossier) return; const dt = editAfspraakStart ? new Date(editAfspraakStart) : null; await updateDossierBewoner(dossier.id, b.id, { afspraakStart: dt });
                                }} />
                                <input type="datetime-local" value={editAfspraakEinde} onChange={(e)=>setEditAfspraakEinde(e.target.value)} placeholder="Einddatum/tijd (optioneel)" className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                                  if(!dossier) return; const dt = editAfspraakEinde ? new Date(editAfspraakEinde) : null; await updateDossierBewoner(dossier.id, b.id, { afspraakEinde: dt });
                                }} />
                              </div>
                              <textarea value={editAfspraakNotitie} onChange={(e)=>setEditAfspraakNotitie(e.target.value)} placeholder="Notitie over de gemaakte afspraak (bijv. onderwerp, locatie, contactpersoon)" rows={2} className="mt-2 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400" onBlur={async ()=>{
                                if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { afspraakNotitie: editAfspraakNotitie.trim() || undefined });
                              }} />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button type="button" className="px-3 py-1 rounded bg-gray-600 text-white" onClick={() => { setEditBewonerId(null); }}>Annuleren</button>
                              <button type="button" className="px-3 py-1 rounded bg-brand-primary text-white" onClick={async () => {
                                if (!dossier) return;
                                const startDt = editAfspraakStart ? new Date(editAfspraakStart) : null;
                                const eindDt = editAfspraakEinde ? new Date(editAfspraakEinde) : null;
                                await updateDossierBewoner(dossier.id, b.id, { 
                                  name: editNaam.trim() || b.name,
                                  contact: composeContact(editTel, editEmail) || undefined,
                                  extraInfo: editExtra.trim() || undefined,
                                  afspraakGemaakt: editAfspraak,
                                  afspraakStart: startDt,
                                  afspraakEinde: eindDt,
                                  afspraakNotitie: editAfspraakNotitie.trim() || undefined,
                                });
                                const updated = await getDossier(dossier.id);
                                setDossier(updated);
                                setEditBewonerId(null);
                              }}>Opslaan</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold flex items-center gap-2">{b.name}{b.afspraakGemaakt && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Afspraak</span>}</p>
                            {b.contact && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">Contact: {b.contact}</p>
                            )}
                            {b.extraInfo && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Extra info: {b.extraInfo}</p>
                            )}
                            {b.afspraakGemaakt && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                <p className="font-medium">Afspraak</p>
                                <p>
                                  {b.afspraakStart ? new Date(b.afspraakStart).toLocaleString() : 'Geen startdatum'}
                                  {b.afspraakEinde ? ` — ${new Date(b.afspraakEinde).toLocaleString()}` : ''}
                                </p>
                                {b.afspraakNotitie && <p className="mt-1">{b.afspraakNotitie}</p>}
                              </div>
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
                                setEditAfspraak(!!b.afspraakGemaakt);
                                const toLocal = (d?: Date | null) => d ? new Date(d).toISOString().slice(0,16) : '';
                                setEditAfspraakStart(toLocal(b.afspraakStart ?? null));
                                setEditAfspraakEinde(toLocal(b.afspraakEinde ?? null));
                                setEditAfspraakNotitie(b.afspraakNotitie || '');
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
                  if (!dossier) return;
                  // validate contact velden
                  const telOk = isValidPhone(bewonerTelefoon.trim());
                  const emailOk = isValidEmail(bewonerEmail.trim());
                  setBewonerTelefoonError(telOk ? null : 'Voer een geldig telefoonnummer in');
                  setBewonerEmailError(emailOk ? null : 'Voer een geldig e-mailadres in');
                  if (!telOk || !emailOk) return;
                  setBewonerToevoegenBusy(true);
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
                    setBewonerToevoegenBusy(false);
                  }
                  setBewonerNaam('');
                  setBewonerTelefoon('');
                  setBewonerEmail('');
                  setBewonerExtraInfo('');
          setBewonerTelefoonError(null);
          setBewonerEmailError(null);
                }}>
                  <h3 className="font-semibold mb-2">Bewoner toevoegen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-300">
                      Naam
                      <input value={bewonerNaam} onChange={e=>setBewonerNaam(e.target.value)} placeholder="Naam" className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-300">
                      Telefoonnummer
            <input value={bewonerTelefoon} onChange={e=>{ setBewonerTelefoon(e.target.value); if (bewonerTelefoonError) setBewonerTelefoonError(null); }} onBlur={()=> setBewonerTelefoonError(isValidPhone(bewonerTelefoon) ? null : 'Voer een geldig telefoonnummer in')} placeholder="Telefoonnummer" className={`mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${bewonerTelefoonError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'}`} />
            {bewonerTelefoonError && <span className="mt-1 block text-xs text-red-600">{bewonerTelefoonError}</span>}
                    </label>
                    <label className="text-xs text-gray-600 dark:text-gray-300">
                      Email
            <input type="email" value={bewonerEmail} onChange={e=>{ setBewonerEmail(e.target.value); if (bewonerEmailError) setBewonerEmailError(null); }} onBlur={()=> setBewonerEmailError(isValidEmail(bewonerEmail) ? null : 'Voer een geldig e-mailadres in')} placeholder="Email" className={`mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${bewonerEmailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'}`} />
            {bewonerEmailError && <span className="mt-1 block text-xs text-red-600">{bewonerEmailError}</span>}
                    </label>
                    <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-300">
                      Extra info (optioneel)
                      <input value={bewonerExtraInfo} onChange={e=>setBewonerExtraInfo(e.target.value)} placeholder="Bijv. contactvoorkeur, bijzonderheden" className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </label>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button type="submit" disabled={bewonerToevoegenBusy} className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:opacity-60 disabled:cursor-not-allowed">{bewonerToevoegenBusy ? 'Toevoegen…' : 'Toevoegen'}</button>
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
              {/* Gerelateerde Meldingen onderaan */}
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
