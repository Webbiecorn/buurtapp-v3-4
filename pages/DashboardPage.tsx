

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui';
import { AlertTriangleIcon, ClockIcon, BriefcaseIcon, UsersIcon } from '../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MeldingStatus } from '../types';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
} from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import startOfYear from 'date-fns/startOfYear';
import nl from 'date-fns/locale/nl';


const DashboardPage: React.FC = () => {
  const { meldingen, urenregistraties, theme } = useAppContext();
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year' | 'total'>('total');

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
