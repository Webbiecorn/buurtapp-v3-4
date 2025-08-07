import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { MeldingMarker } from '../components/MeldingMarker'; 
import { ProjectMarker } from '../components/ProjectMarker';

const COLORS = ['#f59e0b', '#8b5cf6', '#22c55e'];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_LIGHT_ID = import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID;
const GOOGLE_MAP_DARK_ID = import.meta.env.VITE_GOOGLE_MAP_DARK_ID;

const StatisticsPage: React.FC = () => {
  const { meldingen, projecten, urenregistraties, users, theme } = useAppContext();
  const [selectedMeldingId, setSelectedMeldingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<'meldingen' | 'projecten' | 'beide'>('meldingen');

  const meldingenPerWijk = meldingen.reduce((acc, m) => {
    acc[m.wijk] = (acc[m.wijk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const wijkData = Object.entries(meldingenPerWijk).map(([name, value]) => ({ name, meldingen: value }));

  const meldingenPerStatus = Object.values(MeldingStatus).map(status => ({
    name: status,
    value: meldingen.filter(m => m.status === status).length
  }));

  const urenPerMedewerker = users.map(user => {
    const totalMillis = urenregistraties
      .filter(u => u.gebruikerId === user.id && u.eindtijd)
      .reduce((acc, curr) => acc + (new Date(curr.eindtijd!).getTime() - new Date(curr.starttijd).getTime()), 0);
    return { name: user.name, uren: totalMillis / (1000 * 60 * 60) };
  }).filter(u => u.uren > 0);

  // CORRECTIE: De coördinaten zijn nu ingesteld op het centrum van Lelystad.
  const center = { lat: 52.5185, lng: 5.4714 };
  
  const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1f2937', border: '1px solid #374151' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' };

  const mapId = theme === 'dark' ? GOOGLE_MAP_DARK_ID : GOOGLE_MAP_LIGHT_ID;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Statistieken</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Meldingen per Wijk</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wijkData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" stroke={tickColor} fontSize={12} />
              <YAxis type="category" dataKey="name" stroke={tickColor} fontSize={12} width={80} />
              <Tooltip cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}} contentStyle={tooltipStyle}/>
              <Bar dataKey="meldingen" fill="#1d4ed8" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Verdeling Meldingen per Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={meldingenPerStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {meldingenPerStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend wrapperStyle={{ color: tickColor }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Totaal Uren per Medewerker</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={urenPerMedewerker}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={tickColor} fontSize={12} />
              <YAxis stroke={tickColor} fontSize={12} />
              <Tooltip cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}} contentStyle={tooltipStyle}/>
              <Bar dataKey="uren" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          {/* CORRECTIE: Filterknoppen toegevoegd */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Locatie Overzicht</h2>
            <div className="flex-shrink-0 flex space-x-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-lg">
              <button onClick={() => setMapFilter('meldingen')} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${mapFilter === 'meldingen' ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Meldingen</button>
              <button onClick={() => setMapFilter('projecten')} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${mapFilter === 'projecten' ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Projecten</button>
              <button onClick={() => setMapFilter('beide')} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${mapFilter === 'beide' ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Beide</button>
            </div>
          </div>
           <div className="h-[300px] rounded-md overflow-hidden">
                {GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                        <Map
                            mapId={mapId}
                            defaultCenter={center}
                            defaultZoom={12}
                            disableDefaultUI={true}
                            gestureHandling={'cooperative'}
                        >
                            {/* CORRECTIE: Logica om de juiste pins te tonen op basis van de filter */}
                            {(mapFilter === 'meldingen' || mapFilter === 'beide') && meldingen.map(melding => (
                                <MeldingMarker 
                                    key={melding.id} 
                                    melding={melding}
                                    isSelected={selectedMeldingId === melding.id}
                                    onClick={() => { setSelectedProjectId(null); setSelectedMeldingId(melding.id); }}
                                    onClose={() => setSelectedMeldingId(null)}
                                />
                            ))}
                            {(mapFilter === 'projecten' || mapFilter === 'beide') && projecten.map(project => (
                                <ProjectMarker 
                                    key={project.id} 
                                    project={project}
                                    isSelected={selectedProjectId === project.id}
                                    onClick={() => { setSelectedMeldingId(null); setSelectedProjectId(project.id); }}
                                    onClose={() => setSelectedProjectId(null)}
                                />
                            ))}
                        </Map>
                    </APIProvider>
                ) : (
                    <div className="h-full w-full bg-gray-200 dark:bg-dark-bg flex items-center justify-center">
                        <p className="text-red-500 p-4 text-center">Google Maps API sleutel niet gevonden.</p>
                    </div>
                )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
