import { useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

// Definieer een simpeler type voor de locatiedata, omdat we de volledige `Locatie` interface niet nodig hebben.
interface HeatmapPoint {
    lat: number;
    lng: number;
}

// Deze component rendert niets, maar voegt de heatmap-laag toe aan de kaart.
export const HeatmapLayer = ({ data }: { data: HeatmapPoint[] }) => {
    const map = useMap();

    useEffect(() => {
        // Wacht tot de kaart en de visualisatiebibliotheek geladen zijn.
        if (!map || !google.maps.visualization) {
            return;
        }
        
        // Maak een nieuwe heatmap-laag aan met de data en configuratie.
        const heatmapLayer = new google.maps.visualization.HeatmapLayer({
            map: map,
            data: data.map(loc => new google.maps.LatLng(loc.lat, loc.lng)),
            radius: 20, // De grootte van de invloed van elk datapunt
            opacity: 0.8, // De doorzichtigheid van de laag
            // Een kleurengradient van doorzichtig blauw naar vol rood
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        });

        // Cleanup-functie: verwijder de heatmap-laag als de component verdwijnt.
        return () => {
            heatmapLayer.setMap(null);
        };
    }, [map, data]); // Voer dit effect opnieuw uit als de kaart of de data verandert.

    // Deze component hoeft zelf niets te renderen.
    return null;
};
