

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Project, ProjectStatus, UserRole } from '../types';
import { ProjectCard, Modal, NewProjectForm } from '../components/ui';
import { PlusCircleIcon, UsersIcon, CameraIcon, PaperclipIcon, TrashIcon, EditIcon, XIcon } from '../components/Icons';
import { format } from 'date-fns';
import nl from 'date-fns/locale/nl';

type Tab = 'Lopend' | 'Afgerond';

const ProjectDetailModal: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
    const { users, currentUser, joinProject, addProjectContribution, updateProject } = useAppContext();

    const participants = users.filter(u => project.participantIds.includes(u.id));
    const isParticipant = currentUser ? project.participantIds.includes(currentUser.id) : false;

    // State for editing project
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(project.title);
    const [editedDescription, setEditedDescription] = useState(project.description);
    const [editedStartDate, setEditedStartDate] = useState(format(project.startDate, 'yyyy-MM-dd'));
    const [editedEndDate, setEditedEndDate] = useState(project.endDate ? format(project.endDate, 'yyyy-MM-dd') : '');
    const [editedStatus, setEditedStatus] = useState(project.status);

    // State for new contribution
    const [newContributionText, setNewContributionText] = useState("");
    const [newContributionAttachments, setNewContributionAttachments] = useState<{name: string, url: string}[]>([]);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const contributionFileInputRef = React.useRef<HTMLInputElement>(null);

    // Permissions
    const canEditProject = currentUser?.role === UserRole.Beheerder || currentUser?.id === project.creatorId;
    const canAddContribution = isParticipant && currentUser?.role !== UserRole.Viewer;

    const handleJoin = () => {
        joinProject(project.id);
    };
    
    const handleContributionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                name: file.name,
                url: `https://picsum.photos/seed/${Math.random()}/400/300` // Placeholder
            }));
            setNewContributionAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeContributionAttachment = (index: number) => {
        setNewContributionAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddContribution = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContributionText.trim() && newContributionAttachments.length === 0) return;
        addProjectContribution(project.id, { 
            text: newContributionText, 
            attachments: newContributionAttachments.map(a => a.url) 
        });
        setNewContributionText("");
        setNewContributionAttachments([]);
        setShowSuccessMessage(true);
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 3000);
    };

    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        updateProject(project.id, {
            title: editedTitle,
            description: editedDescription,
            startDate: new Date(editedStartDate),
            endDate: editedEndDate ? new Date(editedEndDate) : undefined,
            status: editedStatus,
        });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedTitle(project.title);
        setEditedDescription(project.description);
        setEditedStartDate(format(project.startDate, 'yyyy-MM-dd'));
        setEditedEndDate(project.endDate ? format(project.endDate, 'yyyy-MM-dd') : '');
        setEditedStatus(project.status);
        setIsEditing(false);
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
                            {[...project.contributions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map(c => {
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
                                                    {c.attachments.map((img, idx) => <img key={idx} src={img} className="h-24 w-full object-cover rounded"/>)}
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
                                             <img src={file.url} alt={file.name} className="h-20 w-full object-cover rounded-md"/>
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
                                     <input type="file" ref={contributionFileInputRef} onChange={handleContributionFileChange} multiple accept="image/*,video/*" className="hidden" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    {showSuccessMessage && (
                                       <span className="text-sm text-green-500">Update succesvol geplaatst!</span>
                                    )}
                                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-dark-border text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border">
                                        Sluiten
                                    </button>
                                    <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary">
                                        Plaatsen
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
        .sort((a,b) => (isUnseen(b.id) ? 1 : 0) - (isUnseen(a.id) ? 1: 0)); // Sort unseen projects to the top

    // Find the up-to-date project object from the main `projecten` state to pass to the modal
    // This ensures the modal always shows the latest data after an update (e.g., joining a project)
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
