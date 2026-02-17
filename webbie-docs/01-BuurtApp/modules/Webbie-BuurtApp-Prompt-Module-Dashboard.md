# AI Prompt: Dashboard Module - Buurtconciërge App

## Context
Je gaat een complete Dashboard (Homepage) module bouwen voor een React + TypeScript wijkbeheer applicatie. Dit is de centrale landingspagina met KPI's, recent activity feed, quick actions en overzicht widgets.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **State Management:** React Context API
- **Performance:** usePerformanceTrace hook
- **Icons:** Lucide React
- **Charts:** Mini charts van Rechart (optioneel)

## Module Requirements

### Core Functionaliteit

1. **Dashboard Layout**
   - 3-column responsive grid (1 col mobile, 2 tablet, 3 desktop)
   - Sections:
     - KPI Cards (top row, 4 cards)
     - Quick Actions (sidebar, sticky)
     - Recent Activity (main column, scrollable feed)
     - Quick Stats (bottom row, mini charts)
   - Real-time updates via Firestore listeners
   - Performance tracking

2. **KPI Cards (4 stuks)**
   - **Actieve Meldingen:** Count + trend (↑ %)
   - **Lopende Projecten:** Count + completion %
   - **Uren Deze Week:** Total hours + daily average
   - **Open Dossiers:** Count + urgent badge
   - Features:
     - Icons (color-coded)
     - Trend indicators
     - Click to navigate to detail page
     - Hover animations
     - Loading skeletons

3. **Quick Actions Panel**
   - Floating sticky sidebar (rechts)
   - Buttons:
     - "+ Nieuwe Melding"
     - "+ Nieuw Project"
     - "+ Uren Registreren"
     - "+ Nieuw Dossier"
     - "📊 Statistieken"
     - "🗺️ Kaartweergave"
   - Role-based visibility (Viewer geen create buttons)
   - Keyboard shortcuts hint

4. **Recent Activity Feed**
   - Timeline-style feed
   - Show laatste 20 items:
     - Nieuwe meldingen (laatste 24u)
     - Project updates
     - Uren registraties (vandaag)
     - Dossier wijzigingen
   - Per item:
     - Icon (type-based)
     - Titel + beschrijving
     - User avatar + naam
     - Timestamp (relative: "2u geleden")
     - Click → navigate to detail
   - "Toon meer" button (load next 20)
   - Loading skeleton tijdens fetch

5. **Quick Stats Widgets**
   - Mini visualisaties (bottom row):
     - **Meldingen Deze Maand:** Sparkline chart
     - **Top 3 Categorieën:** Mini bar chart
     - **Projecten Voortgang:** Progress bars (top 3)
     - **Meest Actieve Gebruiker:** Avatar + count

6. **Welcome Banner (Optional)**
   - Personalized greeting: "Goedemorgen, [naam]"
   - Current date + time
   - Quick tip of the day
   - Dismissable

## Data Model

### Dashboard Data Structures

```typescript
interface KPICard {
  id: string;
  title: string;
  value: number | string;
  trend?: number; // percentage change
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  href?: string; // navigation link
}

interface ActivityItem {
  id: string;
  type: 'melding' | 'project' | 'uren' | 'dossier';
  title: string;
  description: string;
  userId: string;
  timestamp: Date;
  href: string; // detail link
}

interface QuickStat {
  id: string;
  title: string;
  data: number[] | { label: string; value: number }[];
  chartType: 'sparkline' | 'bar' | 'progress';
}
```

## Component Examples

### DashboardPage.tsx
```tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { usePerformanceTrace } from '@/hooks/usePerformanceTrace';
import {
  Activity,
  Folder,
  Clock,
  TrendingUp,
  Plus,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { nl } from 'date-fns/locale';

export const DashboardPage: React.FC = () => {
  usePerformanceTrace('DashboardPage');

  const navigate = useNavigate();
  const {
    meldingen,
    projecten,
    urenregistraties,
    dossiers,
    currentUser,
    users,
  } = useAppContext();

  // KPIs
  const activeMeldingen = useMemo(
    () => meldingen.filter(m => m.status !== 'Afgerond'),
    [meldingen]
  );

  const lopendeProjecten = useMemo(
    () => projecten.filter(p => p.status === 'Lopend'),
    [projecten]
  );

  const urenDezeWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    return urenregistraties
      .filter(u => u.start >= weekStart)
      .reduce((sum, u) => {
        const hours = (u.eind.getTime() - u.start.getTime()) / 3600000;
        return sum + hours;
      }, 0);
  }, [urenregistraties]);

  const openDossiers = useMemo(
    () => dossiers.filter(d => d.status === 'actief' || d.status === 'in onderzoek'),
    [dossiers]
  );

  // Recent Activity
  const recentActivity = useMemo(() => {
    const activities: ActivityItem[] = [];

    // Laatste meldingen (24u)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    meldingen
      .filter(m => m.timestamp >= last24h)
      .forEach(m => {
        activities.push({
          id: m.id,
          type: 'melding',
          title: m.titel,
          description: m.categorie,
          userId: m.gebruikerId,
          timestamp: m.timestamp,
          href: `/#/meldingen/${m.id}`,
        });
      });

    // Laatste projecten (7 dagen)
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    projecten
      .filter(p => p.createdAt >= last7d)
      .forEach(p => {
        activities.push({
          id: p.id,
          type: 'project',
          title: p.titel,
          description: `${p.deelnemers.length} deelnemers`,
          userId: p.createdBy,
          timestamp: p.createdAt,
          href: `/#/projecten/${p.id}`,
        });
      });

    // Uren vandaag
    const today = startOfDay(new Date());
    urenregistraties
      .filter(u => u.start >= today)
      .forEach(u => {
        const hours = ((u.eind.getTime() - u.start.getTime()) / 3600000).toFixed(1);
        activities.push({
          id: u.id,
          type: 'uren',
          title: `${hours}u - ${u.activiteit}`,
          description: u.projectName || u.wijk || '',
          userId: u.gebruikerId,
          timestamp: u.start,
          href: '/#/urenregistratie',
        });
      });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }, [meldingen, projecten, urenregistraties]);

  const kpiCards: KPICard[] = [
    {
      id: 'meldingen',
      title: 'Actieve Meldingen',
      value: activeMeldingen.length,
      trend: +12,
      icon: <Activity className="w-6 h-6" />,
      color: 'blue',
      href: '/#/meldingen',
    },
    {
      id: 'projecten',
      title: 'Lopende Projecten',
      value: lopendeProjecten.length,
      trend: +5,
      icon: <Folder className="w-6 h-6" />,
      color: 'green',
      href: '/#/projecten',
    },
    {
      id: 'uren',
      title: 'Uren Deze Week',
      value: urenDezeWeek.toFixed(1),
      icon: <Clock className="w-6 h-6" />,
      color: 'purple',
      href: '/#/urenregistratie',
    },
    {
      id: 'dossiers',
      title: 'Open Dossiers',
      value: openDossiers.length,
      trend: -3,
      icon: <MapPin className="w-6 h-6" />,
      color: 'orange',
      href: '/#/dossiers',
    },
  ];

  return (
    <div className="p-6">
      {/* Welcome Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {getGreeting()}, {currentUser?.name}!
        </h1>
        <p className="text-blue-100">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpiCards.map(card => (
          <KPICard key={card.id} {...card} onClick={() => card.href && navigate(card.href)} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recente Activiteit
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {recentActivity.map(activity => (
              <ActivityCard key={activity.id} activity={activity} users={users} />
            ))}
          </div>
        </div>

        {/* Quick Actions (1 col) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Snelle Acties
          </h2>
          <div className="space-y-3">
            {currentUser?.role !== 'Viewer' && (
              <>
                <QuickActionButton
                  icon={<Plus className="w-5 h-5" />}
                  label="Nieuwe Melding"
                  onClick={() => navigate('/#/nieuwe-melding')}
                  color="blue"
                />
                <QuickActionButton
                  icon={<Plus className="w-5 h-5" />}
                  label="Nieuw Project"
                  onClick={() => navigate('/#/projecten')}
                  color="green"
                />
                <QuickActionButton
                  icon={<Plus className="w-5 h-5" />}
                  label="Uren Registreren"
                  onClick={() => navigate('/#/urenregistratie')}
                  color="purple"
                />
                <QuickActionButton
                  icon={<Plus className="w-5 h-5" />}
                  label="Nieuw Dossier"
                  onClick={() => navigate('/#/dossiers')}
                  color="orange"
                />
              </>
            )}
            <QuickActionButton
              icon={<BarChart3 className="w-5 h-5" />}
              label="Statistieken"
              onClick={() => navigate('/#/statistieken')}
              color="indigo"
            />
            <QuickActionButton
              icon={<MapPin className="w-5 h-5" />}
              label="Kaartweergave"
              onClick={() => navigate('/#/kaart')}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <QuickStatWidget
          title="Meldingen Deze Maand"
          chartType="sparkline"
          data={getMeldingenSparkline(meldingen)}
        />
        <QuickStatWidget
          title="Top 3 Categorieën"
          chartType="bar"
          data={getTopCategories(meldingen)}
        />
        <QuickStatWidget
          title="Projecten Voortgang"
          chartType="progress"
          data={getTopProjects(lopendeProjecten)}
        />
      </div>
    </div>
  );
};

// Sub-components
const KPICard: React.FC<KPICard & { onClick?: () => void }> = ({
  title,
  value,
  trend,
  icon,
  color,
  onClick,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${colorClasses[color]} p-3 rounded-lg text-white`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <TrendingUp
              className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`}
            />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

const ActivityCard: React.FC<{ activity: ActivityItem; users: User[] }> = ({
  activity,
  users,
}) => {
  const user = users.find(u => u.id === activity.userId);

  const typeIcons = {
    melding: <Activity className="w-5 h-5 text-blue-500" />,
    project: <Folder className="w-5 h-5 text-green-500" />,
    uren: <Clock className="w-5 h-5 text-purple-500" />,
    dossier: <MapPin className="w-5 h-5 text-orange-500" />,
  };

  return (
    <a
      href={activity.href}
      className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex-shrink-0">{typeIcons[activity.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {activity.title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {activity.description}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          {user && (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-5 h-5 rounded-full"
            />
          )}
          <span>{user?.name}</span>
          <span>•</span>
          <span>{formatDistance(activity.timestamp, new Date(), { locale: nl, addSuffix: true })}</span>
        </div>
      </div>
    </a>
  );
};

const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}> = ({ icon, label, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
    >
      <div className={`text-${color}-600 dark:text-${color}-400`}>{icon}</div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
    </button>
  );
};

// Helper functions
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
};

const getMeldingenSparkline = (meldingen: Melding[]): number[] => {
  // Return last 30 days counts
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return meldingen.filter(m => isSameDay(m.timestamp, date)).length;
  });
  return last30Days;
};

const getTopCategories = (meldingen: Melding[]): { label: string; value: number }[] => {
  const counts = meldingen.reduce((acc, m) => {
    acc[m.categorie] = (acc[m.categorie] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, value]) => ({ label, value }));
};

const getTopProjects = (projecten: Project[]): { label: string; value: number }[] => {
  return projecten
    .sort((a, b) => b.voortgang - a.voortgang)
    .slice(0, 3)
    .map(p => ({ label: p.titel, value: p.voortgang }));
};
```

## Analytics
```typescript
trackEvent('dashboard_viewed');
trackEvent('quick_action_clicked', { action: 'nieuwe_melding' });
trackEvent('kpi_card_clicked', { card: 'actieve_meldingen' });
```

## Testing Checklist
- [ ] KPI cards tonen correcte data
- [ ] Trend indicators juiste richting
- [ ] Recent activity realtime updates
- [ ] Quick actions navigeren correct
- [ ] Role-based visibility (Viewer geen create buttons)
- [ ] Loading states tijdens fetch
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Dark mode support
- [ ] Performance <2s load time

Succes! 🏠
