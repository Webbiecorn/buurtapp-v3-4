import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './ui';
import { User, ExternalContact } from '../types';
import { PlusCircleIcon, UsersIcon } from './Icons';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  currentParticipantIds: string[];
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  currentParticipantIds
}) => {
  const { users, externalContacts, inviteUserToProject, projectInvitations } = useAppContext();
  const [selectedTab, setSelectedTab] = useState<'users' | 'contacts'>('users');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filter users that are not already participants and don't have pending invitations
  const pendingInvitedUserIds = projectInvitations
    .filter(inv => inv.projectId === projectId && inv.status === 'pending')
    .map(inv => inv.invitedUserId);

  const availableUsers = users.filter(user => 
    !currentParticipantIds.includes(user.id) && 
    !pendingInvitedUserIds.includes(user.id)
  );

  const handleInviteUser = async (userId: string, userName: string) => {
    setIsInviting(true);
    setInviteMessage(null);
    
    try {
      await inviteUserToProject(projectId, userId);
      setInviteMessage({
        type: 'success',
        text: `Uitnodiging verzonden naar ${userName}!`
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setInviteMessage(null);
      }, 3000);
      
    } catch (error) {
      setInviteMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Er is een fout opgetreden'
      });
    } finally {
      setIsInviting(false);
    }
  };

  const UserListItem: React.FC<{ user: User }> = ({ user }) => (
    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
      <div className="flex items-center space-x-3">
        <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full" />
        <div>
          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{user.name}</p>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{user.email}</p>
        </div>
      </div>
      <button
        onClick={() => handleInviteUser(user.id, user.name)}
        disabled={isInviting}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <PlusCircleIcon className="h-4 w-4 mr-1" />
        Uitnodigen
      </button>
    </div>
  );

  const ContactListItem: React.FC<{ contact: ExternalContact }> = ({ contact }) => (
    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-border">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{contact.name}</p>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{contact.email}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{contact.organisation}</p>
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
        <p>Externe contacten kunnen</p>
        <p>niet worden uitgenodigd</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Collega's uitnodigen voor "${projectTitle}"`}>
      <div className="space-y-4">
        {inviteMessage && (
          <div className={`p-3 rounded-md ${
            inviteMessage.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {inviteMessage.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-dark-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'users'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:border-gray-300'
              }`}
            >
              <UsersIcon className="h-4 w-4 inline mr-2" />
              Buurtteam Leden ({availableUsers.length})
            </button>
            <button
              onClick={() => setSelectedTab('contacts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'contacts'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary hover:border-gray-300'
              }`}
            >
              Externe Contacten ({externalContacts.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {selectedTab === 'users' ? (
            availableUsers.length > 0 ? (
              availableUsers.map(user => (
                <UserListItem key={user.id} user={user} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Alle beschikbare leden nemen al deel aan dit project of hebben een openstaande uitnodiging.</p>
              </div>
            )
          ) : (
            externalContacts.length > 0 ? (
              externalContacts.map(contact => (
                <ContactListItem key={contact.id} contact={contact} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
                <p>Geen externe contacten beschikbaar.</p>
                <p className="text-sm mt-2">Voeg contacten toe via de Contacten pagina.</p>
              </div>
            )
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Sluiten
          </button>
        </div>
      </div>
    </Modal>
  );
};
