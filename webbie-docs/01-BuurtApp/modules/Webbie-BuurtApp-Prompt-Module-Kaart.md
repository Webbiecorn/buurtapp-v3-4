# AI Prompt: Kaart Module - Buurtconciërge App

## Context
Je gaat een complete Kaart (Map) module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module toont een interactieve kaart met markers voor meldingen, projecten en dossiers, met layer controls en popups.

## Tech Stack
- **Maps Leaflet:** Detail kaarten (meldingen/dossiers individueel)
- **Google Maps:** @vis.gl/react-google-maps voor statistieken kaart
- **Clustering:** Leaflet.markercluster voor marker groepering
- **Styling:** Tailwind CSS + dark mode
- **Icons:** Lucide React + custom marker icons

## Module Requirements

### Core Functionaliteit

1. **MapPage - Hoofdkaart**
   - Full-screen kaart (minus header)
   - 3 toggle layers:
     - Meldingen (oranje/blauw/groen per status)
     - Projecten (paars/grijs per status)
     - Dossiers (geel/rood per status)
   - Layer control panel (links-boven)
   - Marker clustering bij >20 markers
   - Click marker → popup met info + "Details" link
   - Search bar (adres zoeken, zoom naar locatie)
   - Current location button (GPS)

2. **Meldingen Layer**
   - **MeldingMarker** component
   - Kleuren per status:
     - In behandeling: oranje (#f59e0b)
     - Fixi melding: blauw (#3b82f6)
     - Afgerond: groen (#10b981)
   - Popup content:
     - Titel
     - Categorie badge
     - Status badge
     - Adres (indien beschikbaar)
     - "Details bekijken" button

3. **Projecten Layer**
   - **ProjectMarker** component
   - Kleuren per status:
     - Lopend: paars (#8b5cf6)
     - Afgerond: grijs (#6b7280)
   - Popup content:
     - Titel
     - Status badge
     - Voortgang percentage
     - Deelnemers count
     - "Details bekijken" button

4. **Dossiers Layer**
   - Custom marker (huis icon)
   - Kleuren per status:
     - Actief: groen (#10b981)
     - Afgesloten: grijs (#6b7280)
     - In onderzoek: geel (#f59e0b)
     - Afspraak: blauw (#3b82f6)
   - Popup content:
     - Adres (groot lettertype)
     - Status badge + labels
     - Aantal notities/bewoners
     - "Details bekijken" button

5. **Heatmap Layer (Optional)**
   - **HeatmapLayer** component
   - Toggle on/off
   - Intensity based op melding concentratie
   - Gradiënt: blauw (laag) → rood (hoog)

6. **Search & Filters**
   - Search bar (PDOK autocomplete)
   - Filter toggles:
     - Status filters per layer
     - Categorie filter (meldingen)
     - Wijk filter (alle layers)
     - Datum range (created date)
   - "Clear filters" button

## Component Structure

### MapPage.tsx Skeleton
```tsx
import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useAppContext } from '@/context/AppContext';
import { MeldingMarker } from '@/components/MeldingMarker';
import { ProjectMarker } from '@/components/ProjectMarker';
import { HeatmapLayer } from '@/components/HeatmapLayer';
import { MapPin, Layers, Search, Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

export const MapPage: React.FC = () => {
  const { meldingen, projecten, dossiers, theme } = useAppContext();

  // Layer toggles
  const [showMeldingen, setShowMeldingen] = useState(true);
  const [showProjecten, setShowProjecten] = useState(true);
  const [showDossiers, setShowDossiers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categorieFilter, setCategorieFilter] = useState<string[]>([]);
  const [wijkFilter, setWijkFilter] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.3738, 4.8910]); // Default: Amsterdam
  const [zoom, setZoom] = useState(13);

  // Filter data
  const filteredMeldingen = useMemo(() => {
    return meldingen.filter(m => {
      if (!m.locatie) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(m.status)) return false;
      if (categorieFilter.length > 0 && !categorieFilter.includes(m.categorie)) return false;
      if (wijkFilter.length > 0 && !wijkFilter.includes(m.wijk)) return false;
      return true;
    });
  }, [meldingen, statusFilter, categorieFilter, wijkFilter]);

  const filteredProjecten = useMemo(() => {
    return projecten.filter(p => {
      if (!p.locatie) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (wijkFilter.length > 0 && p.wijk && !wijkFilter.includes(p.wijk)) return false;
      return true;
    });
  }, [projecten, statusFilter, wijkFilter]);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      if (!d.location) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(d.status)) return false;
      return true;
    });
  }, [dossiers, statusFilter]);

  // PDOK search
  const handleSearch = async (query: string) => {
    if (query.length < 3) return;

    try {
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.response.docs.length > 0) {
        const first = data.response.docs[0];
        // Lookup coordinates
        const lookupResp = await fetch(
          `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${first.id}`
        );
        const lookupData = await lookupResp.json();
        const doc = lookupData.response.docs[0];

        if (doc?.centroide_ll) {
          const match = doc.centroide_ll.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            const lon = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            setMapCenter([lat, lon]);
            setZoom(16);
          }
        }
      }
    } catch (error) {
      console.error('PDOK search error:', error);
    }
  };

  // Get current location
  const handleCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setZoom(15);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Locatie kon niet worden opgehaald');
        }
      );
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-3 max-w-xs">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            placeholder="Zoek adres..."
            className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        {/* Layer Toggles */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMeldingen}
              onChange={(e) => setShowMeldingen(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Meldingen ({filteredMeldingen.length})
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showProjecten}
              onChange={(e) => setShowProjecten(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Projecten ({filteredProjecten.length})
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDossiers}
              onChange={(e) => setShowDossiers(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Dossiers ({filteredDossiers.length})
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Heatmap
            </span>
          </label>
        </div>

        {/* Current Location Button */}
        <button
          onClick={handleCurrentLocation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <Target className="w-4 h-4" />
          Huidige Locatie
        </button>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          url={
            theme === 'dark'
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapUpdater center={mapCenter} zoom={zoom} />

        {/* Meldingen Layer */}
        {showMeldingen && (
          <MarkerClusterGroup>
            {filteredMeldingen.map(melding => (
              <MeldingMarker key={melding.id} melding={melding} />
            ))}
          </MarkerClusterGroup>
        )}

        {/* Projecten Layer */}
        {showProjecten && (
          <MarkerClusterGroup>
            {filteredProjecten.map(project => (
              <ProjectMarker key={project.id} project={project} />
            ))}
          </MarkerClusterGroup>
        )}

        {/* Dossiers Layer */}
        {showDossiers && (
          <MarkerClusterGroup>
            {filteredDossiers.map(dossier => (
              <Marker
                key={dossier.id}
                position={[dossier.location!.lat, dossier.location!.lon]}
                icon={getDossierIcon(dossier.status)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-lg mb-2">{dossier.adres}</h3>
                    <div className="flex gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(dossier.status)}`}>
                        {dossier.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {dossier.notities.length} notities • {dossier.bewoners.length} bewoners
                    </p>
                    <a
                      href={`/#/dossiers/${encodeURIComponent(dossier.id)}`}
                      className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Details bekijken
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Heatmap Layer */}
        {showHeatmap && <HeatmapLayer meldingen={filteredMeldingen} />}
      </MapContainer>
    </div>
  );
};

// Map updater component
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
};

// Custom marker icons
const getMeldingIcon = (status: string) => {
  const colors = {
    'In behandeling': '#f59e0b',
    'Fixi melding gemaakt': '#3b82f6',
    'Afgerond': '#10b981',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${colors[status] || '#gray'}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const getProjectIcon = (status: string) => {
  const colors = {
    'Lopend': '#8b5cf6',
    'Afgerond': '#6b7280',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${colors[status] || '#gray'}; width: 32px; height: 32px; border-radius: 4px; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const getDossierIcon = (status: string) => {
  const colors = {
    'actief': '#10b981',
    'afgesloten': '#6b7280',
    'in onderzoek': '#f59e0b',
    'afspraak': '#3b82f6',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="background: ${colors[status] || '#gray'}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <div style="transform: rotate(45deg); margin-top: 4px; margin-left: 8px;">🏠</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};
```

### MeldingMarker.tsx
```tsx
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Melding } from '@/types';
import L from 'leaflet';

export const MeldingMarker: React.FC<{ melding: Melding }> = ({ melding }) => {
  if (!melding.locatie) return null;

  const icon = getMeldingIcon(melding.status);

  return (
    <Marker
      position={[melding.locatie.lat, melding.locatie.lon]}
      icon={icon}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-semibold text-lg mb-2">{melding.titel}</h3>
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
              {melding.categorie}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(melding.status)}`}>
              {melding.status}
            </span>
          </div>
          {melding.locatie.adres && (
            <p className="text-sm text-gray-600 mb-3">{melding.locatie.adres}</p>
          )}
          <a
            href={`/#/meldingen/${melding.id}`}
            className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Details bekijken
          </a>
        </div>
      </Popup>
    </Marker>
  );
};

const getMeldingIcon = (status: string) => {
  const colors = {
    'In behandeling': '#f59e0b',
    'Fixi melding gemaakt': '#3b82f6',
    'Afgerond': '#10b981',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${colors[status] || '#6b7280'}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const getStatusBadgeClass = (status: string): string => {
  const classes = {
    'In behandeling': 'bg-orange-100 text-orange-700',
    'Fixi melding gemaakt': 'bg-blue-100 text-blue-700',
    'Afgerond': 'bg-green-100 text-green-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};
```

### HeatmapLayer.tsx
```tsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Melding } from '@/types';

export const HeatmapLayer: React.FC<{ meldingen: Melding[] }> = ({ meldingen }) => {
  const map = useMap();

  useEffect(() => {
    const points = meldingen
      .filter(m => m.locatie)
      .map(m => [m.locatie!.lat, m.locatie!.lon, 1] as [number, number, number]);

    if (points.length === 0) return;

    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 35,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, meldingen]);

  return null;
};
```

## Dependencies
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "react-leaflet-cluster": "^2.1.0",
  "leaflet.heat": "^0.2.0",
  "@vis.gl/react-google-maps": "^1.0.0"
}
```

## Analytics
```typescript
trackEvent('map_viewed');
trackEvent('map_layer_toggled', { layer: 'meldingen', enabled: true });
trackEvent('map_marker_clicked', { type: 'melding', id: meldingId });
trackEvent('map_search_performed', { query: searchQuery });
```

## Testing Checklist
- [ ] Kaart laadt correct
- [ ] Markers tonen op juiste locaties
- [ ] Layer toggles werken
- [ ] Clustering werkt bij >20 markers
- [ ] Popups tonen correcte info
- [ ] PDOK search zoekt en zooms
- [ ] Current location werkt (GPS)
- [ ] Dark mode tile layer
- [ ] Heatmap toggle werkt
- [ ] Mobile responsive

Succes! 🗺️
