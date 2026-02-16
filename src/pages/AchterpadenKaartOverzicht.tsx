import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Polyline component voor routes op kaart
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

// Bepaal marker kleur op basis van veiligheid en onderhoud
const getMarkerColor = (achterpad: any): string => {
  const veiligheidScore = achterpad.veiligheid?.score || 0;
  const urgentie = achterpad.onderhoud?.urgentie?.toLowerCase() || '';
  
  // Prioriteit: urgentie en veiligheid samen
  // Spoed of zeer onveilig (score 1-2) = ROOD
  if (urgentie === 'spoed' || veiligheidScore <= 2) {
    return '#EF4444'; // 🔴 Rood
  }
  
  // Hoog urgentie of matige veiligheid (score 3) = ORANJE
  if (urgentie === 'hoog' || veiligheidScore === 3) {
    return '#F59E0B'; // 🟠 Oranje
  }
  
  // Normaal urgentie = GEEL
  if (urgentie === 'normaal') {
    return '#EAB308'; // 🟡 Geel
  }
  
  // Laag/geen urgentie en goede veiligheid (score 4-5) = GROEN
  return '#10B981'; // 🟢 Groen
};

// Status kleur helper (backwards compatibility voor oude data)
const getStatusColor = (staat: string): string => {
  switch (staat?.toLowerCase()) {
    case 'goed':
      return '#10B981'; // groen
    case 'matig':
      return '#F59E0B'; // oranje
    case 'slecht':
      return '#EF4444'; // rood
    default:
      return '#6B7280'; // grijs
  }
};

// Detail Modal
const DetailModal: React.FC<{
  achterpad: any;
  onClose: () => void;
  onEdit?: (achterpad: any) => void;
}> = ({ achterpad, onClose, onEdit }) => {
  const { currentUser } = useAppContext();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const allMedia = [
    ...(Array.isArray(achterpad.media) ? achterpad.media : []),
    ...(achterpad.updates || []).flatMap((u: any) => 
      Array.isArray(u.attachments) ? u.attachments : []
    )
  ].filter((url: string, idx: number, self: string[]) => 
    self.indexOf(url) === idx && 
    (url.startsWith('https://') || url.startsWith('http://127.0.0.1:9201/')) && 
    !url.includes('demo') && 
    !url.includes('placeholder')
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white dark:bg-dark-bg rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border p-4 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {achterpad.straat} - {achterpad.wijk}
            </h2>
            <div className="flex gap-2">
              {onEdit && currentUser && (currentUser.role === 'Beheerder' || currentUser.role === 'Concierge') && (
                <button
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
                  onClick={() => onEdit(achterpad)}
                >
                  Bewerken
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 transition"
                onClick={onClose}
              >
                Sluiten
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* GPS Kaart */}
            {(achterpad.gpsRoute?.length >= 2 || (achterpad.gpsBeginpunt && achterpad.gpsEindpunt)) && (
              <div className="border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={achterpad.gpsRoute?.[0] || achterpad.gpsBeginpunt}
                    defaultZoom={16}
                    mapId={import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID}
                    style={{ width: '100%', height: '300px' }}
                    gestureHandling="cooperative"
                  >
                    {achterpad.gpsRoute?.length >= 2 ? (
                      <>
                        {/* Route met meerdere punten */}
                        {achterpad.gpsRoute.map((point: any, idx: number) => {
                          if (idx === achterpad.gpsRoute.length - 1) return null;
                          return (
                            <RoutePolyline
                              key={idx}
                              start={point}
                              end={achterpad.gpsRoute[idx + 1]}
                              color={getMarkerColor(achterpad)}
                            />
                          );
                        })}
                        <Marker position={achterpad.gpsRoute[0]} title="Start" />
                        <Marker position={achterpad.gpsRoute[achterpad.gpsRoute.length - 1]} title="Eind" />
                      </>
                    ) : (
                      <>
                        {/* Oude data format (begin/eind punt) */}
                        <Marker position={achterpad.gpsBeginpunt} title="Beginpunt" />
                        <Marker position={achterpad.gpsEindpunt} title="Eindpunt" />
                        <RoutePolyline 
                          start={achterpad.gpsBeginpunt} 
                          end={achterpad.gpsEindpunt} 
                          color={getMarkerColor(achterpad)} 
                        />
                      </>
                    )}
                  </Map>
                </APIProvider>
              </div>
            )}

            {/* Basis Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">📏 Lengte:</span> {achterpad.lengte || 0}m
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">🏘️ Huisnummers:</span> {achterpad.huisnummers || 'Onbekend'}
              </div>
              {achterpad.registeredBy && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">👤 Geregistreerd door:</span> {achterpad.registeredBy.userName}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">📅 Datum:</span> {achterpad.createdAt ? new Date(achterpad.createdAt.seconds * 1000).toLocaleDateString('nl-NL') : 'Onbekend'}
                  </div>
                </>
              )}
            </div>

            {/* Veiligheid & Onderhoud Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Veiligheid Card */}
              {achterpad.veiligheid && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                    🛡️ Veiligheid
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Verlichting:</span>
                      <span className="font-semibold">{achterpad.veiligheid.verlichting || 'n.v.t.'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Zichtbaarheid:</span>
                      <span className="font-semibold">{achterpad.veiligheid.zichtbaarheid || 'n.v.t.'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Score:</span>
                      <span className="text-lg">{'⭐'.repeat(achterpad.veiligheid.score || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Onderhoud Card */}
              {achterpad.onderhoud && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-3 flex items-center gap-2">
                    🔧 Onderhoud
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Bestrating:</span>
                      <span className="font-semibold">{achterpad.onderhoud.bestrating || 'n.v.t.'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Begroeiing:</span>
                      <span className="font-semibold">{achterpad.onderhoud.begroeiing || 'n.v.t.'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vervuiling:</span>
                      <span className="font-semibold">{achterpad.onderhoud.vervuiling || 'n.v.t.'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Urgentie:</span>
                      <span 
                        className="font-bold px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: getMarkerColor(achterpad),
                          color: 'white'
                        }}
                      >
                        {achterpad.onderhoud.urgentie || 'n.v.t.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Beschrijving */}
            {achterpad.beschrijving && (
              <div className="bg-gray-50 dark:bg-dark-surface rounded-lg p-4">
                <h3 className="font-semibold mb-2">💬 Opmerkingen</h3>
                <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{achterpad.beschrijving}</p>
              </div>
            )}

            {/* Bewoner Enquêtes */}
            {achterpad.bewonerEnquetes?.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-3">👥 Bewoner Feedback ({achterpad.bewonerEnquetes.length})</h3>
                <div className="space-y-3">
                  {achterpad.bewonerEnquetes.map((enquete: any, idx: number) => (
                    <div key={idx} className="text-sm border-b border-purple-200 dark:border-purple-800 last:border-0 pb-2">
                      <div className="flex justify-between mb-1">
                        <span>Bewoner {idx + 1}</span>
                        <span>{'⭐'.repeat(enquete.veiligheidScore || 0)}</span>
                      </div>
                      {enquete.opmerkingen && (
                        <p className="text-gray-600 dark:text-gray-400 italic">"{enquete.opmerkingen}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achterpad.extraInfo && (
              <div className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg">
                <div className="font-semibold mb-2">Extra informatie:</div>
                <div>{achterpad.extraInfo}</div>
              </div>
            )}

            {/* Media */}
            {allMedia.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Foto's & Media ({allMedia.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allMedia.map((url: string, idx: number) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
                                   url.includes('alt=media') || 
                                   url.includes('/v0/b/');
                    return isImage ? (
                      <img
                        key={idx}
                        src={url}
                        alt={`Media ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewUrl(url)}
                      />
                    ) : (
                      <video key={idx} controls className="w-full h-32 rounded-lg">
                        <source src={url} />
                      </video>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
            onClick={() => setPreviewUrl(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

// Main Component
const AchterpadenKaartOverzicht: React.FC<{ onEditAchterpad?: (achterpad: any) => void }> = ({ onEditAchterpad }) => {
  const [registraties, setRegistraties] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedAchterpad, setSelectedAchterpad] = useState<any | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const { debouncedTerm: debouncedSearch, isSearching } = useSearchDebounce(searchTerm);
  const [veiligheidFilter, setVeiligheidFilter] = useState<string>('all'); // all/onveilig/matig/veilig
  const [urgentieFilter, setUrgentieFilter] = useState<string>('all'); // all/spoed/hoog/normaal/laag/geen
  const [wijkFilter, setWijkFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Load data
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'achterpaden');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistraties(data);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...registraties];

// Search (debounced)
    if (debouncedSearch) {
      filtered = filtered.filter(r =>
        r.straat?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.wijk?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.beschrijving?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Veiligheid filter
    if (veiligheidFilter !== 'all') {
      filtered = filtered.filter(r => {
        const score = r.veiligheid?.score || 0;
        if (veiligheidFilter === 'onveilig') return score <= 2;
        if (veiligheidFilter === 'matig') return score === 3;
        if (veiligheidFilter === 'veilig') return score >= 4;
        return true;
      });
    }

    // Urgentie filter
    if (urgentieFilter !== 'all') {
      filtered = filtered.filter(r => 
        r.onderhoud?.urgentie?.toLowerCase() === urgentieFilter.toLowerCase()
      );
    }

    // Wijk filter
    if (wijkFilter !== 'all') {
      filtered = filtered.filter(r => r.wijk === wijkFilter);
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (sortBy === 'length') {
      filtered.sort((a, b) => (b.lengte || 0) - (a.lengte || 0));
    } else if (sortBy === 'street') {
      filtered.sort((a, b) => (a.straat || '').localeCompare(b.straat || ''));
    } else if (sortBy === 'urgentie') {
      const urgOrder: any = { 'spoed': 5, 'hoog': 4, 'normaal': 3, 'laag': 2, 'geen': 1 };
      filtered.sort((a, b) => {
        const aUrg = urgOrder[a.onderhoud?.urgentie?.toLowerCase()] || 0;
        const bUrg = urgOrder[b.onderhoud?.urgentie?.toLowerCase()] || 0;
        return bUrg - aUrg;
      });
    } else if (sortBy === 'veiligheid') {
      filtered.sort((a, b) => (a.veiligheid?.score || 0) - (b.veiligheid?.score || 0));
    }

    setFilteredData(filtered);
  }, [registraties, debouncedSearch, veiligheidFilter, urgentieFilter, wijkFilter, sortBy]);

  // Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Achterpaden Overzicht', 14, 20);
    
    let y = 35;
    filteredData.forEach((a, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(`${idx + 1}. ${a.straat} (${a.wijk})`, 14, y);
      doc.setFontSize(10);
      y += 7;
      doc.text(`Lengte: ${a.lengte}m | Staat: ${a.staat}`, 14, y);
      y += 10;
    });

    doc.save('achterpaden-overzicht.pdf');
  };

  // Export Excel
  const exportToExcel = () => {
    const data = filteredData.map(a => ({
      'Straat': a.straat,
      'Wijk': a.wijk,
      'Lengte (m)': a.lengte,
      'Breedte (m)': a.breedte,
      'Staat': a.staat,
      'Type': a.typePad,
      'Eigendom': a.eigendom,
      'Toegankelijk': a.toegankelijk,
      'Datum': a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Achterpaden');
    XLSX.writeFile(wb, 'achterpaden-overzicht.xlsx');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-gray-600 dark:text-dark-text-secondary">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Achterpaden Kaart
        </h1>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-border rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'map'
                ? 'bg-white dark:bg-dark-bg shadow text-brand-primary'
                : 'text-gray-600 dark:text-dark-text-secondary hover:text-brand-primary'
            }`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Kaart
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-dark-bg shadow text-brand-primary'
                : 'text-gray-600 dark:text-dark-text-secondary hover:text-brand-primary'
            }`}
            onClick={() => setViewMode('list')}
          >
            📋 Lijst
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-dark-bg rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Zoek op straat, wijk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Veiligheid Filter */}
          <select
            value={veiligheidFilter}
            onChange={(e) => setVeiligheidFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="all">🛡️ Alle veiligheid</option>
            <option value="onveilig">🔴 Onveilig (1-2★)</option>
            <option value="matig">🟠 Matig (3★)</option>
            <option value="veilig">🟢 Veilig (4-5★)</option>
          </select>

          {/* Urgentie Filter */}
          <select
            value={urgentieFilter}
            onChange={(e) => setUrgentieFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="all">🔧 Alle urgentie</option>
            <option value="spoed">🔴 Spoed</option>
            <option value="hoog">🟠 Hoog</option>
            <option value="normaal">🟡 Normaal</option>
            <option value="laag">🟢 Laag</option>
            <option value="geen">⚪ Geen</option>
          </select>

          {/* Wijk Filter */}
          <select
            value={wijkFilter}
            onChange={(e) => setWijkFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="all">📍 Alle wijken</option>
            {Array.from(new Set(registraties.map(r => r.wijk).filter(Boolean))).sort().map(wijk => (
              <option key={wijk} value={wijk}>{wijk}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="date">📅 Datum</option>
            <option value="urgentie">🚨 Urgentie</option>
            <option value="veiligheid">🛡️ Veiligheid</option>
            <option value="length">📏 Lengte</option>
            <option value="street">Sorteer op straat</option>
          </select>

          {/* Export */}
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              📄 PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              📊 Excel
            </button>
          </div>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {filteredData.length} van {registraties.length} achterpaden
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        /* Kaartweergave */
        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-bg rounded-xl overflow-hidden shadow-lg">
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{ lat: 52.5085, lng: 5.4750 }}
                defaultZoom={13}
                mapId={import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID}
                style={{ width: '100%', height: '600px' }}
                gestureHandling="greedy"
              >
                {filteredData
                  .filter(a => a.gpsRoute?.length >= 2 || (a.gpsBeginpunt && a.gpsEindpunt))
                  .map((achterpad) => {
                    const markerColor = getMarkerColor(achterpad);
                    const firstPoint = achterpad.gpsRoute?.[0] || achterpad.gpsBeginpunt;
                    const lastPoint = achterpad.gpsRoute?.[achterpad.gpsRoute.length - 1] || achterpad.gpsEindpunt;
                    
                    return (
                      <React.Fragment key={achterpad.id}>
                        {/* Eerste punt marker met kleur */}
                        <Marker
                          position={firstPoint}
                          title={`${achterpad.straat} - ${achterpad.wijk}`}
                          onClick={() => setSelectedAchterpad(achterpad)}
                          icon={{
                            path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                            fillColor: markerColor,
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                            scale: 8,
                          }}
                        />
                        
                        {/* Route lijn (indien beschikbaar) */}
                        {achterpad.gpsRoute?.length >= 2 ? (
                          achterpad.gpsRoute.map((point: any, idx: number) => {
                            if (idx === achterpad.gpsRoute.length - 1) return null;
                            return (
                              <RoutePolyline
                                key={idx}
                                start={point}
                                end={achterpad.gpsRoute[idx + 1]}
                                color={markerColor}
                              />
                            );
                          })
                        ) : (
                          <RoutePolyline
                            start={firstPoint}
                            end={lastPoint}
                            color={markerColor}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
              </Map>
            </APIProvider>
            
            {/* Legenda overlay */}
            <div className="absolute bottom-6 left-6 bg-white dark:bg-dark-bg rounded-lg shadow-lg p-4 border border-gray-200 dark:border-dark-border">
              <h4 className="font-bold text-sm mb-2 text-gray-900 dark:text-dark-text-primary">Legenda</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#EF4444]"></div>
                  <span>🔴 Spoed / Zeer onveilig</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#F59E0B]"></div>
                  <span>🟠 Hoog / Matig veilig</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#EAB308]"></div>
                  <span>🟡 Normaal onderhoud</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#10B981]"></div>
                  <span>🟢 Goed in orde</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm p-4 max-h-96 overflow-auto">
            <h3 className="font-semibold text-lg mb-3">Achterpaden ({filteredData.length})</h3>
            <div className="space-y-2">
              {filteredData
                .filter(a => a.gpsRoute?.length >= 2 || (a.gpsBeginpunt && a.gpsEindpunt))
                .map((achterpad) => {
                  const markerColor = getMarkerColor(achterpad);
                  const urgentie = achterpad.onderhoud?.urgentie || 'onbekend';
                  const veiligheidScore = achterpad.veiligheid?.score || 0;
                  
                  return (
                    <div
                      key={achterpad.id}
                      className="p-3 border-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition"
                      style={{ borderColor: markerColor }}
                      onClick={() => setSelectedAchterpad(achterpad)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {achterpad.straat}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            {achterpad.wijk} • {achterpad.lengte}m
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded">
                              {'⭐'.repeat(veiligheidScore)}
                            </span>
                            <span className="text-xs bg-gray-100 dark:bg-dark-border px-2 py-0.5 rounded">
                              {urgentie}
                            </span>
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: markerColor }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* Lijstweergave */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              Geen achterpaden gevonden.
            </div>
          ) : (
            filteredData.map((achterpad) => (
              <div
                key={achterpad.id}
                className="bg-white dark:bg-dark-bg rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setSelectedAchterpad(achterpad)}
              >
                {/* Thumbnail */}
                {achterpad.media?.[0] ? (
                  <img
                    src={achterpad.media[0]}
                    alt={achterpad.straat}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 dark:bg-dark-border flex items-center justify-center text-gray-400">
                    📸 Geen foto
                  </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{achterpad.straat}</h3>
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {achterpad.wijk}
                      </p>
                    </div>
                    <div
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getStatusColor(achterpad.staat) }}
                    >
                      {achterpad.staat}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-dark-text-secondary line-clamp-2">
                    {achterpad.beschrijving}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-dark-text-secondary pt-2 border-t border-gray-200 dark:border-dark-border">
                    <span>📏 {achterpad.lengte}m × {achterpad.breedte}m</span>
                    <span>{achterpad.typePad}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAchterpad && (
        <DetailModal
          achterpad={selectedAchterpad}
          onClose={() => setSelectedAchterpad(null)}
          onEdit={onEditAchterpad}
        />
      )}
    </div>
  );
};

export default AchterpadenKaartOverzicht;
