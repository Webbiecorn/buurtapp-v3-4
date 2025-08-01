

import React, { useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';

const getStatusPinColor = (status: MeldingStatus) => {
    switch (status) {
        case MeldingStatus.InBehandeling: return '#f59e0b'; // amber-500
        case MeldingStatus.FixiMeldingGemaakt: return '#8b5cf6'; // violet-500
        case MeldingStatus.Afgerond: return '#22c55e'; // green-500
        default: return '#6b7280'; // gray-500
    }
}

const MapPage: React.FC = () => {
    const { meldingen } = useAppContext();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const locatedMeldingen = meldingen.filter(m => m.locatie);
    const filteredMeldingen = locatedMeldingen.filter(m => statusFilter === 'all' || m.status === statusFilter);
    const center: [number, number] = [52.0907, 5.1214]; // Utrecht center

    return (
        <div className="h-[calc(100vh-128px)] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                 <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Kaartoverzicht</h1>
                 <div className="flex items-center space-x-4">
                     <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    >
                        <option value="all" className="bg-white dark:bg-dark-surface">Alle Statussen</option>
                        {Object.values(MeldingStatus).map(s => <option key={s} value={s} className="bg-white dark:bg-dark-surface">{s}</option>)}
                     </select>
                 </div>
            </div>
            <div className="flex-grow rounded-lg overflow-hidden bg-white dark:bg-dark-surface flex items-center justify-center">
                <p className="text-gray-500 dark:text-dark-text-secondary">Kaart is tijdelijk uitgeschakeld voor onderzoek.</p>
                {/*
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {filteredMeldingen.map(melding => melding.locatie && (
                        <CircleMarker
                            key={melding.id}
                            center={[melding.locatie.lat, melding.locatie.lon]}
                            pathOptions={{ 
                                color: getStatusPinColor(melding.status),
                                fillColor: getStatusPinColor(melding.status),
                                fillOpacity: 0.7
                            }}
                            radius={8}
                        >
                            <Popup>
                                <div className="text-black">
                                    <h3 className="font-bold">{melding.titel}</h3>
                                    <p>{melding.omschrijving}</p>
                                    <p className="mt-2 font-semibold">Status: {melding.status}</p>
                                    {melding.attachments[0] && <img src={melding.attachments[0]} alt={melding.titel} className="w-full h-auto object-cover mt-2 rounded" />}
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
                */}
            </div>
        </div>
    );
};

export default MapPage;