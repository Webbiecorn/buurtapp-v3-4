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
  accuracy?: number; // GPS nauwkeurigheid in meters
}

const AchterpadenRegistratie: React.FC<Props> = ({ onSuccess }) => {
  const { currentUser } = useAppContext();
  
  // Auto-detected fields (niet in formulier, alleen tonen)
  const [autoDetected, setAutoDetected] = useState({
    straat: "",
    wijk: "",
    huisnummers: "",
    lengte: 0,
  });
  
  // User input fields
  const [veiligheid, setVeiligheid] = useState({
    verlichting: "", // goed/matig/slecht/afwezig
    zichtbaarheid: "", // overzichtelijk/beperkt/onoverzichtelijk
    score: 0, // 1-5 sterren
  });
  
  const [onderhoud, setOnderhoud] = useState({
    bestrating: "", // goed/matig/slecht
    begroeiing: "", // goed/matig/verwilderd
    vervuiling: "", // schoon/gemiddeld/vervuild
    urgentie: "", // geen/laag/normaal/hoog/spoed
  });
  
  const [beschrijving, setBeschrijving] = useState("");
  const [bewonerEnquete, setBewonerEnquete] = useState(false);
  const [enquetes, setEnquetes] = useState<any[]>([]);
  
  const [beginpunt, setBeginpunt] = useState<GPSCoord | null>(null);
  const [eindpunt, setEindpunt] = useState<GPSCoord | null>(null);
  const [gpsLoading, setGpsLoading] = useState<'begin' | 'eind' | null>(null);
  
  // GPS Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Auto-pause bij stilstand
  const [routePoints, setRoutePoints] = useState<GPSCoord[]>([]);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const trackingIntervalRef = React.useRef<number | null>(null);
  const lastGoodPositionRef = React.useRef<GPSCoord | null>(null);
  
  // ✏️ Route Editor state
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalRoute, setOriginalRoute] = useState<GPSCoord[]>([]);
  const [routeHistory, setRouteHistory] = useState<GPSCoord[][]>([]);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);
  
  const [media, setMedia] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // GPS functies met accuracy filtering
  const getGPSLocation = (type: 'begin' | 'eind') => {
    if (!navigator.geolocation) {
      alert('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    setGpsLoading(type);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        
        // ⭐ ACCURACY FILTER: Alleen punten < 15m accepteren
        if (accuracy > 15) {
          alert(`GPS nauwkeurigheid te laag (${Math.round(accuracy)}m). Probeer opnieuw op een locatie met beter GPS signaal.`);
          setGpsLoading(null);
          return;
        }
        
        const coord = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: accuracy
        };
        
        if (type === 'begin') {
          setBeginpunt(coord);
          lastGoodPositionRef.current = coord;
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

  // Wijk mapping voor Lelystad
  const getWijkFromPostcode = (postcode: string): string | null => {
    if (!postcode) return null;
    const pc = postcode.replace(/\s/g, '').toUpperCase();
    const wijkMapping: Array<{name: string; min: string; max: string}> = [
      { name: 'Zuiderzeewijk', min: '8211BA', max: '8224MJ' },
      { name: 'Atolwijk', min: '8212AA', max: '8232ET' },
      { name: 'Boswijk', min: '8212DA', max: '8225VL' },
      { name: 'Waterwijk-Landerijen', min: '8219AA', max: '8226TW' },
      { name: 'Bolder', min: '8231CA', max: '8243DG' },
      { name: 'Kustwijk', min: '8231AA', max: '8243NG' },
      { name: 'Havendiep', min: '8232JA', max: '8245GN' },
      { name: 'Lelystad-Haven', min: '8243PA', max: '8245AB' },
      { name: 'Stadshart', min: '8224BX', max: '8232ZZ' },
      { name: 'Buitengebied', min: '8211AA', max: '8245AA' },
      { name: 'Warande', min: '8233HB', max: '8245MA' },
    ];
    for (const wijk of wijkMapping) {
      if (pc >= wijk.min && pc <= wijk.max) {
        return wijk.name;
      }
    }
    return null;
  };

  // Auto-detect straat, wijk en huisnummers op basis van GPS route
  const detectLocationInfo = async () => {
    if (routePoints.length < 2) return;
    
    const firstPoint = routePoints[0];
    const lastPoint = routePoints[routePoints.length - 1];
    
    try {
      // Google Geocoding voor eerste en laatste punt
      const [firstRes, lastRes] = await Promise.all([
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${firstPoint.lat},${firstPoint.lng}&key=AIzaSyBsX_16g4PTqinqJvlIblDTFA8ai7RD_I0`),
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lastPoint.lat},${lastPoint.lng}&key=AIzaSyBsX_16g4PTqinqJvlIblDTFA8ai7RD_I0`)
      ]);
      
      const [firstData, lastData] = await Promise.all([firstRes.json(), lastRes.json()]);
      
      if (firstData.results?.[0] && lastData.results?.[0]) {
        const firstAddress = firstData.results[0].address_components;
        const lastAddress = lastData.results[0].address_components;
        
        // Extract street name (route)
        const streetComp = firstAddress.find((c: any) => c.types.includes('route'));
        const street = streetComp?.long_name || '';
        
        // Extract house numbers
        const firstNum = firstAddress.find((c: any) => c.types.includes('street_number'))?.long_name || '';
        const lastNum = lastAddress.find((c: any) => c.types.includes('street_number'))?.long_name || '';
        const huisnummers = firstNum && lastNum ? `${firstNum}-${lastNum}` : (firstNum || lastNum || '');
        
        // Extract postcode for wijk detection
        const postcodeComp = firstAddress.find((c: any) => c.types.includes('postal_code'));
        const postcode = postcodeComp?.long_name || '';
        const wijk = getWijkFromPostcode(postcode) || '';
        
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

  // Automatisch lengte berekenen als route punten bekend zijn
  useEffect(() => {
    if (routePoints.length >= 2) {
      let totalDistance = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        totalDistance += calculateDistance(routePoints[i], routePoints[i + 1]);
      }
      setAutoDetected(prev => ({ ...prev, lengte: Math.round(totalDistance) }));
      
      // Trigger auto-detect van locatie info
      detectLocationInfo();
    }
  }, [routePoints]);

  // GPS Tracking functies met accuracy + movement filtering
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        
        if (accuracy > 15) {
          alert(`GPS nauwkeurigheid te laag (${Math.round(accuracy)}m). Ga naar buiten of wacht op beter signaal.`);
          return;
        }
        
        const coord = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude,
          accuracy: accuracy
        };
        
        setBeginpunt(coord);
        setRoutePoints([coord]);
        setIsTracking(true);
        setIsPaused(false);
        lastGoodPositionRef.current = coord;
        setCurrentAccuracy(accuracy);

        // Tracking elke 3 seconden (sneller voor betere detectie)
        trackingIntervalRef.current = window.setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const accuracy = pos.coords.accuracy;
              const newPoint = { 
                lat: pos.coords.latitude, 
                lng: pos.coords.longitude,
                accuracy: accuracy
              };
              
              setCurrentAccuracy(accuracy);
              
              // ⭐ ACCURACY FILTER: Slechte punten negeren
              if (accuracy > 15) {
                console.log(`Punt genegeerd: accuracy ${Math.round(accuracy)}m te hoog`);
                return;
              }
              
              // ⭐ MOVEMENT THRESHOLD: Alleen toevoegen als >5m verplaatst
              const lastPoint = lastGoodPositionRef.current;
              if (lastPoint) {
                const distance = calculateDistance(lastPoint, newPoint);
                
                // ⚡ STOP DETECTION: Als <3m in 3 seconden → stilstand
                if (distance < 3) {
                  console.log('Stilstand gedetecteerd, punt niet toegevoegd');
                  setIsPaused(true);
                  return;
                }
                
                // Alleen toevoegen als significante beweging (>5m)
                if (distance > 5) {
                  setRoutePoints(prev => [...prev, newPoint]);
                  lastGoodPositionRef.current = newPoint;
                  setIsPaused(false);
                  console.log(`Punt toegevoegd: ${Math.round(distance)}m verplaatst, accuracy ${Math.round(accuracy)}m`);
                }
              } else {
                // Eerste punt altijd toevoegen
                setRoutePoints(prev => [...prev, newPoint]);
                lastGoodPositionRef.current = newPoint;
              }
            },
            (error) => console.error('Tracking error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }, 3000); // 3 seconden interval
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
          const finalRoute = [...routePoints, coord];
          setRoutePoints(finalRoute);
          setOriginalRoute(finalRoute); // 💾 Backup voor reset
          setIsTracking(false);
        },
        () => {
          setEindpunt(routePoints[routePoints.length - 1]);
          setOriginalRoute([...routePoints]); // 💾 Backup voor reset
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
    setIsEditMode(false);
    setOriginalRoute([]);
    setRouteHistory([]);
  };

  // ✏️ Route Editor functies
  const startEditMode = () => {
    setIsEditMode(true);
    setRouteHistory([routePoints]); // Start history met huidige route
  };

  const saveEdits = () => {
    setOriginalRoute([...routePoints]); // Update backup
    setIsEditMode(false);
    setRouteHistory([]);
    setSelectedMarkerIndex(null);
  };

  const cancelEdits = () => {
    setRoutePoints([...originalRoute]); // Herstel naar laatste opgeslagen versie
    setIsEditMode(false);
    setRouteHistory([]);
    setSelectedMarkerIndex(null);
  };

  const undoLastEdit = () => {
    if (routeHistory.length > 1) {
      const newHistory = [...routeHistory];
      newHistory.pop(); // Verwijder huidige
      const previousRoute = newHistory[newHistory.length - 1];
      setRoutePoints(previousRoute);
      setRouteHistory(newHistory);
    }
  };

  const resetToOriginal = () => {
    setRoutePoints([...originalRoute]);
    setRouteHistory([originalRoute]);
  };

  const addRoutePoint = (lat: number, lng: number) => {
    if (!isEditMode) return;
    
    const newPoint: GPSCoord = { lat, lng };
    const updated = [...routePoints, newPoint];
    setRoutePoints(updated);
    setRouteHistory(prev => [...prev, updated]); // Add to history
  };

  const removeRoutePoint = (index: number) => {
    if (!isEditMode) return;
    
    const updated = routePoints.filter((_, i) => i !== index);
    setRoutePoints(updated);
    setRouteHistory(prev => [...prev, updated]);
    setSelectedMarkerIndex(null);
  };

  const updateMarkerPosition = (index: number, lat: number, lng: number) => {
    if (!isEditMode) return;
    
    const updated = [...routePoints];
    updated[index] = { ...updated[index], lat, lng };
    setRoutePoints(updated);
    setRouteHistory(prev => [...prev, updated]);
  };

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
        strokeColor: isTracking ? '#10B981' : (isEditMode ? '#9333EA' : '#1d4ed8'), // Paars in edit mode
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
  
  // ✏️ Interactieve kaart voor edit mode
  const InteractiveMap = () => {
    const map = useMap();
    
    React.useEffect(() => {
      if (!map || !isEditMode) return;
      
      // ✏️ Klik op kaart → nieuw punt toevoegen
      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          addRoutePoint(e.latLng.lat(), e.latLng.lng());
        }
      });
      
      // Verander cursor in edit mode
      map.setOptions({ draggableCursor: 'crosshair' });
      
      return () => {
        google.maps.event.removeListener(clickListener);
        map.setOptions({ draggableCursor: '' });
      };
    }, [map, isEditMode]);
    
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
    
    // Validatie: minimaal route en foto nodig
    if (routePoints.length < 2) {
      alert('Teken eerst een route op de kaart');
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

    // Upload media files to Firebase Storage
    const mediaUrls: string[] = [];
    for (const file of media) {
      const fileRef = ref(storage, `achterpaden/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      mediaUrls.push(url);
    }

    // Save form data to Firestore met nieuwe structuur
    await addDoc(collection(db, "achterpaden"), {
      // Auto-detected velden
      straat: autoDetected.straat,
      wijk: autoDetected.wijk,
      huisnummers: autoDetected.huisnummers,
      lengte: autoDetected.lengte,
      
      // GPS data
      gpsRoute: routePoints,
      
      // Veiligheid beoordeling
      veiligheid: {
        verlichting: veiligheid.verlichting,
        zichtbaarheid: veiligheid.zichtbaarheid,
        score: veiligheid.score,
      },
      
      // Onderhoud beoordeling
      onderhoud: {
        bestrating: onderhoud.bestrating,
        begroeiing: onderhoud.begroeiing,
        vervuiling: onderhoud.vervuiling,
        urgentie: onderhoud.urgentie,
      },
      
      // User input
      beschrijving: beschrijving,
      media: mediaUrls,
      
      // Bewoners enquetes (indien ingevuld)
      bewonerEnquetes: bewonerEnquete ? enquetes : [],
      
      // Medewerker info
      registeredBy: {
        userId: currentUser?.uid || '',
        userName: currentUser?.displayName || currentUser?.email || 'Onbekend',
        userRole: currentUser?.role || '',
      },
      
      createdAt: Timestamp.now(),
    });

    setUploading(false);
    setSuccess(true);
    
    // Reset formulier
    setAutoDetected({ straat: '', wijk: '', huisnummers: '', lengte: 0 });
    setVeiligheid({ verlichting: '', zichtbaarheid: '', score: 0 });
    setOnderhoud({ bestrating: '', begroeiing: '', vervuiling: '', urgentie: '' });
    setBeschrijving('');
    setBewonerEnquete(false);
    setEnquetes([]);
    setRoutePoints([]);
    setMedia([]);
    
    // Activeer overzicht-tab indien callback meegegeven
    if (onSuccess) onSuccess();
  };

  return (
    <div className="mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">Nieuw Achterpad Registreren</h1>
      
      <form className="space-y-6" onSubmit={handleSubmit}>
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
                          <div className="text-green-700 dark:text-green-400">
                            <p>✓ Beginpunt: {beginpunt.lat.toFixed(6)}, {beginpunt.lng.toFixed(6)}</p>
                            {beginpunt.accuracy && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                📊 Nauwkeurigheid: ±{Math.round(beginpunt.accuracy)}m
                              </p>
                            )}
                          </div>
                        )}
                        {eindpunt && (
                          <div className="text-green-700 dark:text-green-400">
                            <p>✓ Eindpunt: {eindpunt.lat.toFixed(6)}, {eindpunt.lng.toFixed(6)}</p>
                            {eindpunt.accuracy && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                📊 Nauwkeurigheid: ±{Math.round(eindpunt.accuracy)}m
                              </p>
                            )}
                          </div>
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
                {/* 📊 VISUAL FEEDBACK: GPS Accuracy Status */}
                {currentAccuracy !== null && (
                  <div className={`p-3 rounded-lg border-2 ${
                    currentAccuracy < 5 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                      : currentAccuracy < 10
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                      : currentAccuracy < 15
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {currentAccuracy < 5 ? '🎯' : currentAccuracy < 10 ? '📍' : currentAccuracy < 15 ? '⚠️' : '❌'}
                        </span>
                        <div>
                          <p className="font-semibold text-sm">
                            {currentAccuracy < 5 
                              ? 'Uitstekend GPS signaal' 
                              : currentAccuracy < 10
                              ? 'Goed GPS signaal'
                              : currentAccuracy < 15
                              ? 'Matig GPS signaal'
                              : 'Slecht GPS signaal'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Nauwkeurigheid: ±{Math.round(currentAccuracy)}m
                          </p>
                        </div>
                      </div>
                      {isPaused && (
                        <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                          ⏸ Stilstand
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
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
                    {/* 📊 Toon gemiddelde accuracy van route */}
                    {routePoints.some(p => p.accuracy) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        🎯 Gemiddelde nauwkeurigheid: ±
                        {Math.round(
                          routePoints
                            .filter(p => p.accuracy)
                            .reduce((sum, p) => sum + (p.accuracy || 0), 0) / 
                          routePoints.filter(p => p.accuracy).length
                        )}m
                      </p>
                    )}
                  </div>
                  
                  {/* ✏️ ROUTE EDITOR KNOP */}
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={startEditMode}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      ✏️ Route bewerken
                    </button>
                  )}
                </div>
                
                {/* ✏️ EDIT MODE TOOLBAR */}
                {isEditMode && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✏️</span>
                        <div>
                          <p className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                            Bewerk modus actief
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Klik op kaart om punten toe te voegen
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={saveEdits}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Opslaan
                      </button>
                      
                      <button
                        type="button"
                        onClick={cancelEdits}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Annuleren
                      </button>
                      
                      <button
                        type="button"
                        onClick={undoLastEdit}
                        disabled={routeHistory.length <= 1}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Undo
                      </button>
                      
                      <button
                        type="button"
                        onClick={resetToOriginal}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset
                      </button>
                    </div>
                  </div>
                )}
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
                    style={{ width: '100%', height: '400px' }}
                    gestureHandling="cooperative"
                    disableDefaultUI={isEditMode}
                  >
                    {/* Start/Einde markers (normale mode) */}
                    {!isEditMode && (
                      <>
                        <Marker position={routePoints[0]} title="Start" />
                        {!isTracking && routePoints.length > 1 && (
                          <Marker position={routePoints[routePoints.length - 1]} title="Einde" />
                        )}
                      </>
                    )}
                    
                    {/* ✏️ Bewerkbare waypoint markers (edit mode) */}
                    {isEditMode && routePoints.map((point, index) => (
                      <Marker
                        key={`waypoint-${index}`}
                        position={point}
                        title={index === 0 ? 'Start' : index === routePoints.length - 1 ? 'Einde' : `Punt ${index + 1}`}
                        draggable={true}
                        onDragEnd={(e) => {
                          if (e.latLng) {
                            updateMarkerPosition(index, e.latLng.lat(), e.latLng.lng());
                          }
                        }}
                        onClick={() => setSelectedMarkerIndex(index)}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: selectedMarkerIndex === index ? 10 : 7,
                          fillColor: selectedMarkerIndex === index ? '#EF4444' : '#9333EA',
                          fillOpacity: 1,
                          strokeColor: '#FFFFFF',
                          strokeWeight: 2
                        }}
                      />
                    ))}
                    
                    <RoutePolyline />
                    <InteractiveMap />
                  </Map>
                </APIProvider>
                <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 text-xs text-gray-600 dark:text-dark-text-secondary border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
                  <span>
                    🗺️ {isTracking ? 'Live tracking route (groene lijn)' : isEditMode ? 'Klik om punten toe te voegen • Sleep markers • Klik marker om te verwijderen' : `Vastgelegde route (${form.lengte}m)`}
                  </span>
                  {isEditMode && selectedMarkerIndex !== null && (
                    <button
                      type="button"
                      onClick={() => removeRoutePoint(selectedMarkerIndex)}
                      className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
                    >
                      ❌ Verwijder punt {selectedMarkerIndex + 1}
                    </button>
                  )}
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
