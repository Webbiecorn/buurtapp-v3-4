# AI Prompt: Admin & Gebruikersbeheer Module - Buurtconciërge App

## Context
Je gaat een complete Admin & Gebruikersbeheer module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module is voor het beheren van gebruikers, rollen, uitnodigingen en app-instellingen.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **State:** React Context API
- **Backend:** Firebase Auth + Cloud Functions
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **AdminPage - User Management**
   - Tabel met alle gebruikers
   - Kolommen:
     - Avatar + Naam
     - Email
     - Rol (Beheerder, Conciërge, Viewer)
     - Status (Actief, Uitgenodigd, Gedeactiveerd)
     - Laatst gezien
     - Acties (edit, delete, deactivate)
   - Search bar (naam, email)
   - Filters:
     - Rol filter
     - Status filter
   - Sort options (naam, rol, laatst gezien)
   - Pagination (20 per pagina)
   - "Gebruiker Uitnodigen +" button

2. **InviteUserModal**
   - Input fields:
     - Email (required, validation)
     - Naam (required)
     - Rol (select: Beheerder, Conciërge, Viewer)
     - Wijk/Gebied (select, optioneel voor Conciërge)
   - "Uitnodiging Versturen" button
   - Flow:
     - Firebase Function creates user
     - Sends welcome email met tijdelijk wachtwoord
     - Default password: `Welkom01`
     - mustChangePassword: true
   - Success: Toast + modal sluit
   - Error handling met specifieke messages

3. **EditUserModal**
   - Edit fields:
     - Naam
     - Email (disabled, can't change)
     - Rol (dropdown)
     - Status (Actief/Gedeactiveerd toggle)
     - Wijk/Gebied
   - "Opslaan" button
   - Delete button (confirmation)
   - Disable self-edit (can't change own role/status)

4. **User Roles & Permissions**
   - **Beheerder:**
     - Volledige toegang tot alles
     - Kan gebruikers beheren
     - Kan app-instellingen wijzigen
   - **Conciërge:**
     - Kan eigen data bewerken (meldingen, projecten, uren)
     - Kan niet: users beheren, anderen's data verwijderen
   - **Viewer:**
     - Alleen lezen (read-only)
     - Geen create/edit/delete

5. **User Status Management**
   - **Actief:** Normale toegang
   - **Uitgenodigd:** Email verstuurd, nog geen login
   - **Gedeactiveerd:** Login disabled, data blijft
   - Toggle status met confirmation
   - Deactivation = soft delete (data bewaren)

6. **Activity Tracking**
   - Laatst gezien timestamp
   - Login history (last 10 logins)
   - Activity log (optional, voor auditing)

7. **Bulk Actions (Optional)**
   - Select multiple users
   - Bulk role change
   - Bulk deactivate
   - Bulk export (CSV)

## Data Model

```typescript
export interface User {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  role: 'Beheerder' | 'Conciërge' | 'Viewer';
  status: 'Actief' | 'Uitgenodigd' | 'Gedeactiveerd';
  avatarUrl?: string; // Profile picture
  wijk?: string; // Voor Conciërges
  createdAt: Date;
  updatedAt: Date;
  lastSeen?: Date;
  mustChangePassword?: boolean; // True voor nieuwe users
  invitedBy?: string; // Admin user ID die uitnodiging deed
}

export interface UserInvitation {
  email: string;
  name: string;
  role: 'Beheerder' | 'Conciërge' | 'Viewer';
  wijk?: string;
  temporaryPassword: string; // Welkom01
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date; // 7 dagen
  status: 'Pending' | 'Accepted' | 'Expired';
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string; // 'login', 'user_created', 'user_updated', etc.
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

## Firebase Integration

### Firestore Collections

**users (main collection):**
```typescript
{
  id: string, // same as Auth UID
  email: string,
  name: string,
  role: 'Beheerder' | 'Conciërge' | 'Viewer',
  status: 'Actief' | 'Uitgenodigd' | 'Gedeactiveerd',
  avatarUrl: string,
  wijk: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastSeen: Timestamp,
  mustChangePassword: boolean
}
```

**invitations (pending invites):**
```typescript
{
  id: string,
  email: string,
  name: string,
  role: string,
  wijk: string,
  temporaryPassword: string,
  invitedBy: string,
  invitedAt: Timestamp,
  expiresAt: Timestamp,
  status: 'Pending' | 'Accepted' | 'Expired'
}
```

### Cloud Functions

**functions/src/inviteUser.ts:**
```typescript
import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const inviteUser = onCall(async (request) => {
  // Check caller is admin
  const { role } = request.auth?.token;
  if (role !== 'Beheerder') {
    throw new Error('Unauthorized');
  }

  const { email, name, role: newUserRole, wijk } = request.data;

  // Create Firebase Auth user
  const userRecord = await getAuth().createUser({
    email,
    password: 'Welkom01',
    displayName: name,
  });

  // Set custom claims (role)
  await getAuth().setCustomUserClaims(userRecord.uid, {
    role: newUserRole,
  });

  // Create Firestore user document
  await getFirestore().collection('users').doc(userRecord.uid).set({
    email,
    name,
    role: newUserRole,
    wijk: wijk || null,
    status: 'Uitgenodigd',
    createdAt: new Date(),
    updatedAt: new Date(),
    mustChangePassword: true,
    invitedBy: request.auth.uid,
  });

  // Send welcome email (via sendWelcomeEmail function)
  // ... email sending logic

  return { success: true, userId: userRecord.uid };
});
```

### Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      // Anyone can read their own user doc
      allow read: if request.auth != null && request.auth.uid == userId;

      // Admins can read all users
      allow read: if request.auth != null &&
        request.auth.token.role == 'Beheerder';

      // Only admins can write
      allow write: if request.auth != null &&
        request.auth.token.role == 'Beheerder';
    }

    // Invitations (admin only)
    match /invitations/{inviteId} {
      allow read, write: if request.auth != null &&
        request.auth.token.role == 'Beheerder';
    }
  }
}
```

### Context API Functions

```typescript
// In AppContext.tsx

const inviteNewUser = async (data: {
  email: string;
  name: string;
  role: string;
  wijk?: string;
}) => {
  const inviteUserFn = httpsCallable(functions, 'inviteUser');
  const result = await inviteUserFn(data);

  // Reload users list
  await fetchUsers();

  return result.data;
};

const updateUser = async (userId: string, updates: Partial<User>) => {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // Update custom claims if role changed
  if (updates.role) {
    const updateRoleFn = httpsCallable(functions, 'updateUserRole');
    await updateRoleFn({ userId, role: updates.role });
  }
};

const deactivateUser = async (userId: string) => {
  await updateDoc(doc(db, 'users', userId), {
    status: 'Gedeactiveerd',
    updatedAt: serverTimestamp(),
  });

  // Disable Firebase Auth
  const disableUserFn = httpsCallable(functions, 'disableUser');
  await disableUserFn({ userId });
};

const deleteUser = async (userId: string) => {
  // Hard delete (optional, soft delete preferred)
  const deleteUserFn = httpsCallable(functions, 'deleteUser');
  await deleteUserFn({ userId });

  // Delete Firestore doc
  await deleteDoc(doc(db, 'users', userId));
};
```

## Component Example

### AdminPage.tsx
```tsx
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button, Input, Badge } from '@/components/ui';
import { UserPlus, Search, Edit, Trash2, Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export const AdminPage: React.FC = () => {
  const { users, currentUser, inviteNewUser, updateUser, deactivateUser } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !u.email.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (roleFilter.length > 0 && !roleFilter.includes(u.role)) {
        return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(u.status)) {
        return false;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleDeactivate = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Je kunt jezelf niet deactiveren');
      return;
    }

    if (confirm(`Weet je zeker dat je ${user.name} wilt deactiveren?`)) {
      try {
        await deactivateUser(user.id);
        toast.success('Gebruiker gedeactiveerd');
      } catch (error) {
        console.error('Error deactivating user:', error);
        toast.error('Fout bij deactiveren');
      }
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const classes = {
      'Beheerder': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Conciërge': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Viewer': 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    };
    return classes[role] || '';
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      'Actief': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Uitgenodigd': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'Gedeactiveerd': 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    };
    return classes[status] || '';
  };

  // Check if current user is admin
  if (currentUser?.role !== 'Beheerder') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Geen Toegang
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Je hebt geen toestemming om deze pagina te bekijken.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gebruikersbeheer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredUsers.length} gebruikers
          </p>
        </div>

        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="w-5 h-5 mr-2" />
          Gebruiker Uitnodigen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek naam of email..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter[0] || ''}
          onChange={(e) => setRoleFilter(e.target.value ? [e.target.value] : [])}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Alle rollen</option>
          <option value="Beheerder">Beheerder</option>
          <option value="Conciërge">Conciërge</option>
          <option value="Viewer">Viewer</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter[0] || ''}
          onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Alle statussen</option>
          <option value="Actief">Actief</option>
          <option value="Uitgenodigd">Uitgenodigd</option>
          <option value="Gedeactiveerd">Gedeactiveerd</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Gebruiker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Laatst Gezien
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getRoleBadgeClass(user.role)}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getStatusBadgeClass(user.status)}>
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.lastSeen
                    ? format(user.lastSeen, 'dd MMM yyyy HH:mm', { locale: nl })
                    : 'Nooit'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    disabled={user.id === currentUser.id && user.role === 'Beheerder'}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeactivate(user)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    disabled={user.id === currentUser.id}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Geen gebruikers gevonden
          </p>
        </div>
      )}

      {/* Modals */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={inviteNewUser}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={updateUser}
        />
      )}
    </div>
  );
};
```

### InviteUserModal.tsx
```tsx
import React, { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onInvite: (data: any) => Promise<void>;
}

export const InviteUserModal: React.FC<Props> = ({ onClose, onInvite }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'Conciërge' as const,
    wijk: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.name) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    // Email validation
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error('Ongeldig email adres');
      return;
    }

    setIsSubmitting(true);

    try {
      await onInvite(formData);
      toast.success(`Uitnodiging verstuurd naar ${formData.email}`);
      onClose();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Fout bij versturen uitnodiging');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gebruiker Uitnodigen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="naam@voorbeeld.nl"
            required
          />

          <Input
            label="Naam *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Voor- en achternaam"
            required
          />

          <Select
            label="Rol *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            required
          >
            <option value="Beheerder">Beheerder</option>
            <option value="Conciërge">Conciërge</option>
            <option value="Viewer">Viewer</option>
          </Select>

          {formData.role === 'Conciërge' && (
            <Select
              label="Wijk"
              value={formData.wijk}
              onChange={(e) => setFormData({ ...formData, wijk: e.target.value })}
            >
              <option value="">Selecteer wijk</option>
              <option value="Boswijk">Boswijk</option>
              <option value="Leyenburg">Leyenburg</option>
              <option value="Morgenstond">Morgenstond</option>
            </Select>
          )}

          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ De gebruiker ontvangt een email met tijdelijk wachtwoord: <strong>Welkom01</strong>
              <br />
              Bij eerste login wordt wachtwoord wijzigen verplicht.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Versturen...' : 'Uitnodiging Versturen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## Analytics
```typescript
trackEvent('admin_page_viewed');
trackEvent('user_invited', { role: newUserRole });
trackEvent('user_edited', { userId, changes: Object.keys(updates) });
trackEvent('user_deactivated', { userId });
```

## Testing Checklist
- [ ] Admin kan gebruikers lijst zien
- [ ] Non-admin krijgt "Geen Toegang"
- [ ] Uitnodiging versturen werkt
- [ ] Welcome email wordt verstuurd
- [ ] Nieuwe user kan inloggen met Welkom01
- [ ] Wachtwoord wijzigen forced bij eerste login
- [ ] User edit werkt
- [ ] Role change update Firebase custom claims
- [ ] Deactivate werkt (soft delete)
- [ ] Can't deactivate yourself
- [ ] Can't change own role (if admin)
- [ ] Search filter werkt
- [ ] Role filter werkt
- [ ] Status filter werkt
- [ ] Pagination werkt (indien >20 users)
- [ ] Mobile responsive
- [ ] Dark mode support

Succes! 👥
