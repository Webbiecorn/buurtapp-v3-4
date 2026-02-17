# AI Prompt: Achterpaden Module - Buurtconciërge App

## Context
Je gaat een complete Achterpaden (Back Alleys) module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module is voor het registreren, beheren en analyseren van onderhoudswerk aan achterpaden in de wijk.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **Maps:** Leaflet + @vis.gl/react-google-maps
- **Charts:** Apache ECharts (echarts-for-react)
- **Firebase:** Firestore + Storage
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **AchterpadenOverzicht** (Main Landing)
   - Card grid met alle achterpaden
   - Per card:
     - Locatie (straat/gebied naam)
     - Status badge (Goed, Redelijk, Slecht, Urgent)
     - Laatste controle datum
     - Aantal geregistreerde acties
     - Foto thumbnail
     - "Details" button
   - Filters:
     - Status filter
     - Gebied/wijk filter
     - Datum range (laatste controle)
   - Search bar (locatie zoeken)
   - Sort opties (datum, status, naam)
   - "Nieuw Achterpad +" button

2. **AchterpadenRegistratie** (Form Page)
   - Multi-step form (3 stappen):
     - **Stap 1: Locatie**
       - Straat naam (input)
       - Gebied/wijk (select)
       - GPS coördinaten (auto via kaart of handmatig)
       - Leaflet kaart met click-to-place marker
       - Adres lookup via PDOK
     - **Stap 2: Status & Details**
       - Status (Goed, Redelijk, Slecht, Urgent)
       - Soort werk (select multi):
         - Onkruid verwijderen
         - Afval opruimen
         - Schade herstel
         - Groenonderhoud
         - Overig
       - Geschatte duur (uren)
       - Prioriteit (Laag, Normaal, Hoog)
       - Notities (textarea)
     - **Stap 3: Foto's**
       - Upload meerdere foto's (max 10)
       - Drag & drop support
       - Preview grid met delete buttons
   - Progress indicator (1/3, 2/3, 3/3)
   - "Vorige" en "Volgende" buttons
   - "Opslaan" button (laatste stap)

3. **AchterpadenBeheer** (Management Page)
   - Table view met alle achterpaden
   - Kolommen:
     - Locatie
     - Status badge
     - Laatste controle
     - Toegewezen aan (gebruiker)
     - Acties (edit, delete, complete)
   - Bulk actions:
     - Status wijzigen (meerdere tegelijk)
     - Toewijzen aan gebruiker
     - Exporteren naar Excel
   - Inline editing (click status → dropdown)
   - Sorting per kolom
   - Pagination (20 per pagina)

4. **AchterpadenKaartOverzicht** (Map View)
   - Full-screen kaart
   - Markers per achterpad:
     - Kleur per status:
       - Goed: groen
       - Redelijk: geel
       - Slecht: oranje
       - Urgent: rood
   - Marker clustering
   - Click marker → popup met:
     - Locatie naam
     - Status badge
     - Laatste controle
     - Foto thumbnail
     - "Details" button
   - Layer controls (status filters)
   - Heatmap toggle (optioneel)

5. **AchterpadenStatistieken** (Analytics)
   - KPI cards (top row):
     - Totaal achterpaden
     - Urgent status count
     - Gemiddelde duur per actie
     - Totale uren deze maand
   - Charts (ECharts):
     - Status distributie (pie chart)
     - Acties per maand (bar chart)
     - Uren per gebied (horizontal bar)
     - Soort werk breakdown (stacked bar)
     - Trend lijn (line chart - aantal controles over tijd)
   - Date range picker (filter alle data)
   - Export charts als PNG

6. **AchterpadenPage** (Detail View)
   - Header met:
     - Locatie naam (groot)
     - Status badge (editable)
     - Laatste controle datum
     - Edit en Delete buttons
   - Tabs:
     - **Overzicht:** Kaart, foto's, details
     - **Historie:** Timeline van acties
     - **Taken:** Todo lijst voor dit achterpad
     - **Documenten:** Uploaded bestanden
   - Quick actions:
     - Markeer als compleet
     - Nieuwe actie toevoegen
     - Status wijzigen
     - Toewijzen aan gebruiker

## Data Model

```typescript
export interface Achterpad {
  id: string;
  locatie: string; // Straat/gebied naam
  gebied: string; // Wijk
  coordinates: {
    lat: number;
    lon: number;
  };
  status: 'Goed' | 'Redelijk' | 'Slecht' | 'Urgent';
  soortWerk: string[]; // ['Onkruid verwijderen', 'Afval opruimen', ...]
  prioriteit: 'Laag' | 'Normaal' | 'Hoog';
  geschatteDuur: number; // uren
  notities: string;
  fotoPaths: string[]; // Storage paths
  laatsteControle: Date;
  toegewezenAan?: string; // userId
  createdBy: string; // userId
  createdAt: Date;
  updatedAt: Date;
  isCompleted: boolean;
  completedAt?: Date;
  acties: AchterpadActie[];
}

export interface AchterpadActie {
  id: string;
  achterpadId: string;
  type: 'Controle' | 'Onderhoud' | 'Herstel' | 'Opmerking';
  beschrijving: string;
  duur?: number; // uren
  uitgevoerdDoor: string; // userId
  uitgevoerdOp: Date;
  fotoPaths?: string[];
}

export interface AchterpadFilter {
  status?: string[];
  gebied?: string[];
  prioriteit?: string[];
  toegewezenAan?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}
```

## Firebase Integration

### Firestore Collection
```typescript
// Collection: 'achterpaden'
{
  id: string,
  locatie: string,
  gebied: string,
  coordinates: { lat: number, lon: number },
  status: string,
  soortWerk: string[],
  prioriteit: string,
  geschatteDuur: number,
  notities: string,
  fotoPaths: string[],
  laatsteControle: Timestamp,
  toegewezenAan: string,
  createdBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isCompleted: boolean,
  completedAt: Timestamp | null,
  acties: [
    {
      id: string,
      type: string,
      beschrijving: string,
      duur: number,
      uitgevoerdDoor: string,
      uitgevoerdOp: Timestamp,
      fotoPaths: string[]
    }
  ]
}
```

### Context API Functions
```typescript
// In AppContext.tsx
const addAchterpad = async (data: Omit<Achterpad, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'achterpaden'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

const updateAchterpad = async (id: string, updates: Partial<Achterpad>) => {
  await updateDoc(doc(db, 'achterpaden', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

const deleteAchterpad = async (id: string) => {
  await deleteDoc(doc(db, 'achterpaden', id));
};

const addAchterpadActie = async (achterpadId: string, actie: Omit<AchterpadActie, 'id'>) => {
  const newActie = {
    ...actie,
    id: Date.now().toString(),
    uitgevoerdOp: serverTimestamp(),
  };

  await updateDoc(doc(db, 'achterpaden', achterpadId), {
    acties: arrayUnion(newActie),
    laatsteControle: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

const uploadAchterpadFoto = async (achterpadId: string, file: File) => {
  const storageRef = ref(storage, `achterpaden/${achterpadId}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
};
```

## Component Examples

### AchterpadenOverzicht.tsx
```tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Card, Badge } from '@/components/ui';
import { Plus, Search, Filter, MapPin, Calendar } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { nl } from 'date-fns/locale';

export const AchterpadenOverzicht: React.FC = () => {
  const navigate = useNavigate();
  const { achterpaden, currentUser } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [gebiedFilter, setGebiedFilter] = useState<string[]>([]);

  const filteredAchterpaden = useMemo(() => {
    return achterpaden.filter(a => {
      if (searchQuery && !a.locatie.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(a.status)) {
        return false;
      }
      if (gebiedFilter.length > 0 && !gebiedFilter.includes(a.gebied)) {
        return false;
      }
      return true;
    });
  }, [achterpaden, searchQuery, statusFilter, gebiedFilter]);

  const statusOptions = ['Goed', 'Redelijk', 'Slecht', 'Urgent'];
  const gebieden = [...new Set(achterpaden.map(a => a.gebied))];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Achterpaden
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredAchterpaden.length} achterpaden gevonden
          </p>
        </div>

        {currentUser?.role !== 'Viewer' && (
          <Button onClick={() => navigate('/#/achterpaden/nieuw')}>
            <Plus className="w-5 h-5 mr-2" />
            Nieuw Achterpad
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek locatie..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        {/* Status Filter */}
        <select
          multiple
          value={statusFilter}
          onChange={(e) => setStatusFilter(Array.from(e.target.selectedOptions, o => o.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        >
          <option value="">Alle statussen</option>
          {statusOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Gebied Filter */}
        <select
          multiple
          value={gebiedFilter}
          onChange={(e) => setGebiedFilter(Array.from(e.target.selectedOptions, o => o.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        >
          <option value="">Alle gebieden</option>
          {gebieden.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {(statusFilter.length > 0 || gebiedFilter.length > 0) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter([]);
              setGebiedFilter([]);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchterpaden.map(achterpad => (
          <AchterpadCard key={achterpad.id} achterpad={achterpad} />
        ))}
      </div>

      {filteredAchterpaden.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Geen achterpaden gevonden
          </p>
        </div>
      )}
    </div>
  );
};

const AchterpadCard: React.FC<{ achterpad: Achterpad }> = ({ achterpad }) => {
  const navigate = useNavigate();

  const statusColors = {
    'Goed': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'Redelijk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    'Slecht': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    'Urgent': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/#/achterpaden/${achterpad.id}`)}
    >
      {/* Thumbnail */}
      {achterpad.fotoPaths[0] && (
        <img
          src={achterpad.fotoPaths[0]}
          alt={achterpad.locatie}
          className="w-full h-48 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {achterpad.locatie}
          </h3>
          <Badge className={statusColors[achterpad.status]}>
            {achterpad.status}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {achterpad.gebied}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDistance(achterpad.laatsteControle, new Date(), { locale: nl, addSuffix: true })}
            </span>
          </div>
          <div>
            {achterpad.acties.length} acties
          </div>
        </div>
      </div>
    </Card>
  );
};
```

### AchterpadenRegistratie.tsx (Simplified)
```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { toast } from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export const AchterpadenRegistratie: React.FC = () => {
  const navigate = useNavigate();
  const { addAchterpad, uploadAchterpadFoto, currentUser } = useAppContext();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    locatie: '',
    gebied: '',
    coordinates: { lat: 52.3738, lon: 4.8910 },
    status: 'Goed' as const,
    soortWerk: [] as string[],
    prioriteit: 'Normaal' as const,
    geschatteDuur: 2,
    notities: '',
    fotoPaths: [] as string[],
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step === 1 && !formData.locatie) {
      toast.error('Voer een locatie in');
      return;
    }
    if (step === 2 && formData.soortWerk.length === 0) {
      toast.error('Selecteer minimaal één soort werk');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Upload photos first
      const fotoPaths: string[] = [];
      for (const photo of photos) {
        const url = await uploadAchterpadFoto('temp', photo);
        fotoPaths.push(url);
      }

      // Create achterpad
      await addAchterpad({
        ...formData,
        fotoPaths,
        laatsteControle: new Date(),
        createdBy: currentUser!.id,
        isCompleted: false,
        acties: [],
      });

      toast.success('Achterpad toegevoegd');
      navigate('/#/achterpaden');
    } catch (error) {
      console.error('Error creating achterpad:', error);
      toast.error('Fout bij opslaan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Nieuw Achterpad Registreren
      </h1>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`flex-1 h-2 mx-1 rounded-full ${
              s <= step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Locatie */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Locatie (straat/gebied)"
            value={formData.locatie}
            onChange={(e) => setFormData({ ...formData, locatie: e.target.value })}
            placeholder="Bijv. Achterpad tussen Hoofdstraat 1-10"
            required
          />

          <Select
            label="Gebied/Wijk"
            value={formData.gebied}
            onChange={(e) => setFormData({ ...formData, gebied: e.target.value })}
            required
          >
            <option value="">Selecteer gebied</option>
            <option value="Boswijk">Boswijk</option>
            <option value="Leyenburg">Leyenburg</option>
            <option value="Morgenstond">Morgenstond</option>
          </Select>

          {/* Leaflet Map */}
          <div className="h-64 rounded-lg overflow-hidden">
            <MapContainer
              center={[formData.coordinates.lat, formData.coordinates.lon]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[formData.coordinates.lat, formData.coordinates.lon]} />
              <LocationPicker
                onLocationSelect={(lat, lon) =>
                  setFormData({ ...formData, coordinates: { lat, lon } })
                }
              />
            </MapContainer>
          </div>
        </div>
      )}

      {/* Step 2: Status & Details */}
      {step === 2 && (
        <div className="space-y-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            required
          >
            <option value="Goed">Goed</option>
            <option value="Redelijk">Redelijk</option>
            <option value="Slecht">Slecht</option>
            <option value="Urgent">Urgent</option>
          </Select>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Soort Werk (meerdere mogelijk)
            </label>
            {['Onkruid verwijderen', 'Afval opruimen', 'Schade herstel', 'Groenonderhoud', 'Overig'].map(werk => (
              <label key={werk} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.soortWerk.includes(werk)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, soortWerk: [...formData.soortWerk, werk] });
                    } else {
                      setFormData({ ...formData, soortWerk: formData.soortWerk.filter(w => w !== werk) });
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{werk}</span>
              </label>
            ))}
          </div>

          <Input
            label="Geschatte Duur (uren)"
            type="number"
            value={formData.geschatteDuur}
            onChange={(e) => setFormData({ ...formData, geschatteDuur: parseFloat(e.target.value) })}
            min="0.5"
            step="0.5"
          />

          <Textarea
            label="Notities"
            value={formData.notities}
            onChange={(e) => setFormData({ ...formData, notities: e.target.value })}
            rows={4}
          />
        </div>
      )}

      {/* Step 3: Foto's */}
      {step === 3 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Foto's Uploaden
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPhotos(files.slice(0, 10)); // Max 10
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/#/achterpaden')}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {step > 1 ? 'Vorige' : 'Annuleren'}
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext}>
            Volgende
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Check className="w-5 h-5 mr-2" />
            {isSubmitting ? 'Opslaan...' : 'Opslaan'}
          </Button>
        )}
      </div>
    </div>
  );
};

// Location Picker Component
const LocationPicker: React.FC<{ onLocationSelect: (lat: number, lon: number) => void }> = ({
  onLocationSelect,
}) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};
```

## Styling
Gebruik Tailwind + status kleuren:
- Goed: `bg-green-100 text-green-700`
- Redelijk: `bg-yellow-100 text-yellow-700`
- Slecht: `bg-orange-100 text-orange-700`
- Urgent: `bg-red-100 text-red-700`

## Analytics
```typescript
trackEvent('achterpad_created');
trackEvent('achterpad_status_changed', { from: oldStatus, to: newStatus });
trackEvent('achterpad_action_added', { type: actieType });
trackEvent('achterpaden_exported');
```

## Testing Checklist
- [ ] Registratie form compleet (3 stappen)
- [ ] Kaart click-to-place werkt
- [ ] Foto upload (max 10)
- [ ] Status filter werkt
- [ ] Search locatie werkt
- [ ] Bulk actions in beheer
- [ ] Kaart markers met correcte kleuren
- [ ] Statistieken charts tonen data
- [ ] PDOK adres lookup
- [ ] Export naar Excel
- [ ] Mobile responsive
- [ ] Dark mode support

Succes met Achterpaden! 🚶
