import React, { useEffect, useState } from "react";
import { getAchterpadStatusColor } from '../utils/statusColors';
import { useAppContext } from '../context/AppContext';
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import AchterpadCard from '../components/AchterpadCard';
import AchterpadenStats from '../components/AchterpadenStats';
import { UserRole } from "../types";
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Polyline component voor route op kaart
const RoutePolyline: React.FC<{
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  color?: string
}> = ({ start, end, color = '#3B82F6' }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;

    const polyline = new window.google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, start, end, color]);

  return null;
};

// Polyline voor route editor (meerdere punten)
const RoutePolylineForEditor: React.FC<{
  points: Array<{lat: number; lng: number}>;
  color?: string
}> = ({ points, color = '#9333EA' }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || points.length < 2) return;

    const polyline = new window.google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: map
    });

    // Fit bounds to show entire route
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, 50);

    return () => {
      polyline.setMap(null);
    };
  }, [map, points, color]);

  return null;
};

// Using shared statusColors utility

// Postcode naar wijk mapping voor Lelystad
const getWijkFromPostcode = (postcode: string): string | null => {
  if (!postcode) return null;

  // Remove spaces and convert to uppercase
  const pc = postcode.replace(/\s/g, '').toUpperCase();

  // Specifieke mapping op volgorde (meest specifiek eerst)
  const wijkMapping: Array<{name: string; min: string; max: string}> = [
    // Boswijk (8212DA - 8225VL) - specifiek voor Kamp, Wold, etc.
    { name: 'Boswijk', min: '8212DA', max: '8225VL' },
    // Atolwijk (exclusief Boswijk gebied)
    { name: 'Atolwijk', min: '8226AA', max: '8232ET' },
    { name: 'Atolwijk', min: '8212AA', max: '8212CZ' }, // Voor lagere postcodes
    // Andere wijken
    { name: 'Zuiderzeewijk', min: '8211BA', max: '8224MJ' },
    { name: 'Waterwijk-Landerijen', min: '8219AA', max: '8226TW' },
    { name: 'Bolder', min: '8231CA', max: '8243DG' },
    { name: 'Kustwijk', min: '8231AA', max: '8243NG' },
    { name: 'Havendiep', min: '8232JA', max: '8245GN' },
    { name: 'Lelystad-Haven', min: '8243PA', max: '8245AB' },
    { name: 'Stadshart', min: '8224BX', max: '8232ZZ' },
    { name: 'Warande', min: '8233HB', max: '8245MA' },
    { name: 'Buitengebied', min: '8211AA', max: '8245AA' },
  ];

  for (const wijk of wijkMapping) {
    if (pc >= wijk.min && pc <= wijk.max) {
      return wijk.name;
    }
  }

  return null;
};

// Haversine formule voor afstand berekenen tussen GPS punten
const calculateRouteDistance = (points: Array<{lat: number; lng: number}>): number => {
  if (points.length < 2) return 0;

  const R = 6371e3; // Earth radius in meters
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const lat1 = points[i].lat * Math.PI / 180;
    const lat2 = points[i + 1].lat * Math.PI / 180;
    const deltaLat = (points[i + 1].lat - points[i].lat) * Math.PI / 180;
    const deltaLng = (points[i + 1].lng - points[i].lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalDistance += R * c;
  }

  return Math.round(totalDistance);
};

// Modal component voor bewerken van achterpad
type EditAchterpadModalProps = {
  selected: any;
  onClose: () => void;
  onUpdate: (updated: any) => void;
};

type Pad = {
  naam: string;
  huisnummers?: string;
};

const EditAchterpadModal: React.FC<EditAchterpadModalProps> = ({ selected, onClose, onUpdate }) => {
  const { currentUser, uploadFile } = useAppContext();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPadBox, setShowPadBox] = useState(false);
  const [pads, setPads] = useState<Pad[]>(selected.paden || []);
  const [padNaam, setPadNaam] = useState("");
  const [padHuisnummers, setPadHuisnummers] = useState("");
  // media uploads are handled via updates only
  // Updates similar to project contributions
  const [updateText, setUpdateText] = useState("");
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);

  // Route editor state
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<Array<{lat: number; lng: number}>>(selected.gpsRoute || []);
  const [originalRoute, setOriginalRoute] = useState<Array<{lat: number; lng: number}>>(selected.gpsRoute || []);
  const [routeHistory, setRouteHistory] = useState<Array<Array<{lat: number; lng: number}>>>([]);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);

  // Bewoner enquête state
  const [bewonerEnquetes, setBewonerEnquetes] = useState<Array<{
    gebruikt: string;
    veiligheidScore: number;
    verbeteringen: string;
    opmerkingen: string;
  }>>(selected.bewonerEnquetes || []);
  const [showEnqueteForm, setShowEnqueteForm] = useState(false);
  const [newEnquete, setNewEnquete] = useState({
    gebruikt: '',
    veiligheidScore: 3,
    verbeteringen: '',
    opmerkingen: ''
  });

  // Veiligheid state
  const [veiligheid, setVeiligheid] = useState({
    verlichting: selected.veiligheid?.verlichting || '',
    zichtbaarheid: selected.veiligheid?.zichtbaarheid || '',
    score: selected.veiligheid?.score || 3
  });

  // Onderhoud state
  const [onderhoud, setOnderhoud] = useState({
    bestrating: selected.onderhoud?.bestrating || '',
    begroeiing: selected.onderhoud?.begroeiing || '',
    vervuiling: selected.onderhoud?.vervuiling || '',
    urgentie: selected.onderhoud?.urgentie || ''
  });

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleAddPad = () => {
    if (padNaam) {
      setPads([...pads, { naam: padNaam, huisnummers: padHuisnummers }]);
      setPadNaam("");
      setPadHuisnummers("");
    }
  };

  const handleRemovePad = (idx: number) => {
    setPads(pads.filter((_: Pad, i: number) => i !== idx));
  };

  // removed: main media upload handled in updates

  const handleUpdateFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUpdateFiles(Array.from(e.target.files));
  };

  const handleRemoveSelectedFile = (idx: number) => {
    setUpdateFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddUpdate = async () => {
    if (!currentUser) {
      setError('Geen ingelogde gebruiker');
      return;
    }
    if (!updateText && updateFiles.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const attachments: string[] = [];
      for (const file of updateFiles) {
        // use uploadFile helper from context to store in storage
        const path = `achterpaden/${selected.id}/updates/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);
        attachments.push(url);
      }
      const updateObj = {
        id: `update-${Date.now()}`,
        text: updateText,
        attachments,
        timestamp: new Date(),
        userId: currentUser.id,
      };
      await updateDoc(doc(db, 'achterpaden', selected.id), {
        updates: arrayUnion(updateObj),
        // voeg attachments ook toe aan de hoofd-media lijst zodat ze overal zichtbaar zijn
        ...(attachments.length > 0 ? { media: arrayUnion(...attachments) } : {}),
      });
      // call parent to refresh
      onUpdate({
        ...selected,
        updates: [...(selected.updates || []), updateObj],
        media: [...(selected.media || []), ...attachments],
      });
      setUpdateText("");
      setUpdateFiles([]);
    } catch (e) {
      // Add update failed
      setError('Toevoegen update mislukt');
    }
    setUploading(false);
  };

  const handleAddEnquete = () => {
    if (!newEnquete.gebruikt) {
      alert('Vul in of het achterpad gebruikt wordt');
      return;
    }
    setBewonerEnquetes([...bewonerEnquetes, newEnquete]);
    setNewEnquete({
      gebruikt: '',
      veiligheidScore: 3,
      verbeteringen: '',
      opmerkingen: ''
    });
    setShowEnqueteForm(false);
  };

  const handleRemoveEnquete = (idx: number) => {
    setBewonerEnquetes(bewonerEnquetes.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError("");
    try {
      // Update pads, bewoner enquetes, veiligheid en onderhoud
      await updateDoc(doc(db, "achterpaden", selected.id), {
        paden: pads,
        bewonerEnquetes: bewonerEnquetes,
        veiligheid: veiligheid,
        onderhoud: onderhoud,
      });
      onUpdate({ ...selected, paden: pads, bewonerEnquetes: bewonerEnquetes, veiligheid: veiligheid, onderhoud: onderhoud });
      setTimeout(() => onClose(), 100);
    } catch {
      setError("Opslaan mislukt");
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-dark-bg flex flex-col" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="button">
      <div className="flex-1 overflow-y-auto p-6" onClick={(_e) => _e.stopPropagation()} tabIndex={0} role="button">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">✏️ Bewerk Achterpad</h2>
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded flex items-center gap-2" onClick={onClose}>
            <span>←</span> Terug
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Map View */}
          <div className="bg-gray-50 dark:bg-dark-surface rounded-lg overflow-hidden">
            <div className="h-[500px]">
              {routePoints.length > 0 ? (
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={routePoints[0]}
                    defaultZoom={17}
                    mapId="a685a3b57e7894f1a94dffc2"
                    style={{width: '100%', height: '100%'}}
                    gestureHandling="cooperative"
                  >
                    {routePoints.length > 1 && <RoutePolylineForEditor points={routePoints} />}
                    {routePoints.map((point, i) => (
                      <Marker key={`marker-${i}`} position={point} />
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Geen GPS route beschikbaar
                </div>
              )}
            </div>
          </div>

          {/* Right: Edit Info */}
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-700 dark:text-dark-text-secondary">
                <div><span className="font-semibold text-brand-primary">Straat:</span> {selected.straat}</div>
                <div><span className="font-semibold text-brand-primary">Wijk:</span> {selected.wijk}</div>
                <div><span className="font-semibold text-brand-primary">Lengte:</span> {selected.lengte} m</div>
                <div><span className="font-semibold text-brand-primary">Breedte:</span> {selected.breedte} m</div>
              </div>
            </div>
            {(selected.gpsRoute && selected.gpsRoute.length > 0) && (
              <div>
                <h3 className="font-semibold mb-2">GPS Route</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingRoute(true);
                    setOriginalRoute([...routePoints]);
                    setRouteHistory([routePoints]);
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2"
                >
                  <span>✏️</span> Route bewerken
                </button>
              </div>
            )}
          </div>
        </div>

        <form id="edit-achterpad-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Route Editor Map - Show fullscreen when editing route */}
          {isEditingRoute && routePoints.length > 0 && (
            <div className="fixed inset-0 top-16 left-0 right-0 bottom-0 z-50 bg-white dark:bg-dark-bg">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface">
                  <h3 className="font-semibold mb-2">GPS Route Bewerken</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setUploading(true);
                          const newDistance = calculateRouteDistance(routePoints);

                          const updateData: any = {
                            gpsRoute: routePoints,
                            lengte: newDistance,
                          };

                          // Try geocoding for first and last point only
                          try {
                            if (window.google?.maps?.Geocoder && routePoints.length >= 2) {
                              const geocoder = new window.google.maps.Geocoder();

                              // Geocode first and last point
                              const firstPoint = routePoints[0];
                              const lastPoint = routePoints[routePoints.length - 1];

                              const [firstResult, lastResult] = await Promise.all([
                                new Promise<google.maps.GeocoderResult | null>((resolve) => {
                                  geocoder.geocode({ location: firstPoint }, (results, status) => {
                                    if (status === 'OK' && results?.[0]) {
                                      resolve(results[0]);
                                    } else {
                                      resolve(null);
                                    }
                                  });
                                }),
                                new Promise<google.maps.GeocoderResult | null>((resolve) => {
                                  geocoder.geocode({ location: lastPoint }, (results, status) => {
                                    if (status === 'OK' && results?.[0]) {
                                      resolve(results[0]);
                                    } else {
                                      resolve(null);
                                    }
                                  });
                                })
                              ]);

                              const addresses = [firstResult, lastResult].filter(Boolean) as google.maps.GeocoderResult[];

                              if (addresses.length > 0) {
                                // Extract unique streets and neighborhoods
                                const streets = new Set<string>();
                                const neighborhoods = new Set<string>();
                                const streetHouseNumbers: { [key: string]: string[] } = {};

                                addresses.forEach(addr => {
                                  // Find street name
                                  const streetComp = addr.address_components.find(c =>
                                    c.types.includes('route')
                                  );
                                  if (streetComp) streets.add(streetComp.long_name);

                                  // Find neighborhood/sublocality - prefer most specific first, avoid locality (city)
                                  const neighborhoodComp = addr.address_components.find(c =>
                                    c.types.includes('neighborhood') ||
                                    c.types.includes('sublocality') ||
                                    c.types.includes('sublocality_level_1') ||
                                    c.types.includes('sublocality_level_2') ||
                                    c.types.includes('sublocality_level_3') ||
                                    c.types.includes('administrative_area_level_3')
                                  );
                                  if (neighborhoodComp) {
                                    neighborhoods.add(neighborhoodComp.long_name);
                                    console.log('Gevonden wijk/buurt:', neighborhoodComp.long_name, 'types:', neighborhoodComp.types);
                                  } else {
                                    console.log('Geen wijk gevonden voor adres:', addr.formatted_address);
                                    console.log('Alle componenten:', addr.address_components.map(c => ({ name: c.long_name, types: c.types })));
                                  }

                                  // Find house number
                                  const houseNumberComp = addr.address_components.find(c =>
                                    c.types.includes('street_number')
                                  );

                                  if (streetComp && houseNumberComp) {
                                    const streetName = streetComp.long_name;
                                    const houseNumber = houseNumberComp.long_name;

                                    if (!streetHouseNumbers[streetName]) {
                                      streetHouseNumbers[streetName] = [];
                                    }
                                    streetHouseNumbers[streetName].push(houseNumber);
                                  }
                                });

                                // Create paden data with first and last house numbers
                                const padenData: Array<{naam: string; huisnummers: string}> = [];
                                Object.entries(streetHouseNumbers).forEach(([street, numbers]) => {
                                  // Remove duplicates and format
                                  const uniqueNumbers = Array.from(new Set(numbers));
                                  padenData.push({
                                    naam: street,
                                    huisnummers: uniqueNumbers.join(' - ')
                                  });
                                });

                                // Only update if we found data
                                if (streets.size > 0) {
                                  updateData.straat = Array.from(streets).join(', ');
                                }

                                // Try to get postcode and map to wijk
                                let wijkNaam: string | null = null;

                                // First try to get postcode from Google geocoding results
                                for (const addr of addresses) {
                                  const postcodeComp = addr.address_components.find(c =>
                                    c.types.includes('postal_code')
                                  );
                                  if (postcodeComp) {
                                    wijkNaam = getWijkFromPostcode(postcodeComp.long_name);
                                    if (wijkNaam) {
                                      console.log('Wijk gevonden via postcode mapping:', wijkNaam);
                                      neighborhoods.add(wijkNaam);
                                      break;
                                    }
                                  }
                                }

                                // If no wijk found via postcode, try PDOK
                                if (!wijkNaam && neighborhoods.size === 0 && streets.size > 0) {
                                  try {
                                    console.log('Proberen wijk te vinden via PDOK locatieserver...');
                                    // Get first house number for PDOK query
                                    const firstStreet = Array.from(streets)[0];
                                    const firstHouseNum = streetHouseNumbers[firstStreet]?.[0] || '';
                                    const searchQuery = `${firstStreet} ${firstHouseNum}`;

                                    const pdokUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(searchQuery)}&fq=type:adres&rows=1`;
                                    const pdokResponse = await fetch(pdokUrl);

                                    if (pdokResponse.ok) {
                                      const pdokData = await pdokResponse.json();
                                      console.log('PDOK API response:', pdokData);

                                      if (pdokData.response?.docs?.[0]) {
                                        const doc = pdokData.response.docs[0];

                                        // Try to map PDOK postcode to wijk
                                        if (doc.postcode) {
                                          wijkNaam = getWijkFromPostcode(doc.postcode);
                                          if (wijkNaam) {
                                            console.log('Wijk gevonden via PDOK postcode mapping:', wijkNaam);
                                            neighborhoods.add(wijkNaam);
                                          }
                                        }

                                        // Fallback to PDOK wijknaam/buurtnaam if no mapping
                                        if (!wijkNaam) {
                                          if (doc.wijknaam) {
                                            neighborhoods.add(doc.wijknaam);
                                            console.log('PDOK wijk gevonden:', doc.wijknaam);
                                          } else if (doc.buurtnaam) {
                                            neighborhoods.add(doc.buurtnaam);
                                            console.log('PDOK buurt gevonden:', doc.buurtnaam);
                                          }
                                        }
                                      }
                                    }
                                  } catch (pdokErr) {
                                    console.warn('PDOK API call failed:', pdokErr);
                                  }
                                }

                                if (neighborhoods.size > 0) {
                                  updateData.wijk = Array.from(neighborhoods)[0];
                                }

                                if (padenData.length > 0) {
                                  updateData.paden = padenData;
                                  setPads(padenData);
                                }

                                console.log('Geocoding resultaat:', {
                                  straat: updateData.straat,
                                  wijk: updateData.wijk,
                                  paden: updateData.paden
                                });
                              }
                            }
                          } catch (geocodeErr) {
                            console.warn('Geocoding failed, saving without address info:', geocodeErr);
                            // Continue anyway - at least save the route and distance
                          }

                          console.log('Opslaan data:', updateData);
                          await updateDoc(doc(db, 'achterpaden', selected.id), updateData);
                          onUpdate({ ...selected, ...updateData });
                          setIsEditingRoute(false);
                          setSelectedMarkerIndex(null);
                          setUploading(false);
                        } catch (err) {
                          console.error('Route opslaan fout:', err);
                          setError('Route opslaan mislukt');
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? <span className="animate-spin">⏳</span> : <span>✓</span>} Opslaan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoutePoints([...originalRoute]);
                        setIsEditingRoute(false);
                        setSelectedMarkerIndex(null);
                        setRouteHistory([]);
                      }}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-2"
                    >
                      <span>✕</span> Annuleren
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (routeHistory.length > 1) {
                          const newHistory = [...routeHistory];
                          newHistory.pop();
                          const previousRoute = newHistory[newHistory.length - 1];
                          setRoutePoints(previousRoute);
                          setRouteHistory(newHistory);
                        }
                      }}
                      disabled={routeHistory.length <= 1}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>↶</span> Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoutePoints([...originalRoute]);
                        setRouteHistory([originalRoute]);
                      }}
                      className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-2"
                    >
                      <span>🔄</span> Reset
                    </button>
                    {selectedMarkerIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = routePoints.filter((_, i) => i !== selectedMarkerIndex);
                          setRoutePoints(updated);
                          setRouteHistory(prev => [...prev, updated]);
                          setSelectedMarkerIndex(null);
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
                      >
                        <span>❌</span> Verwijder punt {selectedMarkerIndex + 1}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Berekende lengte: {calculateRouteDistance(routePoints)} meter
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Klik op kaart om punt toe te voegen • Sleep markers om te verplaatsen • Klik marker om te selecteren
                  </p>
                </div>
                <div className="flex-1">
                  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                    <Map
                      defaultCenter={routePoints[0]}
                      defaultZoom={17}
                      mapId="a685a3b57e7894f1a94dffc2"
                      style={{width: '100%', height: '100%'}}
                      gestureHandling="cooperative"
                      onClick={(e) => {
                        if (e.detail.latLng) {
                          const newPoint = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
                          const updated = [...routePoints, newPoint];
                          setRoutePoints(updated);
                          setRouteHistory(prev => [...prev, updated]);
                        }
                      }}
                    >
                      {routePoints.map((point, i) => (
                        <Marker
                          key={`marker-${i}`}
                          position={point}
                          draggable={true}
                          onClick={() => setSelectedMarkerIndex(i)}
                          onDragEnd={(e) => {
                            if (e.latLng) {
                              const updated = [...routePoints];
                              updated[i] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                              setRoutePoints(updated);
                              setRouteHistory(prev => [...prev, updated]);
                            }
                          }}
                          icon={{
                            path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                            scale: selectedMarkerIndex === i ? 10 : 7,
                            fillColor: selectedMarkerIndex === i ? '#EF4444' : '#9333EA',
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2,
                          }}
                        />
                      ))}
                      <RoutePolylineForEditor points={routePoints} />
                    </Map>
                  </APIProvider>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Paden beheren */}
            <section>
              <h3 className="font-semibold mb-2">Paden</h3>
              <label className="flex items-center gap-2 font-medium mb-2" htmlFor="show-pad-checkbox">
                <input id="show-pad-checkbox" type="checkbox" checked={showPadBox} onChange={e => setShowPadBox(e.target.checked)} />
                Pad toevoegen
              </label>
              {showPadBox && (
                <div className="space-y-4">
                  <div className="space-y-3">
                      <label htmlFor="pad-naam" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Padnaam</label>
                      <input
                        id="pad-naam"
                        type="text"
                        value={padNaam}
                        onChange={e => setPadNaam(e.target.value)}
                        className="border rounded p-2 w-full"
                      />

                      <label htmlFor="pad-huisnummers" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Huisnummers</label>
                      <input
                        id="pad-huisnummers"
                        type="text"
                        value={padHuisnummers}
                        onChange={e => setPadHuisnummers(e.target.value)}
                        className="border rounded p-2 w-full"
                      />

                    <div className="flex justify-end">
                      <button type="button" className="px-3 py-1 bg-brand-primary text-white rounded" onClick={handleAddPad}>Toevoegen</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pads.map((pad: Pad, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-dark-border px-2 py-1 rounded">
                        <div className="text-sm">{pad.naam} <span className="text-xs text-gray-500">({pad.huisnummers})</span></div>
                        <button type="button" className="text-red-600 text-lg leading-none" onClick={() => handleRemovePad(idx)}>&times;</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
                Huidige paden worden opgeslagen bij Opslaan. Media voeg je toe via Updates.
              </div>
            </section>

            {/* Veiligheid Beoordeling */}
            <section className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <span>🛡️</span>
                <span>Veiligheid Beoordeling</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Verlichting</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Goed', 'Voldoende', 'Matig', 'Slecht', 'Geen'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVeiligheid({...veiligheid, verlichting: opt})}
                        className={`px-3 py-2 rounded text-sm ${
                          veiligheid.verlichting === opt
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Zichtbaarheid</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Goed overzichtelijk', 'Voldoende', 'Matig', 'Slecht', 'Zeer slecht'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: opt})}
                        className={`px-3 py-2 rounded text-sm ${
                          veiligheid.zichtbaarheid === opt
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Algemene veiligheidsscore (1-5 sterren)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setVeiligheid({...veiligheid, score: score})}
                        className="text-3xl"
                      >
                        {score <= veiligheid.score ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Onderhoud Beoordeling */}
            <section className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-900 dark:text-orange-100">
                <span>🔧</span>
                <span>Onderhoud Beoordeling</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Bestrating</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Goed', 'Voldoende', 'Matig', 'Vervangen'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOnderhoud({...onderhoud, bestrating: opt})}
                        className={`px-3 py-2 rounded text-sm ${
                          onderhoud.bestrating === opt
                            ? 'bg-orange-600 text-white'
                            : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Begroeiing</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Goed verzorgd', 'Voldoende', 'Overlast', 'Verwijderen'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOnderhoud({...onderhoud, begroeiing: opt})}
                        className={`px-3 py-2 rounded text-sm ${
                          onderhoud.begroeiing === opt
                            ? 'bg-orange-600 text-white'
                            : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vervuiling</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Schoon', 'Licht vervuild', 'Vervuild', 'Zwaar vervuild'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setOnderhoud({...onderhoud, vervuiling: opt})}
                        className={`px-3 py-2 rounded text-sm ${
                          onderhoud.vervuiling === opt
                            ? 'bg-orange-600 text-white'
                            : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Urgentie</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'spoed', label: '🔴 Spoed', color: 'bg-red-600' },
                      { value: 'hoog', label: '🟠 Hoog', color: 'bg-orange-600' },
                      { value: 'normaal', label: '🟡 Normaal', color: 'bg-yellow-500' },
                      { value: 'laag', label: '🟢 Laag', color: 'bg-green-600' },
                      { value: 'geen', label: '⚪ Geen', color: 'bg-gray-600' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOnderhoud({...onderhoud, urgentie: opt.value})}
                        className={`px-3 py-2 rounded text-sm text-white ${
                          onderhoud.urgentie === opt.value
                            ? opt.color + ' ring-4 ring-offset-2 ring-gray-300'
                            : opt.color + ' opacity-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Middle column: Bewoner Enquêtes */}
            <section className="lg:col-span-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                <span>👥</span>
                <span>Bewoner Enquêtes</span>
                <span className="text-sm font-normal text-purple-700 dark:text-purple-300">({bewonerEnquetes.length})</span>
              </h3>

              {/* Bestaande enquêtes */}
              {bewonerEnquetes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {bewonerEnquetes.map((enq, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-dark-bg rounded border border-gray-200 dark:border-dark-border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">Bewoner {idx + 1}</div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEnquete(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Gebruikt:</span> {enq.gebruikt}</div>
                        <div><span className="font-medium">Veiligheid:</span> {'⭐'.repeat(enq.veiligheidScore)}</div>
                        {enq.verbeteringen && <div><span className="font-medium">Verbeteringen:</span> {enq.verbeteringen}</div>}
                        {enq.opmerkingen && <div><span className="font-medium">Opmerkingen:</span> {enq.opmerkingen}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nieuwe enquête form */}
              {!showEnqueteForm ? (
                <button
                  type="button"
                  onClick={() => setShowEnqueteForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Bewoner Enquête Toevoegen
                </button>
              ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Gebruikt u dit achterpad regelmatig?</label>
                      <div className="flex gap-2">
                        {['Ja, dagelijks', 'Ja, wekelijks', 'Af en toe', 'Zelden', 'Nooit'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setNewEnquete({...newEnquete, gebruikt: opt})}
                            className={`px-3 py-2 rounded text-sm ${
                              newEnquete.gebruikt === opt
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Hoe veilig voelt u zich? (1-5 sterren)</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setNewEnquete({...newEnquete, veiligheidScore: score})}
                            className="text-2xl"
                          >
                            {score <= newEnquete.veiligheidScore ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Welke verbeteringen zijn nodig?</label>
                      <textarea
                        value={newEnquete.verbeteringen}
                        onChange={(e) => setNewEnquete({...newEnquete, verbeteringen: e.target.value})}
                        className="w-full border rounded p-2 bg-white dark:bg-dark-surface"
                        rows={2}
                        placeholder="Bijv: meer verlichting, bestrating herstellen..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Overige opmerkingen</label>
                      <textarea
                        value={newEnquete.opmerkingen}
                        onChange={(e) => setNewEnquete({...newEnquete, opmerkingen: e.target.value})}
                        className="w-full border rounded p-2 bg-white dark:bg-dark-surface"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddEnquete}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        ✓ Enquête Toevoegen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEnqueteForm(false);
                          setNewEnquete({ gebruikt: '', veiligheidScore: 3, verbeteringen: '', opmerkingen: '' });
                        }}
                        className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Right column: Updates en bijlagen */}
            <section>
              <h3 className="font-semibold mb-2">Updates & Bijlagen</h3>
              <div className="space-y-2">
                <label htmlFor="update-text" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Nieuwe update</label>
                <textarea id="update-text" value={updateText} onChange={e => setUpdateText(e.target.value)} className="border rounded w-full p-3 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border h-28" />
                  <div>
                  <label htmlFor="update-files" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen</label>
                  <input id="update-files" type="file" accept="image/*,video/*" multiple onChange={handleUpdateFilesChange} className="mt-1" />
                </div>
              </div>
              {updateFiles.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {updateFiles.map((f, idx) => {
                    const url = URL.createObjectURL(f);
                    const isImage = /(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                    return (
                      <div key={idx} className="relative">
                        {isImage ? (
                          <img src={url} className="h-20 w-20 object-cover rounded" alt={f.name} />
                        ) : (
                          <div className="h-20 w-20 bg-gray-100 dark:bg-dark-border rounded flex items-center justify-center text-sm px-2">{f.name}</div>
                        )}
                        <button type="button" className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow" onClick={() => handleRemoveSelectedFile(idx)}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddUpdate} disabled={uploading || (!updateText && updateFiles.length === 0)}>{uploading ? 'Toevoegen...' : 'Voeg update toe'}</button>
              </div>

              {/* Existing updates preview */}
              <div className="mt-4">
                <div className="font-medium mb-2">Vorige updates</div>
                <div className="space-y-2 max-h-56 overflow-auto p-2 bg-gray-50 dark:bg-dark-surface rounded">
                  {(selected.updates || []).slice().reverse().map((u: any) => (
                    <div key={u.id} className="p-2 bg-white dark:bg-dark-bg rounded border border-gray-100 dark:border-dark-border">
                      <div className="text-sm text-gray-700 dark:text-dark-text-secondary">{u.text}</div>
                      {u.attachments && u.attachments.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {u.attachments.map((att: string, idx: number) => (
                            att.match(/\.(jpg|jpeg|png|gif|webp)$/i) || att.includes('alt=media') || att.includes('/v0/b/') ? (
                              <img key={idx} src={att} alt={`Bijlage ${idx + 1}`} className="h-16 w-16 object-cover rounded" />
                            ) : (
                              <video key={idx} controls aria-label={`Bijlage video ${idx + 1}`} className="h-16 w-16 rounded"><source src={att} /><track kind="captions" src="" /></video>
                            )
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">{u.timestamp ? (u.timestamp.seconds ? new Date(u.timestamp.seconds * 1000).toLocaleString() : new Date(u.timestamp).toLocaleString()) : ''} — {(window as any).__app_users__?.find((x: any) => x.id === u.userId)?.name || u.userId}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

        </form>
      </div>

      {/* Sticky footer met Opslaan knop */}
      <div className="flex-shrink-0 bg-white dark:bg-dark-bg border-t dark:border-dark-border px-6 py-4 shadow-lg">
        {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            onClick={onClose}
          >
            Annuleren
          </button>
          <button
            type="submit"
            form="edit-achterpad-form"
            disabled={uploading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow transition flex items-center gap-2 disabled:opacity-50"
          >
            {uploading && <span className="loader border-t-2 border-b-2 border-white rounded-full w-4 h-4 animate-spin"></span>}
            {uploading ? "Opslaan..." : "💾 Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AchterpadenOverzicht: React.FC<{ showStats?: boolean; selectedAchterpadFromKaart?: any }> = ({ showStats, selectedAchterpadFromKaart }) => {
  const [registraties, setRegistraties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [view, setView] = useState<'grid' | 'detail' | 'edit'>('grid'); // View state instead of modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState<string | null>(null);
  const [previewIsImage, setPreviewIsImage] = useState(true);
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);

  // Filters en sorteer state
  const [veiligheidFilter, setVeiligheidFilter] = useState<string>('alle');
  const [urgentieFilter, setUrgentieFilter] = useState<string>('alle');
  const [wijkFilter, setWijkFilter] = useState<string>('alle');
  const [sortBy, setSortBy] = useState<string>('date');

  const getFilename = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      return decodeURIComponent(last.split('?')[0]);
    } catch {
      return '';
    }
  };
  const { users, currentUser } = useAppContext();
  const [tab, setTab] = React.useState<'overview' | 'stats'>(showStats ? 'stats' : 'overview');

  // allow parent to force stats view
  useEffect(() => {
    if (showStats) setTab('stats');
  }, [showStats]);

  // Handle external achterpad selection (from Kaart Overzicht)
  useEffect(() => {
    if (selectedAchterpadFromKaart) {
      setSelected(selectedAchterpadFromKaart);
      setView('edit');
      setTab('overview');
    }
  }, [selectedAchterpadFromKaart]);

  useEffect(() => {
    try {
      (window as any).__app_users__ = users || [];
    } catch {
      // ignore
    }
  }, [users]);

  // Diagnostic: log media arrays when a selection changes to help debug demo/placeholder images
  useEffect(() => {
    if (!selected) return;
    try {
      // Achterpaden media logging for debugging
      // raw media (from Firestore):', selected.media
      // filtered media (rendered):', (selected.media || []).filter((url: string) => (url.startsWith("https://") || url.startsWith("http://127.0.0.1:9201/")) && !url.includes("demo") && !url.includes("placeholder"))
    } catch (_e) {
      // Error logging media for selected item
    }
  }, [selected]);

  // small animation trigger when selected changes
  useEffect(() => {
    if (!selected) {
      setDetailVisible(false);
      return;
    }
    setDetailVisible(false);
    const t = setTimeout(() => setDetailVisible(true), 20);
    return () => clearTimeout(t);
  }, [selected]);

  const openPreview = (url: string, caption?: string) => {
    setPreviewItem(url);
    setPreviewCaption(caption || '');
    setPreviewIsImage(/\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('alt=media') || url.includes('/v0/b/'));
    setPreviewClosing(false);
    setPreviewOpen(true);
    setPreviewAnimating(false);
    // allow DOM to mount then trigger animation
    setTimeout(() => setPreviewAnimating(true), 20);
  };
  const closePreview = () => {
    // trigger exit animation then unmount
    setPreviewClosing(true);
    setPreviewAnimating(false);
    setTimeout(() => {
      setPreviewOpen(false);
      setPreviewItem(null);
      setPreviewCaption(null);
      setPreviewClosing(false);
    }, 220);
  };

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'achterpaden');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      setRegistraties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => {
      // achterpaden onSnapshot error
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter en sorteer logica
  const filteredAndSortedRegistraties = React.useMemo(() => {
    let result = [...registraties];

    // Veiligheid filter
    if (veiligheidFilter !== 'alle') {
      result = result.filter(r => {
        if (!r.veiligheid) return false;
        const score = r.veiligheid.score || 3;
        if (veiligheidFilter === 'onveilig') return score <= 2;
        if (veiligheidFilter === 'matig') return score === 3;
        if (veiligheidFilter === 'veilig') return score >= 4;
        return true;
      });
    }

    // Urgentie filter
    if (urgentieFilter !== 'alle') {
      result = result.filter(r => {
        if (!r.onderhoud) return false;
        return r.onderhoud.urgentie === urgentieFilter;
      });
    }

    // Wijk filter
    if (wijkFilter !== 'alle') {
      result = result.filter(r => r.wijk === wijkFilter);
    }

    // Sorteren
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime; // nieuwste eerst
      }
      if (sortBy === 'urgentie') {
        const urgentieOrder: Record<string, number> = { spoed: 5, hoog: 4, normaal: 3, laag: 2, geen: 1 };
        const aUrg = urgentieOrder[a.onderhoud?.urgentie || 'geen'] || 0;
        const bUrg = urgentieOrder[b.onderhoud?.urgentie || 'geen'] || 0;
        return bUrg - aUrg; // hoogste urgentie eerst
      }
      if (sortBy === 'veiligheid') {
        const aScore = a.veiligheid?.score || 3;
        const bScore = b.veiligheid?.score || 3;
        return aScore - bScore; // laagste score (meest onveilig) eerst
      }
      if (sortBy === 'lengte') {
        return (b.lengte || 0) - (a.lengte || 0); // langste eerst
      }
      if (sortBy === 'straat') {
        return (a.straat || '').localeCompare(b.straat || ''); // alfabetisch
      }
      return 0;
    });

    return result;
  }, [registraties, veiligheidFilter, urgentieFilter, wijkFilter, sortBy]);

  // Unieke wijken voor filter dropdown
  const availableWijken = React.useMemo(() => {
    const wijken = new Set(registraties.map(r => r.wijk).filter(Boolean));
    return Array.from(wijken).sort();
  }, [registraties]);

  // formatUpdateInfo removed; badge info is now in AchterpadCard component

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Laden...</div>;
  }

  // Render edit view as full page
  if (view === 'edit' && selected) {
    return (
      <EditAchterpadModal
        selected={selected}
        onClose={() => setView('detail')}
        onUpdate={async updated => {
          const snap = await getDoc(doc(db, "achterpaden", updated.id));
          if (snap.exists()) {
            setSelected({ id: updated.id, ...snap.data() });
            setRegistraties(registraties => registraties.map(r => r.id === updated.id ? { id: updated.id, ...snap.data() } : r));
          } else {
            setSelected(updated);
            setRegistraties(registraties => registraties.map(r => r.id === updated.id ? updated : r));
          }
          setView('detail');
        }}
      />
    );
  }

  return (
  <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl">
    <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary leading-tight">Overzicht Achterpaden Registraties</h1>

    {/* Filters en sorteer UI - alleen in grid view */}
    {view === 'grid' && (
      <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {filteredAndSortedRegistraties.length} van {registraties.length} registraties
          </div>
          <button
            onClick={() => {
              setVeiligheidFilter('alle');
              setUrgentieFilter('alle');
              setWijkFilter('alle');
              setSortBy('date');
            }}
            className="text-xs text-brand-primary hover:underline"
          >
            Reset filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Veiligheid filter */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Veiligheid</label>
            <select
              value={veiligheidFilter}
              onChange={(e) => setVeiligheidFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded text-sm"
            >
              <option value="alle">Alle</option>
              <option value="onveilig">🔴 Onveilig (⭐⭐ of minder)</option>
              <option value="matig">🟠 Matig (⭐⭐⭐)</option>
              <option value="veilig">🟢 Veilig (⭐⭐⭐⭐+)</option>
            </select>
          </div>

          {/* Urgentie filter */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Urgentie</label>
            <select
              value={urgentieFilter}
              onChange={(e) => setUrgentieFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded text-sm"
            >
              <option value="alle">Alle</option>
              <option value="spoed">🔴 Spoed</option>
              <option value="hoog">🟠 Hoog</option>
              <option value="normaal">🟡 Normaal</option>
              <option value="laag">🟢 Laag</option>
              <option value="geen">⚪ Geen</option>
            </select>
          </div>

          {/* Wijk filter */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Wijk</label>
            <select
              value={wijkFilter}
              onChange={(e) => setWijkFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded text-sm"
            >
              <option value="alle">Alle wijken</option>
              {availableWijken.map(wijk => (
                <option key={wijk} value={wijk}>{wijk}</option>
              ))}
            </select>
          </div>

          {/* Sorteer */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Sorteer op</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded text-sm"
            >
              <option value="date">📅 Nieuwste eerst</option>
              <option value="urgentie">⚠️ Urgentie (hoog → laag)</option>
              <option value="veiligheid">🛡️ Veiligheid (laag → hoog)</option>
              <option value="lengte">📏 Lengte (lang → kort)</option>
              <option value="straat">🔤 Straatnaam (A-Z)</option>
            </select>
          </div>
        </div>
      </div>
    )}

    {view === 'detail' && selected ? (
  <div className={`relative p-6 bg-white dark:bg-dark-bg rounded-xl shadow border border-gray-200 dark:border-dark-border grid grid-cols-1 lg:grid-cols-3 gap-6 items-start transition-all duration-300 ${detailVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {/* Knoppen rechtsboven */}
        <div className="absolute top-4 right-4 flex gap-2 items-center">
          <button className="px-3 py-1 bg-gray-200 dark:bg-dark-border rounded text-sm" onClick={() => { setSelected(null); setView('grid'); }}>Terug</button>
          {(currentUser?.role === UserRole.Beheerder || currentUser?.role === UserRole.Concierge) && (
            <button className="px-3 py-1 bg-brand-primary text-white rounded text-sm" onClick={() => setView('edit')}>Bewerken</button>
          )}
        </div>
        {tab === 'stats' ? (
          <div className="lg:col-span-3 w-full">
            <AchterpadenStats registraties={registraties} />
          </div>
        ) : (
          <>
        <div className="mb-4 lg:col-span-2">
          <div className="text-sm text-gray-700 dark:text-dark-text-secondary">
            <div><span className="font-semibold text-brand-primary">Straat:</span> {selected.straat}</div>
            <div><span className="font-semibold text-brand-primary">Wijk:</span> {selected.wijk}</div>
          </div>
        </div>
        {selected.paden && Array.isArray(selected.paden) && selected.paden.length > 0 && (
          <div className="mb-4 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Paden</h2>
            <div className="space-y-2">
              {selected.paden.map((pad: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-4 items-center">
                  <div><span className="font-medium">{pad.naam}:</span></div>
                  <div><span className="text-gray-700 dark:text-dark-text-secondary">Huisnummers:</span> {pad.huisnummers}</div>
                </div>
              ))}
            </div>
          </div>
        )}
  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
          <div><span className="font-semibold text-brand-primary">Beschrijving:</span> {selected.beschrijving}</div>
          <div><span className="font-semibold text-brand-primary">Type pad:</span> {selected.typePad}</div>
          <div><span className="font-semibold text-brand-primary">Lengte:</span> {selected.lengte} m</div>
          <div><span className="font-semibold text-brand-primary">Breedte:</span> {selected.breedte} m</div>
          <div><span className="font-semibold text-brand-primary">Eigendom:</span> {selected.eigendom === 'huur' ? 'Huur' : selected.eigendom === 'particulier' ? 'Particulier' : selected.eigendom === 'huur_en_particulier' ? 'Huur en Particulier' : (selected.eigendom || '-')}</div>
          <div><span className="font-semibold text-brand-primary">Toegankelijk:</span> {selected.toegankelijk}</div>
          <div><span className="font-semibold text-brand-primary">Staat:</span> {selected.staat}</div>
          <div className="md:col-span-2"><span className="font-semibold text-brand-primary">Obstakels:</span> {selected.obstakels}</div>
          {selected.extraInfo && (
            <div className="md:col-span-2 p-3 bg-gray-50 dark:bg-dark-surface rounded mt-2 shadow-sm">
              <span className="font-semibold text-brand-primary">Extra info:</span> {selected.extraInfo}
            </div>
          )}
        </div>
        {(() => {
          const updateMedia = (selected.updates || []).flatMap((u: any) => Array.isArray(u.attachments) ? u.attachments : []);
          const baseMedia = Array.isArray(selected.media) ? selected.media : [];
          // unieke lijst, zodat dubbele URLs niet herhaald worden
          const mediaCombined = Array.from(new Set([...baseMedia, ...updateMedia]));
          return mediaCombined.length > 0 ? (
          <div className="mt-4 lg:col-span-1">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Media</h2>
            <div className="flex flex-wrap gap-3">
              {mediaCombined
                .filter((url: string) => (url.startsWith("https://") || url.startsWith("http://127.0.0.1:9201/")) && !url.includes("demo") && !url.includes("placeholder"))
                    .map((url: string, idx: number) => {
                  const looksLikeImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
                    || url.includes('alt=media')
                    || url.includes('/v0/b/')
                    || url.includes('firebasestorage.googleapis.com')
                    || url.includes('storage.googleapis.com');
                    if (looksLikeImage) {
                      return (
                        <img
                          key={idx}
                          src={url}
                          alt={getFilename(url) || `media-${idx + 1}`}
                          className="h-24 w-24 object-cover rounded border border-gray-200 dark:border-dark-border cursor-pointer hover:scale-105 transform transition duration-150"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') { try {
                              const media = mediaCombined.filter((u: string) => (u.startsWith('https://') || u.startsWith('http://127.0.0.1:9201/')) && !u.includes('demo') && !u.includes('placeholder'));
                              const captions = media.map((m: string) => {
                                const found = (selected.updates || []).find((up: any) => Array.isArray(up.attachments) && up.attachments.includes(m));
                                if (found) return found.text || getFilename(m);
                                return getFilename(m);
                              });
                              const caption = captions[idx] || getFilename(url);
                              openPreview(url, caption);
                            } catch { openPreview(url, getFilename(url)); } } }}
                          onClick={() => {
                            try {
                              const media = mediaCombined.filter((u: string) => (u.startsWith('https://') || u.startsWith('http://127.0.0.1:9201/')) && !u.includes('demo') && !u.includes('placeholder'));
                              const captions = media.map((m: string) => {
                                const found = (selected.updates || []).find((up: any) => Array.isArray(up.attachments) && up.attachments.includes(m));
                                if (found) return found.text || getFilename(m);
                                return getFilename(m);
                              });
                              const caption = captions[idx] || getFilename(url);
                              openPreview(url, caption);
                            } catch {
                              openPreview(url, getFilename(url));
                            }
                          }}
                        />
                      );
                    }
                  return (
                    <video key={idx} controls aria-label={`Media video ${idx + 1}`} className="h-24 w-24 rounded border border-gray-200 dark:border-dark-border">
                      <source src={url} />
                      <track kind="captions" src="" />
                    </video>
                  );
                })}
            </div>
          </div>
        ) : null; })()}
        {/* inline preview overlay */}
        {previewOpen && previewItem && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${previewAnimating && !previewClosing ? 'opacity-100' : 'opacity-0'}`} onClick={() => closePreview()} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') closePreview(); }} role="button">
            <div className={`absolute inset-0 bg-black/60 transition-opacity ${previewAnimating && !previewClosing ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`relative bg-white dark:bg-dark-bg rounded shadow-lg max-w-[90vw] max-h-[90vh] overflow-auto transform transition-all duration-200 ${previewAnimating && !previewClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={(e) => e.stopPropagation()} tabIndex={0} role="button">
              <div className="p-4">
                <div className="mb-2 text-sm text-gray-600 dark:text-dark-text-secondary">{previewCaption}</div>
                          {previewIsImage ? (
                  <img src={previewItem as string} alt={previewCaption || 'Preview afbeelding'} className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <video controls aria-label={previewCaption || 'Preview video'} className="max-w-full max-h-[70vh]" src={previewItem as string}><track kind="captions" src="" /></video>
                )}
                <div className="mt-3 text-right">
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => closePreview()}>Sluiten</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {selected.updates && Array.isArray(selected.updates) && selected.updates.length > 0 && (
          <div className="mt-4 lg:col-span-3">
            <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Updates</h2>
            <div className="space-y-3">
                {selected.updates.slice().reverse().map((u: any) => {
                const author = (window as any).__app_users__?.find((x: any) => x.id === u.userId) || null;
                return (
                  <div key={u.id} className="p-3 bg-gray-50 dark:bg-dark-surface rounded hover:shadow transition">
                    <div className="text-sm text-gray-700 dark:text-dark-text-secondary">{u.text}</div>
                      {u.attachments && u.attachments.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {u.attachments.map((att: string, idx: number) => {
                            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(att) || att.includes('alt=media') || att.includes('/v0/b/');
                            if (isImg) {
                              return (
                                <img key={idx} src={att} alt={getFilename(att) || `Bijlage ${idx + 1}`} className="h-16 w-16 object-cover rounded cursor-pointer" role="button" tabIndex={0} />
                              );
                            }
                            return (
                              <video key={idx} controls aria-label={`Bijlage video ${idx + 1}`} className="h-16 w-16 rounded"><source src={att} /><track kind="captions" src="" /></video>
                            );
                          })}
                        </div>
                      )}
                    <div className="mt-2 text-xs text-gray-500">{u.timestamp ? (u.timestamp.seconds ? new Date(u.timestamp.seconds * 1000).toLocaleString() : new Date(u.timestamp).toLocaleString()) : ''} — {author ? author.name : u.userId}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {selected.createdAt && (
          <div className="mt-4 text-xs text-gray-500 dark:text-dark-text-secondary">Registratie: {selected.createdAt.seconds ? new Date(selected.createdAt.seconds * 1000).toLocaleString() : ""}</div>
        )}
        </>
        )}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAndSortedRegistraties.length === 0 ? (
          <div className="text-gray-500">
            {registraties.length === 0 ? 'Geen registraties gevonden.' : 'Geen registraties gevonden met de huidige filters.'}
          </div>
        ) : (
          filteredAndSortedRegistraties.map((r: any) => (
            <div key={r.id}>
              <AchterpadCard registratie={r} onSelect={(reg: any) => { setSelected(reg); setView('detail'); }} />
            </div>
          ))
        )}
      </div>
    )}
  </div>
  );
};

export default AchterpadenOverzicht;
