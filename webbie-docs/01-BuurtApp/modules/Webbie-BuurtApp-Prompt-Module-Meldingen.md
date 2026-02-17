# AI Prompt: Meldingen (Issues) Module - Buurtconciërge App

## Context
Je gaat een complete Meldingen (Issues) module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module is het centrale systeem voor het registreren, beheren en afhandelen van wijkproblemen en klachten door buurtconciërges.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 6.4
- **Styling:** Tailwind CSS 3.4 (dark mode support)
- **State Management:** React Context API
- **Routing:** React Router v6 (HashRouter)
- **Backend:** Firebase (Firestore, Storage)
- **Maps:** Leaflet voor kaartweergave
- **Export:** xlsx voor Excel, jspdf voor PDF
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit
1. **Overzichtspagina (IssuesPage)**
   - Lijst van alle meldingen
   - Filters: status, categorie, wijk, gebruiker, datumbereik
   - Zoekfunctionaliteit met debouncing (300ms)
   - Bulk selectie met checkboxes
   - Bulk acties: status wijzigen, exporteren naar Excel/PDF
   - Keyboard shortcuts: Ctrl+A (select all), Delete (bulk delete)
   - Responsive design (mobile-first)
   - Dark mode support

2. **Nieuwe Melding Pagina (NieuweMeldingPage)**
   - Formulier met validatie
   - Titel (verplicht, min 3 chars)
   - Omschrijving (verplicht, min 10 chars)
   - Categorie dropdown (17 categorieën)
   - Wijk dropdown (5 wijken: Atol, Boswijk, Jol, Waterwijk, Zuiderzeewijk)
   - Adres lookup via PDOK API (autocomplete)
   - Locatie selectie op kaart (Leaflet)
   - Media upload (foto's, video's, max 10 bestanden)
   - Preview van uploads
   - Submit met loading state
   - Success/error toasts

3. **Melding Detail Modal/Page**
   - Volledige melding details
   - Status badge met kleuren
   - Locatie op kaart (indien beschikbaar)
   - Media gallery met fullscreen viewer
   - Updates timeline
   - Update toevoegen functionaliteit
   - Status wijzigen dropdown (met confirmatie)
   - Fixi integratie knop (optioneel)
   - Laatste wijziging timestamp

4. **Componenten**
   - `MeldingMarker` - Kaartmarker component voor op maps
   - `BulkActionsToolbar` - Sticky toolbar voor bulk acties
   - `MediaGallery` - Gallery component met viewer

## Data Model

### TypeScript Interfaces

```typescript
export enum MeldingStatus {
  InBehandeling = 'In behandeling',
  FixiMeldingGemaakt = 'Fixi melding gemaakt',
  Afgerond = 'Afgerond',
}

export interface Locatie {
  lat: number;
  lon: number;
  adres?: string;
}

export interface MeldingUpdate {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
  attachments: string[]; // URLs naar Storage
}

export interface Melding {
  id: string;
  titel: string;
  omschrijving: string;
  status: MeldingStatus;
  attachments: string[]; // Firebase Storage URLs
  locatie?: Locatie;
  timestamp: Date;
  gebruikerId: string;
  wijk: string;
  categorie: string;
  updates: MeldingUpdate[];
  afgerondTimestamp?: Date;
}
```

## Categorieën (17 stuks)
```typescript
const CATEGORIES = [
  'Afval',
  'Groen',
  'Overlast',
  'Verkeer',
  'Verlichting',
  'Speeltoestellen',
  'Vandalisme',
  'Graffiti',
  'Riool',
  'Gladheid',
  'Zwerfafval',
  'Hondenpoep',
  'Fietswrak',
  'Container vol',
  'Losliggende stoeptegel',
  'Straatmeubilair',
  'Overig'
];
```

## Wijken (5 stuks)
```typescript
const WIJKEN = [
  'Atol',
  'Boswijk',
  'Jol',
  'Waterwijk',
  'Zuiderzeewijk'
];
```

## UI/UX Requirements

### IssuesPage Layout
```tsx
// Structuur:
// 1. Header met titel + "Nieuwe Melding" button (rechtsboven)
// 2. Filters sectie (collapsible op mobile)
//    - Zoekbalk (met debounce)
//    - Status filter (multi-select)
//    - Categorie filter (multi-select)
//    - Wijk filter (multi-select)
//    - Datum range picker
//    - "Clear filters" button
// 3. Bulk acties toolbar (sticky, only visible when items selected)
// 4. Meldingen lijst
//    - Table op desktop (columns: checkbox, titel, status, categorie, wijk, datum, acties)
//    - Cards op mobile (stacked, met checkbox)
// 5. Pagination (indien >50 items)
```

### Styling Classes (Tailwind)
```css
/* Status badges */
.status-in-behandeling: bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300
.status-fixi: bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300
.status-afgerond: bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300

/* Card hover effect */
hover:shadow-lg transition-shadow duration-200

/* Mobile responsiveness */
hidden md:table-cell (voor table columns)
flex flex-col md:hidden (voor mobile cards)
```

## Firebase Integration

### Firestore Collection Structure
```
meldingen/
  {meldingId}/
    id: string
    titel: string
    omschrijving: string
    status: string
    attachments: string[]
    locatie: { lat: number, lon: number, adres?: string }
    timestamp: Timestamp
    gebruikerId: string
    wijk: string
    categorie: string
    updates: array
    afgerondTimestamp: Timestamp | null
```

### Storage Structure
```
meldingen/{meldingId}/{filename}
```

### Context API Functies (te gebruiken)
```typescript
// Van AppContext:
const {
  meldingen, // Array<Melding>
  currentUser, // User | null
  addMelding, // (melding: Omit<Melding, 'id'>) => Promise<string>
  updateMeldingStatus, // (id: string, status: MeldingStatus) => Promise<void>
  addMeldingUpdate, // (meldingId: string, update: Omit<MeldingUpdate, 'id'>) => Promise<void>
  uploadFile, // (file: File, path: string) => Promise<string>
} = useAppContext();
```

## PDOK API Integration

### Adres Autocomplete
```typescript
// Endpoint voor suggestions
const PDOK_SUGGEST_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';

// Query params:
// ?q={searchTerm}&fq=type:adres

// Response format:
{
  response: {
    docs: Array<{
      id: string,
      weergavenaam: string, // "Straatnaam 123, Plaatsnaam"
      score: number
    }>
  }
}

// Endpoint voor lookup (get coordinates)
const PDOK_LOOKUP_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup';

// Query params:
// ?id={docId}

// Response:
{
  response: {
    docs: Array<{
      centroide_ll: string, // "POINT(5.123 52.456)"
      straatnaam: string,
      huisnummer: number,
      postcode: string,
      woonplaatsnaam: string
    }>
  }
}

// Parse coordinates:
const parseCoords = (centroide: string) => {
  const match = centroide.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  return match ? { lon: parseFloat(match[1]), lat: parseFloat(match[2]) } : null;
};
```

## Component Examples

### IssuesPage.tsx Skeleton
```tsx
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { Button, Input, Select, Badge } from '@/components/ui';
import { BulkActionsToolbar } from '@/components/BulkActionsToolbar';
import { exportToExcel } from '@/services/excelExport';
import { exportMeldingenToPDF } from '@/services/pdfExport';
import { Search, Plus, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const IssuesPage: React.FC = () => {
  const { meldingen, currentUser, updateMeldingStatus } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categorieFilter, setCategorieFilter] = useState<string[]>([]);
  const [wijkFilter, setWijkFilter] = useState<string[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredMeldingen = useMemo(() => {
    return meldingen.filter(m => {
      // Search filter
      if (debouncedSearch && !m.titel.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(m.status)) {
        return false;
      }
      // Categorie filter
      if (categorieFilter.length > 0 && !categorieFilter.includes(m.categorie)) {
        return false;
      }
      // Wijk filter
      if (wijkFilter.length > 0 && !wijkFilter.includes(m.wijk)) {
        return false;
      }
      return true;
    });
  }, [meldingen, debouncedSearch, statusFilter, categorieFilter, wijkFilter]);

  const {
    selectedIds,
    isSelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    selectedItems
  } = useBulkSelection(filteredMeldingen);

  const handleBulkStatusChange = async (newStatus: MeldingStatus) => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateMeldingStatus(id, newStatus))
      );
      toast.success(`${selectedIds.size} meldingen bijgewerkt`);
      clearSelection();
    } catch (error) {
      toast.error('Er ging iets mis');
    }
  };

  const handleExportExcel = () => {
    exportToExcel(selectedItems.length > 0 ? selectedItems : filteredMeldingen, 'meldingen');
    toast.success('Excel geëxporteerd');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meldingen</h1>
        <Button onClick={() => navigate('/#/nieuwe-melding')}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Melding
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <Input
            type="text"
            placeholder="Zoeken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />

          {/* Status filter */}
          <MultiSelect
            options={Object.values(MeldingStatus)}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
          />

          {/* Categorie filter */}
          <MultiSelect
            options={CATEGORIES}
            selected={categorieFilter}
            onChange={setCategorieFilter}
            placeholder="Categorie"
          />

          {/* Wijk filter */}
          <MultiSelect
            options={WIJKEN}
            selected={wijkFilter}
            onChange={setWijkFilter}
            placeholder="Wijk"
          />
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          onStatusChange={handleBulkStatusChange}
          onExport={handleExportExcel}
        />
      )}

      {/* Meldingen List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredMeldingen.length}
                    onChange={() => toggleAll()}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Titel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Wijk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMeldingen.map(melding => (
                <tr key={melding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected(melding.id)}
                      onChange={() => toggleSelection(melding.id)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {melding.titel}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(melding.status)}>
                      {melding.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {melding.categorie}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {melding.wijk}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(melding.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Button size="sm" onClick={() => openDetailModal(melding)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-4 p-4">
          {filteredMeldingen.map(melding => (
            <div
              key={melding.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <input
                  type="checkbox"
                  checked={isSelected(melding.id)}
                  onChange={() => toggleSelection(melding.id)}
                />
                <Badge variant={getStatusVariant(melding.status)}>
                  {melding.status}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {melding.titel}
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p><strong>Categorie:</strong> {melding.categorie}</p>
                <p><strong>Wijk:</strong> {melding.wijk}</p>
                <p><strong>Datum:</strong> {formatDate(melding.timestamp)}</p>
              </div>
              <Button size="sm" className="mt-3 w-full" onClick={() => openDetailModal(melding)}>
                Details bekijken
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getStatusVariant = (status: MeldingStatus): 'success' | 'warning' | 'info' => {
  switch (status) {
    case MeldingStatus.Afgerond:
      return 'success';
    case MeldingStatus.InBehandeling:
      return 'warning';
    case MeldingStatus.FixiMeldingGemaakt:
      return 'info';
  }
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
```

### NieuweMeldingPage.tsx Skeleton
```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Upload, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MeldingStatus } from '@/types';

export const NieuweMeldingPage: React.FC = () => {
  const navigate = useNavigate();
  const { addMelding, uploadFile, currentUser } = useAppContext();

  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [categorie, setCategorie] = useState('');
  const [wijk, setWijk] = useState('');
  const [adres, setAdres] = useState('');
  const [locatie, setLocatie] = useState<{ lat: number; lon: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDOK autocomplete
  const [adresSuggesties, setAdresSuggesties] = useState<any[]>([]);
  const [showSuggesties, setShowSuggesties] = useState(false);

  const handleAdresSearch = async (searchTerm: string) => {
    setAdres(searchTerm);
    if (searchTerm.length < 3) {
      setAdresSuggesties([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(searchTerm)}&fq=type:adres`
      );
      const data = await response.json();
      setAdresSuggesties(data.response.docs);
      setShowSuggesties(true);
    } catch (error) {
      console.error('PDOK API error:', error);
    }
  };

  const handleAdresSelect = async (suggestion: any) => {
    setAdres(suggestion.weergavenaam);
    setShowSuggesties(false);

    // Lookup coordinates
    try {
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${suggestion.id}`
      );
      const data = await response.json();
      const doc = data.response.docs[0];

      if (doc?.centroide_ll) {
        const match = doc.centroide_ll.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        if (match) {
          setLocatie({
            lon: parseFloat(match[1]),
            lat: parseFloat(match[2])
          });
        }
      }
    } catch (error) {
      console.error('PDOK lookup error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 10) {
        toast.error('Maximum 10 bestanden toegestaan');
        return;
      }
      setFiles([...files, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!titel || titel.length < 3) {
      toast.error('Titel moet minimaal 3 karakters bevatten');
      return;
    }
    if (!omschrijving || omschrijving.length < 10) {
      toast.error('Omschrijving moet minimaal 10 karakters bevatten');
      return;
    }
    if (!categorie) {
      toast.error('Selecteer een categorie');
      return;
    }
    if (!wijk) {
      toast.error('Selecteer een wijk');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, `meldingen/temp/${file.name}`);
        attachmentUrls.push(url);
      }

      // Create melding
      const meldingId = await addMelding({
        titel,
        omschrijving,
        status: MeldingStatus.InBehandeling,
        categorie,
        wijk,
        locatie: locatie ? { ...locatie, adres } : undefined,
        attachments: attachmentUrls,
        gebruikerId: currentUser!.id,
        timestamp: new Date(),
        updates: [],
      });

      toast.success('Melding aangemaakt');
      navigate('/#/meldingen');
    } catch (error) {
      console.error('Error creating melding:', error);
      toast.error('Er ging iets mis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Nieuwe Melding
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* Titel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Titel *
          </label>
          <Input
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Korte beschrijving van het probleem"
            required
          />
        </div>

        {/* Omschrijving */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Omschrijving *
          </label>
          <Textarea
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Uitgebreide beschrijving van de melding"
            rows={5}
            required
          />
        </div>

        {/* Categorie & Wijk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categorie *
            </label>
            <Select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              required
            >
              <option value="">Selecteer categorie</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wijk *
            </label>
            <Select
              value={wijk}
              onChange={(e) => setWijk(e.target.value)}
              required
            >
              <option value="">Selecteer wijk</option>
              {WIJKEN.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Adres met PDOK autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Adres (optioneel)
          </label>
          <Input
            type="text"
            value={adres}
            onChange={(e) => handleAdresSearch(e.target.value)}
            placeholder="Begin te typen voor suggesties..."
            icon={<MapPin className="w-4 h-4" />}
          />

          {showSuggesties && adresSuggesties.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {adresSuggesties.map((sug) => (
                <div
                  key={sug.id}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => handleAdresSelect(sug)}
                >
                  {sug.weergavenaam}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kaart (indien locatie) */}
        {locatie && (
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[locatie.lat, locatie.lon]}
              zoom={15}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[locatie.lat, locatie.lon]} />
            </MapContainer>
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Foto's / Video's (max 10)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
          >
            <Upload className="w-6 h-6 mr-2 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              Klik om bestanden te uploaden
            </span>
          </label>

          {/* File previews */}
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Melding indienen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/#/meldingen')}
          >
            Annuleren
          </Button>
        </div>
      </form>
    </div>
  );
};
```

## Keyboard Shortcuts
Implementeer met `useKeyboardShortcuts` hook:
```typescript
useKeyboardShortcuts({
  'ctrl+a': (e) => {
    e.preventDefault();
    toggleAll();
  },
  'ctrl+n': () => {
    navigate('/#/nieuwe-melding');
  },
  'delete': () => {
    if (selectedIds.size > 0) {
      handleBulkDelete();
    }
  },
  'escape': () => {
    clearSelection();
    closeModals();
  }
});
```

## Export Functies

### Excel Export
```typescript
import * as XLSX from 'xlsx';

export const exportMeldingenToExcel = (meldingen: Melding[]) => {
  const data = meldingen.map(m => ({
    'Titel': m.titel,
    'Omschrijving': m.omschrijving,
    'Status': m.status,
    'Categorie': m.categorie,
    'Wijk': m.wijk,
    'Adres': m.locatie?.adres || '',
    'Datum': formatDate(m.timestamp),
    'Afgerond': m.afgerondTimestamp ? formatDate(m.afgerondTimestamp) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Meldingen');

  const fileName = `meldingen_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
```

### PDF Export
```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportMeldingenToPDF = (meldingen: Melding[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Meldingen Rapport', 14, 22);

  doc.setFontSize(11);
  doc.text(`Gegenereerd op: ${formatDate(new Date())}`, 14, 32);

  const tableData = meldingen.map(m => [
    m.titel,
    m.status,
    m.categorie,
    m.wijk,
    formatDate(m.timestamp),
  ]);

  (doc as any).autoTable({
    startY: 40,
    head: [['Titel', 'Status', 'Categorie', 'Wijk', 'Datum']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  doc.save(`meldingen_${new Date().toISOString().split('T')[0]}.pdf`);
};
```

## Analytics Tracking
Voeg tracking toe voor belangrijke acties:
```typescript
import { trackEvent } from '@/services/analytics';

// Bij nieuwe melding
trackEvent('melding_created', { categorie: melding.categorie });

// Bij status wijziging
trackEvent('melding_status_changed', {
  from: oldStatus,
  to: newStatus
});

// Bij export
trackEvent('export_completed', {
  type: 'excel',
  itemCount: meldingen.length
});

// Bij bulk actie
trackEvent('bulk_action', {
  action: 'status_change',
  itemCount: selectedIds.size
});
```

## Testing Checklist
- [ ] Nieuwe melding aanmaken (met en zonder foto's)
- [ ] PDOK autocomplete werkt
- [ ] Locatie wordt correct op kaart getoond
- [ ] Filters werken (status, categorie, wijk)
- [ ] Zoeken met debounce werkt
- [ ] Bulk selectie (select all, individual)
- [ ] Bulk status wijzigen werkt
- [ ] Excel export bevat alle data
- [ ] PDF export is leesbaar
- [ ] Dark mode werkt overal
- [ ] Mobile responsive (cards ipv table)
- [ ] Keyboard shortcuts werken
- [ ] Toasts tonen bij succes/error
- [ ] Loading states tijdens API calls
- [ ] Validation errors worden getoond

## Bestand Structuur
```
src/
├── pages/
│   ├── IssuesPage.tsx
│   └── NieuweMeldingPage.tsx
├── components/
│   ├── MeldingMarker.tsx
│   ├── BulkActionsToolbar.tsx
│   └── MediaGallery.tsx
├── hooks/
│   ├── useDebounce.ts
│   └── useBulkSelection.ts
├── services/
│   ├── excelExport.ts
│   └── pdfExport.ts
└── types.ts (update met Melding types)
```

## Laatste Requirements
- **Nederlandse taal** in alle UI teksten
- **Accessibility:** aria-labels op interactieve elementen
- **Error boundaries:** Wrap pages in ErrorBoundary
- **Toast notifications:** Bij elke actie (success/error)
- **Loading states:** Spinners/skeletons tijdens laden
- **Optimistic updates:** UI update voor Firestore confirm
- **Form validation:** Client-side + server-side
- **Role checking:** Alleen Conciërge/Beheerder kan meldingen aanmaken

Succes met het bouwen van de Meldingen module! 🚀
