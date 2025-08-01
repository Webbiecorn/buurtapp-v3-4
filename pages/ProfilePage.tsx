import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { CameraIcon, EditIcon } from '../components/Icons';

const ProfilePage: React.FC = () => {
    const { currentUser, updateUserProfile } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state
    const [name, setName] = useState(currentUser?.name || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [avatar, setAvatar] = useState(currentUser?.avatarUrl || '');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ensure state is updated if currentUser changes for any reason
    useEffect(() => {
        if (currentUser && !isEditing) {
            setName(currentUser.name);
            setEmail(currentUser.email);
            setPhone(currentUser.phone || '');
            setAvatar(currentUser.avatarUrl);
        }
    }, [currentUser, isEditing]);

    if (!currentUser) {
        return <div className="text-center p-8 text-gray-500 dark:text-dark-text-secondary">Gebruiker wordt geladen...</div>;
    }

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        setIsEditing(false);
        // Reset form fields to original state
        setName(currentUser.name);
        setEmail(currentUser.email);
        setPhone(currentUser.phone || '');
        setAvatar(currentUser.avatarUrl);
    };

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile(currentUser.id, {
            name,
            email,
            phone,
            avatarUrl: avatar
        });
        setIsEditing(false);
    };

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // In a real app, upload the file and get a URL.
            // For this mock, we'll generate a new random avatar.
            const newAvatarUrl = `https://i.pravatar.cc/150?u=${Date.now()}`;
            setAvatar(newAvatarUrl);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Mijn Profiel</h1>

            <form onSubmit={handleSaveClick} className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 flex flex-col items-center">
                        <div className="relative">
                            <img
                                src={avatar}
                                alt="Profielfoto"
                                className="h-40 w-40 rounded-full object-cover border-4 border-gray-200 dark:border-dark-border"
                            />
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleAvatarClick}
                                    className="absolute bottom-2 right-2 bg-brand-primary p-2 rounded-full text-white hover:bg-brand-secondary transition-colors"
                                    aria-label="Profielfoto wijzigen"
                                >
                                    <CameraIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Volledige naam</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                readOnly={!isEditing}
                                required
                                className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary read-only:bg-transparent dark:read-only:bg-dark-surface read-only:border-transparent read-only:ring-0 read-only:px-0"
                            />
                        </div>
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">E-mailadres</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                readOnly={!isEditing}
                                required
                                className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary read-only:bg-transparent dark:read-only:bg-dark-surface read-only:border-transparent read-only:ring-0 read-only:px-0"
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Telefoonnummer</label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                readOnly={!isEditing}
                                className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary read-only:bg-transparent dark:read-only:bg-dark-surface read-only:border-transparent read-only:ring-0 read-only:px-0"
                            />
                        </div>
                         <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Rol</label>
                            <input
                                type="text"
                                id="role"
                                value={currentUser.role}
                                readOnly
                                className="mt-1 block w-full bg-transparent dark:bg-dark-surface border-transparent rounded-md py-2 px-0 focus:outline-none focus:ring-0"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border flex justify-end">
                    {isEditing ? (
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={handleCancelClick}
                                className="px-6 py-2 bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-dark-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Annuleren
                            </button>
                             <button
                                type="submit"
                                className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-secondary transition-colors"
                            >
                                Wijzigingen Opslaan
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="inline-flex items-center px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-secondary transition-colors"
                        >
                            <EditIcon className="h-5 w-5 mr-2" />
                            Profiel Bewerken
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ProfilePage;