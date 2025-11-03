import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MeldingMarker } from '../components/MeldingMarker'; 
import { ProjectMarker } from '../components/ProjectMarker';
import { PeriodComparison } from '../components/PeriodComparison';
import { MultiSelect } from '../components/MultiSelect';
import { InsightCard } from '../components/InsightCard';
import { generateInsights, getFallbackInsights, type AIInsight } from '../services/aiInsights';
import { exportToExcel } from '../services/excelExport';
import { exportMeldingenToPDF, exportProjectenToPDF, exportStatisticsToPDF } from '../services/pdfExport';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const COLORS = ['#f59e0b', '#8b5cf6', '#22c55e'];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_LIGHT_ID = import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID;
const GOOGLE_MAP_DARK_ID = import.meta.env.VITE_GOOGLE_MAP_DARK_ID;

import { format, subMonths, eachMonthOfInterval } from 'date-fns';
import { nl } from 'date-fns/locale';

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

  // Multi-select filters
  const allWijken = useMemo(() => Array.from(new Set(meldingen.map(m => m.wijk))), [meldingen]);
  const allCategories = useMemo(() => Array.from(new Set(meldingen.map(m => m.categorie))), [meldingen]);
  
  // Load filter preferences from localStorage
  const [selectedWijken, setSelectedWijken] = useState<string[]>(() => {
    const saved = localStorage.getItem('stats-filter-wijken');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('stats-filter-categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const saved = localStorage.getItem('stats-filter-statuses');
    return saved ? JSON.parse(saved) : [];
  });

  // Collapsible filters state for mobile
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // AI Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Save filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem('stats-filter-wijken', JSON.stringify(selectedWijken));
  }, [selectedWijken]);

  useEffect(() => {
    localStorage.setItem('stats-filter-categories', JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  useEffect(() => {
    localStorage.setItem('stats-filter-statuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);

  // Filtered data based on multi-select filters
  const filteredMeldingen = useMemo(() => {
    return meldingen.filter(m => {
      if (selectedWijken.length > 0 && !selectedWijken.includes(m.wijk)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(m.categorie)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(m.status)) return false;
      return true;
    });
  }, [meldingen, selectedWijken, selectedCategories, selectedStatuses]);

  // Period comparison: This month vs last month (memoized to prevent re-renders)
  const periodDates = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { now, thisMonthStart, lastMonthStart, lastMonthEnd };
  }, []); // Empty dependency array - only calculate once

  const { now, thisMonthStart, lastMonthStart, lastMonthEnd } = periodDates;

  const meldingenThisMonth = filteredMeldingen.filter(m => m.timestamp >= thisMonthStart).length;
  const meldingenLastMonth = filteredMeldingen.filter(m => m.timestamp >= lastMonthStart && m.timestamp <= lastMonthEnd).length;

  const projectenThisMonth = projecten.filter(p => p.startDate >= thisMonthStart).length;
  const projectenLastMonth = projecten.filter(p => p.startDate >= lastMonthStart && p.startDate <= lastMonthEnd).length;

  const urenThisMonth = urenregistraties
    .filter(u => u.start >= thisMonthStart && u.eind)
    .reduce((acc, curr) => acc + (new Date(curr.eind!).getTime() - new Date(curr.start).getTime()), 0) / (1000 * 60 * 60);
  const urenLastMonth = urenregistraties
    .filter(u => u.start >= lastMonthStart && u.start <= lastMonthEnd && u.eind)
    .reduce((acc, curr) => acc + (new Date(curr.eind!).getTime() - new Date(curr.start).getTime()), 0) / (1000 * 60 * 60);

  // Generate AI Insights when data changes
  useEffect(() => {
    async function loadInsights() {
      setLoadingInsights(true);
      try {
        const insightsData = await generateInsights({
          meldingen: filteredMeldingen,
          projecten,
          urenregistraties,
          period: {
            current: { start: thisMonthStart, end: now },
            previous: { start: lastMonthStart, end: lastMonthEnd },
          },
        });
        
        if (insightsData.length > 0) {
          setInsights(insightsData);
        } else {
          // Fallback to simple insights if AI fails
          setInsights(getFallbackInsights({
            meldingen: filteredMeldingen,
            projecten,
            urenregistraties,
            period: {
              current: { start: thisMonthStart, end: now },
              previous: { start: lastMonthStart, end: lastMonthEnd },
            },
          }));
        }
      } catch (error) {
        console.error('Failed to generate insights:', error);
        // Use fallback insights
        setInsights(getFallbackInsights({
          meldingen: filteredMeldingen,
          projecten,
          urenregistraties,
          period: {
            current: { start: thisMonthStart, end: now },
            previous: { start: lastMonthStart, end: lastMonthEnd },
          },
        }));
      } finally {
        setLoadingInsights(false);
      }
    }

    loadInsights();
    // Only re-generate insights when filtered data changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMeldingen.length, projecten.length, urenregistraties.length]);

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

  const meldingenPerWijk = filteredMeldingen.reduce((acc, m) => {
    acc[m.wijk] = (acc[m.wijk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const wijkData = Object.entries(meldingenPerWijk).map(([name, value]) => ({ name, meldingen: value }));

  const meldingenPerStatus = Object.values(MeldingStatus).map(status => ({
    name: status,
    value: filteredMeldingen.filter(m => m.status === status).length
  }));

  const urenPerMedewerker = users.map(user => {
    const totalMillis = urenregistraties
      .filter(u => u.gebruikerId === user.id && u.eind)
      .reduce((acc, curr) => acc + (new Date(curr.eind!).getTime() - new Date(curr.start).getTime()), 0);
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

  // Export handlers
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportToExcel({
        meldingen: filteredMeldingen,
        projecten,
        urenregistraties,
        users,
      }, 'statistieken');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Er is een fout opgetreden bij het exporteren naar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async (type: 'full' | 'meldingen' | 'projecten') => {
    setIsExporting(true);
    try {
      if (type === 'full') {
        await exportStatisticsToPDF({
          meldingen: filteredMeldingen || [],
          projecten: projecten || [],
          urenregistraties: urenregistraties || [],
          title: 'Buurtconciërge Statistieken'
        });
      } else if (type === 'meldingen') {
        await exportMeldingenToPDF(filteredMeldingen || []);
      } else if (type === 'projecten') {
        await exportProjectenToPDF(projecten || []);
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert(`Er is een fout opgetreden bij het exporteren naar PDF: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Statistieken</h1>
        
        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporteren...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>Exporteren</span>
                <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {/* Dropdown Menu */}
          {showExportMenu && !isExporting && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50">
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">
                  Excel Export
                </div>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Alle Data</div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Meldingen, projecten & uren</div>
                  </div>
                </button>

                <div className="my-2 border-t border-gray-200 dark:border-dark-border"></div>

                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">
                  PDF Export
                </div>
                <button
                  onClick={() => handleExportPDF('full')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Volledig Rapport</div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Met grafieken</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExportPDF('meldingen')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Meldingen</div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Gefilterde lijst</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExportPDF('projecten')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Projecten</div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Overzicht</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Multi-select Filters */}
      <div className="relative z-30 bg-white dark:bg-dark-surface rounded-lg shadow-md">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full p-6 flex items-center justify-between md:hidden text-left hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors rounded-t-lg"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            Filters
            {(selectedWijken.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0) && (
              <span className="ml-2 text-sm font-normal text-brand-primary">
                ({selectedWijken.length + selectedCategories.length + selectedStatuses.length} actief)
              </span>
            )}
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block p-6 ${filtersExpanded ? 'pt-0' : ''} rounded-b-lg`}>
          <h2 className="hidden md:block text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">
            Filters
            {(selectedWijken.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0) && (
              <span className="ml-2 text-sm font-normal text-brand-primary">
                ({selectedWijken.length + selectedCategories.length + selectedStatuses.length} actief)
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MultiSelect
              label="Wijken"
              options={allWijken}
              selectedOptions={selectedWijken}
              onChange={setSelectedWijken}
              placeholder="Alle wijken"
            />
            <MultiSelect
              label="Categorieën"
              options={allCategories}
              selectedOptions={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="Alle categorieën"
            />
            <MultiSelect
              label="Status"
              options={Object.values(MeldingStatus)}
              selectedOptions={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Alle statussen"
            />
          </div>
          {(selectedWijken.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSelectedWijken([]);
                  setSelectedCategories([]);
                  setSelectedStatuses([]);
                }}
                className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
              >
                Wis alle filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Period Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PeriodComparison
          title="Meldingen"
          currentValue={meldingenThisMonth}
          previousValue={meldingenLastMonth}
        />
        <PeriodComparison
          title="Projecten (gestart)"
          currentValue={projectenThisMonth}
          previousValue={projectenLastMonth}
        />
        <PeriodComparison
          title="Uren geregistreerd"
          currentValue={urenThisMonth}
          previousValue={urenLastMonth}
          format={(v) => `${Math.round(v)}u`}
        />
      </div>

      {/* AI Insights */}
      {loadingInsights ? (
        <div className="relative z-10 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-gray-600 dark:text-dark-text-secondary">AI insights aan het genereren...</span>
          </div>
        </div>
      ) : insights.length > 0 && (
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
              🤖 AI Insights
            </h2>
            <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
              Powered by Gemini AI
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <InsightCard
                key={index}
                type={insight.type}
                title={insight.title}
                description={insight.description}
                confidence={insight.confidence}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Projecten: trend</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="stats-monthsBack" className="text-sm text-gray-600 dark:text-dark-text-secondary">Periode:</label>
              <select id="stats-monthsBack" value={monthsBack} onChange={e => setMonthsBack(parseInt(e.target.value))} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
                <option value={5}>6 maanden</option>
                <option value={11}>12 maanden</option>
                <option value={23}>24 maanden</option>
              </select>
              <label htmlFor="stats-projectStatus" className="text-sm text-gray-600 dark:text-dark-text-secondary">Type:</label>
              <select id="stats-projectStatus" value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
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
              <label htmlFor="stats-dossierStatus" className="text-sm text-gray-600 dark:text-dark-text-secondary">Status:</label>
              <select id="stats-dossierStatus" value={dossierStatusFilter} onChange={e => setDossierStatusFilter(e.target.value as any)} className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm">
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
                            {(mapFilter === 'meldingen' || mapFilter === 'beide') && filteredMeldingen.map(melding => (
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
