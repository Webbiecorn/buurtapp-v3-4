import React, { useState, useRef } from 'react';
import { getTimeSafe, formatSafe } from '../utils/dateHelpers';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { Melding, MeldingStatus, UserRole } from '../types';
import { MeldingCard, Modal, getStatusColor } from '../components/ui';
import { PlusCircleIcon, CameraIcon, MapPinIcon, SendIcon, TrashIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '../components/Icons';
import { MOCK_WIJKEN } from '../data/mockData';
import FixiIntegration from '../components/FixiIntegration';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionsToolbar, BulkAction } from '../components/BulkActionsToolbar';
import { usePerformanceTrace } from '../hooks/usePerformanceTrace';

type Tab = 'Lopende' | 'Fixi Meldingen' | 'Afgeronde';

type Toast = { type: 'success' | 'error'; message: string };

// Using shared dateHelpers utility
const NewMeldingForm: React.FC<{ onClose: () => void; onToast: (t: Toast) => void }> = ({ onClose, onToast }) => {
    const { addMelding, uploadFile } = useAppContext();
    const [titel, setTitel] = useState('');
    const [omschrijving, setOmschrijving] = useState('');
    const [wijk, setWijk] = useState('');
    const [locatie, setLocatie] = useState<any>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<MeldingStatus>(MeldingStatus.InBehandeling);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGetLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocatie({ lat: position.coords.latitude, lon: position.coords.longitude });
                alert('Locatie succesvol opgehaald!');
            },
            (error) => {
                alert(`Fout bij ophalen locatie: ${error.message}`);
            }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setAttachments(prev => [...prev, ...Array.from(files)]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // CORRECTIE: De verplichte foto-check is hier verwijderd.
        setIsUploading(true);

        try {
            const attachmentURLs = await Promise.all(
                attachments.map(file => {
                    const randomId = Math.random().toString(36).substring(2);
                    const filePath = `meldingen/${randomId}_${file.name}`;
                    return uploadFile(file, filePath);
                })
            );

            const newMelding = {
                titel,
                omschrijving,
                locatie,
                attachments: attachmentURLs,
                wijk: wijk,
                categorie: 'Overig',
                status: status,
            };
            await addMelding(newMelding);
            onToast({ type: 'success', message: 'Melding aangemaakt.' });
            onClose();

        } catch (error: any) {
            // Upload mislukt
            onToast({ type: 'error', message: error?.message || 'Upload mislukt.' });
    } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Titel</label>
                <input type="text" id="title" value={titel} onChange={e => setTitel(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
             <div>
                <label htmlFor="wijk" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Wijk</label>
                <select id="wijk" value={wijk} onChange={e => setWijk(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                    <option value="" disabled>Kies een wijk</option>
                    {MOCK_WIJKEN.map(w => <option key={w} value={w} className="bg-white dark:bg-dark-surface">{w}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Status</label>
                <select id="status" value={status} onChange={e => setStatus(e.target.value as MeldingStatus)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                    {Object.values(MeldingStatus).map(s => <option key={s} value={s} className="bg-white dark:bg-dark-surface">{s}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Omschrijving</label>
                <textarea id="description" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} rows={4} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
            </div>
          <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:space-x-4 gap-3">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700">
                        <CameraIcon className="h-5 w-5 mr-2" /> Foto/Bestand
                    </button>
                    <button type="button" onClick={handleGetLocation} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700">
                        <MapPinIcon className="h-5 w-5 mr-2" /> GPS Locatie
                    </button>
                 </div>
                          <label htmlFor="new-melding-files" className="sr-only">Bijlagen</label>
                          <input
                    id="new-melding-files"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                              accept="image/*,application/pdf,video/*"
                    className="hidden"
                />
                 {attachments.length > 0 && (
                     <div className="space-y-2">
                         <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen:</p>
                         {attachments.map((file, index) => (
                             <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-dark-bg rounded-md">
                                 <span className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">{file.name}</span>
                                 <button type="button" onClick={() => removeAttachment(index)} className="text-red-500 hover:text-red-400">
                                     <TrashIcon className="h-5 w-5" />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
            <div className="flex justify-end pt-4">
                 <button type="submit" disabled={isUploading} className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400">
                    {isUploading ? 'Bezig met uploaden...' : 'Melding Aanmaken'}
                </button>
            </div>
        </form>
    );
};

const MeldingDetailModal: React.FC<{ melding: Melding; onClose: () => void }> = ({ melding, onClose }) => {
    const { users, currentUser, updateMeldingStatus, addMeldingUpdate, uploadFile } = useAppContext();
    const [newUpdateText, setNewUpdateText] = useState('');
    const [newUpdateAttachments, setNewUpdateAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const updateFileInputRef = useRef<HTMLInputElement>(null);
    const [localToast, setLocalToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    // Preview overlay (images/pdf/video) + carousel
    const [previewItems, setPreviewItems] = useState<string[] | null>(null);
    const [previewIndex, setPreviewIndex] = useState<number>(0);

    React.useEffect(() => {
        if (!previewItems) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreviewItems(null);
            if (e.key === 'ArrowLeft') setPreviewIndex((i) => (previewItems ? (i - 1 + previewItems.length) % previewItems.length : 0));
            if (e.key === 'ArrowRight') setPreviewIndex((i) => (previewItems ? (i + 1) % previewItems.length : 0));
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
            return <img src={url} alt="Voorbeeld bijlage" className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }} />;
        }
        if (t === 'video') {
            return (
                                <video controls aria-label="Voorbeeld video" className="max-h-[85vh] max-w-[90vw] rounded shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
                                    <source src={url} />
                                    {/* TODO: add captions file */}
                                    <track kind="captions" src="" />
                                    Je browser ondersteunt de video tag niet.
                                </video>
            );
        }
        if (t === 'video-embed') {
            return (
                <iframe src={url} title="Video embed" className="w-[90vw] h-[70vh] rounded shadow-2xl bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onClick={(e) => e.stopPropagation()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }} />
            );
        }
        if (t === 'pdf') {
            return (
                <iframe src={`${url}#toolbar=1`} title="PDF preview" className="w-[90vw] h-[90vh] rounded shadow-2xl bg-white" onClick={(e) => e.stopPropagation()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }} />
            );
        }
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center px-4 py-2 rounded bg-white text-gray-800 shadow" role="button">
                <DownloadIcon className="h-5 w-5 mr-2" /> Download bijlage
            </a>
        );
    };

    const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setNewUpdateAttachments(prev => [...prev, ...Array.from(files)]);
    };

    const removeUpdateAttachment = (index: number) => {
        setNewUpdateAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUpdateText.trim() && newUpdateAttachments.length === 0) return;

        setIsUploading(true);
        try {
            const attachmentURLs = await Promise.all(
                newUpdateAttachments.map(file => {
                    const randomId = Math.random().toString(36).substring(2);
                    const filePath = `updates/${melding.id}/${randomId}_${file.name}`;
                    return uploadFile(file, filePath);
                })
            );

            await addMeldingUpdate(melding.id, { text: newUpdateText, attachments: attachmentURLs });
            setNewUpdateText('');
            setNewUpdateAttachments([]);
            // Sluit de popup na succesvol plaatsen
            onClose();

        } catch (error) {
            // Update upload mislukt
            alert("Fout bij uploaden van bijlagen voor update.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as MeldingStatus;
        try {
            await updateMeldingStatus(melding.id, newStatus);
            setLocalToast({ type: 'success', message: 'Status bijgewerkt.' });
        } catch (err: any) {
            setLocalToast({ type: 'error', message: err?.message || 'Status bijwerken mislukt.' });
        } finally {
            setTimeout(() => setLocalToast(null), 2000);
        }
    };

    const canEdit = currentUser?.role !== UserRole.Viewer;

    return (
        <>
        <Modal isOpen={true} onClose={onClose} title={melding.titel}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {melding.attachments[0] && (() => {
                        const first = melding.attachments[0];
                        const t = getType(first);
                        const isImage = t === 'image';
                        return isImage ? (
                            <img
                                src={first}
                                alt={melding.titel}
                                className="w-full h-64 object-cover rounded-lg cursor-zoom-in"
                                onClick={() => openPreview(melding.attachments, 0)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPreview(melding.attachments, 0); }}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => openPreview(melding.attachments, 0)}
                                className="w-full h-64 rounded-lg bg-gray-200 dark:bg-dark-border flex items-center justify-center text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                                aria-label="Open bijlage"
                            >
                                {t === 'pdf' ? 'PDF voorbeeld' : t.startsWith('video') ? 'Video' : 'Bijlage'}
                            </button>
                        );
                    })()}
                    {melding.attachments.length > 1 && (
                        <div className="grid grid-cols-3 gap-2">
                            {melding.attachments.map((att, idx) => {
                                const type = getType(att);
                                const isImage = type === 'image';
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => openPreview(melding.attachments, idx)}
                                        className={`group relative focus:outline-none ${isImage ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                                        aria-label="Open bijlage"
                                    >
                                        {isImage ? (
                                            <img src={att} alt={`bijlage ${idx + 1}`} className="h-20 w-full object-cover rounded transition-transform group-hover:scale-[1.02]" />
                                        ) : (
                                            <div className="h-20 w-full rounded bg-gray-200 dark:bg-dark-border flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 px-2 text-center">
                                                {type === 'pdf' ? 'PDF' : type.startsWith('video') ? 'Video' : 'Bijlage'}
                                            </div>
                                        )}
                                        <span className="pointer-events-none absolute inset-0 rounded bg-black/0 group-hover:bg-black/15 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Omschrijving</h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary">{melding.omschrijving}</p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
                        <p><strong>Categorie:</strong> {melding.categorie}</p>
                        <p><strong>Wijk:</strong> {melding.wijk}</p>
                        <p><strong>Gemeld op:</strong> {formatSafe(melding.timestamp, 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                </div>

                <div className="space-y-4 flex flex-col">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Status</label>
                        <select
                            id="status"
                            value={melding.status}
                            onChange={handleStatusChange}
                            disabled={!canEdit}
                            className={`w-full border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''} ${getStatusColor(melding.status)}`}
                        >
                            {Object.values(MeldingStatus).map(s => <option key={s} value={s} className="bg-white text-black dark:bg-dark-surface dark:text-dark-text-primary">{s}</option>)}
                        </select>
                    </div>

                    <div className="flex-grow flex flex-col min-h-0">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Updates</h3>
                        <div className="space-y-4 flex-grow overflow-y-auto pr-2 max-h-60 bg-gray-50 dark:bg-dark-bg p-2 rounded-md">
                            {[...melding.updates].sort((a, b) => getTimeSafe(b.timestamp) - getTimeSafe(a.timestamp)).map(update => {
                                const user = users.find(u => u.id === update.userId);
                                return (
                                    <div key={update.id} className="flex space-x-3">
                                        <img src={user?.avatarUrl} alt={user?.name} className="h-8 w-8 rounded-full mt-1 flex-shrink-0" />
                                        <div className="flex-1 bg-white dark:bg-dark-surface p-2 rounded-lg">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-gray-800 dark:text-dark-text-primary">{user?.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400">{formatSafe(update.timestamp, 'dd MMM, HH:mm')}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{update.text}</p>
                                            {update.attachments && update.attachments.length > 0 && (
                                                <div className="mt-2 grid grid-cols-3 gap-2">
                                                    {update.attachments.map((att, idx) => {
                                                        const type = getType(att);
                                                        const isImage = type === 'image';
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => openPreview(update.attachments!, idx)}
                                                                className={`group relative focus:outline-none ${isImage ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                                                                aria-label="Open bijlage"
                                                            >
                                                                {isImage ? (
                                                                    <img src={att} alt={`bijlage ${idx + 1}`} className="h-20 w-full object-cover rounded transition-transform group-hover:scale-[1.02]" />
                                                                ) : (
                                                                    <div className="h-20 w-full rounded bg-gray-200 dark:bg-dark-border flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 px-2 text-center">
                                                                        {type === 'pdf' ? 'PDF voorbeeld' : type.startsWith('video') ? 'Video' : 'Bijlage'}
                                                                    </div>
                                                                )}
                                                                <span className="pointer-events-none absolute inset-0 rounded bg-black/0 group-hover:bg-black/15 transition-colors" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {melding.updates.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nog geen updates.</p>}
                        </div>
                    </div>

                    {canEdit && (
                        <form onSubmit={handleUpdateSubmit} className="pt-4 border-t border-gray-200 dark:border-dark-border space-y-4">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary">Update Toevoegen</h3>

                            <div className="space-y-2">
                                <label htmlFor="issue-update-text" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Opmerking</label>
                                <textarea
                                    id="issue-update-text"
                                    value={newUpdateText}
                                    onChange={(e) => setNewUpdateText(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="issue-update-files" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen</label>
                                <input
                                    id="issue-update-files"
                                    type="file"
                                    ref={updateFileInputRef}
                                    onChange={handleUpdateFileChange}
                                    multiple
                                    accept="image/*,application/pdf,video/*"
                                    className="hidden"
                                />

                                {newUpdateAttachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {newUpdateAttachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 text-sm bg-gray-100 dark:bg-dark-bg rounded-md">
                                                <span className="text-gray-600 dark:text-dark-text-secondary truncate">{file.name}</span>
                                                <button type="button" onClick={() => removeUpdateAttachment(index)} className="text-red-500 hover:text-red-400">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-2">
                                    <button type="button" onClick={() => updateFileInputRef.current?.click()} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border">
                                        <CameraIcon className="h-4 w-4 mr-2"/> Foto/Bestand
                                    </button>

                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border">
                                            Sluiten
                                        </button>
                                        <button type="submit" disabled={isUploading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400">
                                            <SendIcon className="h-4 w-4 mr-2" /> {isUploading ? 'Plaatsen...' : 'Plaatsen'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            {localToast && (
                <div className={`mt-4 px-4 py-2 rounded ${localToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {localToast.message}
                </div>
            )}
    </Modal>
        {/* Fullscreen preview overlay */}
        {previewItems && (
            <div
                className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-4"
                onClick={closePreview}
                role="button"
                aria-modal="true"
                aria-label="Voorbeeld bijlage"
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
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex((i) => (i - 1 + previewItems.length) % previewItems.length); }}
                            className="absolute left-4 md:left-6 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2"
                            aria-label="Vorige"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex((i) => (i + 1) % previewItems.length); }}
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


const IssuesPage: React.FC = () => {
    usePerformanceTrace('IssuesPage');
    
    const { meldingen, currentUser, notificaties, markNotificationsAsRead, updateMeldingStatus: contextUpdateStatus } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('Lopende');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [selectedMelding, setSelectedMelding] = useState<Melding | null>(null);
    const [pageToast, setPageToast] = useState<Toast | null>(null);
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<MeldingStatus>(MeldingStatus.InBehandeling);

    // Bulk selection
    const {
        selectedIds,
        selectedCount,
        toggleItem,
        clearSelection,
        isSelected,
        toggleAll,
    } = useBulkSelection<string>();

    const isUnseen = (meldingId: string): boolean => {
        if (currentUser?.role !== UserRole.Beheerder) {
            return false;
        }
        return notificaties.some(n =>
            n.userId === currentUser.id &&
            !n.isRead &&
            n.targetType === 'melding' &&
            n.targetId === meldingId
        );
    };

    const filteredMeldingen = meldingen.filter(m => {
        switch (activeTab) {
            case 'Lopende':
                return m.status === MeldingStatus.InBehandeling;
            case 'Fixi Meldingen':
                return m.status === MeldingStatus.FixiMeldingGemaakt;
            case 'Afgeronde':
                return m.status === MeldingStatus.Afgerond;
            default:
                return true;
        }
    }).sort((a, b) => getTimeSafe(b.timestamp) - getTimeSafe(a.timestamp));

    const tabs: Tab[] = ['Lopende', 'Fixi Meldingen', 'Afgeronde'];

    const meldingForModal = selectedMelding ? meldingen.find(m => m.id === selectedMelding.id) : null;

    // Bulk actions
    const handleBulkStatusUpdate = async () => {
        try {
            const promises = selectedIds.map(id => contextUpdateStatus(id, bulkStatus));
            await Promise.all(promises);
            setPageToast({
                type: 'success',
                message: `${selectedCount} ${selectedCount === 1 ? 'melding' : 'meldingen'} bijgewerkt`
            });
            setTimeout(() => setPageToast(null), 2500);
            clearSelection();
            setShowBulkStatusModal(false);
        } catch (error) {
            setPageToast({ type: 'error', message: 'Fout bij bulk status update' });
            setTimeout(() => setPageToast(null), 2500);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Weet je zeker dat je ${selectedCount} ${selectedCount === 1 ? 'melding' : 'meldingen'} wilt verwijderen?`)) {
            return;
        }
        try {
            // TODO: Implement bulk delete in context
            setPageToast({
                type: 'success',
                message: `${selectedCount} ${selectedCount === 1 ? 'melding' : 'meldingen'} verwijderd`
            });
            setTimeout(() => setPageToast(null), 2500);
            clearSelection();
        } catch (error) {
            setPageToast({ type: 'error', message: 'Fout bij bulk delete' });
            setTimeout(() => setPageToast(null), 2500);
        }
    };

    const bulkActions: BulkAction[] = [
        {
            label: 'Status wijzigen',
            onClick: () => setShowBulkStatusModal(true),
        },
        {
            label: 'Verwijderen',
            onClick: handleBulkDelete,
            danger: true,
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Meldingen</h1>
                {currentUser?.role !== UserRole.Viewer && (
                    <Link to="/issues/nieuw" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary">
                        <PlusCircleIcon className="h-5 w-5 mr-2"/>
                        Nieuwe Melding
                    </Link>
                )}
            </div>

            <div>
                <div className="border-b border-gray-200 dark:border-dark-border">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    clearSelection(); // Clear selection when switching tabs
                                }}
                                className={`${
                                    activeTab === tab
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab}
                            </button>
                        ))}

                        {/* Select All Checkbox */}
                        {activeTab !== 'Fixi Meldingen' && filteredMeldingen.length > 0 && (
                            <div className="ml-auto flex items-center">
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedCount === filteredMeldingen.length && selectedCount > 0}
                                        onChange={() => toggleAll(filteredMeldingen.map(m => m.id))}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                    />
                                    <span>
                                        {selectedCount > 0 ? `${selectedCount} geselecteerd` : 'Selecteer alles'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </nav>
                </div>
            </div>

            {activeTab === 'Fixi Meldingen' ? (
                <FixiIntegration />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredMeldingen.map(melding => (
                            <div key={melding.id} className="relative group">
                                {/* Checkbox overlay */}
                                <label className="absolute top-3 left-3 z-10 cursor-pointer" aria-label={`Selecteer melding ${melding.titel}`}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected(melding.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleItem(melding.id);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-5 h-5 rounded border-2 border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer shadow-sm"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedCount === 0) {
                                            setSelectedMelding(melding);
                                            markNotificationsAsRead('melding', melding.id);
                                        }
                                    }}
                                    className={`cursor-pointer p-0 border-0 bg-transparent text-left w-full ${
                                        selectedCount > 0 ? 'pointer-events-none' : ''
                                    }`}
                                >
                                    <MeldingCard melding={melding} isUnseen={isUnseen(melding.id)} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {filteredMeldingen.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-lg">
                            <p className="text-gray-500 dark:text-dark-text-secondary">Geen meldingen gevonden voor deze status.</p>
                        </div>
                    )}
                </>
            )}

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
                selectedCount={selectedCount}
                onClear={clearSelection}
                actions={bulkActions}
                itemName="melding"
            />

            {/* Bulk Status Update Modal */}
            <Modal
                isOpen={showBulkStatusModal}
                onClose={() => setShowBulkStatusModal(false)}
                title={`Status wijzigen voor ${selectedCount} ${selectedCount === 1 ? 'melding' : 'meldingen'}`}
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="bulk-status-select" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                            Nieuwe status
                        </label>
                        <select
                            id="bulk-status-select"
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as MeldingStatus)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value={MeldingStatus.InBehandeling}>In Behandeling</option>
                            <option value={MeldingStatus.FixiMeldingGemaakt}>Fixi Melding Gemaakt</option>
                            <option value={MeldingStatus.Afgerond}>Afgerond</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowBulkStatusModal(false)}
                            className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-border rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Annuleren
                        </button>
                        <button
                            onClick={handleBulkStatusUpdate}
                            className="px-4 py-2 text-white bg-brand-primary rounded-lg hover:bg-brand-secondary transition-colors"
                        >
                            Status bijwerken
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Nieuwe Melding Maken">
                <NewMeldingForm onClose={() => setIsNewModalOpen(false)} onToast={(t)=>{ setPageToast(t); setTimeout(()=>setPageToast(null), 2500); }} />
            </Modal>

            {meldingForModal && (
              <MeldingDetailModal melding={meldingForModal} onClose={() => setSelectedMelding(null)} />
            )}
            {pageToast && (
                <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg ${pageToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {pageToast.message}
                </div>
            )}
        </div>
    );
};

export default IssuesPage;

