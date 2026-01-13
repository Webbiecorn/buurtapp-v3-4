

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui';
import { AlertTriangleIcon, ClockIcon, BriefcaseIcon, UsersIcon } from '../components/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DossierStatus, MeldingStatus, UserRole } from '../types';
import { db } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import { useDossiers } from '../services/firestoreHooks';
import { toDate } from '../utils/dateHelpers';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  startOfToday,
} from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { startOfYear } from 'date-fns/startOfYear';
import { nl } from 'date-fns/locale/nl';
import { generateDailyUpdate } from '../services/dailyUpdateAI';
import { useNavigate } from 'react-router-dom';


type SlimDossier = { id: string; status: DossierStatus; woningType?: string | null; createdAt?: Date | null; gebruikerId?: string };
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e'];

// Daily Update Card Component for Dashboard
const DailyUpdateCard: React.FC = () => {
  const { meldingen, projecten, urenregistraties, users, currentUser } = useAppContext();
  const [updateText, setUpdateText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const navigate = useNavigate();

  // Determine time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { text: 'Goedemorgen', emoji: '🌅' };
    if (hour >= 12 && hour < 18) return { text: 'Goedemiddag', emoji: '☀️' };
    if (hour >= 18 && hour < 22) return { text: 'Goedenavond', emoji: '🌆' };
    return { text: 'Goedenacht', emoji: '🌙' };
  };

  const greeting = getGreeting();
  const userName = currentUser?.name?.split(' ')[0] || 'daar'; // First name only

  const todayData = useMemo(() => {
    const today = startOfToday();
    
    const newMeldingen = meldingen.filter(m => m.timestamp >= today);
    const newProjects = projecten.filter(p => p.startDate >= today);
    const todayUren = urenregistraties.filter(u => u.start >= today);
    const completedProjects = projecten.filter(p => 
      p.status === 'Afgerond' && p.endDate && new Date(p.endDate) >= today
    );
    const resolvedMeldingen = meldingen.filter(m => 
      m.status === 'Afgerond' && m.timestamp >= today
    );
    
    const activeUserIds = new Set(todayUren.map(u => u.gebruikerId));
    const activeUsers = users.filter(u => activeUserIds.has(u.id));

    return {
      newMeldingen,
      newProjects,
      newDossiers: [],
      todayUren,
      completedProjects,
      resolvedMeldingen,
      activeUsers,
      allMeldingen: meldingen, // Voor vergelijkingen
      allProjects: projecten, // Voor vergelijkingen
      allUsers: users, // Voor nieuwe medewerker detectie
    };
  }, [meldingen, projecten, urenregistraties, users]);

  const loadDailyUpdate = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const update = await generateDailyUpdate(todayData, userName, greeting.text);
      setUpdateText(update);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading daily update:', error);
      setUpdateText('❌ Kon dagelijkse update niet laden.');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [todayData, userName, greeting.text]);

  useEffect(() => {
    if (!hasLoaded && (meldingen.length > 0 || projecten.length > 0)) {
      loadDailyUpdate();
    }
  }, [hasLoaded, meldingen.length, projecten.length, loadDailyUpdate]);

  const quickActions = [
    { label: 'Nieuwe Melding', icon: '📝', onClick: () => navigate('/issues/nieuw'), color: 'from-blue-500 to-blue-600' },
    { label: 'Project Starten', icon: '🚀', onClick: () => navigate('/projects'), color: 'from-green-500 to-green-600' },
    { label: 'Uren Registreren', icon: '⏱️', onClick: () => navigate('/time-tracking'), color: 'from-orange-500 to-orange-600' },
    { label: 'Dossier Maken', icon: '📁', onClick: () => navigate('/dossiers'), color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-xl shadow-xl p-6 border-2 border-blue-100 dark:border-blue-900/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-4xl animate-pulse">{greeting.emoji}</div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {greeting.text}, {userName}!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadDailyUpdate}
            disabled={isLoading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-secondary rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all disabled:opacity-50 hover:scale-110"
            title="Vernieuwen"
          >
            <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-secondary rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all"
            title={isExpanded ? 'Inklappen' : 'Uitklappen'}
          >
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`bg-gradient-to-br ${action.color} text-white rounded-lg p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <div className="text-sm font-semibold">{action.label}</div>
              </button>
            ))}
          </div>

          {/* Quick Stats - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Nieuwe meldingen', value: todayData.newMeldingen.length, icon: '📝', trend: '+12%', trendUp: true },
              { label: 'Nieuwe projecten', value: todayData.newProjects.length, icon: '🚀', trend: '+5%', trendUp: true },
              { label: 'Afgeronde items', value: todayData.completedProjects.length + todayData.resolvedMeldingen.length, icon: '✅', trend: '+8%', trendUp: true },
              { label: 'Actieve medewerkers', value: todayData.activeUsers.length, icon: '👥', trend: '→', trendUp: null },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                  {stat.trendUp !== null && (
                    <span className={`text-xs font-semibold ${stat.trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stat.trend}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl p-5 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                AI Dagelijkse Samenvatting
              </h3>
              <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                Powered by Gemini
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {updateText || 'Laden...'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  // Filter meldingen/uren/dossiers op geselecteerde gebruiker
  const { meldingen, urenregistraties, projecten, theme, users, currentUser } = useAppContext();
  const { data: rawDossiers } = useDossiers();
  const dossiers: SlimDossier[] = useMemo(() => 
    (rawDossiers || []).map(d => ({
      id: d.id,
      status: d.status,
      woningType: d.woningType,
      createdAt: d.createdAt ? toDate(d.createdAt) : null,
      gebruikerId: d.gebruikerId
    })), [rawDossiers]);
  const isConcierge = currentUser?.role === 'Concierge';
  const isAdmin = currentUser?.role === UserRole.Beheerder;
  const [selectedUser, setSelectedUser] = useState<string>(isConcierge ? currentUser?.id ?? '' : 'totaal');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year' | 'total'>('total');
  // Filter meldingen/uren/dossiers op geselecteerde gebruiker
  const filteredMeldingenByUser = useMemo(() => {
    if (isConcierge) return meldingen.filter(m => m.gebruikerId === currentUser?.id);
    if (selectedUser === 'totaal') return meldingen;
    return meldingen.filter(m => m.gebruikerId === selectedUser);
  }, [meldingen, selectedUser, isConcierge, currentUser]);
  const filteredUrenByUser = useMemo(() => {
    if (isConcierge) return urenregistraties.filter(u => u.gebruikerId === currentUser?.id);
    if (selectedUser === 'totaal') return urenregistraties;
    return urenregistraties.filter(u => u.gebruikerId === selectedUser);
  }, [urenregistraties, selectedUser, isConcierge, currentUser]);
  const filteredDossiersByUser = useMemo(() => {
    if (isConcierge) return dossiers.filter(d => d.gebruikerId === currentUser?.id);
    if (selectedUser === 'totaal') return dossiers;
    return dossiers.filter(d => d.gebruikerId === selectedUser);
  }, [dossiers, selectedUser, isConcierge, currentUser]);

  // Dossiers data loading handled by useDossiers hook at component start

  const { filteredMeldingen } = useMemo(() => {
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
  return { filteredMeldingen: newFilteredMeldingen };
  }, [timeFilter, meldingen, urenregistraties]);


  // Stats
  const totalMeldingen = filteredMeldingenByUser.length;
  const fixiMeldingen = filteredMeldingenByUser.filter(m => m.status === MeldingStatus.FixiMeldingGemaakt).length;
  const totalUren = filteredUrenByUser.reduce((acc, curr) => {
    if (curr.eind) {
      const diff = new Date(curr.eind).getTime() - new Date(curr.start).getTime();
      return acc + (diff / (1000 * 60 * 60));
    }
    return acc;
  }, 0).toFixed(1);
  const activeColleagues = filteredUrenByUser.filter(u => !u.eind).length;

  // Chart data
  const chartData = useMemo(() => {
    const sourceData = timeFilter === 'total' ? filteredMeldingenByUser : filteredMeldingenByUser;
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
  const latestMeldingen = filteredMeldingenByUser.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 3);
  
  const filterOptions = [
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
  const filteredProjectenByUser = useMemo(() => {
    if (isConcierge) {
      // Concierge: alleen projecten waar hij/zij deelnemer is
      return projecten.filter(p => p.participantIds?.includes(currentUser?.id));
    }
    if (selectedUser !== 'totaal') {
      // Admin: filter op geselecteerde gebruiker
      return projecten.filter(p => p.participantIds?.includes(selectedUser));
    }
    // Admin: totaal
    return projecten;
  }, [projecten, isConcierge, currentUser, selectedUser]);

  const projectStats = useMemo(() => {
    const totaal = filteredProjectenByUser.length;
    const lopend = filteredProjectenByUser.filter(p => String(p.status) === 'Lopend').length;
    const afgerond = filteredProjectenByUser.filter(p => String(p.status) === 'Afgerond').length;
    return { totaal, lopend, afgerond };
  }, [filteredProjectenByUser]);

  const dossierStats = useMemo(() => {
    return { totaal: filteredDossiersByUser.length };
  }, [filteredDossiersByUser]);

  // Filters for dashboard charts
  const [filterWoningType, setFilterWoningType] = useState<string>('alle');
  const [filterDossierStatus, setFilterDossierStatus] = useState<'alle' | DossierStatus>('alle');
  // Filter gebruikerslijst dynamisch
  const userOptions = useMemo(() => {
    const concierges = users.filter(u => u.role === 'Concierge');
    return ['totaal', ...concierges.map(u => u.id)];
  }, [users]);
  // Filter meldingen/uren/dossiers op geselecteerde gebruiker

  const woningTypeOptions = useMemo(() => {
    const counts = dossiers.reduce((acc, d) => {
      const key = d.woningType || 'Onbekend';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return ['alle', ...Object.keys(counts)];
  }, [dossiers]);

  const dossierStatusData = useMemo(() => {
    const base = filterWoningType === 'alle' ? dossiers : dossiers.filter(d => (d.woningType || 'Onbekend') === filterWoningType);
    return [
      { name: 'Actief', value: base.filter(d => d.status === 'actief').length },
      { name: 'Afgesloten', value: base.filter(d => d.status === 'afgesloten').length },
      { name: 'In onderzoek', value: base.filter(d => d.status === 'in onderzoek').length },
    ];
  }, [dossiers, filterWoningType]);

  const woningTypeData = useMemo(() => {
    const base = filterDossierStatus === 'alle' ? dossiers : dossiers.filter(d => d.status === filterDossierStatus);
    const counts = base.reduce((acc, d) => {
      const key = d.woningType || 'Onbekend';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const arr = Object.entries(counts).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    const top = arr.slice(0, 6);
    const rest = arr.slice(6).reduce((s, x) => s + x.value, 0);
    return rest > 0 ? [...top, { name: 'Overig', value: rest }] : top;
  }, [dossiers, filterDossierStatus]);


  return (
    <div className="space-y-6">
      {/* Daily Update Card - Featured at top */}
      <DailyUpdateCard />

      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Overzicht</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isAdmin && (
            <>
              <label htmlFor="dashboard-user" className="text-sm text-gray-600 dark:text-dark-text-secondary">Gebruiker:</label>
              <select id="dashboard-user" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                {userOptions.map(id => (
                  <option key={id} value={id}>
                    {id === 'totaal' ? 'Totaal' : users.find(u => u.id === id)?.name || id}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="flex-shrink-0">
            <label htmlFor="dashboard-period" className="text-sm text-gray-600 dark:text-dark-text-secondary mr-2">Periode:</label>
            <select id="dashboard-period" value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
              {filterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Dossierstatus</h3>
            <div className="flex items-center gap-2">
              <label htmlFor="woningtype-filter" className="text-sm text-gray-600 dark:text-dark-text-secondary">Woningtype:</label>
              <select id="woningtype-filter" value={filterWoningType} onChange={e => setFilterWoningType(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                {woningTypeOptions.map(opt => (
                  <option key={opt} value={opt} className="bg-white dark:bg-dark-surface">{opt}</option>
                ))}
              </select>
            </div>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Woningtype verdeling</h3>
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm text-gray-600 dark:text-dark-text-secondary">Status:</label>
              <select id="status-filter" value={filterDossierStatus} onChange={e => setFilterDossierStatus(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                <option value="alle" className="bg-white dark:bg-dark-surface">alle</option>
                <option value="actief" className="bg-white dark:bg-dark-surface">actief</option>
                <option value="afgesloten" className="bg-white dark:bg-dark-surface">afgesloten</option>
                <option value="in onderzoek" className="bg-white dark:bg-dark-surface">in onderzoek</option>
              </select>
            </div>
          </div>
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
