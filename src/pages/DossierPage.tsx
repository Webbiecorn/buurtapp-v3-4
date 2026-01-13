import React, { useEffect, useRef, useState } from "react";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '../components/Icons';
import { useAppContext } from '../context/AppContext';
import { DossierBewoner, DossierStatus, WoningDossier } from "../types";
import { fetchDossierMeta, type DossierMeta } from '../services/dossierMeta';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { toDate, getTimeSafe } from '../utils/dateHelpers';

const DossierPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditIntentRef = useRef(false);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const adr = qs.get('adres');
    if (adr) {
      if (!dossier || decodeURIComponent(adr) !== dossier.id) {
        isEditIntentRef.current = true;
        setSearch(adr);
        void doSearch(adr);
      }
    } else {
      isEditIntentRef.current = false;
      setDossier(null);
      setSearch('');
      setSuggestions([]);
      setShowSuggest(false);
      setMeta(null);
    }
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
  const [, setMeta] = useState<DossierMeta | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [woningTypeUpdating, setWoningTypeUpdating] = useState(false); // <-- WIJZIGING: Nieuwe state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [bewonerNaam, setBewonerNaam] = useState('');
  const [bewonerTelefoon, setBewonerTelefoon] = useState('');
  const [bewonerEmail, setBewonerEmail] = useState('');
  const [bewonerExtraInfo, setBewonerExtraInfo] = useState('');
  const [bewonerToevoegenBusy, setBewonerToevoegenBusy] = useState(false);
  const [bewonerTelefoonError, setBewonerTelefoonError] = useState<string | null>(null);
  const [bewonerEmailError, setBewonerEmailError] = useState<string | null>(null);
  const [allDossiers, setAllDossiers] = useState<Array<{ id: string; status: DossierStatus; woningType?: string | null; updatedAt: number }>>([]);

  // <-- WIJZIGING: Nieuwe functie uit context gehaald
  const { 
    getDossier, 
    createNewDossier, 
    addDossierNotitie, 
    uploadDossierDocument, 
    addDossierBewoner, 
    updateDossierStatus, 
    // updateDossierWoningType removed (not present on context)
    updateDossierBewoner, 
    removeDossierBewoner, 
    addDossierAfspraak, 
    removeDossierAfspraak, 
    meldingen, 
    currentUser 
  } = useAppContext();

  // also keep a raw context reference for optional APIs
  const appCtx = useAppContext();

  const [editBewonerId, setEditBewonerId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editExtra, setEditExtra] = useState('');
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
  const [previewItems, setPreviewItems] = useState<string[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  useEffect(() => {
    if (!previewItems) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItems(null);
      if (e.key === 'ArrowLeft') setPreviewIndex(i => (previewItems ? (i - 1 + previewItems.length) % previewItems.length : 0));
      if (e.key === 'ArrowRight') setPreviewIndex(i => (previewItems ? (i + 1) % previewItems.length : 0));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [previewItems]);

  const openPreview = (items: string[], index: number) => { setPreviewItems(items); setPreviewIndex(index); };
  const closePreview = () => setPreviewItems(null);
  const getType = (url: string) => {
    const lower = url.split('?')[0].toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (/(youtube\.com|youtu\.be)/.test(lower)) return 'video-embed';
    if (lower.match(/\.(mp4|webm|ogg)$/)) return 'video';
    if (lower.match(/\.(png|jpe?g|gif|webp|svg)$/)) return 'image';
    return 'unknown';
  };
  const renderInline = (url: string) => {
    const t = getType(url);
    if (t === 'image') return <img src={url} alt="Voorbeeld document" className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} tabIndex={0} role="img" onKeyDown={(e) => { if (e.key === 'Escape') e.stopPropagation(); }} />;
    if (t === 'video') return (
      <video controls className="max-h-[85vh] max-w-[90vw] rounded shadow-2xl bg-black" onClick={(e) => e.stopPropagation()} tabIndex={0} aria-label="Voorbeeld video" aria-describedby="video-no-captions">
        <source src={url} />
        <div id="video-no-captions" className="sr-only">Deze video heeft geen ondertitels beschikbaar</div>
        Je browser ondersteunt de video tag niet.
      </video>
    );
    if (t === 'video-embed') return (
  <iframe src={url} title="Video embed" className="w-[90vw] h-[70vh] rounded shadow-2xl bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onClick={(e) => e.stopPropagation()} tabIndex={0} role="button" />
    );
    if (t === 'pdf') return (
  <iframe src={`${url}#toolbar=1`} title="PDF preview" className="w-[90vw] h-[90vh] rounded shadow-2xl bg-white" onClick={(e) => e.stopPropagation()} tabIndex={0} role="button" />
    );
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center px-4 py-2 rounded bg-white text-gray-800 shadow" role="button">
        <DownloadIcon className="h-5 w-5 mr-2" /> Download document
      </a>
    );
  };

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

  const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidPhone = (v: string) => !v || /^[0-9+()\s-]{6,}$/.test(v);

  const doSearch = async (searchAdres: string) => {
    if (!searchAdres.trim()) return;
    setSearchedAdres(searchAdres);
    setDossier(null); 
    let dossierResult = await getDossier(searchAdres);
    if (!dossierResult) {
      // Dossier voor ${searchAdres} niet gevonden, nieuwe wordt aangemaakt.
      dossierResult = await createNewDossier(searchAdres);
    }
    setDossier(dossierResult);
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
    } catch (e) {
      // Error checking content/navigation redirect
    }
    try {
      const m = await fetchDossierMeta(searchAdres);
      setMeta(m);
    } catch {
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

  const gerelateerdeMeldingen = dossier ? meldingen.filter(m => m.locatie?.adres === dossier.id) : [];

  // <-- WIJZIGING: Volledige DossierHeader vervangen
  const DossierHeader = ({ dossier }: { dossier: WoningDossier }) => (
    <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow mb-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{dossier.id}</h1>
      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
        
        {/* Status Dropdown */}
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
            <option value="afspraak">Afspraak</option>
          </select>
        </div>

        {/* Woningtype Dropdown */}
        <div className="flex items-center gap-2">
            <span>Woningtype:</span>
            <select
                value={dossier.woningType || ''}
        onChange={async (e) => {
          const newType = e.target.value;
          setWoningTypeUpdating(true);
          try {
            if (typeof (appCtx as any)?.updateDossierWoningType === 'function') {
              await (appCtx as any).updateDossierWoningType(dossier.id, newType);
            } else {
              // fallback: no specialized API available
              // updateDossierWoningType not available in context, skipping specialized update.
            }
            const updated = await getDossier(dossier.id);
            setDossier(updated);
          } finally {
            setWoningTypeUpdating(false);
          }
        }}
                disabled={woningTypeUpdating}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
            >
                <option value="" disabled>-- Selecteer type --</option>
                <option value="Huurwoning">Huurwoning</option>
                <option value="Koopwoning">Koopwoning</option>
            </select>
        </div>

        {/* Oude labels (kan weg als je die niet meer gebruikt) */}
        {Array.isArray(dossier.labels) && dossier.labels.length > 0 && (
          <span className="flex items-center gap-1">
            Labels: {dossier.labels.map(label => (
              <span key={label} className="font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{label}</span>
            ))}
          </span>
        )}
        
        <Link to={`/dossier/${encodeURIComponent(dossier.id)}`} className="ml-auto px-3 py-1 rounded bg-gray-600 text-white">Overzicht</Link>
      </div>
    </div>
  );

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsSuggestLoading(true);
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
          // BAG suggest error
        }
      } finally {
        setIsSuggestLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

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
          const d = toDate(h?.date);
          if (d && !isNaN(d.getTime())) dates.push(d.getTime());
        }
        const notes = Array.isArray(data?.notities) ? data.notities : [];
        for (const n of notes) {
          const d = toDate(n?.timestamp);
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
            <label htmlFor="search-adres" className="sr-only">Zoek adres</label>
            <input
              id="search-adres"
            type="text"
            value={search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white bg-white dark:bg-dark-surface"
            role="combobox"
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

            {/* Linkerkolom: Bewoners, Notities + Afspraken */}
            <div className="space-y-6">
              {/* Bewonersinformatie linksboven */}
              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Bewonersinformatie</h2>
                <div className="space-y-3">
                          {dossier.bewoners && dossier.bewoners.length > 0 ? (
                    dossier.bewoners.map(b => (
                      <div key={b.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {editBewonerId === b.id ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label htmlFor={`edit-naam-${b.id}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Naam</label>
                              <input id={`edit-naam-${b.id}`} value={editNaam} onChange={e=>setEditNaam(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                if (!dossier) return; await updateDossierBewoner(dossier.id, b.id, { name: editNaam.trim() || b.name });
                              }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { name: editNaam.trim() || b.name }); }}} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <label htmlFor={`edit-telefoon-${b.id}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Telefoonnummer</label>
                                <input id={`edit-telefoon-${b.id}`} value={editTel} onChange={e=>setEditTel(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                  if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined });
                                }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined }); }}} />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor={`edit-email-${b.id}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Email</label>
                                <input id={`edit-email-${b.id}`} type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                  if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined });
                                }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { contact: composeContact(editTel, editEmail) || undefined }); }}} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label htmlFor={`edit-extra-${b.id}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Extra info</label>
                              <input id={`edit-extra-${b.id}`} value={editExtra} onChange={e=>setEditExtra(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { extraInfo: editExtra.trim() || undefined });
                              }} onKeyDown={async (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { extraInfo: editExtra.trim() || undefined }); }}} />
                            </div>

                            <div className="mt-3 p-3 border rounded bg-gray-50 dark:bg-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <input id={`afspraak-${b.id}`} type="checkbox" checked={editAfspraak} onChange={async (e)=>{
                                  setEditAfspraak(e.target.checked);
                                  if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { afspraakGemaakt: e.target.checked });
                                }} />
                                <label htmlFor={`afspraak-${b.id}`} className="text-sm font-medium">Afspraak gemaakt</label>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <label htmlFor={`edit-afspraak-start-${b.id}`} className="text-sm text-gray-700 dark:text-gray-300">Startdatum/tijd</label>
                                  <input id={`edit-afspraak-start-${b.id}`} type="datetime-local" value={editAfspraakStart} onChange={(e)=>setEditAfspraakStart(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                    if(!dossier) return; const dt = editAfspraakStart ? new Date(editAfspraakStart) : null; await updateDossierBewoner(dossier.id, b.id, { afspraakStart: dt });
                                  }} />
                                </div>
                                <div>
                                  <label htmlFor={`edit-afspraak-einde-${b.id}`} className="text-sm text-gray-700 dark:text-gray-300">Einddatum/tijd (optioneel)</label>
                                  <input id={`edit-afspraak-einde-${b.id}`} type="datetime-local" value={editAfspraakEinde} onChange={(e)=>setEditAfspraakEinde(e.target.value)} className="w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                    if(!dossier) return; const dt = editAfspraakEinde ? new Date(editAfspraakEinde) : null; await updateDossierBewoner(dossier.id, b.id, { afspraakEinde: dt });
                                  }} />
                                </div>
                              </div>
                              <div>
                                <label htmlFor={`edit-afspraak-notitie-${b.id}`} className="text-sm text-gray-700 dark:text-gray-300">Notitie over de gemaakte afspraak (bijv. onderwerp, locatie, contactpersoon)</label>
                                <textarea id={`edit-afspraak-notitie-${b.id}`} value={editAfspraakNotitie} onChange={(e)=>setEditAfspraakNotitie(e.target.value)} rows={2} className="mt-2 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white" onBlur={async ()=>{
                                  if(!dossier) return; await updateDossierBewoner(dossier.id, b.id, { afspraakNotitie: editAfspraakNotitie.trim() || undefined });
                                }} />
                              </div>
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
                                // Navigeer na opslaan direct naar het detailoverzicht van het dossier
                                navigate(`/dossier/${encodeURIComponent(dossier.id)}`);
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
                    <div className="md:col-span-2">
                      <label htmlFor="bewoner-naam" className="text-xs text-gray-600 dark:text-gray-300 block">Naam</label>
                      <input id="bewoner-naam" value={bewonerNaam} onChange={e=>setBewonerNaam(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <div>
                      <label htmlFor="bewoner-telefoon" className="text-xs text-gray-600 dark:text-gray-300 block">Telefoonnummer</label>
                      <input id="bewoner-telefoon" value={bewonerTelefoon} onChange={e=>{ setBewonerTelefoon(e.target.value); if (bewonerTelefoonError) setBewonerTelefoonError(null); }} onBlur={()=> setBewonerTelefoonError(isValidPhone(bewonerTelefoon) ? null : 'Voer een geldig telefoonnummer in')} className={`mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white ${bewonerTelefoonError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'}`} />
                      {bewonerTelefoonError && <span className="mt-1 block text-xs text-red-600">{bewonerTelefoonError}</span>}
                    </div>
                    <div>
                      <label htmlFor="bewoner-email" className="text-xs text-gray-600 dark:text-gray-300 block">Email</label>
                      <input id="bewoner-email" type="email" value={bewonerEmail} onChange={e=>{ setBewonerEmail(e.target.value); if (bewonerEmailError) setBewonerEmailError(null); }} onBlur={()=> setBewonerEmailError(isValidEmail(bewonerEmail) ? null : 'Voer een geldig e-mailadres in')} className={`mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white ${bewonerEmailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'}`} />
                      {bewonerEmailError && <span className="mt-1 block text-xs text-red-600">{bewonerEmailError}</span>}
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="bewoner-extra" className="text-xs text-gray-600 dark:text-gray-300 block">Extra info (optioneel)</label>
                      <input id="bewoner-extra" value={bewonerExtraInfo} onChange={e=>setBewonerExtraInfo(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button type="submit" disabled={bewonerToevoegenBusy} className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary disabled:opacity-60 disabled:cursor-not-allowed">{bewonerToevoegenBusy ? 'Toevoegen…' : 'Toevoegen'}</button>
                  </div>
                </form>
              </div>

              {/* Notities */}
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
                  <div>
                    <label htmlFor="new-note" className="sr-only">Nieuwe notitie</label>
                    <textarea
                      id="new-note"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 dark:text-white bg-white dark:bg-dark-surface mb-2"
                      rows={3}
                    />
                  </div>
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

              {/* Afspraken onder Notities */}
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
                    <div>
                      <label htmlFor="new-appt-start" className="text-sm text-gray-700 dark:text-gray-300">Startdatum/tijd</label>
                      <input
                        id="new-appt-start"
                        type="datetime-local"
                        value={newApptStart}
                        onChange={(e) => setNewApptStart(e.target.value)}
                        className="mt-1 px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="new-appt-end" className="text-sm text-gray-700 dark:text-gray-300">Einddatum/tijd (optioneel)</label>
                      <input
                        id="new-appt-end"
                        type="datetime-local"
                        value={newApptEnd}
                        onChange={(e) => setNewApptEnd(e.target.value)}
                        className="mt-1 px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="new-appt-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Omschrijving <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="new-appt-desc"
                        ref={descInputRef}
                        value={newApptDesc}
                        onChange={(e) => setNewApptDesc(e.target.value)}
                        onBlur={() => setNewApptDescTouched(true)}
                        required
                        onInvalid={(ev) => {
                          ev.preventDefault();
                          setNewApptDescTouched(true);
                        }}
                        aria-invalid={newApptDescTouched && !newApptDesc.trim()}
                        className={
                          `w-full px-3 py-2 border rounded bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 ` +
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

            {/* Rechterkolom: Documenten en onderaan Gerelateerde Meldingen */}
            <div className="space-y-6">
              <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Documenten</h2>
                <div className="max-h-60 overflow-y-auto pr-2">
                  {dossier.documenten && dossier.documenten.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {dossier.documenten.map((doc, idx) => {
                        const type = getType(doc.url);
                        const isImage = type === 'image';
                        const allUrls = dossier.documenten.map(x => x.url);
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => openPreview(allUrls, idx)}
                            className={`group text-left bg-gray-50 dark:bg-gray-700 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition ${isImage ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                            aria-label="Open document"
                          >
                            <div className="w-full mb-2">
                              {isImage ? (
                                <img src={doc.url} alt={doc.name} className="h-28 w-full object-cover rounded" />
                              ) : (
                                <div className="h-28 w-full rounded bg-gray-200 dark:bg-dark-border flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 px-2 text-center">
                                  {type === 'pdf' ? 'PDF' : type.startsWith('video') ? 'Video' : 'Bestand'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm text-brand-primary group-hover:underline" title={doc.name}>{doc.name}</div>
                              <div className="text-[11px] text-gray-500">{new Date(doc.uploadedAt).toLocaleString()}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Nog geen documenten.</p>
                  )}
                </div>
                <form className="mt-4" onSubmit={(e)=>e.preventDefault()}>
          <label className="block" htmlFor="upload-dossier-doc">
            <span className="sr-only">Upload document</span>
            <input id="upload-dossier-doc" type="file" accept="image/*,application/pdf,video/*" onChange={async (e) => {
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
              {/* Grote opvallende Opslaan dossier knop */}
              <div className="mt-8 flex justify-center">
                <button type="button" className="px-8 py-4 text-xl font-bold bg-brand-primary text-white rounded-lg shadow-lg hover:bg-brand-secondary transition-all" onClick={async () => {
                  if (!dossier) return;
                  // Hier kun je eventueel een updateDossier functie aanroepen als je die hebt
                  // Voor nu: navigeer naar het detailoverzicht
                  navigate(`/dossier/${encodeURIComponent(dossier.id)}`);
                }}>Opslaan dossier</button>
              </div>
            </div>
            {/* Overlay viewer voor documenten */}
            {previewItems && (
              <div
                  className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-4"
                  onClick={closePreview}
                  role="button"
                  aria-modal="true"
                  aria-label="Voorbeeld document"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Escape') closePreview(); }}
                >
                    <button
                      type="button"
                      onClick={closePreview}
                      className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2"
                      aria-label="Sluiten"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                {previewItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i - 1 + previewItems.length) % previewItems.length); }}
                      className="absolute left-4 md:left-6 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2"
                      aria-label="Vorige"
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => (i + 1) % previewItems.length); }}
                      className="absolute right-14 md:right-16 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2"
                      aria-label="Volgende"
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </button>
                  </>
                )}
                {renderInline(previewItems[previewIndex])}
              </div>
            )}
          </div>
        </>
      )}

      {!dossier && searchedAdres && (
        <p className="text-center text-gray-500 mt-8">Dossier voor &quot;{searchedAdres}&quot; wordt geladen of aangemaakt...</p>
      )}
    </div>
  );
};

export default DossierPage;
