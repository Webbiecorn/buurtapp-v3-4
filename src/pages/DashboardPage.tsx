

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { StatCard } from '../components/ui';
import { AlertTriangleIcon, ClockIcon, BriefcaseIcon } from '../components/Icons';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { DossierStatus, MeldingStatus, UserRole } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { toDate } from '../utils/dateHelpers';
import { logger } from '../services/logger';
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
const PIE_COLORS = [
  { start: '#3b82f6', end: '#60a5fa' }, // blue
  { start: '#8b5cf6', end: '#a78bfa' }, // purple
  { start: '#ef4444', end: '#f87171' }, // red
  { start: '#f97316', end: '#fb923c' }, // orange
  { start: '#eab308', end: '#facc15' }, // yellow
  { start: '#22c55e', end: '#4ade80' }  // green
];

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
      logger.error('Failed to load daily update', error);
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
    { label: 'Nieuwe Melding', icon: '📝', onClick: () => navigate('/issues/nieuw'), color: 'from-slate-600 to-blue-600' },
    { label: 'Project Starten', icon: '🚀', onClick: () => navigate('/projects'), color: 'from-blue-600 to-slate-600' },
    { label: 'Uren Registreren', icon: '⏱️', onClick: () => navigate('/time-tracking'), color: 'from-gray-600 to-slate-600' },
    { label: 'Dossier Maken', icon: '📁', onClick: () => navigate('/dossiers'), color: 'from-slate-700 to-blue-700' },
  ];

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 via-blue-600 to-gray-600 rounded-2xl blur opacity-15 group-hover:opacity-30 transition duration-1000 animate-glow"></div>
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-5xl drop-shadow-lg">{greeting.emoji}</div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-blue-700 to-gray-700 bg-clip-text text-transparent animate-gradient">
                {greeting.text}, {userName}!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadDailyUpdate}
              disabled={isLoading}
              className="p-3 bg-gradient-to-br from-slate-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 hover:scale-110 disabled:hover:scale-100"
              title="Vernieuwen"
            >
              <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-3 bg-gradient-to-br from-gray-600 to-slate-600 text-white rounded-xl hover:shadow-lg hover:shadow-slate-500/50 transition-all hover:scale-110"
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
          {/* Quick Actions - Futuristic */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className={`relative group bg-gradient-to-br ${action.color} text-white rounded-xl p-5 shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300`}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative">
                  <div className="text-4xl mb-3 drop-shadow-lg">{action.icon}</div>
                  <div className="text-sm font-bold">{action.label}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Stats - Futuristic Neon Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Nieuwe meldingen', value: todayData.newMeldingen.length, icon: '📝', trend: '+12%', trendUp: true, color: 'from-blue-500 to-cyan-500' },
              { label: 'Nieuwe projecten', value: todayData.newProjects.length, icon: '🚀', trend: '+5%', trendUp: true, color: 'from-blue-600 to-slate-600' },
              { label: 'Afgeronde items', value: todayData.completedProjects.length + todayData.resolvedMeldingen.length, icon: '✅', trend: '+8%', trendUp: true, color: 'from-slate-600 to-blue-600' },
            ].map((stat, idx) => (
              <div key={idx} className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-500`}></div>
                <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl drop-shadow-lg">{stat.icon}</span>
                    {stat.trendUp !== null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trendUp ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 mb-2">
                    {stat.value}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Summary - Holographic */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 via-gray-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 animate-glow"></div>
            <div className="relative bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h6V7z" />
                    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Dagelijkse Samenvatting
                </h3>
                <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full font-bold shadow-lg">
                  Gemini AI
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800"></div>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-purple-600 dark:border-t-purple-400 absolute top-0"></div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed text-base">
                    {updateText || 'Laden...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  // Filter meldingen/uren/dossiers op geselecteerde gebruiker
  const { meldingen, urenregistraties, projecten, theme, users, currentUser } = useAppContext();
  const isConcierge = currentUser?.role === 'Concierge';
  const isAdmin = currentUser?.role === UserRole.Beheerder;
  const [selectedUser, setSelectedUser] = useState<string>(isConcierge ? currentUser?.id ?? '' : 'totaal');
  const [dossiers, setDossiers] = useState<SlimDossier[]>([]);
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

  // Subscribe to dossiers for dashboard analytics
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dossiers'), (ss) => {
      const list: SlimDossier[] = ss.docs.map(d => {
        const v: any = d.data();
        let created: Date | null = null;
        if (Array.isArray(v.historie) && v.historie.length) {
          const dates = v.historie
            .map((h: any) => toDate(h?.date))
            .filter(Boolean) as Date[];
          if (dates.length) created = new Date(Math.min(...dates.map(x => x.getTime())));
        }
        return { id: d.id, status: (v.status as DossierStatus) || 'actief', woningType: v.woningType ?? null, createdAt: created, gebruikerId: v.gebruikerId };
      });
      setDossiers(list);
    });
    return () => unsub();
  }, []);

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

  const isDark = theme === 'dark';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

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

      {/* 3D Pie Charts with Futuristic Glow */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-slate-600 to-gray-600 rounded-lg blur opacity-15 group-hover:opacity-30 transition duration-1000 animate-glow"></div>
          <div className="relative bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent">🎯 Dossierstatus 3D</h3>
              <div className="flex items-center gap-2">
                <label htmlFor="woningtype-filter" className="text-sm text-gray-600 dark:text-dark-text-secondary">Woningtype:</label>
                <select id="woningtype-filter" value={filterWoningType} onChange={e => setFilterWoningType(e.target.value)} className="bg-gray-50 dark:bg-dark-bg border-2 border-slate-400 dark:border-slate-600 rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-blue-500">
                  {woningTypeOptions.map(opt => (
                    <option key={opt} value={opt} className="bg-white dark:bg-dark-surface">{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'item',
                  formatter: '{b}: {c} ({d}%)',
                  backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: '#64748b',
                  borderWidth: 2,
                  textStyle: { color: textColor },
                  shadowBlur: 10,
                  shadowColor: 'rgba(100, 116, 139, 0.5)'
                },
                legend: {
                  orient: 'horizontal',
                  bottom: 0,
                  textStyle: { color: textColor, fontSize: 11 }
                },
                series: [
                  {
                    type: 'pie',
                    radius: ['35%', '65%'],
                    center: ['50%', '45%'],
                    roseType: 'area',
                    itemStyle: {
                      borderRadius: 8,
                      borderColor: isDark ? '#1f2937' : '#fff',
                      borderWidth: 3,
                      shadowBlur: 20,
                      shadowOffsetX: 0,
                      shadowOffsetY: 10,
                      shadowColor: 'rgba(0, 0, 0, 0.3)'
                    },
                    label: {
                      show: true,
                      formatter: '{b}\n{d}%',
                      color: textColor,
                      fontSize: 11,
                      fontWeight: 'bold'
                    },
                    labelLine: {
                      show: true,
                      length: 15,
                      length2: 10,
                      smooth: true
                    },
                    emphasis: {
                      label: { show: true, fontSize: 14, fontWeight: 'bold' },
                      itemStyle: {
                        shadowBlur: 30,
                        shadowOffsetY: 15,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                      },
                      scale: true,
                      scaleSize: 10
                    },
                    data: dossierStatusData.map((item, idx) => ({
                      value: item.value,
                      name: item.name,
                      itemStyle: {
                        color: {
                          type: 'linear',
                          x: 0, y: 0, x2: 0, y2: 1,
                          colorStops: [
                            { offset: 0, color: PIE_COLORS[idx % PIE_COLORS.length].start },
                            { offset: 1, color: PIE_COLORS[idx % PIE_COLORS.length].end }
                          ]
                        }
                      }
                    }))
                  }
                ],
                animation: true,
                animationDuration: 1500,
                animationEasing: 'elasticOut',
                animationDurationUpdate: 800
              }}
              style={{ height: '350px' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 via-gray-600 to-blue-600 rounded-lg blur opacity-15 group-hover:opacity-30 transition duration-1000 animate-glow"></div>
          <div className="relative bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">🏘️ Woningtype 3D</h3>
              <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-sm text-gray-600 dark:text-dark-text-secondary">Status:</label>
                <select id="status-filter" value={filterDossierStatus} onChange={e => setFilterDossierStatus(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border-2 border-green-400 dark:border-green-600 rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-green-500">
                  <option value="alle" className="bg-white dark:bg-dark-surface">alle</option>
                  <option value="actief" className="bg-white dark:bg-dark-surface">actief</option>
                  <option value="afgesloten" className="bg-white dark:bg-dark-surface">afgesloten</option>
                  <option value="in onderzoek" className="bg-white dark:bg-dark-surface">in onderzoek</option>
                </select>
              </div>
            </div>
            <ReactECharts
              option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'item',
                  formatter: '{b}: {c} ({d}%)',
                  backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: '#3b82f6',
                  borderWidth: 2,
                  textStyle: { color: textColor },
                  shadowBlur: 10,
                  shadowColor: 'rgba(59, 130, 246, 0.5)'
                },
                legend: {
                  orient: 'horizontal',
                  bottom: 0,
                  textStyle: { color: textColor, fontSize: 11 },
                  type: 'scroll'
                },
                series: [
                  {
                    type: 'pie',
                    radius: ['35%', '65%'],
                    center: ['50%', '45%'],
                    roseType: 'area',
                    itemStyle: {
                      borderRadius: 8,
                      borderColor: isDark ? '#1f2937' : '#fff',
                      borderWidth: 3,
                      shadowBlur: 20,
                      shadowOffsetX: 0,
                      shadowOffsetY: 10,
                      shadowColor: 'rgba(0, 0, 0, 0.3)'
                    },
                    label: {
                      show: true,
                      formatter: '{b}\n{d}%',
                      color: textColor,
                      fontSize: 11,
                      fontWeight: 'bold'
                    },
                    labelLine: {
                      show: true,
                      length: 15,
                      length2: 10,
                      smooth: true
                    },
                    emphasis: {
                      label: { show: true, fontSize: 14, fontWeight: 'bold' },
                      itemStyle: {
                        shadowBlur: 30,
                        shadowOffsetY: 15,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                      },
                      scale: true,
                      scaleSize: 10
                    },
                    data: woningTypeData.map((item, idx) => ({
                      value: item.value,
                      name: item.name,
                      itemStyle: {
                        color: {
                          type: 'linear',
                          x: 0, y: 0, x2: 0, y2: 1,
                          colorStops: [
                            { offset: 0, color: PIE_COLORS[idx % PIE_COLORS.length].start },
                            { offset: 1, color: PIE_COLORS[idx % PIE_COLORS.length].end }
                          ]
                        }
                      }
                    }))
                  }
                ],
                animation: true,
                animationDuration: 1500,
                animationEasing: 'elasticOut',
                animationDurationUpdate: 800
              }}
              style={{ height: '350px' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
      </div>

      {/* Futuristic Stat Cards with Glow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 to-blue-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-glow"></div>
          <StatCard icon={<AlertTriangleIcon className="h-6 w-6 text-white"/>} title="Meldingen" value={totalMeldingen} color="bg-blue-600"/>
        </div>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-slate-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-glow"></div>
          <StatCard icon={<BriefcaseIcon className="h-6 w-6 text-white"/>} title="Fixi Meldingen" value={fixiMeldingen} color="bg-slate-600"/>
        </div>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-slate-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-glow"></div>
          <StatCard icon={<ClockIcon className="h-6 w-6 text-white"/>} title="Gewerkte Uren" value={totalUren} color="bg-gray-600"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3D Meldingen Chart */}
        <div className="lg:col-span-2 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-slate-600 to-gray-600 rounded-lg blur opacity-15 group-hover:opacity-30 transition duration-1000 animate-glow"></div>
          <div className="relative bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-600 to-slate-600 bg-clip-text text-transparent">🚀 Meldingsactiviteit 3D</h2>
            {chartData.length > 0 ? (
              <ReactECharts
                option={{
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    textStyle: { color: textColor },
                    shadowBlur: 10,
                    shadowColor: 'rgba(59, 130, 246, 0.5)'
                  },
                  xAxis3D: {
                    type: 'category',
                    data: chartData.map(d => d.name),
                    axisLabel: { color: textColor, fontSize: 10 },
                    axisLine: { lineStyle: { color: '#3b82f6' } }
                  },
                  yAxis3D: {
                    type: 'value',
                    axisLabel: { color: textColor },
                    axisLine: { lineStyle: { color: '#3b82f6' } },
                    splitLine: { show: true, lineStyle: { color: gridColor, opacity: 0.3 } }
                  },
                  zAxis3D: {
                    type: 'value',
                    axisLabel: { color: textColor }
                  },
                  grid3D: {
                    boxWidth: 200,
                    boxDepth: 80,
                    viewControl: {
                      autoRotate: true,
                      autoRotateSpeed: 5,
                      distance: 180
                    },
                    light: {
                      main: {
                        intensity: 1.5,
                        shadow: true
                      },
                      ambient: {
                        intensity: 0.5
                      }
                    },
                    environment: isDark ? '#1f2937' : '#f3f4f6'
                  },
                  series: [
                    {
                      type: 'bar3D',
                      data: chartData.map((d, idx) => [idx, d.count, 0]),
                      shading: 'realistic',
                      itemStyle: {
                        color: (params: any) => {
                      const colors = ['#3b82f6', '#64748b', '#475569', '#1e40af', '#94a3b8'];
                          return colors[params.dataIndex % colors.length];
                        },
                        opacity: 0.9
                      },
                      emphasis: {
                        itemStyle: {
                          color: '#60a5fa'
                        },
                        label: {
                          show: true,
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 'bold'
                        }
                      },
                      animation: true,
                      animationDuration: 1500,
                      animationEasing: 'elasticOut'
                    }
                  ]
                }}
                style={{ height: '400px' }}
                opts={{ renderer: 'canvas' }}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-dark-text-secondary">
                Geen data beschikbaar voor deze periode.
              </div>
            )}
          </div>
        </div>

        {/* Latest Meldingen List - Futuristic */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-slate-600 to-gray-600 rounded-lg blur opacity-15 group-hover:opacity-30 transition duration-1000 animate-glow"></div>
          <div className="relative bg-white dark:bg-dark-surface p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">⚡ Laatste Meldingen</h2>
            <div className="space-y-4">
              {latestMeldingen.length > 0 ? latestMeldingen.map(melding => (
                <div key={melding.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 border-l-4 border-cyan-500">
                  <img src={melding.attachments[0]} alt={melding.titel} className="w-16 h-16 rounded-md object-cover shadow-lg ring-2 ring-cyan-400/50"/>
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
    </div>
  );
};

export default DashboardPage;
