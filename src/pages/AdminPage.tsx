import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, Urenregistratie, Project } from '../types';
import { Modal, NewProjectForm } from '../components/ui';
import { useSearchParams } from 'react-router-dom';
import { functions, db, auth } from '../firebase'; // Importeer Firebase functions, Firestore en Auth
import { httpsCallable } from 'firebase/functions'; // Importeer de httpsCallable functie
import { doc, updateDoc } from 'firebase/firestore'; // Importeer Firestore functies
import { sendPasswordResetEmail } from 'firebase/auth'; // Importeer sendPasswordResetEmail
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subDays, subWeeks, subMonths, formatDistanceToNow, startOfToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DownloadIcon, ClockIcon, TrendingUpIcon, XIcon, UsersIcon, BriefcaseIcon } from '../components/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateDailyUpdate } from '../services/dailyUpdateAI';

type AdminTab = 'users' | 'hours' | 'projects';

interface InviteUserResult {
    success: boolean;
    message?: string;
    needsPasswordReset?: boolean;
    email?: string;
    passwordResetLink?: string;
}

// Dit is de modal voor het toevoegen/uitnodigen van een nieuwe gebruiker
const AddUserModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Concierge);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const inviteUser = httpsCallable(functions, 'inviteUser');
            const result = await inviteUser({ name, email, role });
            
            const data = result.data as InviteUserResult;
            if (data.success) {
                // Na succesvolle gebruiker creatie, verstuur password reset email
                if (data.needsPasswordReset && data.email) {
                    try {
                        // Wacht 2 seconden om zeker te zijn dat Firebase Auth de gebruiker heeft verwerkt
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Verstuur de password reset email via Firebase client SDK
                        await sendPasswordResetEmail(auth, data.email, {
                            url: `${window.location.origin}/login`,
                            handleCodeInApp: false,
                        });
                        
                        setSuccess(`✅ Gebruiker ${name} aangemaakt en uitnodigingsmail verzonden naar ${email}. De gebruiker ontvangt een link om een wachtwoord in te stellen.`);
                    } catch (emailError: any) {
                        console.error("Fout bij versturen email:", emailError);
                        // Gebruiker is wel aangemaakt, maar email faalde
                        setSuccess(`⚠️ Gebruiker ${name} aangemaakt met standaard wachtwoord: Welkom01. Email kon niet worden verzonden: ${emailError.message}. De gebruiker kan een wachtwoord reset aanvragen op de login pagina.`);
                    }
                } else {
                    setSuccess(data.message || `✅ Gebruiker ${name} aangemaakt.`);
                }
                
                // Reset form
                setName('');
                setEmail('');
                setRole(UserRole.Concierge);
            } else {
                 throw new Error(data.message || 'Er is een onbekende fout opgetreden.');
            }
        } catch (err: any) {
            console.error("Fout bij uitnodigen gebruiker:", err);
            setError(err.message || 'Kon de uitnodiging niet versturen.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Nieuwe Gebruiker Uitnodigen">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Naam</label>
                    <input
                        type="text"
                        id="user-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>
                <div>
                    <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Email</label>
                    <input
                        type="email"
                        id="user-email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>
                <div>
                    <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Rol</label>
                    <select
                        id="user-role"
                        value={role}
                        onChange={e => setRole(e.target.value as UserRole)}
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    >
                        {Object.values(UserRole).map(roleValue => (
                            <option key={roleValue} value={roleValue} className="bg-white dark:bg-dark-surface">{roleValue}</option>
                        ))}
                    </select>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 text-sm">{success}</p>}

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="mr-2 inline-flex items-center px-6 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
                    >
                        {loading ? 'Versturen...' : 'Uitnodiging Versturen'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Project Participants Modal Component
const ProjectParticipantsModal: React.FC<{
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    users: any[];
    onUpdateParticipants: (projectId: string, participantIds: string[]) => Promise<void>;
}> = ({ project, isOpen, onClose, users, onUpdateParticipants }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    if (!project) return null;

    const currentParticipants = project.participantIds || [];
    const availableUsers = users.filter(user => !currentParticipants.includes(user.id));
    const participantUsers = users.filter(user => currentParticipants.includes(user.id));
    
    const filteredAvailableUsers = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddParticipant = async (userId: string) => {
        if (currentParticipants.includes(userId)) return;
        
        setLoading(true);
        try {
            const updatedParticipants = [...currentParticipants, userId];
            await onUpdateParticipants(project.id, updatedParticipants);
        } catch (error) {
            console.error('Error adding participant:', error);
            alert('Fout bij het toevoegen van deelnemer');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveParticipant = async (userId: string) => {
        if (!currentParticipants.includes(userId)) return;
        
        if (confirm('Weet u zeker dat u deze deelnemer wilt verwijderen?')) {
            setLoading(true);
            try {
                const updatedParticipants = currentParticipants.filter(id => id !== userId);
                await onUpdateParticipants(project.id, updatedParticipants);
            } catch (error) {
                console.error('Error removing participant:', error);
                alert('Fout bij het verwijderen van deelnemer');
            } finally {
                setLoading(false);
            }
        }
    };

    const getCreatorRole = (userId: string) => {
        return userId === project.creatorId ? 'eigenaar' : 'lid';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Deelnemers Beheren">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-3">
                        Project: {project.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Voeg nieuwe deelnemers toe of verwijder bestaande deelnemers van dit project.
                    </p>
                </div>

                {/* Huidige Deelnemers */}
                <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-300 mb-3">
                        Huidige Deelnemers ({participantUsers.length})
                    </h4>
                    <div className="space-y-2">
                        {participantUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        getCreatorRole(user.id) === 'eigenaar' 
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}>
                                        {getCreatorRole(user.id)}
                                    </span>
                                    {user.id !== project.creatorId && (
                                        <button
                                            onClick={() => handleRemoveParticipant(user.id)}
                                            disabled={loading}
                                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                            title="Verwijder deelnemer"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {participantUsers.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Geen deelnemers gevonden
                            </p>
                        )}
                    </div>
                </div>

                {/* Nieuwe Deelnemers Toevoegen */}
                <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-300 mb-3">
                        Nieuwe Deelnemers Toevoegen
                    </h4>
                    
                    {/* Zoekbalk */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Zoek gebruikers op naam of email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        />
                    </div>

                    {/* Beschikbare Gebruikers */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredAvailableUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddParticipant(user.id)}
                                    disabled={loading}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                                >
                                    Toevoegen
                                </button>
                            </div>
                        ))}
                        {filteredAvailableUsers.length === 0 && searchQuery && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Geen gebruikers gevonden voor "{searchQuery}"
                            </p>
                        )}
                        {availableUsers.length === 0 && !searchQuery && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Alle gebruikers zijn al deelnemer van dit project
                            </p>
                        )}
                    </div>
                </div>

                {/* Knoppen */}
                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Sluiten
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Project Edit Modal Component
const ProjectEditModal: React.FC<{
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedProject: Partial<Project>) => Promise<void>;
}> = ({ project, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        budget: '',
        startDate: '',
        endDate: '',
        status: 'Planning' as Project['status']
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title || '',
                description: project.description || '',
                location: project.location || '',
                budget: project.budget?.toString() || '',
                startDate: project.startDate ? 
                    (project.startDate instanceof Date ? 
                        project.startDate.toISOString().split('T')[0] : 
                        new Date(project.startDate).toISOString().split('T')[0]) : '',
                endDate: project.endDate ? 
                    (project.endDate instanceof Date ? 
                        project.endDate.toISOString().split('T')[0] : 
                        new Date(project.endDate).toISOString().split('T')[0]) : '',
                status: project.status || 'Planning'
            });
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        setLoading(true);
        try {
            const updatedData: any = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                updatedAt: new Date()
            };

            // Only add optional fields if they have values
            if (formData.location) {
                updatedData.location = formData.location;
            }
            
            if (formData.budget) {
                const budgetValue = parseFloat(formData.budget);
                if (!isNaN(budgetValue)) {
                    updatedData.budget = budgetValue;
                }
            }
            
            if (formData.startDate) {
                updatedData.startDate = new Date(formData.startDate);
            }
            
            if (formData.endDate) {
                updatedData.endDate = new Date(formData.endDate);
            }

            await onSave(updatedData);
            onClose();
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Fout bij het bijwerken van het project. Probeer het opnieuw.');
        } finally {
            setLoading(false);
        }
    };

    if (!project) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Project Bewerken">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project Titel *
                    </label>
                    <input
                        type="text"
                        id="title"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        placeholder="Voer project titel in"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Beschrijving
                    </label>
                    <textarea
                        id="description"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        placeholder="Beschrijf het project..."
                    />
                </div>

                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Locatie
                    </label>
                    <input
                        type="text"
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        placeholder="Project locatie"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Budget (€)
                        </label>
                        <input
                            type="number"
                            id="budget"
                            min="0"
                            step="0.01"
                            value={formData.budget}
                            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status
                        </label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Project['status'] }))}
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        >
                            <option value="Planning">Planning</option>
                            <option value="Lopend">Lopend</option>
                            <option value="Afgerond">Afgerond</option>
                            <option value="Gepauzeerd">Gepauzeerd</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Startdatum
                        </label>
                        <input
                            type="date"
                            id="startDate"
                            value={formData.startDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        />
                    </div>

                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Einddatum
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            value={formData.endDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            min={formData.startDate}
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white bg-white text-gray-900"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Opslaan...' : 'Project Bijwerken'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Project Detail Modal Component
const ProjectDetailModal: React.FC<{ 
    project: Project | null; 
    isOpen: boolean; 
    onClose: () => void;
    users: any[];
    formatDateRelative: (date: Date) => string;
    getLastActivityDate: (project: Project) => Date | null;
    onEditProject: (project: Project) => void;
    onManageParticipants: (project: Project) => void;
    onChangeStatus: (project: Project) => void;
}> = ({ project, isOpen, onClose, users, formatDateRelative, getLastActivityDate, onEditProject, onManageParticipants, onChangeStatus }) => {
    if (!project) return null;

    const creator = users.find(u => u.id === project.creatorId);
    const lastActivity = getLastActivityDate(project);
    const participants = project.participantIds.map(id => users.find(u => u.id === id)).filter(Boolean);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                        {project.imageUrl && (
                            <img src={project.imageUrl} alt={project.title} className="h-16 w-16 rounded-lg object-cover" />
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">{project.title}</h2>
                            <div className="flex items-center space-x-3 mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    project.status === 'Lopend' 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                    {project.status}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    Aangemaakt {formatDateRelative(project.startDate)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Project Info */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Project Details</h3>
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">Beschrijving</p>
                            <p className="text-gray-900 dark:text-dark-text-primary mt-1">{project.description}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">Aangemaakt door</p>
                                <div className="flex items-center space-x-2 mt-1">
                                    <img src={creator?.avatarUrl} alt={creator?.name} className="h-6 w-6 rounded-full" />
                                    <span className="text-gray-900 dark:text-dark-text-primary">{creator?.name || 'Onbekend'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">Laatste activiteit</p>
                                <p className="text-gray-900 dark:text-dark-text-primary mt-1">
                                    {lastActivity ? formatDateRelative(lastActivity) : 'Geen activiteit'}
                                </p>
                            </div>
                            {project.endDate && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">Einddatum</p>
                                    <p className="text-gray-900 dark:text-dark-text-primary mt-1">
                                        {formatDateRelative(project.endDate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Deelnemers */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
                        Deelnemers ({project.participantIds.length})
                    </h3>
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {participants.map((participant: any) => (
                                <div key={participant.id} className="flex items-center space-x-3 p-2 bg-white dark:bg-dark-surface rounded-lg">
                                    <img src={participant.avatarUrl} alt={participant.name} className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-dark-text-primary truncate">
                                            {participant.name}
                                            {participant.id === project.creatorId && (
                                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Creator)</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{participant.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recente Activiteit */}
                {project.contributions && project.contributions.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
                            Recente Activiteit ({project.contributions.length})
                        </h3>
                        <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 max-h-60 overflow-y-auto">
                            <div className="space-y-3">
                                {project.contributions
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .slice(0, 10)
                                    .map((contribution, index) => {
                                        const contributorUser = users.find(u => u.id === contribution.userId);
                                        return (
                                            <div key={contribution.id || index} className="flex space-x-3">
                                                <img 
                                                    src={contributorUser?.avatarUrl || 'https://avatar.vercel.sh/default.png'} 
                                                    alt={contributorUser?.name || 'Onbekend'}
                                                    className="h-8 w-8 rounded-full"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                                                            {contributorUser?.name || 'Onbekend'}
                                                        </p>
                                                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                                            {formatDateRelative(new Date(contribution.timestamp))}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                                        {contribution.text}
                                                    </p>
                                                    {contribution.attachments && contribution.attachments.length > 0 && (
                                                        <div className="flex space-x-2 mt-2">
                                                            {contribution.attachments.slice(0, 3).map((attachment, i) => (
                                                                <img 
                                                                    key={i}
                                                                    src={attachment} 
                                                                    alt={`Bijlage ${i + 1}`}
                                                                    className="h-12 w-12 rounded object-cover"
                                                                />
                                                            ))}
                                                            {contribution.attachments.length > 3 && (
                                                                <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                    <span className="text-xs text-gray-600 dark:text-gray-300">
                                                                        +{contribution.attachments.length - 3}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Beheer Acties */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Beheer Acties</h3>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditProject(project);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            📝 Project Bewerken
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onManageParticipants(project);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            👥 Deelnemers Beheren
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onChangeStatus(project);
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                            📊 Status Wijzigen ({project.status === 'Lopend' ? 'Markeer als Afgerond' : 'Markeer als Lopend'})
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Daily Update Card Component
const DailyUpdateCard: React.FC = () => {
    const { meldingen, projecten, urenregistraties, users } = useAppContext();
    const [updateText, setUpdateText] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);

    const todayData = useMemo(() => {
        const today = startOfToday();
        
        const newMeldingen = meldingen.filter(m => m.timestamp >= today);
        const newProjects = projecten.filter(p => p.startDate >= today);
        const todayUren = urenregistraties.filter(u => u.start >= today);
        const completedProjects = projecten.filter(p => 
            p.status === 'Afgerond' && p.endDate && new Date(p.endDate) >= today
        );
        const resolvedMeldingen = meldingen.filter(m => 
            m.status === 'Afgerond' && m.timestamp >= today
        );
        
        // Unieke actieve gebruikers vandaag (die uren hebben geregistreerd)
        const activeUserIds = new Set(todayUren.map(u => u.gebruikerId));
        const activeUsers = users.filter(u => activeUserIds.has(u.id));

        return {
            newMeldingen,
            newProjects,
            newDossiers: [], // Dossiers not available in current context
            todayUren,
            completedProjects,
            resolvedMeldingen,
            activeUsers,
            allMeldingen: meldingen, // Voor vergelijkingen
            allProjects: projecten, // Voor vergelijkingen
            allUsers: users, // Voor nieuwe medewerker detectie
        };
    }, [meldingen, projecten, urenregistraties, users]);

    const loadDailyUpdate = async () => {
        setIsLoading(true);
        try {
            const update = await generateDailyUpdate(todayData);
            setUpdateText(update);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error loading daily update:', error);
            setUpdateText('❌ Kon dagelijkse update niet laden. Probeer het later opnieuw.');
            setHasLoaded(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Auto-load update only once when component mounts and data is available
        if (!hasLoaded && (meldingen.length > 0 || projecten.length > 0)) {
            loadDailyUpdate();
        }
    }, [hasLoaded, meldingen.length, projecten.length]);  // Only trigger when hasLoaded changes or data becomes available

    const stats = [
        { label: 'Nieuwe meldingen', value: todayData.newMeldingen.length, icon: '📝', color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Nieuwe projecten', value: todayData.newProjects.length, icon: '🚀', color: 'text-green-600 dark:text-green-400' },
        { label: 'Afgeronde items', value: todayData.completedProjects.length + todayData.resolvedMeldingen.length, icon: '✅', color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Uren registraties', value: todayData.todayUren.length, icon: '⏱️', color: 'text-orange-600 dark:text-orange-400' },
    ];

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-900/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="text-3xl">🌅</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Dagelijkse Update
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={loadDailyUpdate}
                        disabled={isLoading}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-secondary rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        title="Vernieuwen"
                    >
                        <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-secondary rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                        title={isExpanded ? 'Inklappen' : 'Uitklappen'}
                    >
                        <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">{stat.icon}</span>
                                    <span className={`text-2xl font-bold ${stat.color}`}>
                                        {stat.value}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* AI Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center space-x-2 mb-3">
                            <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 7H7v6h6V7z" />
                                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                            </svg>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                AI Samenvatting
                            </h3>
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                                Powered by Gemini AI
                            </span>
                        </div>
                        
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                    {updateText}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Hoofdcomponent voor de Beheerpagina
const AdminPage: React.FC = () => {
    const { users, updateUserRole, removeUser, urenregistraties, projecten } = useAppContext();
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
    const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    
    // Project detail modal state
    const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);
    const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
    
    // Participants modal state
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [participantsModalProject, setParticipantsModalProject] = useState<Project | null>(null);
    
    // Team Urenregistratie state
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
    const [selectedUser, setSelectedUser] = useState<string>('alle');
    const [selectedProject, setSelectedProject] = useState<string>('alle');
    const [selectedActivity, setSelectedActivity] = useState<string>('alle');
    const [showAISummary, setShowAISummary] = useState(false);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    
    // Project AI Summary state
    const [showProjectAISummary, setShowProjectAISummary] = useState(false);
    const [projectAiSummary, setProjectAiSummary] = useState<string>('');
    const [isGeneratingProjectSummary, setIsGeneratingProjectSummary] = useState(false);
    
    // Filters voor de gebruikerslijst, beheerd via URL-parameters
    const [searchParams, setSearchParams] = useSearchParams();
    const userRoleFilter = (searchParams.get('role') || 'alle') as 'alle' | UserRole;
    const userQuery = searchParams.get('q') || '';
    
    // Project filters
    const [projectStatusFilter, setProjectStatusFilter] = useState('alle');
    const [projectCreatorFilter, setProjectCreatorFilter] = useState('alle');
    const [projectSearchQuery, setProjectSearchQuery] = useState('');

    const setParam = (key: string, val: string) => {
        const next = new URLSearchParams(searchParams);
        if (val && val !== 'alle') {
            next.set(key, val);
        } else {
            next.delete(key);
        }
        setSearchParams(next, { replace: true });
    };
    
    // Helper functies voor project weergave
    const formatDateRelative = (date: Date) => {
        return formatDistanceToNow(date, { addSuffix: true, locale: nl });
    };
    
    const getLastActivityDate = (project: Project): Date | null => {
        if (!project.contributions || project.contributions.length === 0) {
            return null;
        }
        const lastContribution = project.contributions.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        return new Date(lastContribution.timestamp);
    };
    
    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateUserRole(userId, newRole);
    };
    
    const handleAddUser = () => {
        setIsAddUserModalOpen(true);
    };

    const handleRemoveUser = (userId: string) => {
        if (confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
            removeUser(userId);
        }
    };
    
    // Project management handlers
    const handleEditProject = (project: Project) => {
        // Sluit eerst de detail modal voordat we de edit modal openen
        setIsProjectDetailModalOpen(false);
        setSelectedProjectDetail(null);
        
        // Open edit modal
        setSelectedProjectForEdit(project);
        setIsProjectEditModalOpen(true);
    };

    const handleSaveProject = async (updatedData: any) => {
        if (!selectedProjectForEdit) return;

        try {
            const projectRef = doc(db, 'projecten', selectedProjectForEdit.id);
            
            // Clean the data for Firestore
            const cleanData = { ...updatedData };
            
            // Remove undefined fields to avoid Firestore issues
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(projectRef, cleanData);
            
            // Success feedback
            alert('Project succesvol bijgewerkt!');
            
            // Close modal
            setIsProjectEditModalOpen(false);
            setSelectedProjectForEdit(null);
        } catch (error) {
            console.error('Error updating project:', error);
            const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
            alert(`Fout bij het bijwerken: ${errorMessage}`);
            throw error; // Re-throw to be handled by the modal
        }
    };
    
    const handleManageParticipants = (project: Project) => {
        setParticipantsModalProject(project);
        setShowParticipantsModal(true);
    };

    const handleUpdateParticipants = async (projectId: string, participantIds: string[]) => {
        try {
            const projectRef = doc(db, 'projecten', projectId);
            await updateDoc(projectRef, {
                participantIds: participantIds,
                updatedAt: new Date()
            });
            
            // Update local project data
            const updatedProject = projecten.find(p => p.id === projectId);
            if (updatedProject) {
                updatedProject.participantIds = participantIds;
                updatedProject.updatedAt = new Date();
            }
            
            console.log('Participants updated successfully');
        } catch (error) {
            console.error('Error updating participants:', error);
            throw error;
        }
    };
    
    const handleChangeProjectStatus = async (project: Project) => {
        const newStatus = project.status === 'Lopend' ? 'Afgerond' : 'Lopend';
        
        try {
            const projectRef = doc(db, 'projecten', project.id);
            await updateDoc(projectRef, {
                status: newStatus,
                updatedAt: new Date()
            });
            
            alert(`Status van "${project.title}" gewijzigd naar "${newStatus}"`);
        } catch (error) {
            console.error('Error updating project status:', error);
            alert('Fout bij het wijzigen van de status. Probeer het opnieuw.');
        }
    };

    // Helper functies voor Team Urenregistratie
    const getPeriodRange = () => {
        const now = new Date();
        switch (selectedPeriod) {
            case 'week':
                return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'month':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'quarter':
                const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
                return { start: quarterStart, end: quarterEnd };
            case 'year':
                return { start: startOfYear(now), end: endOfYear(now) };
            default:
                return { start: startOfMonth(now), end: endOfMonth(now) };
        }
    };

    // Filter urenregistraties gebaseerd op geselecteerde filters
    const filteredUrenregistraties = useMemo(() => {
        const { start, end } = getPeriodRange();
        
        return urenregistraties.filter(entry => {
            // Datum filter - gebruik start datum van de entry
            const entryDate = entry.start instanceof Date ? entry.start : new Date(entry.start);
            
            const isInPeriod = isWithinInterval(entryDate, { start, end });
            
            // User filter
            const matchesUser = selectedUser === 'alle' || entry.gebruikerId === selectedUser;
            
            // Project filter
            const matchesProject = selectedProject === 'alle' || entry.projectId === selectedProject;
            
            // Activity filter
            const matchesActivity = selectedActivity === 'alle' || entry.activiteit === selectedActivity;
            
            return isInPeriod && matchesUser && matchesProject && matchesActivity;
        });
    }, [urenregistraties, selectedPeriod, selectedUser, selectedProject, selectedActivity]);

    // Bereken statistieken per gebruiker
    const userStats = useMemo(() => {
        const stats: Record<string, { totalHours: number; entries: typeof filteredUrenregistraties }> = {};
        
        filteredUrenregistraties.forEach(entry => {
            if (!stats[entry.gebruikerId]) {
                stats[entry.gebruikerId] = { totalHours: 0, entries: [] };
            }
            // Bereken uren tussen start en eind
            const startTime = entry.start instanceof Date ? entry.start : new Date(entry.start);
            const endTime = entry.eind instanceof Date ? entry.eind : new Date(entry.eind);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            
            stats[entry.gebruikerId].totalHours += hours;
            stats[entry.gebruikerId].entries.push(entry);
        });
        
        return stats;
    }, [filteredUrenregistraties]);

    // AI Samenvatting genereren
    const generateAISummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const totalHours = filteredUrenregistraties.reduce((sum, entry) => {
                const startTime = entry.start instanceof Date ? entry.start : new Date(entry.start);
                const endTime = entry.eind instanceof Date ? entry.eind : new Date(entry.eind);
                const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            
            const uniqueUsers = new Set(filteredUrenregistraties.map(entry => entry.gebruikerId)).size;
            const activitiesSummary = filteredUrenregistraties.reduce((acc, entry) => {
                const startTime = entry.start instanceof Date ? entry.start : new Date(entry.start);
                const endTime = entry.eind instanceof Date ? entry.eind : new Date(entry.eind);
                const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                acc[entry.activiteit] = (acc[entry.activiteit] || 0) + hours;
                return acc;
            }, {} as Record<string, number>);

            const periodText = selectedPeriod === 'week' ? 'deze week' :
                             selectedPeriod === 'month' ? 'deze maand' :
                             selectedPeriod === 'quarter' ? 'dit kwartaal' : 'dit jaar';

            let summary = `📊 **Team Urenregistratie Samenvatting - ${periodText}**\n\n`;
            summary += `🕒 **Totaal aantal uren:** ${totalHours.toFixed(1)} uur\n`;
            summary += `👥 **Aantal actieve teamleden:** ${uniqueUsers}\n`;
            summary += `📈 **Gemiddeld per persoon:** ${uniqueUsers > 0 ? (totalHours / uniqueUsers).toFixed(1) : 0} uur\n\n`;

            if (Object.keys(activitiesSummary).length > 0) {
                summary += `📋 **Verdeling per activiteit:**\n`;
                Object.entries(activitiesSummary)
                    .sort(([,a], [,b]) => b - a)
                    .forEach(([activity, hours]) => {
                        const percentage = ((hours / totalHours) * 100).toFixed(1);
                        summary += `• ${activity}: ${hours.toFixed(1)} uur (${percentage}%)\n`;
                    });
            }

            if (selectedPeriod === 'month') {
                const avgPerWeek = totalHours / 4;
                summary += `\n📊 **Insights:**\n`;
                summary += `• Gemiddeld ${avgPerWeek.toFixed(1)} uur per week\n`;
                
                if (totalHours > 160) {
                    summary += `• 🟢 Team is zeer actief deze maand\n`;
                } else if (totalHours > 80) {
                    summary += `• 🟡 Gemiddelde teamactiviteit\n`;
                } else {
                    summary += `• 🔴 Lage teamactiviteit, mogelijk meer registratie nodig\n`;
                }
            }

            setAiSummary(summary);
            setShowAISummary(true);
        } catch (error) {
            console.error('Fout bij genereren AI samenvatting:', error);
            setAiSummary('Er is een fout opgetreden bij het genereren van de samenvatting.');
            setShowAISummary(true);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Project AI Samenvatting genereren
    const generateProjectAISummary = async () => {
        setIsGeneratingProjectSummary(true);
        try {
            const totalProjects = filteredProjects.length;
            const activeProjects = filteredProjects.filter(p => p.status === 'Lopend').length;
            const completedProjects = filteredProjects.filter(p => p.status === 'Afgerond').length;
            
            // Calculate completion percentage based on status
            const completionPercentage = totalProjects > 0 
                ? (completedProjects / totalProjects) * 100 
                : 0;

            const creatorsCount = new Set(filteredProjects.map(p => p.creatorId)).size;
            const totalParticipants = new Set(
                filteredProjects.flatMap(p => p.participantIds || [])
            ).size;

            const projectsWithBudget = filteredProjects.filter(p => p.budget && p.budget > 0);
            const totalBudget = projectsWithBudget.reduce((sum, p) => sum + (p.budget || 0), 0);

            // Analyze project age and activity
            const now = new Date();
            const recentProjects = filteredProjects.filter(p => {
                const createdAt = p.createdAt || p.startDate;
                if (!createdAt) return false;
                const projectDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
                const daysDiff = (now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff <= 30; // Projects created in last 30 days
            }).length;

            let summary = `📊 **Project Portfolio Samenvatting**\n\n`;
            summary += `📈 **Portfolio Overzicht:**\n`;
            summary += `• Totaal aantal projecten: ${totalProjects}\n`;
            summary += `• 🟢 Lopende projecten: ${activeProjects}\n`;
            summary += `• ✅ Afgeronde projecten: ${completedProjects}\n`;
            summary += `• 📊 Voltooiingspercentage: ${completionPercentage.toFixed(1)}%\n`;
            summary += `• 🆕 Nieuwe projecten (30 dagen): ${recentProjects}\n\n`;

            summary += `👥 **Team & Betrokkenheid:**\n`;
            summary += `• Aantal project eigenaren: ${creatorsCount}\n`;
            summary += `• Totaal aantal betrokken personen: ${totalParticipants}\n`;
            summary += `• Gemiddeld team grootte: ${totalProjects > 0 ? (totalParticipants / totalProjects).toFixed(1) : 0} personen per project\n\n`;

            if (totalBudget > 0) {
                summary += `💰 **Budget Overzicht:**\n`;
                summary += `• Totaal budget: €${totalBudget.toLocaleString()}\n`;
                summary += `• Projecten met budget: ${projectsWithBudget.length} van ${totalProjects}\n`;
                summary += `• Gemiddeld budget: €${Math.round(totalBudget / projectsWithBudget.length).toLocaleString()}\n\n`;
            }

            // Activity analysis
            const projectsWithEndDate = filteredProjects.filter(p => p.endDate).length;
            const overdueProjects = filteredProjects.filter(p => {
                if (!p.endDate || p.status === 'Afgerond') return false;
                const endDate = p.endDate instanceof Date ? p.endDate : new Date(p.endDate);
                return endDate < now;
            }).length;

            if (projectsWithEndDate > 0) {
                summary += `⏰ **Planning & Deadlines:**\n`;
                summary += `• Projecten met einddatum: ${projectsWithEndDate}\n`;
                summary += `• Projecten over deadline: ${overdueProjects}\n\n`;
            }

            summary += `🔍 **Portfolio Insights:**\n`;
            
            if (activeProjects > completedProjects) {
                summary += `• 🚀 Portfolio focus ligt op actieve ontwikkeling\n`;
            } else if (completedProjects > activeProjects) {
                summary += `• ✅ Portfolio toont sterke uitvoering met veel voltooide projecten\n`;
            } else {
                summary += `• ⚖️ Evenwichtige verdeling tussen lopende en afgeronde projecten\n`;
            }

            if (completionPercentage > 70) {
                summary += `• 🎯 Hoog voltooiingspercentage - effectieve projectuitvoering\n`;
            } else if (completionPercentage > 40) {
                summary += `• 📈 Gemiddeld voltooiingspercentage - ruimte voor verbetering\n`;
            } else {
                summary += `• ⚠️ Laag voltooiingspercentage - review van projectmethode aanbevolen\n`;
            }

            if (recentProjects > totalProjects * 0.3) {
                summary += `• 🆕 Veel nieuwe projecten - groeiende portfolio\n`;
            }

            if (overdueProjects > 0) {
                summary += `• ⏰ Let op: ${overdueProjects} project(en) over deadline\n`;
            }

            if (totalParticipants > totalProjects * 2) {
                summary += `• 👥 Goede team betrokkenheid over projecten\n`;
            } else {
                summary += `• 💡 Overweeg meer team betrokkenheid bij projecten\n`;
            }

            setProjectAiSummary(summary);
            setShowProjectAISummary(true);
        } catch (error) {
            console.error('Fout bij genereren project AI samenvatting:', error);
            setProjectAiSummary('Er is een fout opgetreden bij het genereren van de project samenvatting.');
            setShowProjectAISummary(true);
        } finally {
            setIsGeneratingProjectSummary(false);
        }
    };

    // Export functies
    const exportToExcel = () => {
        const data = filteredUrenregistraties.map(entry => {
            const user = users.find(u => u.id === entry.gebruikerId);
            const project = projecten.find(p => p.id === entry.projectId);
            const startTime = new Date(entry.start);
            const endTime = new Date(entry.eind);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            
            return {
                Datum: format(startTime, 'dd-MM-yyyy', { locale: nl }),
                Teamlid: user?.name || 'Onbekend',
                Activiteit: entry.activiteit,
                Uren: hours.toFixed(1),
                Project: project?.title || entry.projectName || '-',
                Omschrijving: entry.omschrijving || '-'
            };
        });

        // Eenvoudige CSV export (werkt in alle browsers)
        const csv = [
            Object.keys(data[0] || {}).join(','),
            ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `team-urenregistratie-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('Team Urenregistratie Rapport', 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Periode: ${selectedPeriod === 'week' ? 'Deze week' : 
                                selectedPeriod === 'month' ? 'Deze maand' : 
                                selectedPeriod === 'quarter' ? 'Dit kwartaal' : 'Dit jaar'}`, 14, 32);
        doc.text(`Gegenereerd op: ${format(new Date(), 'dd-MM-yyyy HH:mm', { locale: nl })}`, 14, 38);

        // Tabel data
        const tableData = filteredUrenregistraties.map(entry => {
            const user = users.find(u => u.id === entry.gebruikerId);
            const project = projecten.find(p => p.id === entry.projectId);
            const startTime = new Date(entry.start);
            const endTime = new Date(entry.eind);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            
            return [
                format(startTime, 'dd-MM-yyyy', { locale: nl }),
                user?.name || 'Onbekend',
                entry.activiteit,
                `${hours.toFixed(1)}h`,
                project?.title || entry.projectName || '-',
                (entry.omschrijving || '-').substring(0, 40) // Beperkt tot 40 karakters voor PDF
            ];
        });

        autoTable(doc, {
            head: [['Datum', 'Teamlid', 'Activiteit', 'Uren', 'Project', 'Omschrijving']],
            body: tableData,
            startY: 45,
            styles: { fontSize: 7 }, // Kleiner lettertype voor extra kolom
            columnStyles: {
                5: { cellWidth: 35 } // Omschrijving kolom breed genoeg
            },
            headStyles: { fillColor: [66, 139, 202] }
        });

        doc.save(`team-urenregistratie-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const exportProjectsToPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('Project Portfolio Rapport', 14, 22);
        
        doc.setFontSize(12);
        const filterText = projectStatusFilter !== 'alle' ? ` (Status: ${projectStatusFilter})` : '';
        const creatorText = projectCreatorFilter !== 'alle' ? ` (Eigenaar: ${users.find(u => u.id === projectCreatorFilter)?.name || 'Onbekend'})` : '';
        const searchText = projectSearchQuery ? ` (Zoekterm: "${projectSearchQuery}")` : '';
        
        doc.text(`Filters: ${filterText}${creatorText}${searchText}` || 'Alle projecten', 14, 32);
        doc.text(`Gegenereerd op: ${format(new Date(), 'dd-MM-yyyy HH:mm', { locale: nl })}`, 14, 38);

        // Summary stats
        const totalProjects = filteredProjects.length;
        const activeProjects = filteredProjects.filter(p => p.status === 'Lopend').length;
        const completedProjects = filteredProjects.filter(p => p.status === 'Afgerond').length;
        
        doc.setFontSize(10);
        doc.text(`Totaal: ${totalProjects} | Lopend: ${activeProjects} | Afgerond: ${completedProjects}`, 14, 48);

        // Tabel data
        const tableData = filteredProjects.map(project => {
            const creator = users.find(u => u.id === project.creatorId);
            const participantCount = project.participantIds?.length || 0;
            const lastActivity = getLastActivityDate(project);
            const lastActivityText = lastActivity ? formatDistanceToNow(lastActivity, { locale: nl, addSuffix: true }) : 'Onbekend';
            
            return [
                project.title,
                project.status,
                creator?.name || 'Onbekend',
                participantCount.toString(),
                project.budget ? `€${project.budget.toLocaleString()}` : '-',
                lastActivityText
            ];
        });

        autoTable(doc, {
            head: [['Project', 'Status', 'Eigenaar', 'Deelnemers', 'Budget', 'Laatste Activiteit']],
            body: tableData,
            startY: 55,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            columnStyles: {
                0: { cellWidth: 40 }, // Project title
                1: { cellWidth: 20 }, // Status
                2: { cellWidth: 30 }, // Owner
                3: { cellWidth: 20 }, // Participants
                4: { cellWidth: 25 }, // Budget
                5: { cellWidth: 35 }  // Last activity
            }
        });

        doc.save(`project-portfolio-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    // Filter de gebruikerslijst op basis van de actieve filters
    const filteredUsers = useMemo(() => {
        return users
            .filter(u => userRoleFilter === 'alle' ? true : u.role === userRoleFilter)
            .filter(u => {
                if (!userQuery.trim()) return true;
                const q = userQuery.toLowerCase();
                return (
                    (u.name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q)
                );
            });
    }, [users, userRoleFilter, userQuery]);

    // Filter de projecten op basis van de actieve filters
    const filteredProjects = useMemo(() => {
        return projecten
            .filter(p => projectStatusFilter === 'alle' ? true : p.status === projectStatusFilter)
            .filter(p => projectCreatorFilter === 'alle' ? true : p.creatorId === projectCreatorFilter)
            .filter(p => {
                if (!projectSearchQuery.trim()) return true;
                const q = projectSearchQuery.toLowerCase();
                return (
                    p.title.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                // Sorteer op laatste activiteit (meest recent eerst), dan op aanmaakdatum
                const aLastActivity = getLastActivityDate(a);
                const bLastActivity = getLastActivityDate(b);
                
                if (aLastActivity && bLastActivity) {
                    return bLastActivity.getTime() - aLastActivity.getTime();
                } else if (aLastActivity && !bLastActivity) {
                    return -1;
                } else if (!aLastActivity && bLastActivity) {
                    return 1;
                } else {
                    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                }
            });
    }, [projecten, projectStatusFilter, projectCreatorFilter, projectSearchQuery]);

    return (
        <div className="space-y-4 md:space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-dark-text-primary px-4 md:px-0">Beheer</h1>

            {/* Daily Update Card */}
            <div className="px-2 md:px-0">
                <DailyUpdateCard />
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg mx-2 md:mx-0">
                <div className="border-b border-gray-200 dark:border-dark-border">
                    {/* Mobile Tab Navigation - Scrollable */}
                    <nav className="flex overflow-x-auto scrollbar-hide" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`whitespace-nowrap py-3 md:py-4 px-3 md:px-6 border-b-2 font-medium text-xs md:text-sm transition-colors min-w-0 flex-shrink-0 ${
                                activeTab === 'users'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-text-secondary dark:hover:text-dark-text-primary hover:border-gray-300'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2">
                                <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="text-xs md:text-sm">Gebruikers</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('hours')}
                            className={`whitespace-nowrap py-3 md:py-4 px-3 md:px-6 border-b-2 font-medium text-xs md:text-sm transition-colors min-w-0 flex-shrink-0 ${
                                activeTab === 'hours'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-text-secondary dark:hover:text-dark-text-primary hover:border-gray-300'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2">
                                <ClockIcon className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="text-xs md:text-sm">Uren</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`whitespace-nowrap py-3 md:py-4 px-3 md:px-6 border-b-2 font-medium text-xs md:text-sm transition-colors min-w-0 flex-shrink-0 ${
                                activeTab === 'projects'
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-text-secondary dark:hover:text-dark-text-primary hover:border-gray-300'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2">
                                <BriefcaseIcon className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="text-xs md:text-sm">Projecten</span>
                            </div>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-3 md:p-6">
                    {activeTab === 'users' && (
                        <div>
                            {/* Gebruikersbeheer Content */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-3 md:space-y-0">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-dark-text-primary">Gebruikersbeheer</h2>
                                <button onClick={handleAddUser} className="w-full md:w-auto px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-secondary transition-colors text-sm">
                                    Gebruiker Uitnodigen
                                </button>
                            </div>
                            <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-3 md:gap-4 mb-4">
                                <div className="w-full md:w-auto">
                                    <label htmlFor="filter-role" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Rol</label>
                                    <select
                                        id="filter-role"
                                        value={userRoleFilter}
                                        onChange={(e) => setParam('role', e.target.value)}
                                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3"
                                    >
                                        <option value="alle">Alle</option>
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role} className="bg-white dark:bg-dark-surface">{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 w-full md:min-w-[220px]">
                                    <label htmlFor="user-query" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Zoeken</label>
                                    <input
                                        id="user-query"
                                        type="text"
                                        value={userQuery}
                                        onChange={(e) => setParam('q', e.target.value)}
                                        placeholder="Zoek op naam of email..."
                                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3"
                                    />
                                </div>
                            </div>
                            
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-200 dark:border-dark-border">
                                        <tr>
                                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Naam</th>
                                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Email</th>
                                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Rol</th>
                                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary text-right">Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="border-b border-gray-200 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg">
                                                <td className="p-3 text-gray-800 dark:text-dark-text-primary flex items-center">
                                                    <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full mr-3" />
                                                    {user.name}
                                                </td>
                                                <td className="p-3 text-gray-800 dark:text-dark-text-primary">{user.email}</td>
                                                <td className="p-3">
                                                    <select 
                                                        value={user.role} 
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                                        className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                                    >
                                                        {Object.values(UserRole).map(role => (
                                                            <option key={role} value={role} className="bg-white dark:bg-dark-surface">{role}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-400 font-semibold text-sm">
                                                        Verwijderen
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {filteredUsers.map(user => (
                                    <div key={user.id} className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">{user.name}</h3>
                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-secondary mb-1">Rol</label>
                                                <select 
                                                    value={user.role} 
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                                    className="w-full sm:w-auto bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                                >
                                                    {Object.values(UserRole).map(role => (
                                                        <option key={role} value={role} className="bg-white dark:bg-dark-surface">{role}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveUser(user.id)} 
                                                className="w-full sm:w-auto sm:ml-3 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md font-medium transition-colors"
                                            >
                                                Verwijderen
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'hours' && (
                        <div>
                            {/* Team Urenregistratie Content */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-3 md:space-y-0">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                                    <ClockIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-brand-primary" />
                                    Team Urenregistratie
                                </h2>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <button 
                                        onClick={generateAISummary}
                                        disabled={isGeneratingSummary}
                                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center space-x-2 text-sm"
                                    >
                                        <TrendingUpIcon className="h-4 w-4" />
                                        <span>{isGeneratingSummary ? 'Genereren...' : 'AI Samenvatting'}</span>
                                    </button>
                                    <button 
                                        onClick={exportToExcel}
                                        className="w-full sm:w-auto px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center space-x-1"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                        <span>Excel</span>
                                    </button>
                                    <button 
                                        onClick={exportToPDF}
                                        className="w-full sm:w-auto px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                        <span>PDF</span>
                                    </button>
                                </div>
                            </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Periode</label>
                        <select 
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as any)}
                            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="week">Deze week</option>
                            <option value="month">Deze maand</option>
                            <option value="quarter">Dit kwartaal</option>
                            <option value="year">Dit jaar</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Teamlid</label>
                        <select 
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="alle">Alle teamleden</option>
                            {users.filter(u => u.role !== UserRole.Viewer).map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Project</label>
                        <select 
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="alle">Alle projecten</option>
                            {projecten.map(project => (
                                <option key={project.id} value={project.id}>{project.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Activiteit</label>
                        <select 
                            value={selectedActivity}
                            onChange={(e) => setSelectedActivity(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="alle">Alle activiteiten</option>
                            <option value="Project">Project</option>
                            <option value="Wijkronde">Wijkronde</option>
                            <option value="Intern overleg">Intern overleg</option>
                            <option value="Extern overleg">Extern overleg</option>
                            <option value="Overig">Overig</option>
                        </select>
                    </div>
                </div>

                {/* AI Samenvatting */}
                {showAISummary && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 flex items-center">
                                <TrendingUpIcon className="h-5 w-5 mr-2" />
                                AI Samenvatting
                            </h3>
                            <button 
                                onClick={() => setShowAISummary(false)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-300 font-sans bg-transparent">
                                {aiSummary}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Overzicht Tabel */}
                <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                            Overzicht ({filteredUrenregistraties.length} entries)
                        </h3>
                        <div className="flex space-x-2">
                            <button 
                                onClick={exportToExcel}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                <span>Excel</span>
                            </button>
                            <button 
                                onClick={exportToPDF}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-1"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* User Stats Summary - Mobile Responsive */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        {Object.entries(userStats).map(([userId, stats]) => {
                            const user = users.find(u => u.id === userId);
                            if (!user) return null;
                            
                            return (
                                <div key={userId} className="bg-white dark:bg-dark-surface rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center space-x-3">
                                        <img 
                                            src={user.avatarUrl || 'https://avatar.vercel.sh/default.png'} 
                                            alt={user.name}
                                            className="h-8 w-8 md:h-10 md:w-10 rounded-full"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm truncate">
                                                {user.name}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                {stats.totalHours.toFixed(1)} uren • {stats.entries.length} entries
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detailed Entries - Desktop Table */}
                    {filteredUrenregistraties.length > 0 ? (
                        <>
                            {/* Desktop and Tablet View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-gray-200 dark:border-dark-border">
                                        <tr>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Datum</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Teamlid</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Activiteit</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Uren</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Project</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 dark:text-dark-text-secondary">Omschrijving</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUrenregistraties
                                            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                                            .map(entry => {
                                                const user = users.find(u => u.id === entry.gebruikerId);
                                                const project = projecten.find(p => p.id === entry.projectId);
                                                const startTime = new Date(entry.start);
                                                const endTime = new Date(entry.eind);
                                                const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                                                
                                                return (
                                                    <tr key={entry.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border">
                                                        <td className="p-3 text-gray-900 dark:text-dark-text-primary">
                                                            {format(startTime, 'dd-MM-yyyy', { locale: nl })}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex items-center space-x-2">
                                                                <img 
                                                                    src={user?.avatarUrl || 'https://avatar.vercel.sh/default.png'} 
                                                                    alt={user?.name || 'Unknown'}
                                                                    className="h-6 w-6 rounded-full"
                                                                />
                                                                <span className="text-gray-900 dark:text-dark-text-primary">
                                                                    {user?.name || 'Onbekend'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                entry.activiteit === 'Project' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                                                entry.activiteit === 'Wijkronde' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                                entry.activiteit === 'Intern overleg' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                                entry.activiteit === 'Extern overleg' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                                            }`}>
                                                                {entry.activiteit}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-semibold text-gray-900 dark:text-dark-text-primary">
                                                            {hours.toFixed(1)}h
                                                        </td>
                                                        <td className="p-3 text-gray-700 dark:text-dark-text-secondary">
                                                            {project?.title || entry.projectName || '-'}
                                                        </td>
                                                        <td className="p-3 text-gray-600 dark:text-dark-text-secondary max-w-xs truncate">
                                                            {entry.omschrijving || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {filteredUrenregistraties
                                    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                                    .map(entry => {
                                        const user = users.find(u => u.id === entry.gebruikerId);
                                        const project = projecten.find(p => p.id === entry.projectId);
                                        const startTime = new Date(entry.start);
                                        const endTime = new Date(entry.eind);
                                        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                                        
                                        return (
                                            <div key={entry.id} className="bg-white dark:bg-dark-surface rounded-lg p-4 shadow-sm space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <img 
                                                            src={user?.avatarUrl || 'https://avatar.vercel.sh/default.png'} 
                                                            alt={user?.name || 'Unknown'}
                                                            className="h-8 w-8 rounded-full"
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                                                {user?.name || 'Onbekend'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                                {format(startTime, 'dd-MM-yyyy', { locale: nl })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-brand-primary">{hours.toFixed(1)}h</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 dark:text-dark-text-secondary text-xs">Activiteit</p>
                                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                                            entry.activiteit === 'Project' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                                            entry.activiteit === 'Wijkronde' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                            entry.activiteit === 'Intern overleg' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                            entry.activiteit === 'Extern overleg' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                                        }`}>
                                                            {entry.activiteit}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-dark-text-secondary text-xs">Project</p>
                                                        <p className="text-gray-900 dark:text-dark-text-primary font-medium truncate">
                                                            {project?.title || entry.projectName || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {entry.omschrijving && (
                                                    <div>
                                                        <p className="text-gray-500 dark:text-dark-text-secondary text-xs">Omschrijving</p>
                                                        <p className="text-gray-900 dark:text-dark-text-primary text-sm">
                                                            {entry.omschrijving}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-dark-text-secondary">
                                Geen urenregistraties gevonden voor de geselecteerde filters.
                            </p>
                        </div>
                    )}
                </div>
                        </div>
                    )}

                    {/* Project AI Samenvatting - buiten de tabs zodat het zichtbaar blijft */}
                    {showProjectAISummary && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 flex items-center">
                                    <BriefcaseIcon className="h-5 w-5 mr-2" />
                                    Project Portfolio AI Samenvatting
                                </h3>
                                <button 
                                    onClick={() => setShowProjectAISummary(false)}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                                >
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="prose dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-300 font-sans bg-transparent">
                                    {projectAiSummary}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'projects' && (
                        <div>
                            {/* Projectbeheer Content */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-3 md:space-y-0">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-dark-text-primary">Projectbeheer</h2>
                                <button 
                                    onClick={() => setIsNewProjectModalOpen(true)} 
                                    className="w-full md:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors text-sm md:text-base"
                                >
                                    + Nieuw Project
                                </button>
                            </div>

                            {/* Project Statistieken */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Lopende Projecten</p>
                                    <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                        {projecten.filter(p => p.status === 'Lopend').length}
                                    </p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Afgeronde Projecten</p>
                                    <p className="text-lg font-bold text-green-800 dark:text-green-200">
                                        {projecten.filter(p => p.status === 'Afgerond').length}
                                    </p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                    <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Totaal Projecten</p>
                                    <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                                        {projecten.length}
                                    </p>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Actieve Deelnemers</p>
                                    <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                                        {[...new Set(projecten.flatMap(p => p.participantIds))].length}
                                    </p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Status</label>
                                    <select 
                                        value={projectStatusFilter}
                                        onChange={(e) => setProjectStatusFilter(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="alle">Alle Statussen</option>
                                        <option value="Lopend">Lopend</option>
                                        <option value="Afgerond">Afgerond</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Creator</label>
                                    <select 
                                        value={projectCreatorFilter}
                                        onChange={(e) => setProjectCreatorFilter(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="alle">Alle Creators</option>
                                        {[...new Set(projecten.map(p => p.creatorId))].map(creatorId => {
                                            const creator = users.find(u => u.id === creatorId);
                                            return creator ? (
                                                <option key={creatorId} value={creatorId}>{creator.name}</option>
                                            ) : null;
                                        })}
                                    </select>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Zoeken</label>
                                    <input
                                        type="text"
                                        value={projectSearchQuery}
                                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                                        placeholder="Zoek projecten..."
                                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            {/* Export en AI Samenvatting Knoppen */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <button
                                    onClick={generateProjectAISummary}
                                    disabled={isGeneratingProjectSummary}
                                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm"
                                >
                                    <TrendingUpIcon className="w-4 h-4" />
                                    <span>{isGeneratingProjectSummary ? 'Genereren...' : 'AI Samenvatting'}</span>
                                </button>
                                <button
                                    onClick={exportProjectsToPDF}
                                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span>Export naar PDF</span>
                                </button>
                                {filteredProjects.length > 0 && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                        <span>{filteredProjects.length} project(en) gevonden</span>
                                    </div>
                                )}
                            </div>

                            {/* Project Lijst */}
                            {filteredProjects.length > 0 ? (
                                <>
                                    {/* Desktop Table View */}
                                    <div className="hidden lg:block overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="border-b border-gray-200 dark:border-dark-border">
                                                <tr>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Project</th>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Creator</th>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Status</th>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Deelnemers</th>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Laatste Activiteit</th>
                                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Aangemaakt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredProjects.map((project: Project) => {
                                                    const creator = users.find(u => u.id === project.creatorId);
                                                    const lastActivity = getLastActivityDate(project);
                                                    return (
                                                        <tr key={project.id} className="border-b border-gray-200 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg cursor-pointer"
                                                            onClick={() => {
                                                                setSelectedProjectDetail(project);
                                                                setIsProjectDetailModalOpen(true);
                                                            }}
                                                        >
                                                            <td className="p-3">
                                                                <div className="flex items-center space-x-3">
                                                                    {project.imageUrl && (
                                                                        <img src={project.imageUrl} alt={project.title} className="h-10 w-10 rounded object-cover" />
                                                                    )}
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{project.title}</p>
                                                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary truncate max-w-xs">
                                                                            {project.description}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center space-x-2">
                                                                    <img src={creator?.avatarUrl} alt={creator?.name} className="h-6 w-6 rounded-full" />
                                                                    <span className="text-gray-900 dark:text-dark-text-primary text-sm">
                                                                        {creator?.name || 'Onbekend'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    project.status === 'Lopend' 
                                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                                }`}>
                                                                    {project.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-gray-900 dark:text-dark-text-primary font-semibold">
                                                                        {project.participantIds.length}
                                                                    </span>
                                                                    <div className="flex -space-x-1">
                                                                        {project.participantIds.slice(0, 3).map((participantId: string) => {
                                                                            const participant = users.find(u => u.id === participantId);
                                                                            return participant ? (
                                                                                <img 
                                                                                    key={participantId}
                                                                                    src={participant.avatarUrl} 
                                                                                    alt={participant.name}
                                                                                    className="h-6 w-6 rounded-full border-2 border-white dark:border-dark-surface"
                                                                                    title={participant.name}
                                                                                />
                                                                            ) : null;
                                                                        })}
                                                                        {project.participantIds.length > 3 && (
                                                                            <div className="h-6 w-6 rounded-full border-2 border-white dark:border-dark-surface bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                                <span className="text-xs text-gray-600 dark:text-gray-300">
                                                                                    +{project.participantIds.length - 3}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-gray-800 dark:text-dark-text-primary text-sm">
                                                                {lastActivity ? formatDateRelative(lastActivity) : 'Geen activiteit'}
                                                            </td>
                                                            <td className="p-3 text-gray-800 dark:text-dark-text-primary text-sm">
                                                                {formatDateRelative(project.startDate)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile/Tablet Card View */}
                                    <div className="lg:hidden space-y-4">
                                        {filteredProjects.map((project: Project) => {
                                            const creator = users.find(u => u.id === project.creatorId);
                                            const lastActivity = getLastActivityDate(project);
                                            return (
                                                <div key={project.id} className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    onClick={() => {
                                                        setSelectedProjectDetail(project);
                                                        setIsProjectDetailModalOpen(true);
                                                    }}
                                                >
                                                    {/* Header met project info */}
                                                    <div className="flex items-start space-x-3">
                                                        {project.imageUrl && (
                                                            <img src={project.imageUrl} alt={project.title} className="h-12 w-12 rounded object-cover flex-shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                                                                    {project.title}
                                                                </h3>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                                                    project.status === 'Lopend' 
                                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                                }`}>
                                                                    {project.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1 line-clamp-2">
                                                                {project.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Creator en datum info */}
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center space-x-2">
                                                            <img src={creator?.avatarUrl} alt={creator?.name} className="h-5 w-5 rounded-full" />
                                                            <span className="text-gray-700 dark:text-dark-text-secondary">
                                                                {creator?.name || 'Onbekend'}
                                                            </span>
                                                        </div>
                                                        <span className="text-gray-500 dark:text-dark-text-secondary">
                                                            {formatDateRelative(project.startDate)}
                                                        </span>
                                                    </div>

                                                    {/* Deelnemers en laatste activiteit */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                👥 {project.participantIds.length} deelnemers
                                                            </span>
                                                            <div className="flex -space-x-1">
                                                                {project.participantIds.slice(0, 3).map((participantId: string) => {
                                                                    const participant = users.find(u => u.id === participantId);
                                                                    return participant ? (
                                                                        <img 
                                                                            key={participantId}
                                                                            src={participant.avatarUrl} 
                                                                            alt={participant.name}
                                                                            className="h-5 w-5 rounded-full border border-white dark:border-dark-surface"
                                                                            title={participant.name}
                                                                        />
                                                                    ) : null;
                                                                })}
                                                                {project.participantIds.length > 3 && (
                                                                    <div className="h-5 w-5 rounded-full border border-white dark:border-dark-surface bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                        <span className="text-xs text-gray-600 dark:text-gray-300">
                                                                            +{project.participantIds.length - 3}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                            🕐 {lastActivity ? formatDateRelative(lastActivity) : 'Geen activiteit'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-6 mx-auto max-w-md">
                                        <div className="flex items-center justify-center mb-4">
                                            <BriefcaseIcon className="h-12 w-12 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm mb-4">
                                            {projectSearchQuery || projectStatusFilter !== 'alle' || projectCreatorFilter !== 'alle' 
                                                ? 'Geen projecten gevonden voor de geselecteerde filters.'
                                                : 'Nog geen projecten aangemaakt.'}
                                        </p>
                                        {(!projectSearchQuery && projectStatusFilter === 'alle' && projectCreatorFilter === 'alle') && (
                                            <button 
                                                onClick={() => setIsNewProjectModalOpen(true)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                            >
                                                Eerste Project Aanmaken
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Nieuw Project Aanmaken">
                <NewProjectForm onClose={() => setIsNewProjectModalOpen(false)} />
            </Modal>
            {isAddUserModalOpen && <AddUserModal onClose={() => setIsAddUserModalOpen(false)} />}
            <ProjectEditModal
                project={selectedProjectForEdit}
                isOpen={isProjectEditModalOpen}
                onClose={() => {
                    setIsProjectEditModalOpen(false);
                    setSelectedProjectForEdit(null);
                }}
                onSave={handleSaveProject}
            />
            <ProjectDetailModal 
                project={selectedProjectDetail}
                isOpen={isProjectDetailModalOpen}
                onClose={() => {
                    setIsProjectDetailModalOpen(false);
                    setSelectedProjectDetail(null);
                }}
                users={users}
                formatDateRelative={formatDateRelative}
                getLastActivityDate={getLastActivityDate}
                onEditProject={handleEditProject}
                onManageParticipants={handleManageParticipants}
                onChangeStatus={handleChangeProjectStatus}
            />
            <ProjectParticipantsModal
                project={participantsModalProject}
                isOpen={showParticipantsModal}
                onClose={() => {
                    setShowParticipantsModal(false);
                    setParticipantsModalProject(null);
                }}
                users={users}
                onUpdateParticipants={handleUpdateParticipants}
            />
        </div>
    );
};

export default AdminPage;