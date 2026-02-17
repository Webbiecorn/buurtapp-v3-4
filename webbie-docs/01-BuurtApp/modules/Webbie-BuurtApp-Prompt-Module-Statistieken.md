# AI Prompt: Statistieken & Analytics Module - Buurtconciërge App

## Context
Je gaat een complete Statistieken & Analytics module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module gebruikt Apache ECharts voor moderne, interactieve data visualisaties met dark mode support en geanimeerde overgangen.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Charts:** Apache ECharts (echarts-for-react)
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **State Management:** React Context API
- **Performance:** usePerformanceTrace hook
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **Statistieken Dashboard (StatisticsPage)**
   - Grid layout met 8+ charts
   - Responsive (1 col mobile, 2 cols tablet, 3 cols desktop)
   - Dark mode theming voor alle charts
   - Smooth animations (1000ms, cubicOut easing)
   - Export buttons per chart (PNG/SVG)
   - Loading skeletons tijdens data fetch
   - Performance tracking met usePerformanceTrace

2. **Chart Types**

   **a. Meldingen Overzicht (Line Chart)**
   - X-as: Tijd (laatste 12 maanden)
   - Y-as: Aantal meldingen
   - Lines: Per status (3 lijnen)
   - Features: Tooltip, gradient fill, smooth curves

   **b. Meldingen per Categorie (Pie Chart)**
   - 17 categorieën met kleuren
   - Percentage labels
   - Legend rechts
   - Click to toggle

   **c. Meldingen per Status (Bar Chart)**
   - 3 statussen met kleurcodering
   - Horizontal bars
   - Value labels aan einde van bars

   **d. Meldingen per Wijk (Bar Chart)**
   - 5 wijken
   - Vertical bars met gradient
   - Click voor drill-down (optioneel)

   **e. 3D Bar Chart (Wijk vs Categorie)**
   - X-as: Wijken
   - Y-as: Aantal meldingen
   - Z-as: Categorieën
   - Features: Roteerbaar, zoom, tooltips
   - Grid lines

   **f. 2D Heatmap (Wijk vs Categorie)**
   - 6-step gradient (blauw naar rood)
   - Zebra-striping voor leesbaarheid
   - Hover tooltips met waarde
   - Labels op beide assen

   **g. Projecten Timeline (Custom Bar)**
   - Gantt-achtige weergave
   - Y-as: Projectnamen
   - X-as: Tijd
   - Bars: Start tot eind datum
   - Kleuren: Status (lopend/afgerond)

   **h. Uren per Week (Line Chart)**
   - X-as: Weken (laatste 12 weken)
   - Y-as: Totaal uren
   - Multiple lines per gebruiker (optioneel)
   - Area fill

3. **Period Comparison Component**
   - Vergelijk huidige vs vorige periode
   - Key metrics:
     - Totaal meldingen (+/- %)
     - Afgeronde meldingen (+/- %)
     - Actieve projecten (+/- %)
     - Gewerkte uren (+/- %)
   - Trend indicators (↑ ↓ →)
   - Kleurcodering (groen/rood/grijs)

4. **Insight Cards**
   - 4 KPI cards bovenaan:
     - Totaal meldingen (deze maand)
     - Gemiddelde afhandeltijd
     - Project completion rate
     - Meest actieve wijk
   - Animaties bij data update
   - Icons per metric

## Data Model

### Chart Data Structures

```typescript
// Line Chart Data
interface LineChartData {
  categories: string[]; // X-axis labels (dates)
  series: {
    name: string;
    data: number[];
    color: string;
  }[];
}

// Pie Chart Data
interface PieChartData {
  name: string;
  value: number;
  itemStyle: { color: string };
}[];

// Bar Chart Data
interface BarChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
    itemStyle: { color: string };
  }[];
}

// Heatmap Data
interface HeatmapData {
  xAxis: string[]; // Wijken
  yAxis: string[]; // Categorieën
  data: [number, number, number][]; // [x, y, value]
}

// 3D Bar Data (for ECharts 3D extension)
interface Bar3DData {
  data: [number, number, number][]; // [x, y, value]
  xAxis3D: { data: string[] };
  yAxis3D: {};
  zAxis3D: { data: string[] };
}
```

## ECharts Configuration

### Theme Configuration
```typescript
const isDark = theme === 'dark';

const chartTheme = {
  textColor: isDark ? '#e5e7eb' : '#374151',
  backgroundColor: isDark ? '#1f2937' : '#ffffff',
  gridColor: isDark ? '#374151' : '#e5e7eb',
  tooltipBgColor: isDark ? '#374151' : '#ffffff',
  tooltipTextColor: isDark ? '#f3f4f6' : '#111827',
};
```

### Base Chart Options
```typescript
const baseOptions = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    color: chartTheme.textColor,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: chartTheme.tooltipBgColor,
    borderColor: chartTheme.gridColor,
    textStyle: {
      color: chartTheme.tooltipTextColor,
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
  animationDuration: 1000,
  animationEasing: 'cubicOut',
};
```

## Component Examples

### StatisticsPage.tsx Skeleton
```tsx
import React, { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePerformanceTrace } from '@/hooks/usePerformanceTrace';
import ReactECharts from 'echarts-for-react';
import { PeriodComparison } from '@/components/PeriodComparison';
import { InsightCard } from '@/components/InsightCard';
import { TrendingUp, Activity, CheckCircle, MapPin } from 'lucide-react';

export const StatisticsPage: React.FC = () => {
  usePerformanceTrace('StatisticsPage');

  const { meldingen, projecten, urenregistraties, theme } = useAppContext();

  const isDark = theme === 'dark';

  // Prepare data
  const meldingenOverzichtData = useMemo(() =>
    prepareMeldingenOverzicht(meldingen), [meldingen]
  );

  const meldingenPerCategorieData = useMemo(() =>
    prepareMeldingenPerCategorie(meldingen), [meldingen]
  );

  const meldingenPerStatusData = useMemo(() =>
    prepareMeldingenPerStatus(meldingen), [meldingen]
  );

  const meldingenPerWijkData = useMemo(() =>
    prepareMeldingenPerWijk(meldingen), [meldingen]
  );

  const heatmapData = useMemo(() =>
    prepareHeatmap(meldingen), [meldingen]
  );

  const bar3DData = useMemo(() =>
    prepare3DBar(meldingen), [meldingen]
  );

  const projectenTimelineData = useMemo(() =>
    prepareProjectenTimeline(projecten), [projecten]
  );

  const urenPerWeekData = useMemo(() =>
    prepareUrenPerWeek(urenregistraties), [urenregistraties]
  );

  // KPIs
  const totalMeldingen = meldingen.length;
  const gemAfhandeltijd = calculateGemAfhandeltijd(meldingen);
  const projectCompletion = calculateProjectCompletion(projecten);
  const meestActieveWijk = getMeestActieveWijk(meldingen);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Statistieken & Analytics
      </h1>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <InsightCard
          title="Totaal Meldingen"
          value={totalMeldingen}
          icon={<Activity className="w-6 h-6" />}
          trend={+12}
          color="blue"
        />
        <InsightCard
          title="Gem. Afhandeltijd"
          value={`${gemAfhandeltijd} dagen`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={-8}
          color="green"
        />
        <InsightCard
          title="Project Completion"
          value={`${projectCompletion}%`}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={+5}
          color="purple"
        />
        <InsightCard
          title="Meest Actieve Wijk"
          value={meestActieveWijk}
          icon={<MapPin className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Period Comparison */}
      <div className="mb-6">
        <PeriodComparison
          current={{
            meldingen: totalMeldingen,
            afgerond: meldingen.filter(m => m.status === 'Afgerond').length,
            projecten: projecten.filter(p => p.status === 'Lopend').length,
            uren: urenregistraties.reduce((sum, u) =>
              sum + ((u.eind.getTime() - u.start.getTime()) / 3600000), 0
            ),
          }}
          previous={{
            meldingen: 85,
            afgerond: 32,
            projecten: 8,
            uren: 142,
          }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart: Meldingen Overzicht */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Meldingen Overzicht (12 maanden)
          </h3>
          <ReactECharts
            option={getMeldingenOverzichtOptions(meldingenOverzichtData, isDark)}
            style={{ height: '350px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Pie Chart: Per Categorie */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Meldingen per Categorie
          </h3>
          <ReactECharts
            option={getMeldingenPerCategorieOptions(meldingenPerCategorieData, isDark)}
            style={{ height: '350px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Bar Chart: Per Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Meldingen per Status
          </h3>
          <ReactECharts
            option={getMeldingenPerStatusOptions(meldingenPerStatusData, isDark)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Bar Chart: Per Wijk */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Meldingen per Wijk
          </h3>
          <ReactECharts
            option={getMeldingenPerWijkOptions(meldingenPerWijkData, isDark)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* 2D Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Heatmap: Wijk vs Categorie
          </h3>
          <ReactECharts
            option={getHeatmapOptions(heatmapData, isDark)}
            style={{ height: '400px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* 3D Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            3D View: Wijk vs Categorie
          </h3>
          <ReactECharts
            option={get3DBarOptions(bar3DData, isDark)}
            style={{ height: '400px' }}
            opts={{ renderer: 'canvas' }} // Canvas voor 3D
          />
        </div>

        {/* Project Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Projecten Timeline
          </h3>
          <ReactECharts
            option={getProjectenTimelineOptions(projectenTimelineData, isDark)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>

        {/* Uren per Week */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Gewerkte Uren per Week
          </h3>
          <ReactECharts
            option={getUrenPerWeekOptions(urenPerWeekData, isDark)}
            style={{ height: '300px' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </div>
    </div>
  );
};
```

### Chart Options Functions

#### Line Chart (Meldingen Overzicht)
```typescript
const getMeldingenOverzichtOptions = (data: LineChartData, isDark: boolean) => {
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: data.series.map(s => s.name),
      textStyle: { color: textColor },
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: data.series.map(s => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      lineStyle: { width: 3, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: s.color + '50' },
            { offset: 1, color: s.color + '10' },
          ],
        },
      },
    })),
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  };
};
```

#### Pie Chart (Per Categorie)
```typescript
const getMeldingenPerCategorieOptions = (data: PieChartData, isDark: boolean) => {
  const textColor = isDark ? '#e5e7eb' : '#374151';

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: textColor },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{d}%',
          color: textColor,
        },
      },
    ],
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  };
};
```

#### Heatmap (2D)
```typescript
const getHeatmapOptions = (data: HeatmapData, isDark: boolean) => {
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `${data.yAxis[params.data[1]]}<br/>${data.xAxis[params.data[0]]}: ${params.data[2]}`;
      },
    },
    grid: {
      left: '15%',
      right: '5%',
      bottom: '15%',
      top: '5%',
    },
    xAxis: {
      type: 'category',
      data: data.xAxis,
      splitArea: { show: true },
      axisLabel: { color: textColor },
    },
    yAxis: {
      type: 'category',
      data: data.yAxis,
      splitArea: { show: true },
      axisLabel: { color: textColor },
    },
    visualMap: {
      min: 0,
      max: Math.max(...data.data.map(d => d[2])),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#dc2626', '#991b1b'],
      },
      textStyle: { color: textColor },
    },
    series: [
      {
        type: 'heatmap',
        data: data.data,
        label: {
          show: true,
          color: '#fff',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
};
```

#### 3D Bar Chart
```typescript
// Requires: import 'echarts-gl';

const get3DBarOptions = (data: Bar3DData, isDark: boolean) => {
  const textColor = isDark ? '#e5e7eb' : '#374151';

  return {
    backgroundColor: 'transparent',
    textStyle: { color: textColor },
    tooltip: {},
    visualMap: {
      max: Math.max(...data.data.map(d => d[2])),
      inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'] },
      show: false,
    },
    xAxis3D: {
      type: 'category',
      data: data.xAxis3D.data,
      axisLabel: { color: textColor },
    },
    yAxis3D: {
      type: 'value',
      axisLabel: { color: textColor },
    },
    zAxis3D: {
      type: 'category',
      data: data.zAxis3D.data,
      axisLabel: { color: textColor },
    },
    grid3D: {
      boxWidth: 200,
      boxDepth: 80,
      viewControl: {
        projection: 'perspective',
        autoRotate: false,
        rotateSensitivity: 1,
        zoomSensitivity: 0.5,
      },
      light: {
        main: { intensity: 1.2 },
        ambient: { intensity: 0.3 },
      },
    },
    series: [
      {
        type: 'bar3D',
        data: data.data.map(item => ({
          value: [item[0], item[2], item[1]],
        })),
        shading: 'lambert',
        label: {
          fontSize: 16,
          borderWidth: 1,
        },
        emphasis: {
          label: { fontSize: 20 },
          itemStyle: { color: '#ef4444' },
        },
      },
    ],
  };
};
```

## Data Preparation Functions

```typescript
const prepareMeldingenOverzicht = (meldingen: Melding[]): LineChartData => {
  // Group by month for last 12 months
  const last12Months = getLast12Months();
  const statusCounts = {
    'In behandeling': new Array(12).fill(0),
    'Fixi melding gemaakt': new Array(12).fill(0),
    'Afgerond': new Array(12).fill(0),
  };

  meldingen.forEach(m => {
    const monthIndex = last12Months.findIndex(month =>
      isSameMonth(m.timestamp, month)
    );
    if (monthIndex >= 0) {
      statusCounts[m.status][monthIndex]++;
    }
  });

  return {
    categories: last12Months.map(m => format(m, 'MMM yyyy')),
    series: [
      { name: 'In behandeling', data: statusCounts['In behandeling'], color: '#f59e0b' },
      { name: 'Fixi melding', data: statusCounts['Fixi melding gemaakt'], color: '#3b82f6' },
      { name: 'Afgerond', data: statusCounts['Afgerond'], color: '#10b981' },
    ],
  };
};

const prepareMeldingenPerCategorie = (meldingen: Melding[]): PieChartData => {
  const counts = meldingen.reduce((acc, m) => {
    acc[m.categorie] = (acc[m.categorie] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors = generateColors(Object.keys(counts).length);

  return Object.entries(counts).map(([name, value], index) => ({
    name,
    value,
    itemStyle: { color: colors[index] },
  }));
};

const prepareHeatmap = (meldingen: Melding[]): HeatmapData => {
  const wijken = ['Atol', 'Boswijk', 'Jol', 'Waterwijk', 'Zuiderzeewijk'];
  const categorieën = [...new Set(meldingen.map(m => m.categorie))];

  const data: [number, number, number][] = [];

  wijken.forEach((wijk, x) => {
    categorieën.forEach((cat, y) => {
      const count = meldingen.filter(m => m.wijk === wijk && m.categorie === cat).length;
      data.push([x, y, count]);
    });
  });

  return { xAxis: wijken, yAxis: categorieën, data };
};
```

## Analytics Tracking
```typescript
trackEvent('statistics_page_viewed');
trackEvent('chart_exported', { chartType: 'line', format: 'png' });
```

## Testing Checklist
- [ ] Alle charts renderen correct
- [ ] Dark mode theming werkt
- [ ] Smooth animaties bij data wijziging
- [ ] Tooltips tonen correcte data
- [ ] 3D chart is draaibaar/zoombaar
- [ ] Heatmap gradient correct
- [ ] Period comparison toont juiste percentages
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Export functionaliteit werkt
- [ ] Performance: geen lag bij chart updates

## File Structure
```
src/
├── pages/
│   └── StatisticsPage.tsx
├── components/
│   ├── PeriodComparison.tsx
│   └── InsightCard.tsx
└── utils/
    └── chartHelpers.ts
```

Succes met het bouwen van de Statistieken module! 📊
