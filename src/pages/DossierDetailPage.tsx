import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DossierDocument, DossierNotitie, DossierTaak, WoningDossier } from '../types';
import { fetchDossierMeta, type DossierMeta } from '../services/dossierMeta';

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
  const taken = dossier.taken || [] as DossierTaak[];
  const bewoners = dossier.bewoners || [];

  const lat = dossier?.location?.lat ?? meta?.location?.lat;
  const lon = dossier?.location?.lon ?? meta?.location?.lon;

  return (
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
            {docs.length ? docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
                <a className="text-brand-primary" href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
                <span className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</span>
              </div>
            )) : <p className="text-gray-500">Geen documenten.</p>}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-dark-surface rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Taken</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-2">
            {taken.length ? taken.map(t => (
              <div key={t.id} className="p-2 rounded bg-gray-50 dark:bg-gray-700">
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
              </div>
            )) : <p className="text-gray-500">Geen taken.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DossierDetailPage;
