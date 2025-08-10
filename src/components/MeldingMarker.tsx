import React from 'react';
import { AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Melding, MeldingStatus } from '../types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale/nl';

// Functie om de juiste kleur voor de pin te bepalen
const getStatusPinColor = (status: MeldingStatus) => {
    switch (status) {
        case MeldingStatus.InBehandeling: return { background: '#f59e0b', glyphColor: '#ffffff', borderColor: '#b45309' }; // amber-500
        case MeldingStatus.FixiMeldingGemaakt: return { background: '#8b5cf6', glyphColor: '#ffffff', borderColor: '#6d28d9' }; // violet-500
        case MeldingStatus.Afgerond: return { background: '#22c55e', glyphColor: '#ffffff', borderColor: '#15803d' }; // green-500
        default: return { background: '#6b7280', glyphColor: '#ffffff', borderColor: '#4b5563' }; // gray-500
    }
}

interface MeldingMarkerProps {
  melding: Melding;
  isSelected: boolean;
  onClick: () => void;
  onClose: () => void;
}

export const MeldingMarker: React.FC<MeldingMarkerProps> = ({ melding, isSelected, onClick, onClose }) => {
  if (!melding.locatie) return null;

  const pinStyle = getStatusPinColor(melding.status);

  return (
    <>
      <AdvancedMarker
        position={{ lat: melding.locatie.lat, lng: melding.locatie.lon }}
        onClick={onClick}
      >
        <Pin 
            background={pinStyle.background} 
            glyphColor={pinStyle.glyphColor} 
            borderColor={pinStyle.borderColor} 
        />
      </AdvancedMarker>

      {isSelected && (
        <InfoWindow
          position={{ lat: melding.locatie.lat, lng: melding.locatie.lon }}
          onCloseClick={onClose}
        >
          <div className="p-2 text-black max-w-xs">
            {melding.attachments[0] && <img src={melding.attachments[0]} alt={melding.titel} className="w-full h-24 object-cover rounded-md mb-2" />}
            <h3 className="font-bold text-md mb-1">{melding.titel}</h3>
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{melding.omschrijving}</p>
            <div className="text-xs text-gray-500">
                <p><strong>Status:</strong> {melding.status}</p>
                <p><strong>Wijk:</strong> {melding.wijk}</p>
                <p><strong>Datum:</strong> {format(melding.timestamp, 'dd-MM-yyyy', { locale: nl })}</p>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};
