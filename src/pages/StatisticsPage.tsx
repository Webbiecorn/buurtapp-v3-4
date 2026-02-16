import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MeldingMarker } from '../components/MeldingMarker';
import { ProjectMarker } from '../components/ProjectMarker';
import { PeriodComparison } from '../components/PeriodComparison';
import { MultiSelect } from '../components/MultiSelect';
import { exportToExcel } from '../services/excelExport';
import { exportMeldingenToPDF, exportProjectenToPDF, exportStatisticsToPDF } from '../services/pdfExport';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_LIGHT_ID = import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID;
const GOOGLE_MAP_DARK_ID = import.meta.env.VITE_GOOGLE_MAP_DARK_ID;

import { format, subMonths, eachMonthOfInterval } from 'date-fns';
import { nl } from 'date-fns/locale';

const StatisticsPage: React.FC = () => {
  const { meldingen, projecten, urenregistraties, users, theme } = useAppContext();
  const [monthsBack, setMonthsBack] = useState(5);
  const [projectStatusFilter, setProjectStatusFilter] = useState<'alle' | 'Lopend' | 'Afgerond'>('alle');
  const [selectedMeldingId, setSelectedMeldingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<'meldingen' | 'projecten' | 'dossiers' | 'beide'>('meldingen');
  const [dossiers, setDossiers] = useState<Array<{ id: string; adres: string; lat: number; lon: number }>>([]);

  // Chart type selections
  const [chart3Type, setChart3Type] = useState<'bar3D' | 'scatter3D'>('bar3D');
  const [chart4Type, setChart4Type] = useState<'bar3D' | 'heatmap'>('bar3D');
  const [chart5Type, setChart5Type] = useState<'scatter3D' | 'bubble'>('scatter3D');

  // Multi-select filters
  const allWijken = useMemo(() => Array.from(new Set(meldingen.map(m => m.wijk))), [meldingen]);
  const allCategories = useMemo(() => Array.from(new Set(meldingen.map(m => m.categorie))), [meldingen]);

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

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('stats-filter-wijken', JSON.stringify(selectedWijken));
  }, [selectedWijken]);

  useEffect(() => {
    localStorage.setItem('stats-filter-categories', JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  useEffect(() => {
    localStorage.setItem('stats-filter-statuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);

  const filteredMeldingen = useMemo(() => {
    return meldingen.filter(m => {
      if (selectedWijken.length > 0 && !selectedWijken.includes(m.wijk)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(m.categorie)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(m.status)) return false;
      return true;
    });
  }, [meldingen, selectedWijken, selectedCategories, selectedStatuses]);

  const periodDates = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { now, thisMonthStart, lastMonthStart, lastMonthEnd };
  }, []);

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

  const urenPerMedewerker = users.map(user => {
    const totalMillis = urenregistraties
      .filter(u => u.gebruikerId === user.id && u.eind)
      .reduce((acc, curr) => acc + (new Date(curr.eind!).getTime() - new Date(curr.start).getTime()), 0);
    return { name: user.name, uren: totalMillis / (1000 * 60 * 60) };
  }).filter(u => u.uren > 0);

  const center = { lat: 52.5185, lng: 5.4714 };
  const mapId = theme === 'dark' ? GOOGLE_MAP_DARK_ID : GOOGLE_MAP_LIGHT_ID;

  // Theme colors
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const backgroundColor = isDark ? '#1f2937' : '#ffffff';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

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

  // Meldingen trend data
  const meldingenTrend = useMemo(() => months.map(ms => {
    const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const maand = format(ms, 'MMM', { locale: nl });
    const nieuweM = filteredMeldingen.filter(m => m.timestamp >= ms && m.timestamp <= me).length;
    const opgelost = filteredMeldingen.filter(m => m.status === MeldingStatus.Afgerond && m.timestamp >= ms && m.timestamp <= me).length;
    return { maand, nieuw: nieuweM, opgelost };
  }), [months, filteredMeldingen]);

  // Meldingen per categorie
  const meldingenPerCategorie = useMemo(() => {
    const catMap: { [key: string]: number } = {};
    filteredMeldingen.forEach(m => {
      catMap[m.categorie] = (catMap[m.categorie] || 0) + 1;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredMeldingen]);

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
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">📊 Statistieken</h1>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-blue-700 hover:from-slate-800 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {showExportMenu && !isExporting && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50">
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">Excel Export</div>
                  <button onClick={handleExportExcel} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Alle Data</div>
                      <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Meldingen & projecten</div>
                    </div>
                  </button>

                  <div className="my-2 border-t border-gray-200 dark:border-dark-border"></div>

                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase">PDF Export</div>
                  <button onClick={() => handleExportPDF('full')} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Volledig Rapport</div>
                      <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Met grafieken</div>
                    </div>
                  </button>
                  <button onClick={() => handleExportPDF('meldingen')} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">Meldingen</div>
                      <div className="text-xs text-gray-500 dark:text-dark-text-secondary">Gefilterde lijst</div>
                    </div>
                  </button>
                  <button onClick={() => handleExportPDF('projecten')} className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center space-x-2">
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
      </div>

      {/* Filters */}
      <div className="relative z-30 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-100 dark:border-dark-border">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Projecten Trend */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent">📊 Projecten Trend</h2>
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
          <ReactECharts
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'axis',
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              legend: {
                data: ['Gestart', 'Afgerond'],
                textStyle: { color: textColor },
                top: 0
              },
              grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
              },
              xAxis: {
                type: 'category',
                data: projectTrend.map(d => d.maand),
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              yAxis: {
                type: 'value',
                axisLabel: { color: textColor },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }
              },
              series: [
                {
                  name: 'Gestart',
                  type: 'line',
                  data: projectTrend.map(d => d.nieuw),
                  smooth: true,
                  lineStyle: { width: 3, color: '#3b82f6' },
                  itemStyle: { color: '#3b82f6' }
                },
                {
                  name: 'Afgerond',
                  type: 'line',
                  data: projectTrend.map(d => d.afgerond),
                  smooth: true,
                  lineStyle: { width: 3, color: '#22c55e' },
                  itemStyle: { color: '#22c55e' }
                }
              ],
              animationDuration: 1000
            }}
            style={{ height: '380px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Chart 2: Meldingen Overzicht */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">📈 Meldingen Overzicht</h2>
          <ReactECharts
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'axis',
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              legend: {
                data: ['Nieuwe Meldingen', 'Opgelost'],
                textStyle: { color: textColor },
                top: 0
              },
              grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
              },
              xAxis: {
                type: 'category',
                data: meldingenTrend.map(d => d.maand),
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              yAxis: {
                type: 'value',
                axisLabel: { color: textColor },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }
              },
              series: [
                {
                  name: 'Nieuwe Meldingen',
                  type: 'bar',
                  data: meldingenTrend.map(d => d.nieuw),
                  itemStyle: {
                    color: {
                      type: 'linear',
                      x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: '#a855f7' },
                        { offset: 1, color: '#7c3aed' }
                      ]
                    },
                    borderRadius: [4, 4, 0, 0]
                  },
                  emphasis: {
                    itemStyle: {
                      color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: '#c084fc' },
                          { offset: 1, color: '#a855f7' }
                        ]
                      }
                    }
                  }
                },
                {
                  name: 'Opgelost',
                  type: 'line',
                  data: meldingenTrend.map(d => d.opgelost),
                  smooth: true,
                  lineStyle: { width: 3, color: '#10b981' },
                  itemStyle: { color: '#10b981' },
                  areaStyle: {
                    color: {
                      type: 'linear',
                      x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
                      ]
                    }
                  }
                }
              ],
              animationDuration: 1000,
              animationEasing: 'cubicOut'
            }}
            style={{ height: '380px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Chart 3: Uren per Medewerker - FIXED VERSION */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">⏱️ Uren per Medewerker</h2>
            <select
              value={chart3Type}
              onChange={e => setChart3Type(e.target.value as 'bar3D' | 'scatter3D')}
              className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm"
            >
              <option value="bar3D">3D Balken</option>
              <option value="scatter3D">3D Scatter</option>
            </select>
          </div>
          <ReactECharts
            key={`uren-chart-${chart3Type}`}
            option={chart3Type === 'bar3D' ? {
              backgroundColor: 'transparent',
              tooltip: {
                formatter: (params: any) => {
                  const p = params;
                  return `${urenPerMedewerker[p.value[0]]?.name || 'Medewerker'}<br/>Uren: ${Math.round(p.value[1])}u`;
                },
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              xAxis3D: {
                type: 'category',
                data: urenPerMedewerker.map(d => d.name),
                name: 'Medewerker',
                axisLabel: { color: textColor, fontSize: 10, rotate: 30 },
                axisLine: { lineStyle: { color: gridColor } }
              },
              yAxis3D: {
                type: 'value',
                name: 'Uren',
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              zAxis3D: {
                type: 'value',
                name: 'Intensiteit',
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              grid3D: {
                boxWidth: 100,
                boxDepth: 100,
                viewControl: {
                  autoRotate: true,
                  autoRotateSpeed: 3,
                  distance: 200,
                  alpha: 30,
                  beta: 40
                },
                light: {
                  main: { intensity: 1.2, shadow: true },
                  ambient: { intensity: 0.6 }
                },
                environment: isDark ? '#1f2937' : '#f3f4f6'
              },
              series: [
                {
                  type: 'bar3D',
                  data: urenPerMedewerker.map((d, idx) => [idx, d.uren, d.uren / 10]),
                  shading: 'realistic',
                  itemStyle: {
                    color: (params: any) => {
                      const colors = ['#3b82f6', '#64748b', '#475569', '#1e40af', '#94a3b8'];
                      return colors[params.dataIndex % colors.length];
                    },
                    opacity: 0.9
                  },
                  emphasis: {
                    itemStyle: { color: '#fbbf24' },
                    label: {
                      show: true,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 'bold',
                      formatter: (params: any) => Math.round(params.value[1]) + 'u'
                    }
                  }
                }
              ]
            } : {
              backgroundColor: 'transparent',
              tooltip: {
                formatter: (params: any) => `${params.name}<br/>Uren: ${Math.round(params.value[1])}u`,
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              xAxis3D: {
                type: 'value',
                name: 'Index',
                axisLabel: { color: textColor }
              },
              yAxis3D: {
                type: 'value',
                name: 'Uren',
                axisLabel: { color: textColor }
              },
              zAxis3D: {
                type: 'value',
                name: 'Volume',
                axisLabel: { color: textColor }
              },
              grid3D: {
                boxWidth: 100,
                boxDepth: 100,
                viewControl: {
                  autoRotate: true,
                  autoRotateSpeed: 3,
                  distance: 200,
                  alpha: 30,
                  beta: 40
                },
                light: {
                  main: { intensity: 1.2, shadow: true },
                  ambient: { intensity: 0.6 }
                },
                environment: isDark ? '#1f2937' : '#f3f4f6'
              },
              series: [{
                type: 'scatter3D',
                data: urenPerMedewerker.map((d, idx) => ({
                  value: [idx, d.uren, d.uren / 10],
                  name: d.name
                })),
                symbolSize: (data: any) => Math.max(15, Math.min(40, data[1] / 4)),
                itemStyle: {
                  color: '#3b82f6',
                  opacity: 0.8
                },
                emphasis: {
                  itemStyle: { color: '#fbbf24', opacity: 1 },
                  label: {
                    show: true,
                    formatter: '{b}',
                    color: '#fff',
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    padding: 5,
                    borderRadius: 4
                  }
                }
              }]
            }}
            style={{ height: '380px' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        {/* Chart 4: Activiteit Heatmap */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">📊 Activiteit Heatmap</h2>
            <select
              value={chart4Type}
              onChange={e => setChart4Type(e.target.value as 'bar3D' | 'heatmap')}
              className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm"
            >
              <option value="bar3D">3D Balken</option>
              <option value="heatmap">2D Heatmap</option>
            </select>
          </div>
          <ReactECharts
            option={chart4Type === 'bar3D' ? {
              backgroundColor: 'transparent',
              tooltip: {
                formatter: (params: any) => {
                  const dagen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
                  return `${dagen[params.value[0]]}, ${params.value[1]}u<br/>Meldingen: ${params.value[2]}`;
                },
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              visualMap: {
                max: Math.max(...filteredMeldingen.map(() => 1), 5),
                inRange: {
                  color: ['#64748b', '#3b82f6', '#60a5fa', '#93c5fd']
                },
                textStyle: { color: textColor },
                orient: 'vertical',
                left: 'left',
                top: 'center',
                itemWidth: 15,
                itemHeight: 80
              },
              xAxis3D: {
                type: 'category',
                data: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                name: 'Dag',
                axisLabel: { color: textColor, fontSize: 10 },
                axisLine: { lineStyle: { color: gridColor } }
              },
              yAxis3D: {
                type: 'category',
                data: Array.from({ length: 24 }, (_, i) => `${i}u`),
                name: 'Uur',
                axisLabel: { color: textColor, fontSize: 9 },
                axisLine: { lineStyle: { color: gridColor } }
              },
              zAxis3D: {
                type: 'value',
                name: 'Aantal',
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              grid3D: {
                boxWidth: 100,
                boxDepth: 100,
                viewControl: {
                  autoRotate: true,
                  autoRotateSpeed: 3,
                  distance: 200,
                  alpha: 30,
                  beta: 40
                },
                light: {
                  main: { intensity: 1.2, shadow: true },
                  ambient: { intensity: 0.6 }
                },
                environment: isDark ? '#1f2937' : '#f3f4f6'
              },
              series: [{
                type: 'bar3D',
                data: (() => {
                  const hourData: { [key: string]: number } = {};
                  filteredMeldingen.forEach(m => {
                    const day = (m.timestamp.getDay() + 6) % 7;
                    const hour = m.timestamp.getHours();
                    const key = `${day}-${hour}`;
                    hourData[key] = (hourData[key] || 0) + 1;
                  });

                  const result = [];
                  for (let day = 0; day < 7; day++) {
                    for (let hour = 0; hour < 24; hour++) {
                      const count = hourData[`${day}-${hour}`] || 0;
                      result.push([day, hour, count]);
                    }
                  }
                  return result;
                })(),
                shading: 'realistic',
                itemStyle: { opacity: 0.8 }
              }]
            } : {
              backgroundColor: 'transparent',
              tooltip: {
                position: 'top',
                formatter: (params: any) => {
                  const dagen = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
                  return `${dagen[params.value[0]]}, ${params.value[1]}u<br/>Meldingen: ${params.value[2]}`;
                },
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: '#6366f1',
                borderWidth: 2,
                textStyle: { color: textColor, fontSize: 13 },
                padding: 10,
                extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
              },
              grid: {
                height: '65%',
                top: '8%',
                left: '12%',
                right: '5%'
              },
              xAxis: {
                type: 'category',
                data: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                splitArea: {
                  show: true,
                  areaStyle: {
                    color: [isDark ? '#1f2937' : '#fafafa', isDark ? '#111827' : '#f5f5f5']
                  }
                },
                axisLabel: {
                  color: textColor,
                  fontSize: 11,
                  fontWeight: 'bold'
                },
                axisLine: { show: false }
              },
              yAxis: {
                type: 'category',
                data: Array.from({ length: 24 }, (_, i) => `${i}u`),
                splitArea: {
                  show: true,
                  areaStyle: {
                    color: [isDark ? '#1f2937' : '#fafafa', isDark ? '#111827' : '#f5f5f5']
                  }
                },
                axisLabel: { color: textColor, fontSize: 9 },
                axisLine: { show: false }
              },
              visualMap: {
                min: 0,
                max: Math.max(...(() => {
                  const hourData: { [key: string]: number } = {};
                  filteredMeldingen.forEach(m => {
                    const day = (m.timestamp.getDay() + 6) % 7;
                    const hour = m.timestamp.getHours();
                    const key = `${day}-${hour}`;
                    hourData[key] = (hourData[key] || 0) + 1;
                  });
                  return Object.values(hourData);
                })(), 3),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '2%',
                inRange: {
                  color: isDark
                    ? ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe']
                    : ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af']
                },
                textStyle: { color: textColor },
                itemWidth: 20,
                itemHeight: 10
              },
              series: [{
                type: 'heatmap',
                data: (() => {
                  const hourData: { [key: string]: number } = {};
                  filteredMeldingen.forEach(m => {
                    const day = (m.timestamp.getDay() + 6) % 7;
                    const hour = m.timestamp.getHours();
                    const key = `${day}-${hour}`;
                    hourData[key] = (hourData[key] || 0) + 1;
                  });

                  const result = [];
                  for (let day = 0; day < 7; day++) {
                    for (let hour = 0; hour < 24; hour++) {
                      const count = hourData[`${day}-${hour}`] || 0;
                      result.push([day, hour, count]);
                    }
                  }
                  return result;
                })(),
                label: {
                  show: false
                },
                itemStyle: {
                  borderColor: isDark ? '#111827' : '#fff',
                  borderWidth: 1,
                  borderRadius: 2
                },
                emphasis: {
                  itemStyle: {
                    shadowBlur: 15,
                    shadowColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 2
                  }
                }
              }],
              animationDuration: 1000,
              animationEasing: 'cubicOut'
            }}
            style={{ height: '380px' }}
            opts={{ renderer: chart4Type === 'bar3D' ? 'canvas' : 'svg' }}
          />
        </div>

        {/* Chart 5: Impact vs Urgentie */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">🎯 Impact vs Urgentie</h2>
            <select
              value={chart5Type}
              onChange={e => setChart5Type(e.target.value as 'scatter3D' | 'bubble')}
              className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md py-1 px-2 text-sm"
            >
              <option value="scatter3D">3D Scatter</option>
              <option value="bubble">2D Bubbles</option>
            </select>
          </div>
          <ReactECharts
            option={chart5Type === 'scatter3D' ? {
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                  const urgentieLabels = ['Laag', 'Normaal', 'Hoog', 'Urgent'];
                  const impactLabels = ['Klein', 'Gemiddeld', 'Groot'];
                  return `${params.name}<br/>Impact: ${impactLabels[params.value[0]] || 'Onbekend'}<br/>Urgentie: ${urgentieLabels[params.value[1]] || 'Onbekend'}<br/>Dagen open: ${Math.round(params.value[2])}`;
                },
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: '#8b5cf6',
                textStyle: { color: textColor }
              },
              visualMap: {
                max: 30,
                inRange: {
                  color: ['#fca5a5', '#f87171', '#dc2626', '#991b1b']
                },
                textStyle: { color: textColor },
                orient: 'vertical',
                left: 'left',
                top: 'center',
                itemWidth: 15,
                itemHeight: 80
              },
              xAxis3D: {
                type: 'category',
                data: ['Klein', 'Gemiddeld', 'Groot'],
                name: 'Impact',
                axisLabel: { color: textColor, fontSize: 10 },
                axisLine: { lineStyle: { color: gridColor } }
              },
              yAxis3D: {
                type: 'category',
                data: ['Laag', 'Normaal', 'Hoog', 'Urgent'],
                name: 'Urgentie',
                axisLabel: { color: textColor, fontSize: 10 },
                axisLine: { lineStyle: { color: gridColor } }
              },
              zAxis3D: {
                type: 'value',
                name: 'Dagen Open',
                axisLabel: { color: textColor },
                axisLine: { lineStyle: { color: gridColor } }
              },
              grid3D: {
                boxWidth: 100,
                boxDepth: 100,
                viewControl: {
                  autoRotate: true,
                  autoRotateSpeed: 3,
                  distance: 200,
                  alpha: 30,
                  beta: 40
                },
                light: {
                  main: { intensity: 1.2, shadow: true },
                  ambient: { intensity: 0.6 }
                },
                environment: isDark ? '#1f2937' : '#f3f4f6'
              },
              series: [{
                type: 'scatter3D',
                data: (() => {
                  return filteredMeldingen
                    .filter(m => m.status !== MeldingStatus.Afgerond)
                    .map(m => {
                      const dagenOpen = Math.floor((now.getTime() - m.timestamp.getTime()) / (1000 * 60 * 60 * 24));
                      const impact = m.categorie === 'Openbaar groen' ? 0 : m.categorie === 'Afval' ? 1 : 2;
                      const urgentie = m.status === MeldingStatus.FixiMeldingGemaakt ? 2 : dagenOpen > 14 ? 3 : dagenOpen > 7 ? 2 : 1;
                      return {
                        value: [impact, urgentie, dagenOpen],
                        name: m.titel || 'Melding'
                      };
                    });
                })(),
                symbolSize: (data: any) => Math.min(20, 8 + data[2] / 2),
                itemStyle: {
                  opacity: 0.7,
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#e5e7eb'
                },
                emphasis: {
                  itemStyle: {
                    opacity: 1,
                    borderWidth: 2,
                    borderColor: '#8b5cf6'
                  },
                  label: {
                    show: true,
                    formatter: '{b}',
                    color: '#fff',
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    padding: 5,
                    borderRadius: 4
                  }
                }
              }]
            } : {
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                  return `${params.name}<br/>Dagen open: ${Math.round(params.value[2])}`;
                },
                backgroundColor: backgroundColor,
                borderColor: '#8b5cf6',
                textStyle: { color: textColor }
              },
              grid: {
                left: '8%',
                right: '8%',
                bottom: '10%',
                top: '15%',
                containLabel: true
              },
              xAxis: {
                type: 'value',
                name: 'Impact →',
                nameLocation: 'center',
                nameGap: 30,
                nameTextStyle: { color: textColor, fontSize: 12 },
                min: 0,
                max: 3,
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
                axisLabel: {
                  color: textColor,
                  formatter: (value: number) => {
                    const labels = ['', 'Klein', 'Gemiddeld', 'Groot'];
                    return labels[value] || '';
                  }
                }
              },
              yAxis: {
                type: 'value',
                name: 'Urgentie →',
                nameLocation: 'center',
                nameGap: 40,
                nameTextStyle: { color: textColor, fontSize: 12 },
                min: 0,
                max: 4,
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
                axisLabel: {
                  color: textColor,
                  formatter: (value: number) => {
                    const labels = ['', 'Laag', 'Normaal', 'Hoog', 'Urgent'];
                    return labels[value] || '';
                  }
                }
              },
              series: [{
                type: 'scatter',
                data: (() => {
                  return filteredMeldingen
                    .filter(m => m.status !== MeldingStatus.Afgerond)
                    .map(m => {
                      const dagenOpen = Math.floor((now.getTime() - m.timestamp.getTime()) / (1000 * 60 * 60 * 24));
                      const impact = m.categorie === 'Openbaar groen' ? 0 : m.categorie === 'Afval' ? 1 : 2;
                      const urgentie = m.status === MeldingStatus.FixiMeldingGemaakt ? 2 : dagenOpen > 14 ? 3 : dagenOpen > 7 ? 2 : 1;
                      return {
                        value: [impact, urgentie, dagenOpen],
                        name: m.titel || 'Melding'
                      };
                    });
                })(),
                symbolSize: (data: any) => Math.min(30, 10 + data[2]),
                itemStyle: {
                  opacity: 0.6
                },
                emphasis: {
                  itemStyle: {
                    opacity: 1,
                    borderWidth: 2,
                    borderColor: '#8b5cf6'
                  },
                  label: {
                    show: true,
                    formatter: '{b}',
                    position: 'top',
                    color: textColor
                  }
                }
              }],
              animationDuration: 1000
            }}
            style={{ height: '380px' }}
            opts={{ renderer: chart5Type === 'scatter3D' ? 'canvas' : 'svg' }}
          />
        </div>

        {/* Chart 6: Meldingen per Categorie */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">📂 Meldingen per Categorie</h2>
          <ReactECharts
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)',
                backgroundColor: backgroundColor,
                borderColor: gridColor,
                textStyle: { color: textColor }
              },
              legend: {
                orient: 'vertical',
                left: 'left',
                top: 'center',
                textStyle: { color: textColor },
                formatter: (name: string) => {
                  const item = meldingenPerCategorie.find(c => c.name === name);
                  return `${name}: ${item?.value || 0}`;
                }
              },
              series: [
                {
                  name: 'Categorieën',
                  type: 'pie',
                  radius: ['45%', '70%'],
                  center: ['60%', '50%'],
                  avoidLabelOverlap: true,
                  itemStyle: {
                    borderRadius: 8,
                    borderColor: isDark ? '#1f2937' : '#fff',
                    borderWidth: 2
                  },
                  label: {
                    show: true,
                    position: 'outside',
                    formatter: '{d}%',
                    color: textColor,
                    fontSize: 12,
                    fontWeight: 'bold'
                  },
                  labelLine: {
                    show: true,
                    lineStyle: { color: gridColor }
                  },
                  emphasis: {
                    itemStyle: {
                      shadowBlur: 10,
                      shadowOffsetX: 0,
                      shadowColor: 'rgba(0, 0, 0, 0.3)'
                    },
                    label: {
                      show: true,
                      fontSize: 14,
                      fontWeight: 'bold'
                    }
                  },
                  data: meldingenPerCategorie.map((item, idx) => ({
                    value: item.value,
                    name: item.name,
                    itemStyle: {
                      color: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                      ][idx % 10]
                    }
                  })),
                  animationType: 'scale',
                  animationEasing: 'elasticOut',
                  animationDelay: (idx: number) => idx * 50
                }
              ]
            }}
            style={{ height: '380px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-gray-100 dark:border-dark-border">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent">🗺️ Locatie Overzicht</h2>
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
  );
};

export default StatisticsPage;
