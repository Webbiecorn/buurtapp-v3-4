import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DossierDocument, DossierNotitie, DossierAfspraak, WoningDossier } from '../types';
import { fetchDossierMeta, type DossierMeta } from '../services/dossierMeta';
import { XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '../components/Icons';

// Simple Leaflet map import; CSS is included in index.html
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const DossierDetailPage: React.FC = () => {
  const { adres: rawAdres } = useParams<{ adres: string }>();
  const adres = decodeURIComponent(rawAdres || '');
  const { getDossier } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<WoningDossier | null>(null);
  const [meta, setMeta] = useState<DossierMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const d = await getDossier(adres);
        if (!cancelled) setDossier(d);
        const m = await fetchDossierMeta(adres);
        if (!cancelled) setMeta(m);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (adres) run();
    return () => { cancelled = true; };
  }, [adres, getDossier]);

  if (!adres) {
    return <div className="p-4">Ongeldig adres.</div>;
  }

  if (loading) {
    return <div className="p-4">Dossier voor "{adres}" laden...</div>;
  }

  if (!dossier) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geen dossier gevonden</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Voor dit adres is nog geen dossier aangemaakt.</p>
        <Link to="/dossiers" className="inline-block mt-4 px-4 py-2 rounded bg-brand-primary text-white">Ga naar dossiers</Link>
      </div>
    );
  }

  const notes = dossier.notities || [] as DossierNotitie[];
  const docs = dossier.documenten || [] as DossierDocument[];
  const afspraken = (dossier.afspraken || []) as DossierAfspraak[];
  const bewoners = dossier.bewoners || [];

  const lat = dossier?.location?.lat ?? meta?.location?.lat;
  const lon = dossier?.location?.lon ?? meta?.location?.lon;

  // Inline viewer for documenten (image/pdf/video) met overlay en navigatie
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

  const openPreview = (items: string[], index: number) => {
    setPreviewItems(items);
    setPreviewIndex(index);
  };
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
    if (t === 'image') {
      return <img src={url} alt="Voorbeeld document" className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />;
    }
    if (t === 'video') {
      return (
        <video controls className="max-h-[85vh] max-w-[90vw] rounded shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
          <source src={url} />
          Je browser ondersteunt de video tag niet.
        </video>
      );
    }
    if (t === 'video-embed') {
      return (
        <iframe src={url} className="w-[90vw] h-[70vh] rounded shadow-2xl bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onClick={(e) => e.stopPropagation()} />
      );
    }
    if (t === 'pdf') {
      return (
        <iframe src={`${url}#toolbar=1`} className="w-[90vw] h-[90vh] rounded shadow-2xl bg-white" onClick={(e) => e.stopPropagation()} />
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center px-4 py-2 rounded bg-white text-gray-800 shadow">
        <DownloadIcon className="h-5 w-5 mr-2" /> Download document
      </a>
    );
  };

  return (
    <>
    <div className="p-4 max-w-6xl mx-auto space-y-6">
  <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{dossier.id}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
            <span>Status: <span className="font-semibold">{dossier.status}</span></span>
            <span>Labels: {dossier.labels.map(l => <span key={l} className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{l}</span>)}</span>
            {(dossier.woningType || meta?.woningType) && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">{dossier.woningType || meta?.woningType}</span>}
            {meta?.energieLabel && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">Label {meta.energieLabel}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/dossiers?adres=${encodeURIComponent(dossier.id)}`} className="px-3 py-2 rounded bg-brand-primary text-white">Bewerken</Link>
          <Link to="/dossiers" className="px-3 py-2 rounded bg-gray-600 text-white">Terug</Link>
        </div>
      </div>

      {typeof lat === 'number' && typeof lon === 'number' && (
        <div className="rounded-lg overflow-hidden shadow border border-gray-200 dark:border-gray-700">
          <MapContainer center={[lat, lon]} zoom={17} style={{ height: 320, width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Marker position={[lat, lon]}>
              <Popup>{dossier.id}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Bewoners</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {bewoners.length ? bewoners.map(b => (
              <div key={b.id} className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                <p className="font-semibold">{b.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{b.contact || '—'}</p>
                {b.extraInfo && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{b.extraInfo}</p>}
              </div>
            )) : <p className="text-gray-500">Geen bewonersinformatie.</p>}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Notities</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {notes.length ? notes.map(n => (
              <div key={n.id} className={`p-3 rounded ${n.isBelangrijk ? 'bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                <p>{n.text}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
              </div>
            )) : <p className="text-gray-500">Geen notities.</p>}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Documenten</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {docs.length ? docs.map((d, idx) => {
              const type = getType(d.url);
              const isImage = type === 'image';
              const allUrls = docs.map(x => x.url);
              return (
                <div key={d.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => openPreview(allUrls, idx)}
                      className={`flex-shrink-0 ${isImage ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                      aria-label="Open document"
                    >
                      {isImage ? (
                        <img src={d.url} alt={d.name} className="h-10 w-14 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-14 rounded bg-gray-200 dark:bg-dark-border flex items-center justify-center text-[10px] text-gray-700 dark:text-gray-200 px-1 text-center">
                          {type === 'pdf' ? 'PDF' : type.startsWith('video') ? 'Video' : 'Bestand'}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0">
                      <a className="text-brand-primary truncate block" href={d.url} target="_blank" rel="noreferrer" title={d.name}>{d.name}</a>
                      <span className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPreview(allUrls, idx)}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    Bekijken
                  </button>
                </div>
              );
            }) : <p className="text-gray-500">Geen documenten.</p>}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Afspraken</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {afspraken.length ? (
              afspraken
                .slice()
                .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                .map(a => (
                  <div key={a.id} className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(a.start).toLocaleString()} {a.end ? `— ${new Date(a.end).toLocaleString()}` : ''}
                    </p>
                    {a.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{a.description}</p>
                    )}
                    {a.bewonerNaam && (
                      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Bewoner: {a.bewonerNaam}</p>
                    )}
                  </div>
                ))
            ) : (
              <p className="text-gray-500">Geen afspraken.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  {/* Overlay viewer voor documenten */}
    {previewItems && (
      <div
        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-4"
        onClick={closePreview}
        role="dialog"
        aria-modal="true"
        aria-label="Voorbeeld document"
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
    </>
  );
};

export default DossierDetailPage;
