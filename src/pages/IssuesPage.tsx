import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Melding, MeldingStatus, UserRole } from '../types';
import { MeldingCard, Modal, getStatusColor } from '../components/ui';
import { PlusCircleIcon, CameraIcon, MapPinIcon, SendIcon, TrashIcon } from '../components/Icons';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale/nl';
import { MOCK_WIJKEN } from '../data/mockData';

type Tab = 'Lopende' | 'Fixi Meldingen' | 'Afgeronde';

const NewMeldingForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
            onClose();

        } catch (error) {
            console.error("Upload mislukt:", error);
            alert("Er is iets misgegaan bij het uploaden van de afbeeldingen.");
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Omschrijving</label>
                <textarea id="description" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} rows={4} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
            </div>
             <div className="space-y-4">
                 <div className="flex space-x-4">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700">
                        <CameraIcon className="h-5 w-5 mr-2" /> Foto/Bestand
                    </button>
                    <button type="button" onClick={handleGetLocation} className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700">
                        <MapPinIcon className="h-5 w-5 mr-2" /> GPS Locatie
                    </button>
                 </div>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*"
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

        } catch (error) {
            console.error("Update upload mislukt:", error);
            alert("Fout bij uploaden van bijlagen voor update.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as MeldingStatus;
        updateMeldingStatus(melding.id, newStatus);
    };

    const canEdit = currentUser?.role !== UserRole.Viewer;

    return (
        <Modal isOpen={true} onClose={onClose} title={melding.titel}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <img src={melding.attachments[0]} alt={melding.titel} className="w-full h-64 object-cover rounded-lg" />
                    <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Omschrijving</h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary">{melding.omschrijving}</p>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
                        <p><strong>Categorie:</strong> {melding.categorie}</p>
                        <p><strong>Wijk:</strong> {melding.wijk}</p>
                        <p><strong>Gemeld op:</strong> {format(melding.timestamp, 'dd MMM yyyy, HH:mm', { locale: nl })}</p>
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
                            {[...melding.updates].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map(update => {
                                const user = users.find(u => u.id === update.userId);
                                return (
                                    <div key={update.id} className="flex space-x-3">
                                        <img src={user?.avatarUrl} alt={user?.name} className="h-8 w-8 rounded-full mt-1 flex-shrink-0" />
                                        <div className="flex-1 bg-white dark:bg-dark-surface p-2 rounded-lg">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-gray-800 dark:text-dark-text-primary">{user?.name}</span>
                                                <span className="text-gray-500 dark:text-gray-400">{format(update.timestamp, 'dd MMM, HH:mm', { locale: nl })}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{update.text}</p>
                                            {update.attachments && update.attachments.length > 0 && (
                                                <div className="mt-2 grid grid-cols-3 gap-2">
                                                    {update.attachments.map((att, idx) => (
                                                        <a key={idx} href={att} target="_blank" rel="noopener noreferrer">
                                                           <img src={att} alt={`bijlage ${idx}`} className="h-20 w-full object-cover rounded"/>
                                                        </a>
                                                    ))}
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
                        <form onSubmit={handleUpdateSubmit} className="pt-4 border-t border-gray-200 dark:border-dark-border">
                             <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Update Toevoegen</h3>
                             <textarea 
                                value={newUpdateText}
                                onChange={(e) => setNewUpdateText(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                placeholder="Voeg een opmerking toe..."
                                rows={3}
                             />
                              <input
                                type="file"
                                ref={updateFileInputRef}
                                onChange={handleUpdateFileChange}
                                multiple
                                accept="image/*"
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
                                    <CameraIcon className="h-4 w-4 mr-2"/> Foto
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
                        </form>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const IssuesPage: React.FC = () => {
    const { meldingen, currentUser, notificaties, markNotificationsAsRead } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('Lopende');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [selectedMelding, setSelectedMelding] = useState<Melding | null>(null);

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
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const tabs: Tab[] = ['Lopende', 'Fixi Meldingen', 'Afgeronde'];
    
    const meldingForModal = selectedMelding ? meldingen.find(m => m.id === selectedMelding.id) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Meldingen</h1>
                {currentUser?.role !== UserRole.Viewer && (
                     <button onClick={() => setIsNewModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary">
                        <PlusCircleIcon className="h-5 w-5 mr-2"/>
                        Nieuwe Melding
                    </button>
                )}
            </div>
            
            <div>
                <div className="border-b border-gray-200 dark:border-dark-border">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`${
                                    activeTab === tab
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMeldingen.map(melding => (
                    <div key={melding.id} onClick={() => {
                        setSelectedMelding(melding);
                        markNotificationsAsRead('melding', melding.id);
                        }} className="cursor-pointer">
                        <MeldingCard melding={melding} isUnseen={isUnseen(melding.id)} />
                    </div>
                ))}
            </div>

            {filteredMeldingen.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-lg">
                    <p className="text-gray-500 dark:text-dark-text-secondary">Geen meldingen gevonden voor deze status.</p>
                </div>
            )}

            <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Nieuwe Melding Maken">
                <NewMeldingForm onClose={() => setIsNewModalOpen(false)} />
            </Modal>
            
            {meldingForModal && (
              <MeldingDetailModal melding={meldingForModal} onClose={() => setSelectedMelding(null)} />
            )}
        </div>
    );
};

export default IssuesPage;

