

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui';
import { AlertTriangleIcon, ClockIcon, BriefcaseIcon, UsersIcon } from '../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DossierStatus, MeldingStatus } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
} from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { startOfYear } from 'date-fns/startOfYear';
import { nl } from 'date-fns/locale/nl';


type SlimDossier = { id: string; status: DossierStatus; woningType?: string | null; createdAt?: Date | null };
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e'];

const DashboardPage: React.FC = () => {
  const { meldingen, urenregistraties, projecten, theme } = useAppContext();
  const [dossiers, setDossiers] = useState<SlimDossier[]>([]);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year' | 'total'>('total');

  // Subscribe to dossiers for dashboard analytics
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dossiers'), (ss) => {
      const list: SlimDossier[] = ss.docs.map(d => {
        const v: any = d.data();
        let created: Date | null = null;
        if (Array.isArray(v.historie) && v.historie.length) {
          const dates = v.historie
            .map((h: any) => h?.date instanceof Timestamp ? h.date.toDate() : (h?.date ? new Date(h.date) : null))
            .filter(Boolean) as Date[];
          if (dates.length) created = new Date(Math.min(...dates.map(x => x.getTime())));
        }
        return { id: d.id, status: (v.status as DossierStatus) || 'actief', woningType: v.woningType ?? null, createdAt: created };
      });
      setDossiers(list);
    });
    return () => unsub();
  }, []);

  const { filteredMeldingen, filteredUrenregistraties } = useMemo(() => {
    if (timeFilter === 'total') {
      return { filteredMeldingen: meldingen, filteredUrenregistraties: urenregistraties };
    }

    const now = new Date();
    let interval: { start: Date; end: Date; };

    switch (timeFilter) {
      case 'day':
        interval = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case 'week':
        interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        break;
      case 'month':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'year':
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
      default:
        return { filteredMeldingen: meldingen, filteredUrenregistraties: urenregistraties };
    }

    const newFilteredMeldingen = meldingen.filter(m => isWithinInterval(m.timestamp, interval));
    const newFilteredUren = urenregistraties.filter(u => u.eindtijd && isWithinInterval(u.starttijd, interval));
    
    return { filteredMeldingen: newFilteredMeldingen, filteredUrenregistraties: newFilteredUren };
  }, [timeFilter, meldingen, urenregistraties]);


  // Stats
  const totalMeldingen = filteredMeldingen.length;
  const fixiMeldingen = filteredMeldingen.filter(m => m.status === MeldingStatus.FixiMeldingGemaakt).length;
  const totalUren = filteredUrenregistraties.reduce((acc, curr) => {
    if (curr.eindtijd) {
      const diff = new Date(curr.eindtijd).getTime() - new Date(curr.starttijd).getTime();
      return acc + (diff / (1000 * 60 * 60));
    }
    return acc;
  }, 0).toFixed(1);
  const activeColleagues = urenregistraties.filter(u => !u.eindtijd).length;

  // Chart data
  const chartData = useMemo(() => {
    const sourceData = timeFilter === 'total' ? meldingen : filteredMeldingen;
    if (sourceData.length === 0) return [];
    
    let keyFormatter: (date: Date) => string;
    
    switch (timeFilter) {
        case 'day':
            keyFormatter = (date) => format(date, 'HH:00');
            break;
        case 'week':
            keyFormatter = (date) => format(date, 'i-EEE', { locale: nl }); 
            break;
        case 'month':
            keyFormatter = (date) => format(date, 'dd');
            break;
        case 'year':
        case 'total':
            keyFormatter = (date) => format(date, 'yyyy-MM-MMM', { locale: nl });
            break;
        default:
            keyFormatter = (date) => format(date, 'yyyy-MM-dd');
    }

    const counts = sourceData.reduce((acc, item) => {
        const key = keyFormatter(item.timestamp);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, count]) => ({
            name: key.includes('-') ? key.substring(key.lastIndexOf('-') + 1) : key,
            count: count
        }));

  }, [timeFilter, meldingen, filteredMeldingen]);
  
  // Recent 3 meldingen - unchanged, shows absolute latest
  const latestMeldingen = meldingen.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 3);
  
  const filterButtons = [
    { label: 'Dag', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Maand', value: 'month' },
    { label: 'Jaar', value: 'year' },
    { label: 'Totaal', value: 'total' },
  ];

  const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f9fafb' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937' };
  const tooltipLabelStyle = theme === 'dark' ? { color: '#f9fafb' } : { color: '#111827' };

  // Admin KPIs and distributions
  const projectStats = useMemo(() => {
    const totaal = projecten.length;
    const lopend = projecten.filter(p => String(p.status) === 'Lopend').length;
    const afgerond = projecten.filter(p => String(p.status) === 'Afgerond').length;
    return { totaal, lopend, afgerond };
  }, [projecten]);

  const dossierStats = useMemo(() => {
    return { totaal: dossiers.length };
  }, [dossiers]);

  const dossierStatusData = useMemo(() => (
    [
      { name: 'Actief', value: dossiers.filter(d => d.status === 'actief').length },
      { name: 'Afgesloten', value: dossiers.filter(d => d.status === 'afgesloten').length },
      { name: 'In onderzoek', value: dossiers.filter(d => d.status === 'in onderzoek').length },
    ]
  ), [dossiers]);

  const woningTypeData = useMemo(() => {
    const counts = dossiers.reduce((acc, d) => {
      const key = d.woningType || 'Onbekend';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const arr = Object.entries(counts).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    const top = arr.slice(0, 6);
    const rest = arr.slice(6).reduce((s, x) => s + x.value, 0);
    return rest > 0 ? [...top, { name: 'Overig', value: rest }] : top;
  }, [dossiers]);


  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Dashboard</h1>
        <div className="flex-shrink-0 flex-wrap flex space-x-1 sm:space-x-2 bg-white dark:bg-dark-surface p-1 rounded-lg">
          {filterButtons.map(btn => (
             <button
                key={btn.value}
                onClick={() => setTimeFilter(btn.value as any)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${timeFilter === btn.value ? 'bg-brand-primary text-white' : 'bg-transparent text-gray-500 hover:bg-gray-200 dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>
                {btn.label}
             </button>
          ))}
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<span className="font-bold">P</span>} title="Projecten (totaal)" value={projectStats.totaal} color="bg-indigo-600" />
        <StatCard icon={<span className="font-bold">▶</span>} title="Projecten (lopend)" value={projectStats.lopend} color="bg-blue-600" />
        <StatCard icon={<span className="font-bold">✔</span>} title="Projecten (afgerond)" value={projectStats.afgerond} color="bg-green-600" />
        <StatCard icon={<span className="font-bold">🏠</span>} title="Dossiers (totaal)" value={dossierStats.totaal} color="bg-rose-600" />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Dossierstatus</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dossierStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100 || 0).toFixed(0)}%`}>
                {dossierStatusData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: tickColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Woningtype verdeling</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={woningTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100 || 0).toFixed(0)}%`}>
                {woningTypeData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: tickColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<AlertTriangleIcon className="h-6 w-6 text-white"/>} title="Meldingen" value={totalMeldingen} color="bg-blue-600"/>
        <StatCard icon={<BriefcaseIcon className="h-6 w-6 text-white"/>} title="Fixi Meldingen" value={fixiMeldingen} color="bg-purple-600"/>
        <StatCard icon={<ClockIcon className="h-6 w-6 text-white"/>} title="Gewerkte Uren" value={totalUren} color="bg-green-600"/>
        <StatCard icon={<UsersIcon className="h-6 w-6 text-white"/>} title="Actieve Collega's" value={activeColleagues} color="bg-yellow-500"/>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Meldingen Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Meldingsactiviteit</h2>
           {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={tickColor} fontSize={12} />
                <YAxis allowDecimals={false} stroke={tickColor} fontSize={12} />
                <Tooltip 
                  cursor={{fill: theme === 'dark' ? '#374151' : '#f3f4f6'}}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Bar dataKey="count" name="Aantal meldingen" fill="#1d4ed8" barSize={30}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-dark-text-secondary">
              Geen data beschikbaar voor deze periode.
            </div>
          )}
        </div>
        
        {/* Latest Meldingen List */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
           <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Laatste Meldingen</h2>
           <div className="space-y-4">
               {latestMeldingen.length > 0 ? latestMeldingen.map(melding => (
                   <div key={melding.id} className="flex items-start space-x-4">
                       <img src={melding.attachments[0]} alt={melding.titel} className="w-16 h-16 rounded-md object-cover"/>
                       <div>
                           <h3 className="font-semibold text-gray-800 dark:text-dark-text-primary line-clamp-1">{melding.titel}</h3>
                           <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2">{melding.omschrijving}</p>
                       </div>
                   </div>
               )) : (
                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-dark-text-secondary">
                    Geen meldingen gevonden.
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
