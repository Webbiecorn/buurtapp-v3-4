import { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface HeatmapLayerProps {
  data: { lat: number; lng: number }[];
}

export const HeatmapLayer = ({ data }: HeatmapLayerProps) => {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');
  const [heatmap, setHeatmap] = useState<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !visualization) return;

    // Maak een nieuwe heatmap laag aan als die nog niet bestaat
    if (!heatmap) {
      const newHeatmap = new visualization.HeatmapLayer({
        map: map,
        radius: 20, // Je kunt deze waarde aanpassen voor het effect
        opacity: 0.8,
      });
      setHeatmap(newHeatmap);
    }

    // Update de data van de heatmap
    if (heatmap) {
      const heatmapData = data.map(
        point => new google.maps.LatLng(point.lat, point.lng)
      );
      heatmap.setData(heatmapData);
    }

    // Zorg ervoor dat de heatmap wordt opgeruimd als het component verdwijnt
    return () => {
      if (heatmap) {
        heatmap.setMap(null);
      }
    };
  }, [map, visualization, data, heatmap]);

  return null; // Dit component rendert zelf niets, het werkt direct op de kaart
};
