import React from 'react';
import { AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Project, ProjectStatus } from '../types';
import { format } from 'date-fns';
import nl from 'date-fns/locale/nl';
import { BriefcaseIcon } from './Icons'; // We gebruiken een ander icoon

// Functie om de juiste kleur voor de project-pin te bepalen
const getProjectPinColor = (status: ProjectStatus) => {
    switch (status) {
        case ProjectStatus.Lopend: return { background: '#3b82f6', glyphColor: '#ffffff', borderColor: '#1d4ed8' }; // blue-500
        case ProjectStatus.Afgerond: return { background: '#16a34a', glyphColor: '#ffffff', borderColor: '#15803d' }; // green-600
        default: return { background: '#6b7280', glyphColor: '#ffffff', borderColor: '#4b5563' }; // gray-500
    }
}

interface ProjectMarkerProps {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  onClose: () => void;
}

export const ProjectMarker: React.FC<ProjectMarkerProps> = ({ project, isSelected, onClick, onClose }) => {
  // We gebruiken een willekeurige locatie in de buurt voor de demo, omdat projecten geen locatie hebben.
  // In een echte app zou een project een eigen locatieveld moeten hebben.
  const projectLocation = { lat: 52.515 + (Math.random() - 0.5) * 0.01, lng: 5.475 + (Math.random() - 0.5) * 0.01 };

  const pinStyle = getProjectPinColor(project.status);

  return (
    <>
      <AdvancedMarker
        position={projectLocation}
        onClick={onClick}
      >
        {/* We gebruiken een Pin met een ander icoon om projecten te onderscheiden */}
        <Pin 
            background={pinStyle.background} 
            glyph="💼"
            glyphColor={pinStyle.glyphColor} 
            borderColor={pinStyle.borderColor} 
        />
      </AdvancedMarker>

      {isSelected && (
        <InfoWindow
          position={projectLocation}
          onCloseClick={onClose}
        >
          <div className="p-2 text-black max-w-xs">
            <img src={project.imageUrl} alt={project.title} className="w-full h-24 object-cover rounded-md mb-2" />
            <h3 className="font-bold text-md mb-1">{project.title}</h3>
            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{project.description}</p>
            <div className="text-xs text-gray-500">
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Startdatum:</strong> {format(project.startDate, 'dd-MM-yyyy', { locale: nl })}</p>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};
