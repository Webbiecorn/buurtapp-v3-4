import React, { useEffect, useState } from 'react';
import { getAchterpadStatusColor } from '../utils/statusColors';
import { useAppContext } from '../context/AppContext';
import { useAchterpaden } from '../services/firestoreHooks';
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

// Using shared statusColors utility

// Detail Modal
const DetailModal: React.FC<{
  achterpad: any;
  onClose: () => void;
}> = ({ achterpad, onClose }) => {
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
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 transition"
              onClick={onClose}
            >
              Sluiten
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* GPS Kaart */}
            {achterpad.gpsBeginpunt && achterpad.gpsEindpunt && (
              <div className="border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={achterpad.gpsBeginpunt}
                    defaultZoom={16}
                    mapId={import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID}
                    style={{ width: '100%', height: '300px' }}
                    gestureHandling="cooperative"
                  >
                    <Marker position={achterpad.gpsBeginpunt} title="Beginpunt" />
                    <Marker position={achterpad.gpsEindpunt} title="Eindpunt" />
                    <RoutePolyline 
                      start={achterpad.gpsBeginpunt} 
                      end={achterpad.gpsEindpunt} 
                      color={getAchterpadStatusColor(achterpad.staat)} 
                    />
                  </Map>
                </APIProvider>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Beschrijving:</span> {achterpad.beschrijving}</div>
              <div><span className="font-semibold">Type:</span> {achterpad.typePad}</div>
              <div><span className="font-semibold">Lengte:</span> {achterpad.lengte}m</div>
              <div><span className="font-semibold">Breedte:</span> {achterpad.breedte}m</div>
              <div><span className="font-semibold">Eigendom:</span> {achterpad.eigendom}</div>
              <div><span className="font-semibold">Toegankelijk:</span> {achterpad.toegankelijk}</div>
              <div>
                <span className="font-semibold">Staat:</span>{' '}
                <span style={{ color: getAchterpadStatusColor(achterpad.staat) }} className="font-bold">
                  {achterpad.staat}
                </span>
              </div>
              <div><span className="font-semibold">Obstakels:</span> {achterpad.obstakels}</div>
            </div>

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
const AchterpadenKaartOverzicht: React.FC = () => {
  const { data: registraties, loading } = useAchterpaden();
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedAchterpad, setSelectedAchterpad] = useState<any | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  const { currentUser } = useAppContext();

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...registraties];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.straat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.wijk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.beschrijving?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.staat?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.seconds || 0) * 1000;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.seconds || 0) * 1000;
        return bTime - aTime;
      });
    } else if (sortBy === 'length') {
      filtered.sort((a, b) => (b.lengte || 0) - (a.lengte || 0));
    } else if (sortBy === 'street') {
      filtered.sort((a, b) => (a.straat || '').localeCompare(b.straat || ''));
    }

    setFilteredData(filtered);
  }, [registraties, searchTerm, statusFilter, sortBy]);

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
      'Datum': a.createdAt instanceof Date 
        ? a.createdAt.toLocaleDateString() 
        : a.createdAt?.seconds 
          ? new Date(a.createdAt.seconds * 1000).toLocaleDateString() 
          : '-'
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Zoek op straat, wijk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="all">Alle statussen</option>
            <option value="goed">Goed</option>
            <option value="matig">Matig</option>
            <option value="slecht">Slecht</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary"
          >
            <option value="date">Sorteer op datum</option>
            <option value="length">Sorteer op lengte</option>
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
                  .filter(a => a.gpsBeginpunt && a.gpsEindpunt)
                  .map((achterpad) => (
                    <React.Fragment key={achterpad.id}>
                      <Marker
                        position={achterpad.gpsBeginpunt}
                        title={`${achterpad.straat} - Begin`}
                        onClick={() => setSelectedAchterpad(achterpad)}
                      />
                      <Marker
                        position={achterpad.gpsEindpunt}
                        title={`${achterpad.straat} - Eind`}
                        onClick={() => setSelectedAchterpad(achterpad)}
                      />
                      <RoutePolyline
                        start={achterpad.gpsBeginpunt}
                        end={achterpad.gpsEindpunt}
                        color={getAchterpadStatusColor(achterpad.staat)}
                      />
                    </React.Fragment>
                  ))}
              </Map>
            </APIProvider>
          </div>

          {/* Sidebar */}
          <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm p-4 max-h-96 overflow-auto">
            <h3 className="font-semibold text-lg mb-3">Achterpaden op kaart</h3>
            <div className="space-y-2">
              {filteredData
                .filter(a => a.gpsBeginpunt && a.gpsEindpunt)
                .map((achterpad) => (
                  <div
                    key={achterpad.id}
                    className="p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition"
                    onClick={() => setSelectedAchterpad(achterpad)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{achterpad.straat}</div>
                        <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                          {achterpad.wijk} • {achterpad.lengte}m
                        </div>
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getAchterpadStatusColor(achterpad.staat) }}
                        title={achterpad.staat}
                      />
                    </div>
                  </div>
                ))}
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
                      style={{ backgroundColor: getAchterpadStatusColor(achterpad.staat) }}
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
        />
      )}
    </div>
  );
};

export default AchterpadenKaartOverzicht;
