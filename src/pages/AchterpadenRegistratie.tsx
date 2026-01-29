import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useAppContext } from '../context/AppContext';

type Props = { onSuccess?: () => void };

interface GPSCoord {
  lat: number;
  lng: number;
  accuracy?: number;
}

const AchterpadenRegistratie: React.FC<Props> = ({ onSuccess }) => {
  const { currentUser } = useAppContext();

  // Auto-detected fields
  const [autoDetected, setAutoDetected] = useState({
    straat: "",
    wijk: "",
    huisnummers: "",
    lengte: 0,
  });

  // User input fields
  const [veiligheid, setVeiligheid] = useState({
    verlichting: "",
    zichtbaarheid: "",
    score: 0,
  });

  const [onderhoud, setOnderhoud] = useState({
    bestrating: "",
    begroeiing: "",
    vervuiling: "",
    urgentie: "",
  });

  const [beschrijving, setBeschrijving] = useState("");
  const [bewonerEnquete, setBewonerEnquete] = useState(false);
  const [enquetes, setEnquetes] = useState<Array<{
    gebruikt: string;
    veiligheidScore: number;
    verbeteringen: string[];
    opmerkingen: string;
  }>>([]);

  // GPS Route state
  const [routePoints, setRoutePoints] = useState<GPSCoord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);
  const [routeHistory, setRouteHistory] = useState<GPSCoord[][]>([]);

  const trackingIntervalRef = React.useRef<number | null>(null);
  const lastGoodPositionRef = React.useRef<GPSCoord | null>(null);

  const [media, setMedia] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Refs voor camera/gallery inputs
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Wijk mapping voor Lelystad
  const getWijkFromPostcode = (postcode: string): string | null => {
    if (!postcode) return null;
    const pc = postcode.replace(/\s/g, '').toUpperCase();

    // Specifieke mapping op volgorde (meest specifiek eerst)
    const wijkMapping: Array<{name: string; min: string; max: string}> = [
      // Boswijk (8212DA - 8225VL) - specifiek voor Kamp, Wold, etc.
      { name: 'Boswijk', min: '8212DA', max: '8225VL' },
      // Atolwijk (exclusief Boswijk gebied)
      { name: 'Atolwijk', min: '8226AA', max: '8232ET' },
      { name: 'Atolwijk', min: '8212AA', max: '8212CZ' }, // Voor lagere postcodes
      // Andere wijken
      { name: 'Zuiderzeewijk', min: '8211BA', max: '8224MJ' },
      { name: 'Waterwijk-Landerijen', min: '8219AA', max: '8226TW' },
      { name: 'Bolder', min: '8231CA', max: '8243DG' },
      { name: 'Kustwijk', min: '8231AA', max: '8243NG' },
      { name: 'Havendiep', min: '8232JA', max: '8245GN' },
      { name: 'Lelystad-Haven', min: '8243PA', max: '8245AB' },
      { name: 'Stadshart', min: '8224BX', max: '8232ZZ' },
      { name: 'Warande', min: '8233HB', max: '8245MA' },
      { name: 'Buitengebied', min: '8211AA', max: '8245AA' },
    ];
    for (const wijk of wijkMapping) {
      if (pc >= wijk.min && pc <= wijk.max) {
        return wijk.name;
      }
    }
    return null;
  };

  // Haversine distance calculation
  const calculateDistance = (point1: GPSCoord, point2: GPSCoord): number => {
    const R = 6371000;
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // Auto-detect location info
  const detectLocationInfo = async () => {
    if (routePoints.length < 2) return;

    const firstPoint = routePoints[0];
    const lastPoint = routePoints[routePoints.length - 1];

    try {
      const [firstRes, lastRes] = await Promise.all([
        fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat=${firstPoint.lat}&lon=${firstPoint.lng}&rows=1`),
        fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat=${lastPoint.lat}&lon=${lastPoint.lng}&rows=1`)
      ]);

      const [firstData, lastData] = await Promise.all([firstRes.json(), lastRes.json()]);

      if (firstData.response?.docs?.[0] && lastData.response?.docs?.[0]) {
        const firstDoc = firstData.response.docs[0];
        const lastDoc = lastData.response.docs[0];

        const street = firstDoc.straatnaam || firstDoc.weergavenaam?.split(',')[0] || '';

        const firstNum = firstDoc.huisnummer || '';
        const lastNum = lastDoc.huisnummer || '';
        const huisnummers = firstNum && lastNum ? `${firstNum}-${lastNum}` : (firstNum || lastNum || '');

        const postcode = firstDoc.postcode || '';
        const wijk = getWijkFromPostcode(postcode) || firstDoc.wijk || '';

        setAutoDetected(prev => ({
          ...prev,
          straat: street,
          wijk: wijk,
          huisnummers: huisnummers,
        }));
      }
    } catch (error) {
      console.error('Auto-detect error:', error);
    }
  };

  // Auto-calculate length and detect location
  useEffect(() => {
    if (routePoints.length >= 2) {
      let totalDistance = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);
      }
      setAutoDetected(prev => ({ ...prev, lengte: Math.round(totalDistance) }));
      detectLocationInfo();
    }
  }, [routePoints]);

  // Route editor functions
  const addRoutePoint = (lat: number, lng: number) => {
    setRouteHistory([...routeHistory, routePoints]);
    setRoutePoints([...routePoints, { lat, lng }]);
  };

  const updateRoutePoint = (index: number, lat: number, lng: number) => {
    setRouteHistory([...routeHistory, routePoints]);
    const updated = [...routePoints];
    updated[index] = { lat, lng };
    setRoutePoints(updated);
  };

  const deleteRoutePoint = (index: number) => {
    setRouteHistory([...routeHistory, routePoints]);
    setRoutePoints(routePoints.filter((_, i) => i !== index));
    if (selectedMarkerIndex === index) setSelectedMarkerIndex(null);
  };

  const undoRoute = () => {
    if (routeHistory.length > 0) {
      const previous = routeHistory[routeHistory.length - 1];
      setRoutePoints(previous);
      setRouteHistory(routeHistory.slice(0, -1));
    }
  };

  const resetRoute = () => {
    if (window.confirm('Weet je zeker dat je de route wilt verwijderen?')) {
      setRouteHistory([...routeHistory, routePoints]);
      setRoutePoints([]);
    }
  };

  // GPS Tracking functies
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    setIsTracking(true);
    setIsPaused(false);

    // Start interval voor GPS tracking
    trackingIntervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          setCurrentAccuracy(accuracy);

          // Alleen punten met goede accuracy accepteren (< 15m)
          if (accuracy > 15) {
            console.log('GPS nauwkeurigheid te laag:', accuracy);
            return;
          }

          const newPoint: GPSCoord = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: accuracy
          };

          // Check of we bewogen zijn (minimaal 3 meter van vorig punt)
          const lastPoint = lastGoodPositionRef.current;
          if (lastPoint) {
            const distance = calculateDistance(lastPoint, newPoint);
            if (distance < 3) {
              setIsPaused(true);
              return; // Te weinig beweging, sla punt over
            }
          }

          setIsPaused(false);
          lastGoodPositionRef.current = newPoint;
          setRoutePoints(prev => [...prev, newPoint]);
        },
        (error) => {
          console.error('GPS error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }, 3000); // Check elke 3 seconden
  };

  const stopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
  };

  // Cleanup tracking bij unmount
  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const openCamera = () => cameraInputRef.current?.click();
  const openGallery = () => galleryInputRef.current?.click();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setMedia([...media, ...Array.from(e.target.files)]);
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const addBewonerEnquete = () => {
    setEnquetes([...enquetes, {
      gebruikt: '',
      veiligheidScore: 0,
      verbeteringen: [],
      opmerkingen: ''
    }]);
  };

  const updateEnquete = (index: number, field: string, value: any) => {
    const updated = [...enquetes];
    updated[index] = { ...updated[index], [field]: value };
    setEnquetes(updated);
  };

  const removeEnquete = (index: number) => {
    setEnquetes(enquetes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stop tracking als actief
    if (isTracking) {
      stopTracking();
    }

    // Validatie
    if (routePoints.length < 2) {
      alert('Teken eerst een route op de kaart (minimaal 2 punten)');
      return;
    }

    if (media.length === 0) {
      alert('Minimaal 1 foto is verplicht voor registratie.');
      return;
    }

    if (!onderhoud.urgentie) {
      alert('Selecteer een urgentie niveau.');
      return;
    }
    if (media.length === 0) {
      alert('Voeg minimaal 1 foto toe');
      return;
    }
    if (!veiligheid.verlichting || !veiligheid.zichtbaarheid || veiligheid.score === 0) {
      alert('Vul alle veiligheidsvelden in');
      return;
    }
    if (!onderhoud.bestrating || !onderhoud.begroeiing || !onderhoud.vervuiling || !onderhoud.urgentie) {
      alert('Vul alle onderhoudsvelden in');
      return;
    }

    setUploading(true);
    setSuccess(false);

    try {
      // Upload media
      const mediaUrls: string[] = [];
      for (const file of media) {
        const fileRef = ref(storage, `achterpaden/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        mediaUrls.push(url);
      }

      // Save to Firestore
      await addDoc(collection(db, "achterpaden"), {
        // Auto-detected
        straat: autoDetected.straat,
        wijk: autoDetected.wijk,
        huisnummers: autoDetected.huisnummers,
        lengte: autoDetected.lengte,

        // GPS
        gpsRoute: routePoints,

        // Veiligheid
        veiligheid: {
          verlichting: veiligheid.verlichting,
          zichtbaarheid: veiligheid.zichtbaarheid,
          score: veiligheid.score,
        },

        // Onderhoud
        onderhoud: {
          bestrating: onderhoud.bestrating,
          begroeiing: onderhoud.begroeiing,
          vervuiling: onderhoud.vervuiling,
          urgentie: onderhoud.urgentie,
        },

        // Extra info
        beschrijving: beschrijving,
        media: mediaUrls,
        bewonerEnquetes: bewonerEnquete ? enquetes : [],

        // Medewerker
        registeredBy: {
          userId: currentUser?.id || '',
          userName: currentUser?.name || currentUser?.email || 'Onbekend',
          userRole: currentUser?.role || '',
        },

        createdAt: Timestamp.now(),
      });

      setUploading(false);
      setSuccess(true);

      // Reset
      setAutoDetected({ straat: '', wijk: '', huisnummers: '', lengte: 0 });
      setVeiligheid({ verlichting: '', zichtbaarheid: '', score: 0 });
      setOnderhoud({ bestrating: '', begroeiing: '', vervuiling: '', urgentie: '' });
      setBeschrijving('');
      setBewonerEnquete(false);
      setEnquetes([]);
      setRoutePoints([]);
      setRouteHistory([]);
      setMedia([]);
      setIsEditMode(false);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Er ging iets mis bij het opslaan. Probeer opnieuw.');
      setUploading(false);
    }
  };

  // Helper components
  const ChoiceButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
        active
          ? 'bg-brand-primary text-white shadow-md'
          : 'bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg'
      }`}
    >
      {children}
    </button>
  );

  const StarRating: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-3xl transition-all hover:scale-110"
        >
          {star <= value ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );

  // Polyline component voor route weergave
  const RoutePolyline: React.FC = () => {
    const map = useMap();

    useEffect(() => {
      if (!map || !window.google || routePoints.length < 2) return;

      const polyline = new window.google.maps.Polyline({
        path: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: isTracking ? '#10B981' : '#3B82F6', // Groen tijdens tracking, blauw bij handmatig
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
      });

      return () => {
        polyline.setMap(null);
      };
    }, [map, routePoints, isTracking]);

    return null;
  };

  // Click listener voor route editor
  const MapClickHandler: React.FC = () => {
    const map = useMap();

    useEffect(() => {
      if (!map || !isEditMode) return;

      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          addRoutePoint(e.latLng.lat(), e.latLng.lng());
        }
      });

      map.setOptions({ draggableCursor: 'crosshair' });

      return () => {
        google.maps.event.removeListener(clickListener);
        map.setOptions({ draggableCursor: '' });
      };
    }, [map, isEditMode]);

    return null;
  };

  const centerMap = routePoints.length > 0
    ? routePoints[Math.floor(routePoints.length / 2)]
    : { lat: 52.5083, lng: 5.4750 }; // Lelystad centrum

  return (
    <div className="mx-auto p-4 sm:p-6 max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">
        📍 Nieuw Achterpad Registreren
      </h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* STAP 1: GPS Route Tekenen */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            🗺️ Stap 1: Teken de Route
          </h2>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {/* GPS Tracking knoppen */}
              {!isTracking ? (
                <button
                  type="button"
                  onClick={startTracking}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  📍 Start GPS Tracking
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTracking}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isPaused
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {isPaused ? '⏸️ Gepauzeerd (sta stil)' : '🟢 Tracking actief'}
                </button>
              )}

              {/* Manual edit mode knop */}
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                disabled={isTracking}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isEditMode
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-dark-text-secondary'
                } ${isTracking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isEditMode ? '✏️ Bewerken actief' : '✏️ Handmatig bewerken'}
              </button>

              {routePoints.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={undoRoute}
                    disabled={routeHistory.length === 0 || isTracking}
                    className="px-4 py-2 bg-gray-200 dark:bg-dark-border rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    ↶ Ongedaan maken
                  </button>
                  <button
                    type="button"
                    onClick={resetRoute}
                    disabled={isTracking}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    🗑️ Reset route
                  </button>
                </>
              )}
            </div>

            {/* GPS Info */}
            {isTracking && (
              <div className={`text-sm p-3 rounded-lg ${
                isPaused
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              }`}>
                {isPaused ? (
                  <>⏸️ GPS tracking gepauzeerd - begin met lopen om door te gaan</>
                ) : (
                  <>🟢 GPS tracking actief - blijf lopen! (Nauwkeurigheid: {currentAccuracy ? Math.round(currentAccuracy) + 'm' : '...'}) {routePoints.length} punten</>
                )}
              </div>
            )}

            <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-dark-border">
              <APIProvider apiKey="AIzaSyBsX_16g4PTqinqJvlIblDTFA8ai7RD_I0">
                <Map
                  defaultCenter={centerMap}
                  defaultZoom={15}
                  mapId="achterpaden-registratie"
                  gestureHandling="greedy"
                >
                  <RoutePolyline />
                  <MapClickHandler />

                  {routePoints.map((point, idx) => (
                    <Marker
                      key={idx}
                      position={{ lat: point.lat, lng: point.lng }}
                      draggable={isEditMode}
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          updateRoutePoint(idx, e.latLng.lat(), e.latLng.lng());
                        }
                      }}
                      onClick={() => {
                        if (isEditMode && window.confirm('Dit punt verwijderen?')) {
                          deleteRoutePoint(idx);
                        }
                      }}
                      label={{
                        text: (idx + 1).toString(),
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    />
                  ))}
                </Map>
              </APIProvider>
            </div>

            <div className="text-sm text-gray-600 dark:text-dark-text-secondary bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              💡 <strong>Twee manieren om route te tekenen:</strong>
              <ul className="mt-2 ml-4 space-y-1">
                <li><strong>GPS Tracking:</strong> Loop het pad af, GPS volgt automatisch (beste kwaliteit)</li>
                <li><strong>Handmatig:</strong> Klik punten op de kaart, sleep markers om aan te passen</li>
              </ul>
              {isEditMode && (
                <div className="mt-2 text-xs">
                  ✏️ Bewerken actief: Klik om punten toe te voegen • Sleep markers • Klik marker om te verwijderen
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto-detected Info Box */}
        {routePoints.length >= 2 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">📍 Automatisch Gedetecteerd:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Straat:</span> {autoDetected.straat || 'Detecteren...'}
              </div>
              <div>
                <span className="font-medium">Wijk:</span> {autoDetected.wijk || 'Detecteren...'}
              </div>
              <div>
                <span className="font-medium">Huisnummers:</span> {autoDetected.huisnummers || 'Detecteren...'}
              </div>
              <div>
                <span className="font-medium">Lengte:</span> {autoDetected.lengte} meter
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-700 dark:text-blue-400">
              👤 Geregistreerd door: {currentUser?.name || currentUser?.email || 'Onbekend'}
            </div>
          </div>
        )}

        {/* STAP 2: Veiligheid Beoordeling */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            🛡️ Stap 2: Veiligheid Beoordeling
          </h2>

          <div className="space-y-6">
            {/* Verlichting */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Verlichting
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={veiligheid.verlichting === 'goed'} onClick={() => setVeiligheid({...veiligheid, verlichting: 'goed'})}>
                  💡 Goed
                </ChoiceButton>
                <ChoiceButton active={veiligheid.verlichting === 'voldoende'} onClick={() => setVeiligheid({...veiligheid, verlichting: 'voldoende'})}>
                  ✅ Voldoende
                </ChoiceButton>
                <ChoiceButton active={veiligheid.verlichting === 'matig'} onClick={() => setVeiligheid({...veiligheid, verlichting: 'matig'})}>
                  🔆 Matig
                </ChoiceButton>
                <ChoiceButton active={veiligheid.verlichting === 'slecht'} onClick={() => setVeiligheid({...veiligheid, verlichting: 'slecht'})}>
                  🌑 Slecht
                </ChoiceButton>
                <ChoiceButton active={veiligheid.verlichting === 'geen'} onClick={() => setVeiligheid({...veiligheid, verlichting: 'geen'})}>
                  ⚫ Geen
                </ChoiceButton>
              </div>
            </div>

            {/* Zichtbaarheid */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Zichtbaarheid
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={veiligheid.zichtbaarheid === 'goed_overzichtelijk'} onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: 'goed_overzichtelijk'})}>
                  👁️ Goed overzichtelijk
                </ChoiceButton>
                <ChoiceButton active={veiligheid.zichtbaarheid === 'voldoende'} onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: 'voldoende'})}>
                  👀 Voldoende
                </ChoiceButton>
                <ChoiceButton active={veiligheid.zichtbaarheid === 'matig'} onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: 'matig'})}>
                  👓 Matig
                </ChoiceButton>
                <ChoiceButton active={veiligheid.zichtbaarheid === 'slecht'} onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: 'slecht'})}>
                  🙈 Slecht
                </ChoiceButton>
                <ChoiceButton active={veiligheid.zichtbaarheid === 'zeer_slecht'} onClick={() => setVeiligheid({...veiligheid, zichtbaarheid: 'zeer_slecht'})}>
                  🚫 Zeer slecht
                </ChoiceButton>
              </div>
            </div>

            {/* Algehele Veiligheid */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Algehele Veiligheid (1-5 sterren)
              </label>
              <StarRating value={veiligheid.score} onChange={(v) => setVeiligheid({...veiligheid, score: v})} />
            </div>
          </div>
        </div>

        {/* STAP 3: Onderhoud Beoordeling */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            🔧 Stap 3: Onderhoud Beoordeling
          </h2>

          <div className="space-y-6">
            {/* Bestrating */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Staat Bestrating
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={onderhoud.bestrating === 'goed'} onClick={() => setOnderhoud({...onderhoud, bestrating: 'goed'})}>
                  ✅ Goed
                </ChoiceButton>
                <ChoiceButton active={onderhoud.bestrating === 'voldoende'} onClick={() => setOnderhoud({...onderhoud, bestrating: 'voldoende'})}>
                  👍 Voldoende
                </ChoiceButton>
                <ChoiceButton active={onderhoud.bestrating === 'matig'} onClick={() => setOnderhoud({...onderhoud, bestrating: 'matig'})}>
                  ⚠️ Matig
                </ChoiceButton>
                <ChoiceButton active={onderhoud.bestrating === 'vervangen'} onClick={() => setOnderhoud({...onderhoud, bestrating: 'vervangen'})}>
                  ❌ Vervangen
                </ChoiceButton>
              </div>
            </div>

            {/* Begroeiing */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Begroeiing
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={onderhoud.begroeiing === 'goed_verzorgd'} onClick={() => setOnderhoud({...onderhoud, begroeiing: 'goed_verzorgd'})}>
                  🌳 Goed verzorgd
                </ChoiceButton>
                <ChoiceButton active={onderhoud.begroeiing === 'voldoende'} onClick={() => setOnderhoud({...onderhoud, begroeiing: 'voldoende'})}>
                  🌿 Voldoende
                </ChoiceButton>
                <ChoiceButton active={onderhoud.begroeiing === 'overlast'} onClick={() => setOnderhoud({...onderhoud, begroeiing: 'overlast'})}>
                  🌾 Overlast
                </ChoiceButton>
                <ChoiceButton active={onderhoud.begroeiing === 'verwijderen'} onClick={() => setOnderhoud({...onderhoud, begroeiing: 'verwijderen'})}>
                  🪓 Verwijderen
                </ChoiceButton>
              </div>
            </div>

            {/* Vervuiling */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Vervuiling / Afval
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={onderhoud.vervuiling === 'schoon'} onClick={() => setOnderhoud({...onderhoud, vervuiling: 'schoon'})}>
                  ✨ Schoon
                </ChoiceButton>
                <ChoiceButton active={onderhoud.vervuiling === 'licht_vervuild'} onClick={() => setOnderhoud({...onderhoud, vervuiling: 'licht_vervuild'})}>
                  🍂 Licht vervuild
                </ChoiceButton>
                <ChoiceButton active={onderhoud.vervuiling === 'vervuild'} onClick={() => setOnderhoud({...onderhoud, vervuiling: 'vervuild'})}>
                  🗑️ Vervuild
                </ChoiceButton>
                <ChoiceButton active={onderhoud.vervuiling === 'zwaar_vervuild'} onClick={() => setOnderhoud({...onderhoud, vervuiling: 'zwaar_vervuild'})}>
                  🚮 Zwaar vervuild
                </ChoiceButton>
              </div>
            </div>

            {/* Urgentie */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Urgentie Onderhoud *
              </label>
              <div className="flex flex-wrap gap-2">
                <ChoiceButton active={onderhoud.urgentie === 'geen'} onClick={() => setOnderhoud({...onderhoud, urgentie: 'geen'})}>
                  ⚪ Geen
                </ChoiceButton>
                <ChoiceButton active={onderhoud.urgentie === 'laag'} onClick={() => setOnderhoud({...onderhoud, urgentie: 'laag'})}>
                  🟢 Laag
                </ChoiceButton>
                <ChoiceButton active={onderhoud.urgentie === 'normaal'} onClick={() => setOnderhoud({...onderhoud, urgentie: 'normaal'})}>
                  🟡 Normaal
                </ChoiceButton>
                <ChoiceButton active={onderhoud.urgentie === 'hoog'} onClick={() => setOnderhoud({...onderhoud, urgentie: 'hoog'})}>
                  🟠 Hoog
                </ChoiceButton>
                <ChoiceButton active={onderhoud.urgentie === 'spoed'} onClick={() => setOnderhoud({...onderhoud, urgentie: 'spoed'})}>
                  🔴 Spoed
                </ChoiceButton>
              </div>
            </div>
          </div>
        </div>

        {/* STAP 4: Foto's & Opmerkingen */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            📸 Stap 4: Foto's & Opmerkingen
          </h2>

          <div className="space-y-4">
            {/* Foto Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Foto's * (minimaal 1 verplicht)
              </label>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleMediaChange}
                className="hidden"
                multiple
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
                multiple
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition"
                >
                  📷 Foto maken
                </button>
                <button
                  type="button"
                  onClick={openGallery}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 text-gray-700 dark:text-dark-text-primary rounded-lg font-medium transition"
                >
                  🖼️ Bestanden kiezen
                </button>
              </div>

              {media.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {media.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded border-2 border-gray-200 dark:border-dark-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opmerkingen */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-dark-text-secondary">
                Extra Opmerkingen (optioneel)
              </label>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                rows={4}
                placeholder="Aanvullende informatie over het achterpad..."
                className="w-full border rounded-lg p-3 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border"
              />
            </div>
          </div>
        </div>

        {/* STAP 5: Bewoner Enquête (optioneel) */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
              👥 Stap 5: Bewoner Input (optioneel)
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bewonerEnquete}
                onChange={(e) => setBewonerEnquete(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Bewoners gesproken?</span>
            </label>
          </div>

          {bewonerEnquete && (
            <div className="space-y-4">
              {enquetes.map((enquete, idx) => (
                <div key={idx} className="border-2 border-gray-200 dark:border-dark-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Bewoner {idx + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeEnquete(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Verwijderen
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Gebruikt u dit pad regelmatig?</label>
                      <div className="flex gap-2">
                        <ChoiceButton
                          active={enquete.gebruikt === 'ja'}
                          onClick={() => updateEnquete(idx, 'gebruikt', 'ja')}
                        >
                          Ja
                        </ChoiceButton>
                        <ChoiceButton
                          active={enquete.gebruikt === 'soms'}
                          onClick={() => updateEnquete(idx, 'gebruikt', 'soms')}
                        >
                          Soms
                        </ChoiceButton>
                        <ChoiceButton
                          active={enquete.gebruikt === 'nee'}
                          onClick={() => updateEnquete(idx, 'gebruikt', 'nee')}
                        >
                          Nee
                        </ChoiceButton>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Veiligheidsgevoel (1-5 sterren)</label>
                      <StarRating
                        value={enquete.veiligheidScore}
                        onChange={(v) => updateEnquete(idx, 'veiligheidScore', v)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Wat kan er verbeterd worden?</label>
                      <div className="flex flex-wrap gap-2">
                        {['verlichting', 'bestrating', 'begroeiing', 'afval', 'anders'].map(opt => (
                          <ChoiceButton
                            key={opt}
                            active={enquete.verbeteringen.includes(opt)}
                            onClick={() => {
                              const current = enquete.verbeteringen;
                              const updated = current.includes(opt)
                                ? current.filter(v => v !== opt)
                                : [...current, opt];
                              updateEnquete(idx, 'verbeteringen', updated);
                            }}
                          >
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </ChoiceButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Extra opmerkingen</label>
                      <textarea
                        value={enquete.opmerkingen}
                        onChange={(e) => updateEnquete(idx, 'opmerkingen', e.target.value)}
                        rows={2}
                        className="w-full border rounded p-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary border-gray-300 dark:border-dark-border"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {enquetes.length < 3 && (
                <button
                  type="button"
                  onClick={addBewonerEnquete}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg text-gray-600 dark:text-dark-text-secondary hover:border-brand-primary hover:text-brand-primary transition"
                >
                  + Bewoner toevoegen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={uploading || routePoints.length < 2}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg shadow-lg transition-all disabled:cursor-not-allowed"
          >
            {uploading ? '⏳ Opslaan...' : '✅ Achterpad Registreren'}
          </button>

          {success && (
            <div className="text-green-600 dark:text-green-400 font-semibold">
              ✓ Succesvol opgeslagen!
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AchterpadenRegistratie;
