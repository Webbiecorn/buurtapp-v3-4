# AI Prompt: Projecten Module - Buurtconciërge App

## Context
Je gaat een complete Projecten module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module beheert wijkprojecten met planning, deelnemers, voortgang tracking, documentatie en een uitnodigingssysteem voor externe betrokkenen.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 6.4
- **Styling:** Tailwind CSS 3.4 (dark mode support)
- **State Management:** React Context API
- **Routing:** React Router v6 (HashRouter)
- **Backend:** Firebase (Firestore, Storage)
- **Maps:** Leaflet + Google Maps
- **Date handling:** date-fns
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit
1. **Projecten Overzicht (ProjectsPage)**
   - Grid/lijst van alle projecten
   - Status filter (Lopend / Afgerond)
   - Zoekfunctionaliteit op titel
   - Project cards met preview info:
     - Titel
     - Status badge
     - Voortgang percentage met progress bar
     - Aantal deelnemers
     - Startdatum / einddatum
     - Wijk label
     - Thumbnail foto (eerste document)
   - "Nieuw Project" button (rechtsboven)
   - Click op card → open detail

2. **Project Detail View**
   - Header sectie:
     - Titel (editable voor creator/admin)
     - Status dropdown (wijzigbaar)
     - Voortgang slider (0-100%)
     - Start/einddatum pickers
   - Tabs navigatie:
     - **Overzicht:** Omschrijving, locatie op kaart, basis info
     - **Deelnemers:** Lijst van users, "Deelnemen" button, uitnodigen externe
     - **Documenten:** Upload/view foto's, PDFs, bestanden
     - **Uren:** Uren geregistreerd per deelnemer (uit Urenregistratie module)
     - **Bijdragen:** Contributions met omschrijvingen per user
   - Actions:
     - "Deelnemen aan project" (als nog geen deelnemer)
     - "Bijdrage toevoegen" (uren + omschrijving)
     - "Document uploaden"
     - "Externe uitnodigen" (email invite)
     - "Project verwijderen" (alleen admin)

3. **Nieuw Project Modal/Page**
   - Formulier velden:
     - Titel (required, min 3 chars)
     - Omschrijving (required, min 10 chars)
     - Wijk (dropdown, 5 wijken)
     - Budget (optioneel, number input, euro's)
     - Startdatum (date picker, default vandaag)
     - Einddatum (date picker, optioneel)
     - Locatie (adres lookup via PDOK, kaart marker)
     - Status (default: Lopend)
     - Initiële voortgang (default: 0%)
   - Submit button met loading state
   - Success toast → navigate naar project detail

4. **Project Uitnodigingen Systeem**
   - Modal: "Externe uitnodigen"
   - Input: email adres
   - Genereer unieke invite token
   - Opslaan in `projectInvitations` collection
   - Email versturen (via Firebase Function)
   - Invite link: `/#/project-invite/{token}`
   - Invite accept page: toon project info, "Accepteren" button
   - Na accept: add user ID to project deelnemers

5. **Project Contributions**
   - "Bijdrage toevoegen" modal
   - Input velden:
     - Uren gewerkt (number)
     - Datum (date picker)
     - Omschrijving (textarea)
   - Contributions lijst in detail view
   - Totaal uren per deelnemer
   - Optie: koppel aan Urenregistratie (sync)

## Data Model

### TypeScript Interfaces

```typescript
export enum ProjectStatus {
  Lopend = 'Lopend',
  Afgerond = 'Afgerond',
}

export interface Locatie {
  lat: number;
  lon: number;
  adres?: string;
}

export interface ProjectContribution {
  id: string;
  userId: string;
  userName: string;
  datum: Date;
  uren: number;
  omschrijving: string;
  timestamp: Date;
}

export interface Project {
  id: string;
  titel: string;
  omschrijving: string;
  status: ProjectStatus;
  startDatum?: Date;
  eindDatum?: Date;
  locatie?: Locatie;
  documenten: string[]; // Storage URLs
  deelnemers: string[]; // User IDs
  voortgang: number; // 0-100
  budget?: number; // euros
  wijk?: string;
  contributions: ProjectContribution[];
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectInvitation {
  id: string; // unique token
  projectId: string;
  email: string;
  invitedBy: string; // User ID
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired';
}
```

## Firebase Integration

### Firestore Collections

```
projecten/
  {projectId}/
    id: string
    titel: string
    omschrijving: string
    status: 'Lopend' | 'Afgerond'
    startDatum: Timestamp | null
    eindDatum: Timestamp | null
    locatie: { lat, lon, adres } | null
    documenten: string[]
    deelnemers: string[] (User IDs)
    voortgang: number (0-100)
    budget: number | null
    wijk: string | null
    contributions: array
    createdBy: string
    createdAt: Timestamp
    updatedAt: Timestamp

projectInvitations/
  {inviteToken}/
    id: string (=token)
    projectId: string
    email: string
    invitedBy: string
    invitedAt: Timestamp
    acceptedAt: Timestamp | null
    status: 'pending' | 'accepted' | 'expired'
```

### Storage Structure
```
projecten/{projectId}/{filename}
```

### Context API Functies
```typescript
const {
  projecten, // Project[]
  projectInvitations, // ProjectInvitation[]
  currentUser, // User | null
  users, // User[] (voor namen ophalen)

  // CRUD operaties
  addProject, // (project: Omit<Project, 'id'>) => Promise<string>
  updateProject, // (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject, // (id: string) => Promise<void>

  // Deelnemen
  joinProject, // (projectId: string, userId: string) => Promise<void>

  // Contributions
  addProjectContribution, // (projectId: string, contribution: Omit<ProjectContribution, 'id'>) => Promise<void>

  // Uitnodigingen
  createProjectInvitation, // (invitation: Omit<ProjectInvitation, 'id'>) => Promise<string>
  acceptProjectInvitation, // (token: string, userId: string) => Promise<void>

  // File uploads
  uploadFile, // (file: File, path: string) => Promise<string>
} = useAppContext();
```

## Component Examples

### ProjectsPage.tsx Skeleton
```tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Input, Badge, Modal } from '@/components/ui';
import { Plus, Search, Users, Calendar, TrendingUp } from 'lucide-react';
import { ProjectStatus } from '@/types';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projecten, currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const filteredProjects = useMemo(() => {
    return projecten.filter(p => {
      if (searchTerm && !p.titel.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [projecten, searchTerm, statusFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Projecten
        </h1>
        <Button onClick={() => setShowNewProjectModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Project
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Zoek projecten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status filter */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Alle statussen</option>
              <option value={ProjectStatus.Lopend}>Lopend</option>
              <option value={ProjectStatus.Afgerond}>Afgerond</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => navigate(`/#/projecten/${project.id}`)}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Geen projecten gevonden
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({
  project,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Thumbnail */}
      {project.documenten.length > 0 && (
        <div className="h-48 bg-gray-200 dark:bg-gray-700">
          <img
            src={project.documenten[0]}
            alt={project.titel}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
            {project.titel}
          </h3>
          <Badge variant={project.status === ProjectStatus.Lopend ? 'info' : 'success'}>
            {project.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {project.omschrijving}
        </p>

        {/* Voortgang */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Voortgang</span>
            <span>{project.voortgang}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${project.voortgang}%` }}
            />
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{project.deelnemers.length}</span>
          </div>

          {project.startDatum && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(project.startDatum)}</span>
            </div>
          )}

          {project.wijk && (
            <Badge variant="secondary" size="sm">
              {project.wijk}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};
```

### Project Detail Page Skeleton
```tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Badge, Tabs, Modal } from '@/components/ui';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  Users,
  FileText,
  Clock,
  Plus,
  Upload,
  Mail,
  Calendar,
  MapPin,
  TrendingUp,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ProjectStatus } from '@/types';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projecten,
    users,
    currentUser,
    updateProject,
    joinProject,
    addProjectContribution,
    uploadFile,
    deleteProject,
  } = useAppContext();

  const project = projecten.find(p => p.id === projectId);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Modals
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (project) {
      setEditedTitle(project.titel);
    }
  }, [project]);

  if (!project) {
    return <div>Project niet gevonden</div>;
  }

  const isDeelnemer = project.deelnemers.includes(currentUser?.id || '');
  const isCreator = project.createdBy === currentUser?.id;
  const isAdmin = currentUser?.role === 'Beheerder';
  const canEdit = isCreator || isAdmin;

  const handleJoinProject = async () => {
    try {
      await joinProject(project.id, currentUser!.id);
      toast.success('Je bent toegevoegd aan het project');
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      await updateProject(project.id, { status: newStatus });
      toast.success('Status bijgewerkt');
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  const handleVoortgangChange = async (voortgang: number) => {
    try {
      await updateProject(project.id, { voortgang });
      toast.success('Voortgang bijgewerkt');
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim().length < 3) {
      toast.error('Titel moet minimaal 3 karakters bevatten');
      return;
    }
    try {
      await updateProject(project.id, { titel: editedTitle });
      setIsEditing(false);
      toast.success('Titel bijgewerkt');
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Weet je zeker dat je dit project wilt verwijderen?')) {
      return;
    }
    try {
      await deleteProject(project.id);
      toast.success('Project verwijderd');
      navigate('/#/projecten');
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              <Button onClick={handleTitleSave}>Opslaan</Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Annuleren
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.titel}
              </h1>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {canEdit && (
              <Button variant="danger" size="sm" onClick={handleDeleteProject}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status en Voortgang */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value={ProjectStatus.Lopend}>Lopend</option>
              <option value={ProjectStatus.Afgerond}>Afgerond</option>
            </select>
          </div>

          {/* Voortgang */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voortgang: {project.voortgang}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={project.voortgang}
              onChange={(e) => handleVoortgangChange(parseInt(e.target.value))}
              disabled={!canEdit}
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        {!isDeelnemer && (
          <div className="mt-4">
            <Button onClick={handleJoinProject}>
              <Users className="w-4 h-4 mr-2" />
              Deelnemen aan project
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overzicht', label: 'Overzicht', icon: <FileText className="w-4 h-4" /> },
          { id: 'deelnemers', label: 'Deelnemers', icon: <Users className="w-4 h-4" /> },
          { id: 'documenten', label: 'Documenten', icon: <Upload className="w-4 h-4" /> },
          { id: 'bijdragen', label: 'Bijdragen', icon: <Clock className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        {activeTab === 'overzicht' && (
          <OverzichtTab project={project} />
        )}

        {activeTab === 'deelnemers' && (
          <DeelnemersTab
            project={project}
            onInvite={() => setShowInviteModal(true)}
          />
        )}

        {activeTab === 'documenten' && (
          <DocumentenTab
            project={project}
            onUpload={() => setShowUploadModal(true)}
          />
        )}

        {activeTab === 'bijdragen' && (
          <BijdragenTab
            project={project}
            onAddContribution={() => setShowContributionModal(true)}
            isDeelnemer={isDeelnemer}
          />
        )}
      </div>

      {/* Modals */}
      {showContributionModal && (
        <ContributionModal
          projectId={project.id}
          onClose={() => setShowContributionModal(false)}
        />
      )}

      {showInviteModal && (
        <InviteModal
          projectId={project.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          projectId={project.id}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

// Tab Components (implement these separately)
const OverzichtTab: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Omschrijving</h3>
        <p className="text-gray-600 dark:text-gray-300">{project.omschrijving}</p>
      </div>

      {project.locatie && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Locatie</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {project.locatie.adres}
          </p>
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[project.locatie.lat, project.locatie.lon]}
              zoom={15}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[project.locatie.lat, project.locatie.lon]} />
            </MapContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {project.startDatum && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Startdatum</p>
            <p className="font-medium">{formatDate(project.startDatum)}</p>
          </div>
        )}
        {project.eindDatum && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Einddatum</p>
            <p className="font-medium">{formatDate(project.eindDatum)}</p>
          </div>
        )}
        {project.budget && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
            <p className="font-medium">€ {project.budget.toLocaleString('nl-NL')}</p>
          </div>
        )}
        {project.wijk && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Wijk</p>
            <p className="font-medium">{project.wijk}</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Additional Components

### ContributionModal
```typescript
// Modal voor bijdrage toevoegen
// Velden: uren (number), datum (date), omschrijving (textarea)
// Submit: addProjectContribution()
```

### InviteModal
```typescript
// Modal voor externe uitnodigen
// Veld: email
// Submit: createProjectInvitation() + trigger Firebase Function voor email
```

### UploadModal
```typescript
// Modal voor documenten uploaden
// File input (multiple)
// Preview thumbnails
// Upload naar Storage: projecten/{projectId}/{filename}
// Update project.documenten array
```

### ProjectInviteAcceptPage
```typescript
// /#/project-invite/{token}
// Haal invitation op uit Firestore
// Toon project details
// "Accepteren" button
// Add current user to deelnemers
// Update invitation status naar 'accepted'
```

## Styling Guidelines

### Project Card Style
```css
- Shadow hover effect: hover:shadow-lg
- Smooth transitions: transition-all duration-200
- Status badge kleuren:
  - Lopend: blue (info)
  - Afgerond: green (success)
- Progress bar: bg-blue-600 on bg-gray-200
- Card hover: cursor-pointer
- Image aspect ratio: aspect-video or h-48
```

### Responsive Breakpoints
```css
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 3 columns
- Detail page: max-w-6xl mx-auto
```

## Analytics Tracking
```typescript
// Bij project creatie
trackEvent('project_created', { status: project.status, wijk: project.wijk });

// Bij deelnemen
trackEvent('project_joined', { projectId });

// Bij contribution
trackEvent('project_contribution_added', { projectId, uren });

// Bij document upload
trackEvent('project_document_uploaded', { projectId, fileType });

// Bij uitnodiging
trackEvent('project_invitation_sent', { projectId });
```

## Testing Checklist
- [ ] Projecten lijst toont alle projecten
- [ ] Filters werken (status, zoeken)
- [ ] Nieuw project aanmaken werkt
- [ ] PDOK adres lookup werkt
- [ ] Locatie op kaart wordt getoond
- [ ] Deelnemen button werkt
- [ ] Voortgang slider update werkt
- [ ] Status dropdown update werkt
- [ ] Bijdrage toevoegen werkt
- [ ] Document upload werkt
- [ ] Externe uitnodiging versturen werkt
- [ ] Invite accept flow werkt
- [ ] Tabs navigatie werkt
- [ ] Dark mode support overal
- [ ] Mobile responsive
- [ ] Role permissions (alleen creator/admin kan editten)
- [ ] Toast notifications bij acties

## File Structure
```
src/
├── pages/
│   ├── ProjectsPage.tsx
│   ├── ProjectDetailPage.tsx
│   └── ProjectInviteAcceptPage.tsx
├── components/
│   ├── ProjectCard.tsx
│   ├── ProjectMarker.tsx (voor maps)
│   ├── ContributionModal.tsx
│   ├── InviteModal.tsx
│   └── UploadModal.tsx
└── types.ts (update met Project types)
```

Succes met het bouwen van de Projecten module! 🚀
