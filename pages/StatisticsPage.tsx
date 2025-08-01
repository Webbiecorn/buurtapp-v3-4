

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import { MapContainer, TileLayer, Circle } from 'react-leaflet';

const COLORS = ['#f59e0b', '#8b5cf6', '#22c55e'];

const StatisticsPage: React.FC = () => {
  const { meldingen, urenregistraties, users, theme } = useAppContext();

  // Meldingen per wijk
  const meldingenPerWijk = meldingen.reduce((acc, m) => {
    acc[m.wijk] = (acc[m.wijk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const wijkData = Object.entries(meldingenPerWijk).map(([name, value]) => ({ name, meldingen: value }));

  // Meldingen per status
  const meldingenPerStatus = Object.values(MeldingStatus).map(status => ({
    name: status,
    value: meldingen.filter(m => m.status === status).length
  }));

  // Uren per medewerker
  const urenPerMedewerker = users.map(user => {
    const totalMillis = urenregistraties
      .filter(u => u.gebruikerId === user.id && u.eindtijd)
      .reduce((acc, curr) => acc + (new Date(curr.eindtijd!).getTime() - new Date(curr.starttijd).getTime()), 0);
    return { name: user.name, uren: totalMillis / (1000 * 60 * 60) };
  }).filter(u => u.uren > 0);

  const center: [number, number] = [52.0907, 5.1214];
  
  const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1f2937', border: '1px solid #374151' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' };

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
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Heatmap Meldingslocaties</h2>
           <div className="h-[300px] rounded-md overflow-hidden bg-gray-100 dark:bg-dark-bg flex items-center justify-center">
                <p className="text-gray-500 dark:text-dark-text-secondary">Heatmap is tijdelijk uitgeschakeld voor onderzoek.</p>
                {/*
                <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} dragging={false} scrollWheelZoom={false} doubleClickZoom={false}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {meldingen.filter(m => m.locatie).map(m => (
                       <Circle 
                          key={m.id}
                          center={[m.locatie!.lat, m.locatie!.lon]} 
                          pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }} 
                          radius={100}
                          stroke={false}
                       />
                    ))}
                </MapContainer>
                */}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;