import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Project, ProjectStatus, UserRole } from '../types';
import { ProjectCard, Modal, NewProjectForm } from '../components/ui';
import { PlusCircleIcon, UsersIcon, PaperclipIcon, EditIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '../components/Icons';
import { format } from 'date-fns';
import nl from 'date-fns/locale/nl';

type Tab = 'Lopend' | 'Afgerond';

const ProjectDetailModal: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
    const { users, currentUser, joinProject, addProjectContribution, updateProject, uploadFile } = useAppContext();

    const participants = users.filter(u => project.participantIds.includes(u.id));
    const isParticipant = currentUser ? project.participantIds.includes(currentUser.id) : false;

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(project.title);
    const [editedDescription, setEditedDescription] = useState(project.description);
    const [editedStartDate, setEditedStartDate] = useState(format(project.startDate, 'yyyy-MM-dd'));
    const [editedEndDate, setEditedEndDate] = useState(project.endDate ? format(project.endDate, 'yyyy-MM-dd') : '');
    const [editedStatus, setEditedStatus] = useState(project.status);

    const [newContributionText, setNewContributionText] = useState("");
    const [newContributionAttachments, setNewContributionAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    // Preview overlay for activity attachments (supports images, pdf, video) + carousel
    const [previewItems, setPreviewItems] = useState<string[] | null>(null);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const contributionFileInputRef = React.useRef<HTMLInputElement>(null);

    const canEditProject = currentUser?.role === UserRole.Beheerder || currentUser?.id === project.creatorId;
    const canAddContribution = isParticipant && currentUser?.role !== UserRole.Viewer;

    const handleJoin = () => {
        joinProject(project.id);
    };
    
    const handleContributionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewContributionAttachments(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeContributionAttachment = (index: number) => {
        setNewContributionAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddContribution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContributionText.trim() && newContributionAttachments.length === 0) return;
        
        setIsUploading(true);
        try {
            const attachmentURLs = await Promise.all(
                newContributionAttachments.map(file => {
                    // CORRECTIE: Gebruik een willekeurige ID om unieke bestandsnamen te garanderen.
                    const randomId = Math.random().toString(36).substring(2);
                    const filePath = `contributions/${project.id}/${randomId}_${file.name}`;
                    return uploadFile(file, filePath);
                })
            );

            await addProjectContribution(project.id, { 
                text: newContributionText, 
                attachments: attachmentURLs 
            });

            setNewContributionText("");
            setNewContributionAttachments([]);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);

        } catch (error) {
            console.error("Contribution upload failed:", error);
            alert("Fout bij het uploaden van de bijlagen.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        updateProject(project.id, {
            title: editedTitle,
            description: editedDescription,
            startDate: new Date(editedStartDate),
            endDate: editedEndDate ? new Date(editedEndDate) : null,
            status: editedStatus,
        });
        setIsEditing(false);
        // We sluiten de modal na het updaten voor een betere UX
        onClose();
    };

    const handleCancelEdit = () => {
        setEditedTitle(project.title);
        setEditedDescription(project.description);
        setEditedStartDate(format(project.startDate, 'yyyy-MM-dd'));
        setEditedEndDate(project.endDate ? format(project.endDate, 'yyyy-MM-dd') : '');
        setEditedStatus(project.status);
        setIsEditing(false);
    };

    // Close preview with Escape key when open
    useEffect(() => {
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
            return <img src={url} alt="Voorbeeld bijlage" className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />;
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
                <DownloadIcon className="h-5 w-5 mr-2" /> Download bijlage
            </a>
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditing ? 'Project Bewerken' : project.title}>
            {isEditing ? (
                <form onSubmit={handleUpdateProject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Titel</label>
                        <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Omschrijving</label>
                        <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} rows={4} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Startdatum</label>
                            <input type="date" value={editedStartDate} onChange={e => setEditedStartDate(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Einddatum</label>
                            <input type="date" value={editedEndDate} onChange={e => setEditedEndDate(e.target.value)} min={editedStartDate} className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Status</label>
                        <select value={editedStatus} onChange={e => setEditedStatus(e.target.value as ProjectStatus)} className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                            {Object.values(ProjectStatus).map(s => <option key={s} value={s} className="bg-white dark:bg-dark-surface">{s}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={handleCancelEdit} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600">Annuleren</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary">Opslaan</button>
                    </div>
                </form>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-end -mb-4">
                         {canEditProject && (
                            <button onClick={() => setIsEditing(true)} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border">
                                <EditIcon className="h-4 w-4 mr-2" /> Bewerken
                            </button>
                        )}
                    </div>

                    <img src={project.imageUrl} alt={project.title} className="w-full h-64 object-cover rounded-lg" />
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                        <span><strong>Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded ${project.status === 'Lopend' ? 'bg-blue-500' : 'bg-green-500'} text-white`}>{project.status}</span></span>
                        <span><strong>Start:</strong> {format(project.startDate, 'dd MMM yyyy', { locale: nl })}</span>
                        {project.endDate && <span><strong>Einde:</strong> {format(project.endDate, 'dd MMM yyyy', { locale: nl })}</span>}
                    </div>
                    
                    <p className="text-gray-600 dark:text-dark-text-secondary">{project.description}</p>
                    
                    <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Deelnemers ({participants.length})</h3>
                        <div className="flex flex-wrap gap-4">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center space-x-2 bg-gray-100 dark:bg-dark-bg p-2 rounded-lg">
                                    <img src={p.avatarUrl} alt={p.name} className="h-8 w-8 rounded-full" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {project.attachments.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Bijlagen</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {project.attachments.map((att, index) => (
                                    <a key={index} href={att} target="_blank" rel="noopener noreferrer">
                                        <img src={att} alt={`Bijlage ${index + 1}`} className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Activiteiten</h3>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {[...project.contributions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map(c => {
                                const user = users.find(u => u.id === c.userId);
                                return (
                                    <div key={c.id} className="flex space-x-3">
                                        <img src={user?.avatarUrl} alt={user?.name} className="h-10 w-10 rounded-full mt-1" />
                                        <div className="flex-1 bg-gray-50 dark:bg-dark-bg p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{user?.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{format(c.timestamp, 'dd MMM, HH:mm', {locale: nl})}</span>
                                            </div>
                                            {c.text && <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{c.text}</p>}
                                            {c.attachments.length > 0 && (
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {c.attachments.map((att, idx) => {
                                                        const type = getType(att);
                                                        const isImage = type === 'image';
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => openPreview(c.attachments, idx)}
                                                                className={`group relative focus:outline-none ${isImage ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                                                                aria-label="Open bijlage"
                                                            >
                                                                {isImage ? (
                                                                    <img src={att} alt={`Bijlage ${idx + 1}`} className="h-24 w-full object-cover rounded transition-transform group-hover:scale-[1.02]" />
                                                                ) : (
                                                                    <div className="h-24 w-full rounded bg-gray-200 dark:bg-dark-border flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 px-2 text-center">
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
                            {project.contributions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nog geen bijdrages.</p>}
                        </div>
                    </div>

                    {canAddContribution && (
                        <form onSubmit={handleAddContribution} className="pt-4 border-t border-gray-200 dark:border-dark-border">
                             <h3 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">Bijdrage toevoegen</h3>
                             <textarea 
                                value={newContributionText}
                                onChange={(e) => setNewContributionText(e.target.value)}
                                className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                placeholder="Deel een update..."
                                rows={3}
                             />
                             {newContributionAttachments.length > 0 && (
                                 <div className="mt-2 grid grid-cols-3 gap-2">
                                     {newContributionAttachments.map((file, index) => (
                                         <div key={index} className="relative">
                                             <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-full object-cover rounded-md"/>
                                             <button type="button" onClick={() => removeContributionAttachment(index)} className="absolute top-1 right-1 bg-black/50 rounded-full text-white p-0.5">
                                                 <XIcon className="h-3 w-3" />
                                             </button>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             <div className="flex justify-between items-center mt-2">
                                <div>
                                     <button type="button" onClick={() => contributionFileInputRef.current?.click()} className="flex items-center text-sm font-medium text-brand-primary hover:underline">
                                        <PaperclipIcon className="h-4 w-4 mr-1" /> Bijlage toevoegen
                                     </button>
                                     <input type="file" ref={contributionFileInputRef} onChange={handleContributionFileChange} multiple accept="image/*,application/pdf,video/*" className="hidden" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    {showSuccessMessage && (
                                       <span className="text-sm text-green-500">Update geplaatst!</span>
                                    )}
                                    <button type="submit" disabled={isUploading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400">
                                        {isUploading ? 'Plaatsen...' : 'Plaatsen'}
                                    </button>
                                </div>
                             </div>
                        </form>
                    )}

                    {!isParticipant && currentUser?.role === UserRole.Concierge && (
                        <div className="pt-4 border-t border-gray-200 dark:border-dark-border text-center">
                            <button onClick={handleJoin} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                                <UsersIcon className="h-6 w-6 mr-2" /> Ik wil helpen!
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* Fullscreen preview overlay with navigation and rich types */}
            {previewItems && (
                <div
                    className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-4"
                    onClick={closePreview}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Voorbeeld bijlage"
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
        </Modal>
    );
};

const ProjectsPage: React.FC = () => {
    const { projecten, currentUser, notificaties, markNotificationsAsRead } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('Lopend');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

    const isUnseen = (projectId: string): boolean => {
        if (!currentUser || (currentUser.role !== UserRole.Beheerder && currentUser.role !== UserRole.Concierge)) {
            return false;
        }
        return notificaties.some(n =>
            n.userId === currentUser.id &&
            !n.isRead &&
            n.targetType === 'project' &&
            n.targetId === projectId
        );
    };

    const filteredProjects = projecten
        .filter(p => p.status === activeTab)
        .sort((a,b) => (isUnseen(b.id) ? 1 : 0) - (isUnseen(a.id) ? 1: 0));

    const projectForModal = selectedProject ? projecten.find(p => p.id === selectedProject.id) : null;

    const tabs: Tab[] = ['Lopend', 'Afgerond'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Projecten</h1>
                {(currentUser?.role === UserRole.Beheerder || currentUser?.role === UserRole.Concierge) && (
                     <button onClick={() => setIsNewProjectModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary">
                        <PlusCircleIcon className="h-5 w-5 mr-2"/>
                        Nieuw Project
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <div key={project.id} onClick={() => {
                        setSelectedProject(project);
                        markNotificationsAsRead('project', project.id);
                        }} className="cursor-pointer">
                        <ProjectCard project={project} isUnseen={isUnseen(project.id)} />
                    </div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                 <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-lg">
                    <p className="text-gray-500 dark:text-dark-text-secondary">Geen projecten gevonden voor deze status.</p>
                </div>
            )}
            
            {projectForModal && <ProjectDetailModal project={projectForModal} onClose={() => setSelectedProject(null)} />}

            <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Nieuw Project Aanmaken">
                <NewProjectForm onClose={() => setIsNewProjectModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default ProjectsPage;