import React, { useEffect, useState } from "react";
import { getAchterpadStatusColor } from '../utils/statusColors';
import { useAppContext } from '../context/AppContext';
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAchterpaden } from '../services/firestoreHooks';
import AchterpadCard from '../components/AchterpadCard';
import AchterpadenStats from '../components/AchterpadenStats';
import { UserRole } from "../types";
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Polyline component voor route op kaart
const RoutePolyline: React.FC<{ 
  start: { lat: number; lng: number }; 
  end: { lat: number; lng: number }; 
  color?: string 
}> = ({ start, end, color = '#3B82F6' }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !window.google) return;
    
    const polyline = new window.google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: map
    });
    
    return () => {
      polyline.setMap(null);
    };
  }, [map, start, end, color]);
  
  return null;
};

// Using shared statusColors utility

// Modal component voor bewerken van achterpad
type EditAchterpadModalProps = {
  selected: any;
  onClose: () => void;
  onUpdate: (updated: any) => void;
};

type Pad = {
  naam: string;
  huisnummers?: string;
};

const EditAchterpadModal: React.FC<EditAchterpadModalProps> = ({ selected, onClose, onUpdate }) => {
  const { currentUser, uploadFile } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPadBox, setShowPadBox] = useState(false);
  const [pads, setPads] = useState<Pad[]>(selected.paden || []);
  const [padNaam, setPadNaam] = useState("");
  const [padHuisnummers, setPadHuisnummers] = useState("");
  // media uploads are handled via updates only
  // Updates similar to project contributions
  const [updateText, setUpdateText] = useState("");
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);
  
  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleAddPad = () => {
    if (padNaam) {
      setPads([...pads, { naam: padNaam, huisnummers: padHuisnummers }]);
      setPadNaam("");
      setPadHuisnummers("");
    }
  };

  const handleRemovePad = (idx: number) => {
    setPads(pads.filter((_: Pad, i: number) => i !== idx));
  };

  // removed: main media upload handled in updates

  const handleUpdateFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUpdateFiles(Array.from(e.target.files));
  };

  const handleRemoveSelectedFile = (idx: number) => {
    setUpdateFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddUpdate = async () => {
    if (!currentUser) {
      setError('Geen ingelogde gebruiker');
      return;
    }
    if (!updateText && updateFiles.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const attachments: string[] = [];
      for (const file of updateFiles) {
        // use uploadFile helper from context to store in storage
        const path = `achterpaden/${selected.id}/updates/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        attachments.push(url);
      }
      const updateObj = {
        id: `update-${Date.now()}`,
        text: updateText,
        attachments,
        timestamp: new Date(),
        userId: currentUser.id,
      };
      await updateDoc(doc(db, 'achterpaden', selected.id), {
        updates: arrayUnion(updateObj),
        // voeg attachments ook toe aan de hoofd-media lijst zodat ze overal zichtbaar zijn
        ...(attachments.length > 0 ? { media: arrayUnion(...attachments) } : {}),
      });
      // call parent to refresh
      onUpdate({
        ...selected,
        updates: [...(selected.updates || []), updateObj],
        media: [...(selected.media || []), ...attachments],
      });
      setUpdateText("");
      setUpdateFiles([]);
    } catch (e) {
      // Add update failed
      setError('Toevoegen update mislukt');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError("");
    try {
      // Update only pads on main submit; media/attachments handled through updates
      await updateDoc(doc(db, "achterpaden", selected.id), {
        paden: pads,
      });
      onUpdate({ ...selected, paden: pads });
      setTimeout(() => onClose(), 100);
    } catch {
      setError("Opslaan mislukt");
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-auto py-10" onClick={(_e) => { if (_e.target === _e.currentTarget) onClose(); }} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="button">
      <div className="bg-white dark:bg-dark-bg p-6 rounded-xl shadow-xl w-full max-w-2xl" onClick={(_e) => _e.stopPropagation()} tabIndex={0} role="button">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Bewerk Achterpad</h2>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded" onClick={onClose}>Sluiten</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Paden beheren */}
            <section>
              <h3 className="font-semibold mb-2">Paden</h3>
              <label className="flex items-center gap-2 font-medium mb-2" htmlFor="show-pad-checkbox">
                <input id="show-pad-checkbox" type="checkbox" checked={showPadBox} onChange={e => setShowPadBox(e.target.checked)} />
                Pad toevoegen
              </label>
              {showPadBox && (
                <div className="space-y-4">
                  <div className="space-y-3">
                      <label htmlFor="pad-naam" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Padnaam</label>
                      <input
                        id="pad-naam"
                        type="text"
                        value={padNaam}
                        onChange={e => setPadNaam(e.target.value)}
                        className="border rounded p-2 w-full"
                      />

                      <label htmlFor="pad-huisnummers" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Huisnummers</label>
                      <input
                        id="pad-huisnummers"
                        type="text"
                        value={padHuisnummers}
                        onChange={e => setPadHuisnummers(e.target.value)}
                        className="border rounded p-2 w-full"
                      />

                    <div className="flex justify-end">
                      <button type="button" className="px-3 py-1 bg-brand-primary text-white rounded" onClick={handleAddPad}>Toevoegen</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pads.map((pad: Pad, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-dark-border px-2 py-1 rounded">
                        <div className="text-sm">{pad.naam} <span className="text-xs text-gray-500">({pad.huisnummers})</span></div>
                        <button type="button" className="text-red-600 text-lg leading-none" onClick={() => handleRemovePad(idx)}>&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
                Huidige paden worden opgeslagen bij Opslaan. Media voeg je toe via Updates.
              </div>
            </section>

            {/* Right column: Updates en bijlagen */}
            <section>
              <h3 className="font-semibold mb-2">Updates & Bijlagen</h3>
              <div className="space-y-2">
                <label htmlFor="update-text" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Nieuwe update</label>
                <textarea id="update-text" value={updateText} onChange={e => setUpdateText(e.target.value)} className="border rounded w-full p-3 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border h-28" />
                  <div>
                  <label htmlFor="update-files" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen</label>
                  <input id="update-files" type="file" accept="image/*,video/*" multiple onChange={handleUpdateFilesChange} className="mt-1" />
                </div>
              </div>
              {updateFiles.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {updateFiles.map((f, idx) => {
                    const url = URL.createObjectURL(f);
                    const isImage = /(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                    return (
                      <div key={idx} className="relative">
                        {isImage ? (
                          <img src={url} className="h-20 w-20 object-cover rounded" alt={f.name} />
                        ) : (
                          <div className="h-20 w-20 bg-gray-100 dark:bg-dark-border rounded flex items-center justify-center text-sm px-2">{f.name}</div>
                        )}
                        <button type="button" className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow" onClick={() => handleRemoveSelectedFile(idx)}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddUpdate} disabled={uploading || (!updateText && updateFiles.length === 0)}>{uploading ? 'Toevoegen...' : 'Voeg update toe'}</button>
              </div>

              {/* Existing updates preview */}
              <div className="mt-4">
                <div className="font-medium mb-2">Vorige updates</div>
                <div className="space-y-2 max-h-56 overflow-auto p-2 bg-gray-50 dark:bg-dark-surface rounded">
                  {(selected.updates || []).slice().reverse().map((u: any) => (
                    <div key={u.id} className="p-2 bg-white dark:bg-dark-bg rounded border border-gray-100 dark:border-dark-border">
                      <div className="text-sm text-gray-700 dark:text-dark-text-secondary">{u.text}</div>
                      {u.attachments && u.attachments.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {u.attachments.map((att: string, idx: number) => (
                            att.match(/\.(jpg|jpeg|png|gif|webp)$/i) || att.includes('alt=media') || att.includes('/v0/b/') ? (
                              <img key={idx} src={att} alt={`Bijlage ${idx + 1}`} className="h-16 w-16 object-cover rounded" />
                            ) : (
                              <video key={idx} controls aria-label={`Bijlage video ${idx + 1}`} className="h-16 w-16 rounded"><source src={att} /><track kind="captions" src="" /></video>
                            )
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">{u.timestamp ? (u.timestamp.seconds ? new Date(u.timestamp.seconds * 1000).toLocaleString() : new Date(u.timestamp).toLocaleString()) : ''} — {(window as any).__app_users__?.find((x: any) => x.id === u.userId)?.name || u.userId}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {error && <div className="text-red-600 mb-2 text-sm">{error}</div>}

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="px-4 py-2 bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-white rounded" onClick={onClose}>Annuleren</button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow transition flex items-center gap-2"
            >
              {uploading && <span className="loader border-t-2 border-b-2 border-white rounded-full w-4 h-4 animate-spin"></span>}
              {uploading ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AchterpadenOverzicht: React.FC<{ showStats?: boolean }> = ({ showStats }) => {
  // Verwijderd: oude edit modal state
  const { data: registraties, loading } = useAchterpaden();
  const [selected, setSelected] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState<string | null>(null);
  const [previewIsImage, setPreviewIsImage] = useState(true);
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);

  const getFilename = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      return decodeURIComponent(last.split('?')[0]);
    } catch {
      return '';
    }
  };
  const { users, currentUser } = useAppContext();
  const [tab, setTab] = React.useState<'overview' | 'stats'>(showStats ? 'stats' : 'overview');

  // allow parent to force stats view
  useEffect(() => {
    if (showStats) setTab('stats');
  }, [showStats]);

  useEffect(() => {
    try {
      (window as any).__app_users__ = users || [];
    } catch {
      // ignore
    }
  }, [users]);

  // Diagnostic: log media arrays when a selection changes to help debug demo/placeholder images
  useEffect(() => {
    if (!selected) return;
    try {
      // Achterpaden media logging for debugging
      // raw media (from Firestore):', selected.media
      // filtered media (rendered):', (selected.media || []).filter((url: string) => (url.startsWith("https://") || url.startsWith("http://127.0.0.1:9201/")) && !url.includes("demo") && !url.includes("placeholder"))
    } catch (_e) {
      // Error logging media for selected item
    }
  }, [selected]);

  // small animation trigger when selected changes
  useEffect(() => {
    if (!selected) {
      setDetailVisible(false);
      return;
    }
    setDetailVisible(false);
    const t = setTimeout(() => setDetailVisible(true), 20);
    return () => clearTimeout(t);
  }, [selected]);

  const openPreview = (url: string, caption?: string) => {
    setPreviewItem(url);
    setPreviewCaption(caption || '');
    setPreviewIsImage(/\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('alt=media') || url.includes('/v0/b/'));
    setPreviewClosing(false);
    setPreviewOpen(true);
    setPreviewAnimating(false);
    // allow DOM to mount then trigger animation
    setTimeout(() => setPreviewAnimating(true), 20);
  };
  const closePreview = () => {
    // trigger exit animation then unmount
    setPreviewClosing(true);
    setPreviewAnimating(false);
    setTimeout(() => {
      setPreviewOpen(false);
      setPreviewItem(null);
      setPreviewCaption(null);
      setPreviewClosing(false);
    }, 220);
  };

  // Data loading handled by useAchterpaden hook

  // formatUpdateInfo removed; badge info is now in AchterpadCard component

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Laden...</div>;
  }

  return (
  <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl">
    <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary leading-tight">Overzicht Achterpaden Registraties</h1>
    {selected ? (
  <div className={`relative p-6 bg-white dark:bg-dark-bg rounded-xl shadow border border-gray-200 dark:border-dark-border grid grid-cols-1 lg:grid-cols-3 gap-6 items-start transition-all duration-300 ${detailVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {/* Knoppen rechtsboven */}
        <div className="absolute top-4 right-4 flex gap-2 items-center">
          <button className="px-3 py-1 bg-gray-200 dark:bg-dark-border rounded text-sm" onClick={() => setSelected(null)}>Terug</button>
          {(currentUser?.role === UserRole.Beheerder || currentUser?.role === UserRole.Concierge) && (
            <button className="px-3 py-1 bg-brand-primary text-white rounded text-sm" onClick={() => setShowEdit(true)}>Bewerken</button>
          )}
        </div>
        {tab === 'stats' ? (
          <div className="lg:col-span-3 w-full">
            <AchterpadenStats registraties={registraties} />
          </div>
        ) : (
          <>
        <div className="mb-4 lg:col-span-2">
          <div className="text-sm text-gray-700 dark:text-dark-text-secondary">
            <div><span className="font-semibold text-brand-primary">Straat:</span> {selected.straat}</div>
            <div><span className="font-semibold text-brand-primary">Wijk:</span> {selected.wijk}</div>
          </div>
        </div>
        {selected.paden && Array.isArray(selected.paden) && selected.paden.length > 0 && (
          <div className="mb-4 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Paden</h2>
            <div className="space-y-2">
              {selected.paden.map((pad: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-4 items-center">
                  <div><span className="font-medium">{pad.naam}:</span></div>
                  <div><span className="text-gray-700 dark:text-dark-text-secondary">Huisnummers:</span> {pad.huisnummers}</div>
                </div>
              ))}
            </div>
          </div>
        )}
  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
          <div><span className="font-semibold text-brand-primary">Beschrijving:</span> {selected.beschrijving}</div>
          <div><span className="font-semibold text-brand-primary">Type pad:</span> {selected.typePad}</div>
          <div><span className="font-semibold text-brand-primary">Lengte:</span> {selected.lengte} m</div>
          <div><span className="font-semibold text-brand-primary">Breedte:</span> {selected.breedte} m</div>
          <div><span className="font-semibold text-brand-primary">Eigendom:</span> {selected.eigendom === 'huur' ? 'Huur' : selected.eigendom === 'particulier' ? 'Particulier' : selected.eigendom === 'huur_en_particulier' ? 'Huur en Particulier' : (selected.eigendom || '-')}</div>
          <div><span className="font-semibold text-brand-primary">Toegankelijk:</span> {selected.toegankelijk}</div>
          <div><span className="font-semibold text-brand-primary">Staat:</span> {selected.staat}</div>
          <div className="md:col-span-2"><span className="font-semibold text-brand-primary">Obstakels:</span> {selected.obstakels}</div>
          {selected.extraInfo && (
            <div className="md:col-span-2 p-3 bg-gray-50 dark:bg-dark-surface rounded mt-2 shadow-sm">
              <span className="font-semibold text-brand-primary">Extra info:</span> {selected.extraInfo}
            </div>
          )}
        </div>
        {(() => {
          const updateMedia = (selected.updates || []).flatMap((u: any) => Array.isArray(u.attachments) ? u.attachments : []);
          const baseMedia = Array.isArray(selected.media) ? selected.media : [];
          // unieke lijst, zodat dubbele URLs niet herhaald worden
          const mediaCombined = Array.from(new Set([...baseMedia, ...updateMedia]));
          return mediaCombined.length > 0 ? (
          <div className="mt-4 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Media</h2>
            <div className="flex flex-wrap gap-3">
              {mediaCombined
                .filter((url: string) => (url.startsWith("https://") || url.startsWith("http://127.0.0.1:9201/")) && !url.includes("demo") && !url.includes("placeholder"))
                    .map((url: string, idx: number) => {
                  const looksLikeImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                    || url.includes('alt=media')
                    || url.includes('/v0/b/')
                    || url.includes('firebasestorage.googleapis.com')
                    || url.includes('storage.googleapis.com');
                    if (looksLikeImage) {
                      return (
                        <img
                          key={idx}
                          src={url}
                          alt={getFilename(url) || `media-${idx + 1}`}
                          className="h-24 w-24 object-cover rounded border border-gray-200 dark:border-dark-border cursor-pointer hover:scale-105 transform transition duration-150"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') { try {
                              const media = mediaCombined.filter((u: string) => (u.startsWith('https://') || u.startsWith('http://127.0.0.1:9201/')) && !u.includes('demo') && !u.includes('placeholder'));
                              const captions = media.map((m: string) => {
                                const found = (selected.updates || []).find((up: any) => Array.isArray(up.attachments) && up.attachments.includes(m));
                                if (found) return found.text || getFilename(m);
                                return getFilename(m);
                              });
                              const caption = captions[idx] || getFilename(url);
                              openPreview(url, caption);
                            } catch { openPreview(url, getFilename(url)); } } }}
                          onClick={() => {
                            try {
                              const media = mediaCombined.filter((u: string) => (u.startsWith('https://') || u.startsWith('http://127.0.0.1:9201/')) && !u.includes('demo') && !u.includes('placeholder'));
                              const captions = media.map((m: string) => {
                                const found = (selected.updates || []).find((up: any) => Array.isArray(up.attachments) && up.attachments.includes(m));
                                if (found) return found.text || getFilename(m);
                                return getFilename(m);
                              });
                              const caption = captions[idx] || getFilename(url);
                              openPreview(url, caption);
                            } catch {
                              openPreview(url, getFilename(url));
                            }
                          }}
                        />
                      );
                    }
                  return (
                    <video key={idx} controls aria-label={`Media video ${idx + 1}`} className="h-24 w-24 rounded border border-gray-200 dark:border-dark-border">
                      <source src={url} />
                      <track kind="captions" src="" />
                    </video>
                  );
                })}
            </div>
          </div>
        ) : null; })()}
        {/* inline preview overlay */}
        {previewOpen && previewItem && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${previewAnimating && !previewClosing ? 'opacity-100' : 'opacity-0'}`} onClick={() => closePreview()} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') closePreview(); }} role="button">
            <div className={`absolute inset-0 bg-black/60 transition-opacity ${previewAnimating && !previewClosing ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`relative bg-white dark:bg-dark-bg rounded shadow-lg max-w-[90vw] max-h-[90vh] overflow-auto transform transition-all duration-200 ${previewAnimating && !previewClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={(e) => e.stopPropagation()} tabIndex={0} role="button">
              <div className="p-4">
                <div className="mb-2 text-sm text-gray-600 dark:text-dark-text-secondary">{previewCaption}</div>
                          {previewIsImage ? (
                  <img src={previewItem as string} alt={previewCaption || 'Preview afbeelding'} className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <video controls aria-label={previewCaption || 'Preview video'} className="max-w-full max-h-[70vh]" src={previewItem as string}><track kind="captions" src="" /></video>
                )}
                <div className="mt-3 text-right">
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => closePreview()}>Sluiten</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {selected.updates && Array.isArray(selected.updates) && selected.updates.length > 0 && (
          <div className="mt-4 lg:col-span-3">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Updates</h2>
            <div className="space-y-3">
                {selected.updates.slice().reverse().map((u: any) => {
                const author = (window as any).__app_users__?.find((x: any) => x.id === u.userId) || null;
                return (
                  <div key={u.id} className="p-3 bg-gray-50 dark:bg-dark-surface rounded hover:shadow transition">
                    <div className="text-sm text-gray-700 dark:text-dark-text-secondary">{u.text}</div>
                      {u.attachments && u.attachments.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {u.attachments.map((att: string, idx: number) => {
                            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(att) || att.includes('alt=media') || att.includes('/v0/b/');
                            if (isImg) {
                              return (
                                <img key={idx} src={att} alt={getFilename(att) || `Bijlage ${idx + 1}`} className="h-16 w-16 object-cover rounded cursor-pointer" role="button" tabIndex={0} />
                              );
                            }
                            return (
                              <video key={idx} controls aria-label={`Bijlage video ${idx + 1}`} className="h-16 w-16 rounded"><source src={att} /><track kind="captions" src="" /></video>
                            );
                          })}
                        </div>
                      )}
                    <div className="mt-2 text-xs text-gray-500">{u.timestamp ? (u.timestamp.seconds ? new Date(u.timestamp.seconds * 1000).toLocaleString() : new Date(u.timestamp).toLocaleString()) : ''} — {author ? author.name : u.userId}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {selected.createdAt && (
          <div className="mt-4 text-xs text-gray-500 dark:text-dark-text-secondary">Registratie: {selected.createdAt.seconds ? new Date(selected.createdAt.seconds * 1000).toLocaleString() : ""}</div>
        )}
        </>
        )}
        {/* Bewerken modal (placeholder) */}
        {showEdit && (
          <EditAchterpadModal
            selected={selected}
            onClose={() => setShowEdit(false)}
            onUpdate={async updated => {
              // Na update: haal de nieuwste data uit Firestore
              const snap = await getDoc(doc(db, "achterpaden", updated.id));
              if (snap.exists()) {
                setSelected({ id: updated.id, ...snap.data() });
                setRegistraties(registraties => registraties.map(r => r.id === updated.id ? { id: updated.id, ...snap.data() } : r));
              } else {
                setSelected(updated);
                setRegistraties(registraties => registraties.map(r => r.id === updated.id ? updated : r));
              }
            }}
          />
        )}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {registraties.length === 0 ? (
          <div className="text-gray-500">Geen registraties gevonden.</div>
        ) : (
          registraties.map((r: any) => (
            <div key={r.id}>
              <AchterpadCard registratie={r} onSelect={(reg: any) => setSelected(reg)} />
            </div>
          ))
        )}
      </div>
    )}
  </div>
  );
};

export default AchterpadenOverzicht;
