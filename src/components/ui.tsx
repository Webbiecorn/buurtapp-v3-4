import React, { useState, useRef } from 'react';
import { MeldingStatus, ProjectStatus } from '../types';
import type { StatCardProps, ModalProps, Melding, Project } from '../types';
import { useAppContext } from '../context/AppContext';
import { MapPinIcon, XIcon, PaperclipIcon, TrashIcon } from './Icons';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale/nl';

export const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color }) => (
  <div className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-md flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-dark-text-primary">{value}</p>
    </div>
  </div>
);

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};


export const getStatusColor = (status: MeldingStatus) => {
    switch (status) {
        case MeldingStatus.InBehandeling: return 'bg-yellow-500 text-black';
        case MeldingStatus.FixiMeldingGemaakt: return 'bg-purple-500 text-white';
        case MeldingStatus.Afgerond: return 'bg-green-500 text-white';
        default: return 'bg-gray-500 text-white';
    }
};

export const MeldingCard: React.FC<{ melding: Melding, isUnseen?: boolean }> = ({ melding, isUnseen }) => {
    const safeFormatDate = (value: any) => {
        try {
            const d = value instanceof Date
                ? value
                : (value?.toDate ? value.toDate() : (typeof value === 'string' ? new Date(value) : null));
            if (!d || isNaN(d.getTime())) return '—';
            return format(d, 'dd MMM yyyy', { locale: nl });
        } catch {
            return '—';
        }
    };

    const hasImage = Array.isArray(melding.attachments) && melding.attachments[0];
    const dateLabel = safeFormatDate((melding as any).timestamp);

    return (
        <div className="relative bg-white dark:bg-dark-surface rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300">
            {isUnseen && <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 z-10 border-2 border-white dark:border-dark-surface animate-pulse"></div>}
            {hasImage ? (
                <img src={melding.attachments[0]} alt={melding.titel} className="w-full h-48 object-cover" />
            ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-dark-border flex items-center justify-center text-gray-500 text-sm">Geen afbeelding</div>
            )}
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-dark-text-primary">{melding.titel}</h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(melding.status)}`}>
                        {melding.status}
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3 line-clamp-2">{melding.omschrijving}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                    <span>{dateLabel}</span>
                    {melding.locatie && (
                        <span className="flex items-center"><MapPinIcon className="h-4 w-4 mr-1"/> {melding.wijk}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ProjectCard: React.FC<{ project: Project, isUnseen?: boolean }> = ({ project, isUnseen }) => {
    const { users } = useAppContext();
    const participants = users.filter(u => project.participantIds.includes(u.id));

    return (
        <div className="relative bg-white dark:bg-dark-surface rounded-lg overflow-hidden shadow-lg">
             {isUnseen && <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 z-10 border-2 border-white dark:border-dark-surface animate-pulse"></div>}
            <img src={project.imageUrl} alt={project.title} className="w-full h-48 object-cover" />
            <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">{project.title}</h3>
                     <span className={`text-xs font-semibold px-2 py-1 rounded-full ${project.status === 'Lopend' ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
                        {project.status}
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-3">{project.description}</p>
                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {participants.slice(0, 5).map(p => (
                            <img key={p.id} src={p.avatarUrl} alt={p.name} title={p.name} className="h-8 w-8 rounded-full border-2 border-white dark:border-dark-bg"/>
                        ))}
                        {participants.length > 5 && (
                            <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-dark-bg">
                                +{participants.length - 5}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NewProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addProject, uploadFile } = useAppContext();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endDateUnknown, setEndDateUnknown] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files ?? [])]);
        }
    };
    
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !startDate) {
            alert("Titel, omschrijving en startdatum zijn verplicht.");
            return;
        }
        if (!endDateUnknown && !endDate) {
            alert("Selecteer een einddatum of vink 'Einddatum nog niet bekend' aan.");
            return;
        }
        setIsUploading(true);

        try {
            const attachmentURLs = await Promise.all(
                attachments.map(file => {
                    const filePath = `projecten/${Date.now()}_${file.name}`;
                    return uploadFile(file, filePath);
                })
            );

            const combinedStartDate = new Date(startDate);
            const combinedEndDate = endDateUnknown ? undefined : new Date(endDate);
            
            await addProject({ 
                title, 
                description,
                status: ProjectStatus.Lopend,
                startDate: combinedStartDate,
                endDate: combinedEndDate,
                attachments: attachmentURLs,
            });
            onClose();

        } catch {
            // Upload mislukt
            alert("Er is iets misgegaan bij het uploaden van de afbeeldingen.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
                <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Titel *</label>
                <input type="text" id="project-title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
            <div className="space-y-2">
                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Omschrijving *</label>
                <textarea id="project-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
            </div>
            <div className="space-y-2">
                <label htmlFor="project-start-date" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Startdatum *</label>
                <input type="date" id="project-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>
            <div className="space-y-2">
                <label htmlFor="project-end-date" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Einddatum</label>
                {!endDateUnknown && (
                    <input type="date" id="project-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                )}
                <div className="mt-2 flex items-center">
                    <input id="endDateUnknown" type="checkbox" checked={endDateUnknown} onChange={(e) => setEndDateUnknown(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                    <label htmlFor="endDateUnknown" className="ml-2 block text-sm text-gray-900 dark:text-dark-text-secondary">Einddatum nog niet bekend</label>
                </div>
            </div>
            <div>
                 <label htmlFor="project-attachments" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen (optioneel)</label>
                 <div className="mt-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex justify-center items-center px-4 py-2 border border-dashed border-gray-300 dark:border-dark-border rounded-md text-sm font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg">
                        <PaperclipIcon className="h-5 w-5 mr-2" />
                        Bestanden kiezen
                    </button>
                    <input id="project-attachments" type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                 </div>
                 {attachments.length > 0 && (
                     <div className="mt-4 space-y-2">
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
                    {isUploading ? 'Bezig met uploaden...' : 'Project Aanmaken'}
                </button>
            </div>
        </form>
    );
};
