import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { Modal, NewProjectForm } from '../components/ui';

const AddUserModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addUser } = useAppContext();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Concierge);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            alert('Naam en email zijn verplicht.');
            return;
        }
        addUser({ name, email, role });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Nieuwe Gebruiker Toevoegen">
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
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                    >
                        Gebruiker Toevoegen
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const AdminPage: React.FC = () => {
    const { users, updateUserRole, removeUser } = useAppContext();
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    
    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateUserRole(userId, newRole);
    };
    
    const handleAddUser = () => {
        setIsAddUserModalOpen(true);
    };

    const handleRemoveUser = (userId: string) => {
        if(window.confirm('Weet u zeker dat u deze gebruiker wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
            removeUser(userId);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Beheer</h1>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Gebruikersbeheer</h2>
                    <button onClick={handleAddUser} className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-secondary transition-colors">
                        Gebruiker Toevoegen
                    </button>
                </div>
                <div className="overflow-x-auto">
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
                            {users.map(user => (
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
                                        <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-400 font-semibold">
                                            Verwijderen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">Projectbeheer</h2>
                <div className="text-center">
                    <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Maak snel een nieuw wijkverbeteringsproject aan.</p>
                     <button onClick={() => setIsNewProjectModalOpen(true)} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        Nieuw Project Aanmaken
                    </button>
                </div>
             </div>
             <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Nieuw Project Aanmaken">
                <NewProjectForm onClose={() => setIsNewProjectModalOpen(false)} />
            </Modal>
            {isAddUserModalOpen && <AddUserModal onClose={() => setIsAddUserModalOpen(false)} />}
        </div>
    );
};

export default AdminPage;