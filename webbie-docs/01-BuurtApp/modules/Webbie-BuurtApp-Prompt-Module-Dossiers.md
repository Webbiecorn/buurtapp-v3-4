# AI Prompt: Dossiers Module - Buurtconciërge App

## Context
Je gaat een complete Dossiers module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module beheert complete woningdossiers per adres met bewoners, notities, documenten, afspraken en volledige historie tracking. Dit is een complex, document-georiënteerd systeem met veel interactieve features.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 6.4
- **Styling:** Tailwind CSS 3.4 (dark mode support)
- **State Management:** React Context API
- **Routing:** React Router v6 (HashRouter)
- **Backend:** Firebase (Firestore, Storage)
- **Maps:** Leaflet voor adres visualisatie
- **Date handling:** date-fns
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **Dossier Overzicht (DossierPage)**
   - Lijst van alle dossiers (sorteerbaar)
   - Zoekbalk op adres (debounced)
   - Filters:
     - Status (Actief, Afgesloten, In onderzoek, Afspraak)
     - Labels (Woning, Bedrijf, Overig)
     - Gebruiker (creator)
   - "Nieuw Dossier" button met PDOK adres lookup
   - Dossier cards met:
     - Adres (grote tekst)
     - Status badge + labels badges
     - Aantal notities, documenten, bewoners, afspraken
     - Laatste wijziging timestamp
     - Preview thumbnail (eerste document)
   - Click op card → navigate naar detail

2. **Dossier Detail Page (DossierDetailPage)**
   - Header sectie:
     - Adres als titel
     - Status dropdown (wijzigbaar)
     - Labels multi-select
     - Woningtype input (optioneel)
     - Creator info + creation date
   - Tabs navigatie (6 tabs):
     - **Overzicht:** Kaart + linked meldingen/projecten + quick stats
     - **Notities:** Notities lijst met reacties (threaded), "Belangrijk" pinning
     - **Documenten:** Media gallery (foto's, PDF's, video's) met fullscreen viewer
     - **Bewoners:** Historisch overzicht bewoners met van/tot datums, contactinfo
     - **Afspraken:** Kalender-achtige weergave van afspraken per bewoner
     - **Historie:** Audit trail van alle wijzigingen (automatisch gelogd)
   - Floating Action Button voor snelle acties per tab

3. **Nieuw Dossier Modal**
   - Adres lookup via PDOK API (autocomplete)
   - Check of dossier al bestaat (unique per adres)
   - Automatisch ophalen geo-coördinaten
   - Initiële status selectie (default: Actief)
   - Labels selectie (Woning, Bedrijf, Overig)
   - Woningtype input (optioneel: eengezinswoning, appartement, etc.)
   - Submit → create in Firestore
   - Navigate naar detail page

4. **Notities Systeem**
   - Notitie toevoegen: textarea + "Belangrijk" checkbox
   - Notities lijst met tijdlijn layout
   - Markeer als belangrijk (pin icon, gele border)
   - Reacties per notitie (threaded comments)
   - Edit/delete eigen notities (binnen 24u of als admin)
   - User avatar + naam + timestamp bij elke notitie

5. **Documenten Systeem**
   - Upload button: meerdere bestanden tegelijk
   - Accept types: image/*, application/pdf, video/*
   - Preview grid (thumbnails)
   - Click → fullscreen overlay viewer met:
     - Pijltoets navigatie (← →)
     - ESC om te sluiten
     - Download button
     - Delete button (creator/admin)
   - Images: direct render
   - PDF: iframe embed
   - Video: HTML5 video player met controls

6. **Bewoners Systeem**
   - Bewoner toevoegen modal:
     - Naam (required)
     - Contact (telefoon/email)
     - Van datum (required)
     - Tot datum (optioneel, null = nog inwonend)
     - Extra info (textarea)
   - Bewoners lijst (gesorteerd op van-datum DESC)
   - Huidige bewoner(s) bovenaan (to = null), groene badge
   - Voormalige bewoners daaronder, grijze badge
   - Edit/delete bewoner (creator/admin)
   - Koppeling met afspraken (per bewoner)

7. **Afspraken Systeem**
   - Afspraak toevoegen modal:
     - Start datum/tijd (required)
     - Eind datum/tijd (optioneel)
     - Omschrijving (textarea)
     - Bewoner selectie (dropdown van huidige bewoners)
   - Afspraken lijst (chronologisch, toekomstige eerst)
   - Groeperen per maand
   - Bewoner naam + beschrijving + tijdstip
   - Edit/delete afspraak
   - Optioneel: badge op dossier card als afspraak binnen 7 dagen

8. **Historie Tracking (Automatisch)**
   - Log elke wijziging in dossier:
     - Notitie toegevoegd
     - Document geüpload
     - Bewoner toegevoegd/verwijderd
     - Afspraak gemaakt/gewijzigd
     - Status gewijzigd
     - Labels gewijzigd
   - Historie entries:
     - Type (icon)
     - Beschrijving (bijv. "Notitie toegevoegd: [eerste 50 chars]")
     - Datum + tijd
     - Gebruiker (naam + avatar)
   - Read-only (no edit/delete)

## Data Model

### TypeScript Interfaces

```typescript
export type DossierStatus = 'actief' | 'afgesloten' | 'in onderzoek' | 'afspraak';
export type DossierLabel = 'woning' | 'bedrijf' | 'overig';

export interface DossierNotitie {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
  isBelangrijk: boolean;
  reacties?: DossierReactie[];
}

export interface DossierReactie {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
}

export interface DossierDocument {
  id: string;
  url: string; // Firebase Storage URL
  name: string;
  uploadedAt: Date;
  userId: string;
  type?: string; // mime type
  size?: number; // bytes
}

export interface DossierBewoner {
  id: string;
  name: string;
  contact: string; // telefoon of email
  from: Date; // start bewoning
  to?: Date | null; // einde bewoning (null = nog steeds inwonend)
  extraInfo?: string;
}

export interface DossierAfspraak {
  id: string;
  start: Date;
  end?: Date | null;
  description?: string;
  bewonerId?: string; // koppeling met bewoner
  bewonerNaam?: string; // cache voor display
  createdBy: string;
  createdAt: Date;
}

export interface DossierHistorieItem {
  id: string;
  type: 'notitie' | 'document' | 'bewoner' | 'afspraak' | 'status' | 'label' | 'overig';
  description: string; // Bijv: "Notitie toegevoegd: Klacht over geluidsoverlast"
  date: Date;
  userId: string;
}

export interface WoningDossier {
  id: string; // uniek adres (formatted string)
  adres: string;
  gebruikerId: string; // creator
  location?: { lat: number; lon: number } | null;
  woningType?: string | null; // bijv: "Eengezinswoning", "Appartement"
  notities: DossierNotitie[];
  documenten: DossierDocument[];
  afspraken: DossierAfspraak[];
  bewoners: DossierBewoner[];
  historie: DossierHistorieItem[];
  status: DossierStatus;
  labels: DossierLabel[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Firebase Integration

### Firestore Collection
```
woningdossiers/
  {dossierId}/ (formatted adres als ID)
    id: string
    adres: string
    gebruikerId: string
    location: { lat, lon } | null
    woningType: string | null
    notities: array
    documenten: array
    afspraken: array
    bewoners: array
    historie: array
    status: string
    labels: array
    createdAt: Timestamp
    updatedAt: Timestamp
```

### Storage Structure
```
dossiers/{dossierId}/{documentId}_{filename}
```

### Context API Functions
```typescript
const {
  dossiers, // WoningDossier[]
  currentUser,
  users,

  // CRUD
  getDossier, // (adres: string) => WoningDossier | undefined
  createNewDossier, // (adres, location, ...) => Promise<string>
  updateDossierStatus, // (dossierId, status) => Promise<void>
  updateDossierLabels, // (dossierId, labels) => Promise<void>

  // Notities
  addDossierNotitie, // (dossierId, notitie) => Promise<string>
  addDossierReactie, // (dossierId, notitieId, reactie) => Promise<void>
  toggleDossierNotitiebelangrijk, // (dossierId, notitieId) => Promise<void>

  // Documenten
  uploadDossierDocument, // (dossierId, file) => Promise<string>
  deleteDossierDocument, // (dossierId, documentId) => Promise<void>

  // Bewoners
  addDossierBewoner, // (dossierId, bewoner) => Promise<string>
  removeDossierBewoner, // (dossierId, bewonerId) => Promise<void>
  updateDossierBewoner, // (dossierId, bewonerId, updates) => Promise<void>

  // Afspraken
  addDossierAfspraak, // (dossierId, afspraak) => Promise<string>
  updateDossierAfspraak, // (dossierId, afspraakId, updates) => Promise<void>
  deleteDossierAfspraak, // (dossierId, afspraakId) => Promise<void>

  // Historie (automatisch via andere functies)
  logDossierHistorie, // (dossierId, type, description) => Promise<void>
} = useAppContext();
```

## Component Examples

### DossierPage.tsx Skeleton
```tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { Button, Input, Badge, MultiSelect } from '@/components/ui';
import { Plus, Search, FileText, Users, Calendar, MapPin } from 'lucide-react';
import { DossierStatus, DossierLabel } from '@/types';

export const DossierPage: React.FC = () => {
  const navigate = useNavigate();
  const { dossiers } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DossierStatus[]>([]);
  const [labelFilter, setLabelFilter] = useState<DossierLabel[]>([]);
  const [showNewDossierModal, setShowNewDossierModal] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      if (debouncedSearch && !d.adres.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(d.status)) {
        return false;
      }
      if (labelFilter.length > 0 && !labelFilter.some(l => d.labels.includes(l))) {
        return false;
      }
      return true;
    });
  }, [dossiers, debouncedSearch, statusFilter, labelFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dossiers
        </h1>
        <Button onClick={() => setShowNewDossierModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Dossier
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Zoek op adres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />

          <MultiSelect
            options={['actief', 'afgesloten', 'in onderzoek', 'afspraak']}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
          />

          <MultiSelect
            options={['woning', 'bedrijf', 'overig']}
            selected={labelFilter}
            onChange={setLabelFilter}
            placeholder="Labels"
          />
        </div>
      </div>

      {/* Dossiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDossiers.map(dossier => (
          <DossierCard
            key={dossier.id}
            dossier={dossier}
            onClick={() => navigate(`/#/dossiers/${encodeURIComponent(dossier.id)}`)}
          />
        ))}
      </div>

      {/* New Dossier Modal */}
      {showNewDossierModal && (
        <NewDossierModal
          isOpen={showNewDossierModal}
          onClose={() => setShowNewDossierModal(false)}
        />
      )}
    </div>
  );
};

const DossierCard: React.FC<{ dossier: WoningDossier; onClick: () => void }> = ({
  dossier,
  onClick,
}) => {
  const getStatusColor = (status: DossierStatus) => {
    switch (status) {
      case 'actief': return 'success';
      case 'afgesloten': return 'secondary';
      case 'in onderzoek': return 'warning';
      case 'afspraak': return 'info';
    }
  };

  const huidigeBewoners = dossier.bewoners.filter(b => !b.to);
  const komendAfspraken = dossier.afspraken.filter(a => a.start > new Date());

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-5"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {dossier.adres}
          </h3>
          {dossier.woningType && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dossier.woningType}
            </p>
          )}
        </div>
        <Badge variant={getStatusColor(dossier.status)}>
          {dossier.status}
        </Badge>
      </div>

      {/* Labels */}
      {dossier.labels.length > 0 && (
        <div className="flex gap-2 mb-4">
          {dossier.labels.map(label => (
            <Badge key={label} variant="secondary" size="sm">
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <FileText className="w-4 h-4" />
          <span>{dossier.notities.length} notities</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4" />
          <span>{huidigeBewoners.length} bewoner(s)</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <MapPin className="w-4 h-4" />
          <span>{dossier.documenten.length} documenten</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>{komendAfspraken.length} afspraak(en)</span>
        </div>
      </div>

      {/* Laatste wijziging */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Laatst bijgewerkt: {formatDistance(dossier.updatedAt)} geleden
      </div>
    </div>
  );
};
```

### DossierDetailPage.tsx Structure
```tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Tabs, Button, Badge } from '@/components/ui';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

export const DossierDetailPage: React.FC = () => {
  const { dossierId } = useParams<{ dossierId: string }>();
  const decodedId = decodeURIComponent(dossierId || '');
  const { dossiers } = useAppContext();

  const dossier = dossiers.find(d => d.id === decodedId);
  const [activeTab, setActiveTab] = useState('overzicht');

  if (!dossier) {
    return <div>Dossier niet gevonden</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <DossierHeader dossier={dossier} />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overzicht', label: 'Overzicht' },
          { id: 'notities', label: `Notities (${dossier.notities.length})` },
          { id: 'documenten', label: `Documenten (${dossier.documenten.length})` },
          { id: 'bewoners', label: `Bewoners (${dossier.bewoners.length})` },
          { id: 'afspraken', label: `Afspraken (${dossier.afspraken.length})` },
          { id: 'historie', label: 'Historie' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overzicht' && <OverzichtTab dossier={dossier} />}
        {activeTab === 'notities' && <NotitiesTab dossier={dossier} />}
        {activeTab === 'documenten' && <DocumentenTab dossier={dossier} />}
        {activeTab === 'bewoners' && <BewonersTab dossier={dossier} />}
        {activeTab === 'afspraken' && <AfsprakenTab dossier={dossier} />}
        {activeTab === 'historie' && <HistorieTab dossier={dossier} />}
      </div>
    </div>
  );
};

// Implement each tab component separately
const NotitiesTab: React.FC<{ dossier: WoningDossier }> = ({ dossier }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Sort: belangrijke eerst, dan chronologisch DESC
  const sortedNotities = [...dossier.notities].sort((a, b) => {
    if (a.isBelangrijk && !b.isBelangrijk) return -1;
    if (!a.isBelangrijk && b.isBelangrijk) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <div>
      <Button onClick={() => setShowAddModal(true)} className="mb-4">
        + Notitie toevoegen
      </Button>

      <div className="space-y-4">
        {sortedNotities.map(notitie => (
          <NotitieCard key={notitie.id} notitie={notitie} dossierId={dossier.id} />
        ))}
      </div>

      {showAddModal && (
        <AddNotitieModal
          dossierId={dossier.id}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

const NotitieCard: React.FC<{ notitie: DossierNotitie; dossierId: string }> = ({
  notitie,
  dossierId,
}) => {
  const { users, currentUser, addDossierReactie } = useAppContext();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const author = users.find(u => u.id === notitie.userId);

  const handleReply = async () => {
    if (!replyText.trim()) return;

    await addDossierReactie(dossierId, notitie.id, {
      text: replyText,
      userId: currentUser!.id,
      timestamp: new Date(),
    });

    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${
        notitie.isBelangrijk ? 'border-2 border-yellow-400' : 'border border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <img
            src={author?.avatarUrl}
            alt={author?.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {author?.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(notitie.timestamp)}
            </p>
          </div>
        </div>
        {notitie.isBelangrijk && (
          <Badge variant="warning">Belangrijk</Badge>
        )}
      </div>

      {/* Content */}
      <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
        {notitie.text}
      </p>

      {/* Reacties */}
      {notitie.reacties && notitie.reacties.length > 0 && (
        <div className="ml-6 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {notitie.reacties.map(reactie => {
            const reactieAuthor = users.find(u => u.id === reactie.userId);
            return (
              <div key={reactie.id}>
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={reactieAuthor?.avatarUrl}
                    alt={reactieAuthor?.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <p className="text-sm font-medium">{reactieAuthor?.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(reactie.timestamp)}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {reactie.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply button */}
      <button
        onClick={() => setShowReplyInput(!showReplyInput)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
      >
        Reageren
      </button>

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Typ je reactie..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
          <Button size="sm" onClick={handleReply}>
            Verstuur
          </Button>
        </div>
      )}
    </div>
  );
};
```

### DocumentenTab with Fullscreen Viewer
```tsx
const DocumentenTab: React.FC<{ dossier: WoningDossier }> = ({ dossier }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const handleKeyPress = (e: KeyboardEvent) => {
    if (selectedIndex === null) return;

    if (e.key === 'ArrowLeft' && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (e.key === 'ArrowRight' && selectedIndex < dossier.documenten.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (e.key === 'Escape') {
      setSelectedIndex(null);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedIndex]);

  return (
    <div>
      <Button onClick={() => setShowUpload(true)} className="mb-4">
        + Document uploaden
      </Button>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dossier.documenten.map((doc, index) => (
          <div
            key={doc.id}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-75"
          >
            {doc.type?.startsWith('image/') ? (
              <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
            ) : doc.type === 'application/pdf' ? (
              <div className="flex items-center justify-center h-full">
                <FileText className="w-12 h-12 text-gray-400" />
                <p className="text-xs mt-2">PDF</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Film className="w-12 h-12 text-gray-400" />
                <p className="text-xs mt-2">Video</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Viewer */}
      {selectedIndex !== null && (
        <FullscreenViewer
          documents={dossier.documenten}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadDocumentModal
          dossierId={dossier.id}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

const FullscreenViewer: React.FC<{
  documents: DossierDocument[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}> = ({ documents, currentIndex, onClose, onNavigate }) => {
  const doc = documents[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative w-full h-full p-8" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl z-10"
        >
          ×
        </button>

        {/* Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl"
          >
            ‹
          </button>
        )}
        {currentIndex < documents.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl"
          >
            ›
          </button>
        )}

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center">
          {doc.type?.startsWith('image/') ? (
            <img src={doc.url} alt={doc.name} className="max-w-full max-h-full object-contain" />
          ) : doc.type === 'application/pdf' ? (
            <iframe src={doc.url} className="w-full h-full" />
          ) : (
            <video src={doc.url} controls className="max-w-full max-h-full" />
          )}
        </div>

        {/* Info bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded">
          {doc.name} ({currentIndex + 1} / {documents.length})
        </div>
      </div>
    </div>
  );
};
```

## PDOK Integration for Address Lookup
```typescript
// Same as Meldingen module
const PDOK_SUGGEST_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';
const PDOK_LOOKUP_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup';

// In NewDossierModal:
// 1. Autocomplete adres input
// 2. Bij selectie: lookup coordinates
// 3. Check if dossier already exists: getDossier(adres)
// 4. If not exists: create with createNewDossier()
```

## Analytics Tracking
```typescript
trackEvent('dossier_created', { woningType });
trackEvent('dossier_notitie_added', { isImportant: notitie.isBelangrijk });
trackEvent('dossier_document_uploaded', { fileType, sizeKB });
trackEvent('dossier_bewoner_added');
trackEvent('dossier_afspraak_created');
trackEvent('dossier_status_changed', { from, to });
```

## Testing Checklist
- [ ] Nieuw dossier via PDOK lookup
- [ ] Check duplicate address prevention
- [ ] Status wijzigen werkt
- [ ] Labels multi-select werkt
- [ ] Notitie toevoegen (met/zonder belangrijk)
- [ ] Reacties op notities
- [ ] Document upload (image, PDF, video)
- [ ] Fullscreen viewer met keyboard nav (← → ESC)
- [ ] Bewoner toevoegen met datums
- [ ] Afspraak maken + koppeling bewoner
- [ ] Historie wordt automatisch gelogd
- [ ] Filters werken (status, labels, search)
- [ ] Dark mode support
- [ ] Mobile responsive
- [ ] Role permissions (creator/admin)

## File Structure
```
src/
├── pages/
│   ├── DossierPage.tsx
│   └── DossierDetailPage.tsx
├── components/
│   ├── DossierCard.tsx
│   ├── NotitieCard.tsx
│   ├── FullscreenViewer.tsx
│   ├── NewDossierModal.tsx
│   ├── AddNotitieModal.tsx
│   ├── AddBewonerModal.tsx
│   ├── AddAfspraakModal.tsx
│   └── UploadDocumentModal.tsx
└── types.ts (update)
```

Succes met het bouwen van de Dossiers module! 🏘️
