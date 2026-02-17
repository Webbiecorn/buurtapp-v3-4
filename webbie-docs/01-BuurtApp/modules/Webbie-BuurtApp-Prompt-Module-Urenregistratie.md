# AI Prompt: Urenregistratie Module - Buurtconciërge App

## Context
Je gaat een complete Urenregistratie (Time Tracking) module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module registreert gewerkte uren van conciërges met activiteit-categorieën, project-koppeling en exportmogelijkheden.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 6.4
- **Styling:** Tailwind CSS 3.4 (dark mode support)
- **State Management:** React Context API
- **Backend:** Firebase Firestore
- **Date/Time:** date-fns voor datum formatting
- **Export:** xlsx voor Excel export
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **Urenregistratie Overzicht (UrenregistratiePage)**
   - Tabel weergave van alle uren
   - Columns:
     - Datum
     - Gebruiker (naam + avatar)
     - Start tijd
     - Eind tijd
     - Totaal uren (berekend)
     - Activiteit type
     - Project (indien gekoppeld)
     - Wijk (indien van toepassing)
     - Omschrijving (truncated met tooltip)
     - Acties (edit/delete)
   - Filters:
     - Datumrange picker (vandaag, deze week, deze maand, custom)
     - Gebruiker filter (multi-select)
     - Activiteit filter (multi-select)
     - Project filter (dropdown)
     - Wijk filter (multi-select)
   - "Uren Registreren" button (rechtsboven)
   - Export naar Excel button (filtered data)
   - Totalen sectie:
     - Totaal uren gefilterde periode
     - Totaal per gebruiker
     - Totaal per activiteit
     - Totaal per project

2. **Uren Registreren Modal**
   - Formulier velden:
     - Datum (date picker, default vandaag)
     - Start tijd (time input, HH:MM)
     - Eind tijd (time input, HH:MM)
     - Activiteit dropdown (6 types, required)
     - Afhankelijk van activiteit:
       - **Project**: Project dropdown (uit projecten lijst)
       - **Wijkronde**: Wijk dropdown (5 wijken)
       - **Extern overleg**: Input veld "Partner naam"
       - **Overig**: Omschrijving textarea
   - Berekend uren weergave (real-time update bij tijd wijziging)
   - Validatie:
     - Eind tijd > start tijd
     - Minimum 0.25 uur (15 minuten)
     - Maximum 24 uur per registratie
   - Submit met loading state
   - Success toast

3. **Uren Bewerken Modal**
   - Zelfde formulier als registreren
   - Pre-fill met bestaande data
   - Alleen eigen uren bewerken (binnen 48u) of als admin
   - Update timestamp loggen

4. **Statistieken Sectie**
   - Cards met key metrics:
     - Totaal uren deze maand
     - Gemiddelde uren per dag
     - Meest voorkomende activiteit
     - Meest gekoppeld project
   - Charts (optioneel):
     - Uren per week (line chart)
     - Uren per activiteit (pie chart)
     - Uren per gebruiker (bar chart)

5. **Export Functionaliteit**
   - Excel export met:
     - Alle filtered uren
     - Formatted columns
     - Totaal row onderaan
     - Per-project subtotalen
     - Headers met datum range
   - Filename: `uren_export_YYYY-MM-DD.xlsx`

## Data Model

### TypeScript Interfaces

```typescript
export type UrenActiviteit =
  | 'Project'
  | 'Wijkronde'
  | 'Intern overleg'
  | 'Extern overleg'
  | 'Persoonlijke ontwikkeling'
  | 'Overig';

export interface Urenregistratie {
  id: string;
  gebruikerId: string; // User ID
  start: Date; // Full datetime
  eind: Date; // Full datetime
  activiteit: UrenActiviteit;

  // Optionele velden afhankelijk van activiteit
  projectId?: string;
  projectName?: string; // Cache voor display
  wijk?: 'Atol' | 'Boswijk' | 'Jol' | 'Waterwijk' | 'Zuiderzeewijk';
  overlegPartner?: string; // Voor extern overleg
  omschrijving?: string; // Voor overig of extra notities

  // Meta
  createdAt: Date;
  updatedAt?: Date;
}

// Helper type voor berekeningen
export interface UrenTotaal {
  gebruikerId: string;
  gebruikerNaam: string;
  totalHours: number;
  byActiviteit: Record<UrenActiviteit, number>;
  byProject: Record<string, number>;
  byWijk: Record<string, number>;
}
```

## Activiteit Types en Bijbehorende Velden

```typescript
const ACTIVITEIT_CONFIG = {
  'Project': {
    requiredFields: ['projectId'],
    optionalFields: ['omschrijving'],
  },
  'Wijkronde': {
    requiredFields: ['wijk'],
    optionalFields: ['omschrijving'],
  },
  'Intern overleg': {
    requiredFields: [],
    optionalFields: ['omschrijving'],
  },
  'Extern overleg': {
    requiredFields: ['overlegPartner'],
    optionalFields: ['omschrijving'],
  },
  'Persoonlijke ontwikkeling': {
    requiredFields: [],
    optionalFields: ['omschrijving'],
  },
  'Overig': {
    requiredFields: ['omschrijving'],
    optionalFields: [],
  },
};
```

## Firebase Integration

### Firestore Collection
```
urenregistraties/
  {urenId}/
    id: string
    gebruikerId: string
    start: Timestamp
    eind: Timestamp
    activiteit: string
    projectId: string | null
    projectName: string | null
    wijk: string | null
    overlegPartner: string | null
    omschrijving: string | null
    createdAt: Timestamp
    updatedAt: Timestamp | null
```

### Context API Functions
```typescript
const {
  urenregistraties, // Urenregistratie[]
  projecten, // Voor project dropdown
  currentUser,
  users, // Voor namen display

  addUrenregistratie, // (uren: Omit<Urenregistratie, 'id'>) => Promise<string>
  updateUrenregistratie, // (id: string, updates: Partial<Urenregistratie>) => Promise<void>
  deleteUrenregistratie, // (id: string) => Promise<void>
} = useAppContext();
```

## Component Examples

### UrenregistratiePage.tsx Skeleton
```tsx
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { Button, Input, Select, DateRangePicker } from '@/components/ui';
import { Plus, Download, Calendar, Clock, User } from 'lucide-react';
import { exportUrenToExcel } from '@/services/excelExport';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';

export const UrenregistratiePage: React.FC = () => {
  const { urenregistraties, users, projecten, currentUser } = useAppContext();

  // Filters
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    startOfMonth(new Date()),
    endOfMonth(new Date()),
  ]);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [activiteitFilter, setActiviteitFilter] = useState<UrenActiviteit[]>([]);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [wijkFilter, setWijkFilter] = useState<string[]>([]);

  const [showRegistreerModal, setShowRegistreerModal] = useState(false);

  // Filtered uren
  const filteredUren = useMemo(() => {
    return urenregistraties.filter(u => {
      // Date range
      if (u.start < dateRange[0] || u.start > dateRange[1]) {
        return false;
      }
      // User filter
      if (userFilter.length > 0 && !userFilter.includes(u.gebruikerId)) {
        return false;
      }
      // Activiteit filter
      if (activiteitFilter.length > 0 && !activiteitFilter.includes(u.activiteit)) {
        return false;
      }
      // Project filter
      if (projectFilter && u.projectId !== projectFilter) {
        return false;
      }
      // Wijk filter
      if (wijkFilter.length > 0 && u.wijk && !wijkFilter.includes(u.wijk)) {
        return false;
      }
      return true;
    });
  }, [urenregistraties, dateRange, userFilter, activiteitFilter, projectFilter, wijkFilter]);

  // Calculate totals
  const totalen = useMemo(() => {
    const total = filteredUren.reduce((sum, u) => {
      const hours = (u.eind.getTime() - u.start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    const byUser = filteredUren.reduce((acc, u) => {
      const hours = (u.eind.getTime() - u.start.getTime()) / (1000 * 60 * 60);
      acc[u.gebruikerId] = (acc[u.gebruikerId] || 0) + hours;
      return acc;
    }, {} as Record<string, number>);

    return { total, byUser };
  }, [filteredUren]);

  const handleExport = () => {
    exportUrenToExcel(filteredUren, users);
    toast.success('Excel geëxporteerd');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Urenregistratie
        </h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => setShowRegistreerModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Uren Registreren
          </Button>
        </div>
      </div>

      {/* Totaal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Totaal Uren</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalen.total.toFixed(2)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registraties</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredUren.length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gemiddeld/Dag</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(totalen.total / Math.max(1, getDaysBetween(dateRange))).toFixed(1)}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Top Activiteit</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {getMostCommonActiviteit(filteredUren)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Periode
            </label>
            <select
              onChange={(e) => {
                const today = new Date();
                switch (e.target.value) {
                  case 'today':
                    setDateRange([today, today]);
                    break;
                  case 'week':
                    setDateRange([startOfWeek(today), endOfWeek(today)]);
                    break;
                  case 'month':
                    setDateRange([startOfMonth(today), endOfMonth(today)]);
                    break;
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="today">Vandaag</option>
              <option value="week">Deze Week</option>
              <option value="month" selected>Deze Maand</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* User filter */}
          <MultiSelect
            label="Gebruiker"
            options={users.map(u => ({ value: u.id, label: u.name }))}
            selected={userFilter}
            onChange={setUserFilter}
          />

          {/* Activiteit filter */}
          <MultiSelect
            label="Activiteit"
            options={ACTIVITEIT_TYPES.map(a => ({ value: a, label: a }))}
            selected={activiteitFilter}
            onChange={setActiviteitFilter}
          />

          {/* Project filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project
            </label>
            <select
              value={projectFilter || ''}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="">Alle projecten</option>
              {projecten.map(p => (
                <option key={p.id} value={p.id}>{p.titel}</option>
              ))}
            </select>
          </div>

          {/* Wijk filter */}
          <MultiSelect
            label="Wijk"
            options={WIJKEN.map(w => ({ value: w, label: w }))}
            selected={wijkFilter}
            onChange={setWijkFilter}
          />
        </div>
      </div>

      {/* Uren Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tijd
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Uren
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Activiteit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUren.map(uren => {
                const user = users.find(u => u.id === uren.gebruikerId);
                const hours = calculateHours(uren.start, uren.eind);

                return (
                  <tr key={uren.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatDate(uren.start)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={user?.avatarUrl}
                          alt={user?.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatTime(uren.start)} - {formatTime(uren.eind)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {hours.toFixed(2)}u
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">{uren.activiteit}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {getDetailText(uren)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(uren)}
                          disabled={!canEdit(uren, currentUser)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(uren.id)}
                          disabled={!canEdit(uren, currentUser)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registreer Modal */}
      {showRegistreerModal && (
        <RegistreerUrenModal
          isOpen={showRegistreerModal}
          onClose={() => setShowRegistreerModal(false)}
        />
      )}
    </div>
  );
};

// Helper functions
const calculateHours = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getDetailText = (uren: Urenregistratie): string => {
  if (uren.projectName) return `Project: ${uren.projectName}`;
  if (uren.wijk) return `Wijk: ${uren.wijk}`;
  if (uren.overlegPartner) return `Met: ${uren.overlegPartner}`;
  if (uren.omschrijving) return uren.omschrijving.substring(0, 50) + '...';
  return '-';
};

const canEdit = (uren: Urenregistratie, user: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'Beheerder') return true;
  if (uren.gebruikerId !== user.id) return false;

  const hoursSinceCreated = (Date.now() - uren.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated < 48; // 48 uur edit window
};

const getMostCommonActiviteit = (uren: Urenregistratie[]): string => {
  const counts = uren.reduce((acc, u) => {
    acc[u.activiteit] = (acc[u.activiteit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || '-';
};
```

### RegistreerUrenModal.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Modal, Button, Input, Select, Textarea } from '@/components/ui';
import { toast } from 'react-hot-toast';
import { UrenActiviteit } from '@/types';

export const RegistreerUrenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  existingUren?: Urenregistratie; // Voor edit mode
}> = ({ isOpen, onClose, existingUren }) => {
  const { addUrenregistratie, updateUrenregistratie, currentUser, projecten } = useAppContext();

  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [startTijd, setStartTijd] = useState('09:00');
  const [eindTijd, setEindTijd] = useState('17:00');
  const [activiteit, setActiviteit] = useState<UrenActiviteit>('Project');
  const [projectId, setProjectId] = useState('');
  const [wijk, setWijk] = useState('');
  const [overlegPartner, setOverlegPartner] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate hours
  const berekendUren = useMemo(() => {
    try {
      const start = new Date(`${datum}T${startTijd}`);
      const eind = new Date(`${datum}T${eindTijd}`);
      return (eind.getTime() - start.getTime()) / (1000 * 60 * 60);
    } catch {
      return 0;
    }
  }, [datum, startTijd, eindTijd]);

  useEffect(() => {
    if (existingUren) {
      // Pre-fill voor edit mode
      setDatum(existingUren.start.toISOString().split('T')[0]);
      setStartTijd(formatTimeInput(existingUren.start));
      setEindTijd(formatTimeInput(existingUren.eind));
      setActiviteit(existingUren.activiteit);
      setProjectId(existingUren.projectId || '');
      setWijk(existingUren.wijk || '');
      setOverlegPartner(existingUren.overlegPartner || '');
      setOmschrijving(existingUren.omschrijving || '');
    }
  }, [existingUren]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (berekendUren < 0.25) {
      toast.error('Minimum 15 minuten');
      return;
    }
    if (berekendUren > 24) {
      toast.error('Maximum 24 uur per registratie');
      return;
    }

    // Activiteit-specifieke validatie
    if (activiteit === 'Project' && !projectId) {
      toast.error('Selecteer een project');
      return;
    }
    if (activiteit === 'Wijkronde' && !wijk) {
      toast.error('Selecteer een wijk');
      return;
    }
    if (activiteit === 'Extern overleg' && !overlegPartner) {
      toast.error('Vul partner naam in');
      return;
    }
    if (activiteit === 'Overig' && !omschrijving) {
      toast.error('Vul een omschrijving in');
      return;
    }

    setIsSubmitting(true);

    try {
      const start = new Date(`${datum}T${startTijd}`);
      const eind = new Date(`${datum}T${eindTijd}`);

      const data: Omit<Urenregistratie, 'id'> = {
        gebruikerId: currentUser!.id,
        start,
        eind,
        activiteit,
        createdAt: new Date(),
      };

      // Activiteit-specifieke velden
      if (activiteit === 'Project') {
        data.projectId = projectId;
        const project = projecten.find(p => p.id === projectId);
        data.projectName = project?.titel;
      }
      if (activiteit === 'Wijkronde') {
        data.wijk = wijk as any;
      }
      if (activiteit === 'Extern overleg') {
        data.overlegPartner = overlegPartner;
      }
      if (omschrijving) {
        data.omschrijving = omschrijving;
      }

      if (existingUren) {
        await updateUrenregistratie(existingUren.id, { ...data, updatedAt: new Date() });
        toast.success('Uren bijgewerkt');
      } else {
        await addUrenregistratie(data);
        toast.success('Uren geregistreerd');
      }

      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er ging iets mis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingUren ? 'Uren Bewerken' : 'Uren Registreren'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datum */}
        <div>
          <label className="block text-sm font-medium mb-2">Datum</label>
          <Input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            required
          />
        </div>

        {/* Tijd */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Tijd</label>
            <Input
              type="time"
              value={startTijd}
              onChange={(e) => setStartTijd(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Eind Tijd</label>
            <Input
              type="time"
              value={eindTijd}
              onChange={(e) => setEindTijd(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Berekende uren */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Totaal: <strong>{berekendUren.toFixed(2)} uur</strong>
          </p>
        </div>

        {/* Activiteit */}
        <div>
          <label className="block text-sm font-medium mb-2">Activiteit *</label>
          <Select
            value={activiteit}
            onChange={(e) => setActiviteit(e.target.value as UrenActiviteit)}
            required
          >
            <option value="Project">Project</option>
            <option value="Wijkronde">Wijkronde</option>
            <option value="Intern overleg">Intern overleg</option>
            <option value="Extern overleg">Extern overleg</option>
            <option value="Persoonlijke ontwikkeling">Persoonlijke ontwikkeling</option>
            <option value="Overig">Overig</option>
          </Select>
        </div>

        {/* Conditional fields */}
        {activiteit === 'Project' && (
          <div>
            <label className="block text-sm font-medium mb-2">Project *</label>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              <option value="">Selecteer project</option>
              {projecten.map(p => (
                <option key={p.id} value={p.id}>{p.titel}</option>
              ))}
            </Select>
          </div>
        )}

        {activiteit === 'Wijkronde' && (
          <div>
            <label className="block text-sm font-medium mb-2">Wijk *</label>
            <Select
              value={wijk}
              onChange={(e) => setWijk(e.target.value)}
              required
            >
              <option value="">Selecteer wijk</option>
              <option value="Atol">Atol</option>
              <option value="Boswijk">Boswijk</option>
              <option value="Jol">Jol</option>
              <option value="Waterwijk">Waterwijk</option>
              <option value="Zuiderzeewijk">Zuiderzeewijk</option>
            </Select>
          </div>
        )}

        {activiteit === 'Extern overleg' && (
          <div>
            <label className="block text-sm font-medium mb-2">Partner *</label>
            <Input
              type="text"
              value={overlegPartner}
              onChange={(e) => setOverlegPartner(e.target.value)}
              placeholder="Naam van overleg partner"
              required
            />
          </div>
        )}

        {/* Omschrijving (always available, required for Overig) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Omschrijving {activiteit === 'Overig' && '*'}
          </label>
          <Textarea
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            rows={3}
            placeholder="Extra notities..."
            required={activiteit === 'Overig'}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
            {existingUren ? 'Bijwerken' : 'Registreren'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const formatTimeInput = (date: Date): string => {
  return date.toTimeString().slice(0, 5); // HH:MM
};
```

## Excel Export Function
```typescript
import * as XLSX from 'xlsx';

export const exportUrenToExcel = (uren: Urenregistratie[], users: User[]) => {
  // Prepare data
  const data = uren.map(u => {
    const user = users.find(usr => usr.id === u.gebruikerId);
    const hours = (u.eind.getTime() - u.start.getTime()) / (1000 * 60 * 60);

    return {
      'Datum': formatDate(u.start),
      'Gebruiker': user?.name || '',
      'Start': formatTime(u.start),
      'Eind': formatTime(u.eind),
      'Uren': hours.toFixed(2),
      'Activiteit': u.activiteit,
      'Project': u.projectName || '',
      'Wijk': u.wijk || '',
      'Partner': u.overlegPartner || '',
      'Omschrijving': u.omschrijving || '',
    };
  });

  // Add totals row
  const totalHours = data.reduce((sum, row) => sum + parseFloat(row.Uren), 0);
  data.push({
    'Datum': '',
    'Gebruiker': '',
    'Start': '',
    'Eind': '',
    'Uren': totalHours.toFixed(2),
    'Activiteit': 'TOTAAL',
    'Project': '',
    'Wijk': '',
    'Partner': '',
    'Omschrijving': '',
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Uren');

  // Auto-width columns
  const maxWidth = data.reduce((w, r) => {
    return Object.keys(r).map(k => Math.max(w[k] || 0, String(r[k]).length));
  }, {});
  ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: maxWidth[k] + 2 }));

  const fileName = `uren_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
```

## Analytics Tracking
```typescript
trackEvent('uren_registered', {
  hours: berekendUren,
  activiteit,
  project_linked: !!projectId
});

trackEvent('uren_export', {
  count: filteredUren.length,
  total_hours: totalen.total
});
```

## Testing Checklist
- [ ] Uren registreren met alle activiteit types
- [ ] Time validatie (min 15min, max 24u, eind > start)
- [ ] Conditional fields tonen based on activiteit
- [ ] Berekende uren real-time update
- [ ] Edit eigen uren (binnen 48u)
- [ ] Admin kan alle uren editen
- [ ] Delete uren met confirmatie
- [ ] Filters werken (datum, user, activiteit, project, wijk)
- [ ] Totalen berekenen correct
- [ ] Excel export bevat alle data + totalen
- [ ] Dark mode support
- [ ] Mobile responsive table

## File Structure
```
src/
├── pages/
│   └── UrenregistratiePage.tsx
├── components/
│   └── RegistreerUrenModal.tsx
├── services/
│   └── excelExport.ts (update)
└── types.ts (update)
```

Succes met het bouwen van de Urenregistratie module! ⏱️
