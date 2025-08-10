import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MeldingMarker } from '../components/MeldingMarker'; 
import { ProjectMarker } from '../components/ProjectMarker';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const COLORS = ['#f59e0b', '#8b5cf6', '#22c55e'];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_LIGHT_ID = import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID;
const GOOGLE_MAP_DARK_ID = import.meta.env.VITE_GOOGLE_MAP_DARK_ID;

import { format } from 'date-fns';
import nl from 'date-fns/locale/nl';
import subMonths from 'date-fns/subMonths';
import { eachMonthOfInterval } from 'date-fns';

const StatisticsPage: React.FC = () => {
  const { meldingen, projecten, urenregistraties, users, theme } = useAppContext();
  const [monthsBack, setMonthsBack] = useState(5);
  const [projectStatusFilter, setProjectStatusFilter] = useState<'alle' | 'Lopend' | 'Afgerond'>('alle');
  const [dossierStatusFilter, setDossierStatusFilter] = useState<'alle' | 'actief' | 'afgesloten' | 'in onderzoek'>('alle');
  const [selectedMeldingId, setSelectedMeldingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<'meldingen' | 'projecten' | 'dossiers' | 'beide'>('meldingen');
  const [dossiers, setDossiers] = useState<Array<{ id: string; adres: string; lat: number; lon: number }>>([]);

  // Laad dossiers met coördinaten voor de kaart
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dossiers'), (snap) => {
      const list: Array<{ id: string; adres: string; lat: number; lon: number }> = [];
      snap.forEach(doc => {
        const data = doc.data() as any;
        const loc = data?.location;
        if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
          list.push({ id: doc.id, adres: data?.adres || doc.id, lat: loc.lat, lon: loc.lon });
        }
      });
      setDossiers(list);
    });
    return () => unsub();
  }, []);

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

  // Trends: Projecten (gestart/afgerond) en Dossiers (nieuw) laatste 6 maanden
  const months = useMemo(() => eachMonthOfInterval({ start: subMonths(new Date(), monthsBack), end: new Date() }), [monthsBack]);
  const projectTrend = useMemo(() => months.map(ms => {
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const maand = format(ms, 'MMM', { locale: nl });
    const started = projecten.filter(p => p.startDate >= ms && p.startDate <= me);
    const finished = projecten.filter(p => p.endDate && p.endDate >= ms && p.endDate <= me);
    const nieuw = projectStatusFilter === 'alle' || projectStatusFilter === 'Lopend' ? started.length : 0;
    const afgerond = projectStatusFilter === 'alle' || projectStatusFilter === 'Afgerond' ? finished.length : 0;
    return { maand, nieuw, afgerond };
  }), [months, projecten, projectStatusFilter]);

  const [dossiersForTrend, setDossiersForTrend] = useState<Array<{ createdAt?: Date | null; status?: string }>>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dossiers'), (ss) => {
      const arr = ss.docs.map(d => {
        const v: any = d.data();
        // createdAt: earliest historie.date
        let created: Date | null = null;
        if (Array.isArray(v.historie) && v.historie.length) {
          const dates = v.historie
            .map((h: any) => h?.date instanceof Date ? h.date : (h?.date?.toDate ? h.date.toDate() : (h?.date ? new Date(h.date) : null)))
            .filter(Boolean) as Date[];
          if (dates.length) created = new Date(Math.min(...dates.map(d => d.getTime())));
        }
        return { createdAt: created, status: v?.status };
      });
      setDossiersForTrend(arr);
    });
    return () => unsub();
  }, []);

  const dossierTrend = useMemo(() => months.map(ms => {
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const maand = format(ms, 'MMM', { locale: nl });
    const base = dossiersForTrend.filter(d => d.createdAt && d.createdAt >= ms && d.createdAt <= me);
    const nieuw = dossierStatusFilter === 'alle' ? base.length : base.filter((x: any) => x.status === dossierStatusFilter).length;
    return { maand, nieuw };
  }), [months, dossiersForTrend, dossierStatusFilter]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Statistieken</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Projecten: trend</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Periode:</label>
              <select value={monthsBack} onChange={e => setMonthsBack(parseInt(e.target.value))} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                <option value={5}>6 maanden</option>
                <option value={11}>12 maanden</option>
                <option value={23}>24 maanden</option>
              </select>
              <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Type:</label>
              <select value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                <option value="alle">Gestart & Afgerond</option>
                <option value="Lopend">Alleen gestart</option>
                <option value="Afgerond">Alleen afgerond</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="maand" stroke={tickColor} fontSize={12} />
              <YAxis stroke={tickColor} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: tickColor }} />
              <Line type="monotone" dataKey="nieuw" stroke="#3b82f6" name="Gestart" strokeWidth={2} />
              <Line type="monotone" dataKey="afgerond" stroke="#22c55e" name="Afgerond" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Dossiers: nieuwe per maand</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-dark-text-secondary">Status:</label>
              <select value={dossierStatusFilter} onChange={e => setDossierStatusFilter(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                <option value="alle">alle</option>
                <option value="actief">actief</option>
                <option value="afgesloten">afgesloten</option>
                <option value="in onderzoek">in onderzoek</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dossierTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="maand" stroke={tickColor} fontSize={12} />
              <YAxis stroke={tickColor} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="nieuw" fill="#ef4444" name="Nieuwe dossiers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
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
                {meldingenPerStatus.map((_entry, index) => (
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
              <button onClick={() => setMapFilter('dossiers')} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${mapFilter === 'dossiers' ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Woningdossiers</button>
              <button onClick={() => setMapFilter('beide')} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-md transition-colors ${mapFilter === 'beide' ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Allen</button>
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
                            {mapFilter === 'dossiers' && dossiers.map(d => (
                              <React.Fragment key={d.id}>
                                <AdvancedMarker position={{ lat: d.lat, lng: d.lon }} onClick={() => { setSelectedMeldingId(null); setSelectedProjectId(null); setSelectedDossierId(d.id); }}>
                                  <Pin background="#1d4ed8" glyph="🏠" glyphColor="#ffffff" borderColor="#1e40af" />
                                </AdvancedMarker>
                                {selectedDossierId === d.id && (
                                  <InfoWindow position={{ lat: d.lat, lng: d.lon }} onCloseClick={() => setSelectedDossierId(null)}>
                                    <div className="p-2 text-black max-w-xs">
                                      <h3 className="font-bold text-md mb-1">{d.adres}</h3>
                                      <p className="text-sm text-gray-700">Woningdossier</p>
                                    </div>
                                  </InfoWindow>
                                )}
                              </React.Fragment>
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
