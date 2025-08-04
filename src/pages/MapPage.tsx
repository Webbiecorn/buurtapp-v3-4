import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Melding, MeldingStatus } from '../types';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';

// De sleutels zijn nu direct ingevuld
const GOOGLE_MAPS_API_KEY = 'AIzaSyD9BrD8NTc5cynkTNL9PPfcp-A76Kb8o3Q';
const GOOGLE_MAP_ID = 'a685a3b57e7894f1a94dffc2'; // Uw correcte Map ID

// Functie om de kleur van de pin te bepalen op basis van de status
const getStatusPinColor = (status: MeldingStatus) => {
    switch (status) {
        case MeldingStatus.InBehandeling: return '#f59e0b'; // amber-500
        case MeldingStatus.FixiMeldingGemaakt: return '#8b5cf6'; // violet-500
        case MeldingStatus.Afgerond: return '#22c55e'; // green-500
        default: return '#6b7280'; // gray-500
    }
};

const MapPage: React.FC = () => {
    const { meldingen } = useAppContext();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    // State om bij te houden welke infowindow (popup) open is
    const [openInfoWindow, setOpenInfoWindow] = useState<string | null>(null);
    
    // Filter de meldingen die een locatie hebben
    const locatedMeldingen = meldingen.filter(m => m.locatie && m.locatie.lat && m.locatie.lon);
    // Filter op de geselecteerde status
    const filteredMeldingen = locatedMeldingen.filter(m => statusFilter === 'all' || m.status === statusFilter);
    // Definieer het centrum van de kaart
    const center = { lat: 52.0907, lng: 5.1214 }; // Utrecht center

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
            <div className="flex-grow rounded-lg overflow-hidden">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <Map
                        defaultCenter={center}
                        defaultZoom={13}
                        mapId={GOOGLE_MAP_ID} // Hier wordt uw eigen kaartstijl geladen
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        defaultTilt={0}
                    >
                        {filteredMeldingen.map(melding => (
                            <AdvancedMarker
                                key={melding.id}
                                position={{ lat: melding.locatie!.lat, lng: melding.locatie!.lon }}
                                onClick={() => setOpenInfoWindow(melding.id)}
                            >
                                <Pin 
                                    background={getStatusPinColor(melding.status)}
                                    borderColor={'#FFF'}
                                    glyphColor={'#FFF'}
                                />
                            </AdvancedMarker>
                        ))}

                        {openInfoWindow && (
                            <InfoWindow
                                position={{ 
                                    lat: filteredMeldingen.find(m => m.id === openInfoWindow)!.locatie!.lat, 
                                    lng: filteredMeldingen.find(m => m.id === openInfoWindow)!.locatie!.lon 
                                }}
                                onCloseClick={() => setOpenInfoWindow(null)}
                            >
                                <div className="p-2 max-w-xs text-black">
                                    <h3 className="font-bold text-base mb-1">{filteredMeldingen.find(m => m.id === openInfoWindow)!.titel}</h3>
                                    <p className="text-sm mb-2">{filteredMeldingen.find(m => m.id === openInfoWindow)!.omschrijving}</p>
                                    <span style={{
                                        backgroundColor: getStatusPinColor(filteredMeldingen.find(m => m.id === openInfoWindow)!.status),
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                    }}>
                                        {filteredMeldingen.find(m => m.id === openInfoWindow)!.status}
                                    </span>
                                </div>
                            </InfoWindow>
                        )}
                    </Map>
                </APIProvider>
            </div>
        </div>
    );
};

export default MapPage;
