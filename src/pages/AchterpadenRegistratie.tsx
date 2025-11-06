import React, { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';

type Props = { onSuccess?: () => void };

interface GPSCoord {
  lat: number;
  lng: number;
}

const AchterpadenRegistratie: React.FC<Props> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    straat: "",
    wijk: "",
    beschrijving: "",
    typePad: "",
    lengte: "",
    breedte: "",
    eigendom: "",
    toegankelijk: "",
    staat: "",
    obstakels: "",
  });
  const [beginpunt, setBeginpunt] = useState<GPSCoord | null>(null);
  const [eindpunt, setEindpunt] = useState<GPSCoord | null>(null);
  const [gpsLoading, setGpsLoading] = useState<'begin' | 'eind' | null>(null);
  
  // GPS Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [routePoints, setRoutePoints] = useState<GPSCoord[]>([]);
  const trackingIntervalRef = React.useRef<number | null>(null);
  
  const [paden, setPaden] = useState<Array<{ naam: string; huisnummers: string }>>([
    { naam: "Pad 1", huisnummers: "" }
  ]);
  const [media, setMedia] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRadio = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMedia([...media, ...Array.from(e.target.files)]);
  };

  // Refs voor de verschillende file inputs
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  // GPS functies
  const getGPSLocation = (type: 'begin' | 'eind') => {
    if (!navigator.geolocation) {
      alert('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    setGpsLoading(type);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coord = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        if (type === 'begin') {
          setBeginpunt(coord);
        } else {
          setEindpunt(coord);
        }
        
        setGpsLoading(null);
      },
      (error) => {
        console.error('GPS error:', error);
        alert(`GPS locatie kon niet worden bepaald: ${error.message}`);
        setGpsLoading(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Bereken afstand tussen twee GPS punten (Haversine formule)
  const calculateDistance = (point1: GPSCoord, point2: GPSCoord): number => {
    const R = 6371000; // Aarde radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Afstand in meters
  };

  // Automatisch lengte berekenen als beide punten bekend zijn
  React.useEffect(() => {
    // Als tracking actief is, bereken route lengte
    if (routePoints.length >= 2) {
      let totalDistance = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);
      }
      setForm(prev => ({ ...prev, lengte: totalDistance.toString() }));
    }
    // Anders gebruik handmatige begin/eindpunt
    else if (beginpunt && eindpunt && !isTracking) {
      const afstand = calculateDistance(beginpunt, eindpunt);
      setForm(prev => ({ ...prev, lengte: afstand.toString() }));
    }
  }, [beginpunt, eindpunt, routePoints, isTracking]);

  // GPS Tracking functies
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coord = { lat: position.coords.latitude, lng: position.coords.longitude };
        setBeginpunt(coord);
        setRoutePoints([coord]);
        setIsTracking(true);

        // Tracking elke 5 seconden
        trackingIntervalRef.current = window.setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const newPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setRoutePoints(prev => [...prev, newPoint]);
            },
            (error) => console.error('Tracking error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }, 5000);
      },
      (error) => alert(`GPS kon niet worden bepaald: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    if (routePoints.length > 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coord = { lat: position.coords.latitude, lng: position.coords.longitude };
          setEindpunt(coord);
          setRoutePoints(prev => [...prev, coord]);
          setIsTracking(false);
        },
        () => {
          setEindpunt(routePoints[routePoints.length - 1]);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setIsTracking(false);
    }
  };

  const addWaypoint = () => {
    if (!isTracking) {
      alert('Start eerst GPS tracking');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coord = { lat: position.coords.latitude, lng: position.coords.longitude };
        setRoutePoints(prev => [...prev, coord]);
      },
      () => alert('Kon waypoint niet toevoegen'),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const resetTracking = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }
    setBeginpunt(null);
    setEindpunt(null);
    setRoutePoints([]);
    setIsTracking(false);
  };

  // Cleanup bij unmount
  // Cleanup bij unmount
  React.useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const resetGPS = () => {
    setBeginpunt(null);
    setEindpunt(null);
    setForm(prev => ({ ...prev, lengte: '' }));
  };

  // Component om de route op de kaart te tekenen
  const RoutePolyline = () => {
    const map = useMap();
    
    React.useEffect(() => {
      if (!map) return;
      
      // Gebruik route points als die beschikbaar zijn, anders begin/eindpunt
      const path = routePoints.length >= 2 
        ? routePoints 
        : (beginpunt && eindpunt ? [beginpunt, eindpunt] : []);
      
      if (path.length < 2) return;
      
      // Teken lijn door alle punten
      const line = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: isTracking ? '#10B981' : '#1d4ed8', // Groen tijdens tracking
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map
      });

      // Pas viewport aan zodat alle punten zichtbaar zijn
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, 50);

      return () => {
        line.setMap(null);
      };
    }, [map, beginpunt, eindpunt, routePoints, isTracking]);

    return null;
  };

  // print action intentionally removed (unused)

  const handlePadChange = (idx: number, field: "naam" | "huisnummers", value: string) => {
    setPaden(paden => paden.map((pad, i) => i === idx ? { ...pad, [field]: value } : pad));
  };

  const handleAddPad = () => {
    setPaden([...paden, { naam: `Pad ${paden.length + 1}`, huisnummers: "" }]);
  };

  const handleRemovePad = (idx: number) => {
    setPaden(paden => paden.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setSuccess(false);

    // Upload media files to Firebase Storage
    const mediaUrls: string[] = [];
    for (const file of media) {
      const fileRef = ref(storage, `achterpaden/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      mediaUrls.push(url);
    }

    // Save form data to Firestore
    await addDoc(collection(db, "achterpaden"), {
      ...form,
      paden,
      media: mediaUrls,
      gpsBeginpunt: beginpunt,
      gpsEindpunt: eindpunt,
      gpsRoute: routePoints.length > 0 ? routePoints : null,
      createdAt: Timestamp.now(),
    });

    setUploading(false);
    setSuccess(true);
    setForm({
      straat: "",
      wijk: "",
      beschrijving: "",
      typePad: "",
      lengte: "",
      breedte: "",
      eigendom: "",
      toegankelijk: "",
      staat: "",
      obstakels: "",
    });
    setBeginpunt(null);
    setEindpunt(null);
    setRoutePoints([]);
    setMedia([]);
    setPaden([{ naam: "Pad 1", huisnummers: "" }]);
    
    // Activeer overzicht-tab indien callback meegegeven
    if (onSuccess) onSuccess();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-xl shadow print:bg-white print:shadow-none print:p-0">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary">Achterpaden registratie</h1>
  <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
        {/* Locatie */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Locatie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="straat" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Straatnaam</label>
              <input id="straat" name="straat" value={form.straat} onChange={handleChange} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
            <div className="space-y-2">
              <label htmlFor="wijk" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Wijk</label>
              <input id="wijk" name="wijk" value={form.wijk} onChange={handleChange} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
          </div>
          {/* Huisnummers worden nu per pad toegevoegd, zie dynamische paden hierboven */}
        </div>
        {/* Pad details */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Pad details</h2>
          <div className="space-y-4">
            {paden.map((pad, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label htmlFor={`pad-naam-${idx}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Pad naam</label>
                  <input id={`pad-naam-${idx}`} value={pad.naam} onChange={e => handlePadChange(idx, "naam", e.target.value)} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`pad-huisnummers-${idx}`} className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Huisnummers grenzend aan dit pad</label>
                  <input id={`pad-huisnummers-${idx}`} value={pad.huisnummers} onChange={e => handlePadChange(idx, "huisnummers", e.target.value)} className="mt-1 border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
                </div>
                {paden.length > 1 && (
                  <div className="col-span-2 text-right">
                    <button type="button" onClick={() => handleRemovePad(idx)} className="text-red-600 hover:underline text-sm">Pad verwijderen</button>
                  </div>
                )}
              </div>
            ))}
            <div>
              <button type="button" onClick={handleAddPad} className="px-4 py-1 bg-brand-primary text-white rounded shadow hover:bg-brand-primary/90">Pad toevoegen</button>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="beschrijving" className="text-gray-700 dark:text-dark-text-secondary">Beschrijving van het achterpad</label>
            <textarea id="beschrijving" name="beschrijving" value={form.beschrijving} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
          </div>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "enkel"} onChange={() => handleRadio("typePad", "enkel")} /> Enkel pad</label>
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "doorlopend"} onChange={() => handleRadio("typePad", "doorlopend")} /> Doorlopende paden</label>
            <label className="flex items-center gap-2"><input type="radio" name="typePad" checked={form.typePad === "aangrenzend"} onChange={() => handleRadio("typePad", "aangrenzend")} /> Aangrenzende paden</label>
          </div>
        </div>
        {/* GPS Locatie & Afmetingen */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">📍 GPS Locatie & Afmetingen</h2>
          
          {/* GPS Tracking */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
                🚶 Start GPS tracking en loop het achterpad af. De route wordt automatisch vastgelegd!
              </p>
              {routePoints.length > 0 && !isTracking && (
                <button
                  type="button"
                  onClick={resetTracking}
                  className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  🔄 Reset
                </button>
              )}
            </div>

            {/* Tracking niet gestart */}
            {!isTracking && routePoints.length === 0 && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startTracking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  🚶 Start GPS Tracking
                </button>
                
                {/* Fallback: Handmatige GPS knoppen */}
                <details className="mt-3">
                  <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                    Of markeer handmatig begin/eindpunt
                  </summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => getGPSLocation('begin')}
                      disabled={gpsLoading !== null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        beginpunt 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-brand-primary hover:bg-brand-primary/90 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {gpsLoading === 'begin' ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Bezig...
                        </>
                      ) : beginpunt ? (
                        <>✓ Beginpunt</>
                      ) : (
                        <>📍 Beginpunt</>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => getGPSLocation('eind')}
                      disabled={gpsLoading !== null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        eindpunt 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-brand-primary hover:bg-brand-primary/90 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {gpsLoading === 'eind' ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Bezig...
                        </>
                      ) : eindpunt ? (
                        <>✓ Eindpunt</>
                      ) : (
                        <>🏁 Eindpunt</>
                      )}
                    </button>
                    
                    {(beginpunt || eindpunt) && (
                      <button
                        type="button"
                        onClick={resetGPS}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-border dark:hover:bg-dark-bg text-gray-700 dark:text-dark-text-primary rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                      </button>
                    )}
                    
                    {/* Status weergave handmatige punten */}
                    {(beginpunt || eindpunt) && (
                      <div className="w-full mt-2 text-sm space-y-1">
                        {beginpunt && (
                          <p className="text-green-700 dark:text-green-400">
                            ✓ Beginpunt: {beginpunt.lat.toFixed(6)}, {beginpunt.lng.toFixed(6)}
                          </p>
                        )}
                        {eindpunt && (
                          <p className="text-green-700 dark:text-green-400">
                            ✓ Eindpunt: {eindpunt.lat.toFixed(6)}, {eindpunt.lng.toFixed(6)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Tracking actief */}
            {isTracking && (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-500 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        Tracking actief
                      </span>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {routePoints.length} punt{routePoints.length !== 1 ? 'en' : ''}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={stopTracking}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      🛑 Stop Tracking
                    </button>
                    <button
                      type="button"
                      onClick={addWaypoint}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      ➕ Waypoint
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking voltooid */}
            {!isTracking && routePoints.length > 0 && (
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-green-700 dark:text-green-400 font-semibold mb-2">
                    ✓ Route vastgelegd!
                  </p>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>📍 {routePoints.length} GPS punt{routePoints.length !== 1 ? 'en' : ''} opgenomen</p>
                    {form.lengte && (
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        📏 Totale lengte: {form.lengte} meter
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Kaart weergave (tijdens of na tracking) */}
            {routePoints.length >= 2 && (
              <div className="mt-3 border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={routePoints[0]}
                    defaultZoom={16}
                    mapId={import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID}
                    style={{ width: '100%', height: '300px' }}
                    gestureHandling="cooperative"
                  >
                    <Marker position={routePoints[0]} title="Start" />
                    {!isTracking && routePoints.length > 1 && (
                      <Marker position={routePoints[routePoints.length - 1]} title="Einde" />
                    )}
                    <RoutePolyline />
                  </Map>
                </APIProvider>
                <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 text-xs text-gray-600 dark:text-dark-text-secondary border-t border-gray-200 dark:border-dark-border">
                  🗺️ {isTracking ? 'Live tracking route (groene lijn)' : `Vastgelegde route (${form.lengte}m)`}
                </div>
              </div>
            )}

            {/* Kaart voor handmatige begin/eindpunt */}
            {routePoints.length === 0 && beginpunt && eindpunt && (
              <div className="mt-3 border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <Map
                    defaultCenter={beginpunt}
                    defaultZoom={16}
                    mapId={import.meta.env.VITE_GOOGLE_MAP_LIGHT_ID}
                    style={{ width: '100%', height: '300px' }}
                    gestureHandling="cooperative"
                  >
                    <Marker position={beginpunt} title="Beginpunt" />
                    <Marker position={eindpunt} title="Eindpunt" />
                    <RoutePolyline />
                  </Map>
                </APIProvider>
                <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 text-xs text-gray-600 dark:text-dark-text-secondary border-t border-gray-200 dark:border-dark-border">
                  🗺️ Route tussen begin- en eindpunt (blauwe lijn = {form.lengte}m)
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lengte" className="text-gray-700 dark:text-dark-text-secondary">
                Lengte (meters) {beginpunt && eindpunt ? '- automatisch berekend' : '- handmatig'}
              </label>
              <input 
                id="lengte" 
                name="lengte" 
                value={form.lengte} 
                onChange={handleChange}
                readOnly={!!(beginpunt && eindpunt)}
                className={`border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border ${
                  beginpunt && eindpunt ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                placeholder={beginpunt && eindpunt ? 'Automatisch berekend' : 'Schatting in meters'}
              />
            </div>
            <div>
              <label htmlFor="breedte" className="text-gray-700 dark:text-dark-text-secondary">Breedte (geschat in meters)</label>
              <input id="breedte" name="breedte" value={form.breedte} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
            </div>
          </div>
        </div>
        {/* Eigendom & Toegankelijkheid */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Eigendom & Toegankelijkheid</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
            {/* Eigendom */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Eigendom</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "huur"} onChange={() => handleRadio("eigendom", "huur")} />
                  Huur
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "particulier"} onChange={() => handleRadio("eigendom", "particulier")} />
                  Particulier
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="eigendom" checked={form.eigendom === "huur_en_particulier"} onChange={() => handleRadio("eigendom", "huur_en_particulier")} />
                  Huur en Particulier
                </label>
              </div>
            </div>
            {/* Toegankelijkheid */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Toegankelijkheid</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="toegankelijk" checked={form.toegankelijk === "ja"} onChange={() => handleRadio("toegankelijk", "ja")} /> Toegankelijk</label>
                <label className="flex items-center gap-2"><input type="radio" name="toegankelijk" checked={form.toegankelijk === "nee"} onChange={() => handleRadio("toegankelijk", "nee")} /> Niet toegankelijk</label>
              </div>
            </div>
            {/* Staat */}
            <div>
              <div className="font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">Staat van het pad</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "goed"} onChange={() => handleRadio("staat", "goed")} />
                  <span>Goed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "matig"} onChange={() => handleRadio("staat", "matig")} />
                  <span>Matig</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="staat" checked={form.staat === "slecht"} onChange={() => handleRadio("staat", "slecht")} />
                  <span>Slecht</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* Obstakels */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Obstakels of bijzonderheden</h2>
          <label htmlFor="obstakels" className="text-gray-700 dark:text-dark-text-secondary">Obstakels of bijzonderheden</label>
          <textarea id="obstakels" name="obstakels" value={form.obstakels} onChange={handleChange} className="border rounded w-full p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border" />
        </div>
        {/* Media */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-brand-primary dark:text-brand-primary">Foto&apos;s/Filmpjes toevoegen</h2>
          
          {/* Hidden file inputs */}
          <input 
            ref={cameraInputRef}
            type="file" 
            accept="image/*,video/*" 
            capture="environment"
            multiple 
            onChange={handleMediaChange} 
            className="hidden" 
          />
          <input 
            ref={galleryInputRef}
            type="file" 
            accept="image/*,video/*" 
            multiple 
            onChange={handleMediaChange} 
            className="hidden" 
          />
          
          {/* Visible buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={openCamera}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Foto maken
            </button>
            <button
              type="button"
              onClick={openGallery}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-border dark:hover:bg-dark-bg text-gray-700 dark:text-dark-text-primary rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Bestanden kiezen
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {media.map((file, idx) =>
              file.type.startsWith("image/") ? (
                <div key={idx} className="relative group">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-20 object-cover rounded border border-gray-200 dark:border-dark-border" />
                  <span className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">{file.name}</span>
                </div>
              ) : (
                <div key={idx} className="relative group">
                  <video controls aria-label="Bijlage video" className="h-20 w-20 rounded border border-gray-200 dark:border-dark-border">
                    <source src={URL.createObjectURL(file)} type={file.type} />
                    {/* captions TODO */}
                    <track kind="captions" src="" />
                  </video>
                  <span className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100">{file.name}</span>
                </div>
              )
            )}
          </div>
        </div>
        {/* Acties */}
        <div className="flex items-center gap-4 mt-8">
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow print:hidden transition"
          >
            {uploading ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
        {success && (
          <div className="mt-4 text-green-700 dark:text-green-400 font-semibold">
            Formulier succesvol opgeslagen!
          </div>
        )}
      </form>
    </div>
  );
};

export default AchterpadenRegistratie;
