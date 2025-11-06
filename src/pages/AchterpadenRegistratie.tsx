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
    if (beginpunt && eindpunt) {
      const afstand = calculateDistance(beginpunt, eindpunt);
      setForm(prev => ({ ...prev, lengte: afstand.toString() }));
    }
  }, [beginpunt, eindpunt]);

  const resetGPS = () => {
    setBeginpunt(null);
    setEindpunt(null);
    setForm(prev => ({ ...prev, lengte: '' }));
  };

  // Component om de route op de kaart te tekenen
  const RoutePolyline = ({ start, end }: { start: GPSCoord; end: GPSCoord }) => {
    const map = useMap();
    
    React.useEffect(() => {
      if (!map) return;
      
      // Teken lijn tussen begin en eind
      const line = new google.maps.Polyline({
        path: [start, end],
        geodesic: true,
        strokeColor: '#1d4ed8',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map
      });

      // Pas viewport aan zodat beide punten zichtbaar zijn
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(start);
      bounds.extend(end);
      map.fitBounds(bounds, 50);

      return () => {
        line.setMap(null);
      };
    }, [map, start, end]);

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
          
          {/* GPS Knoppen */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-dark-text-secondary mb-3">
              Gebruik GPS om het beginpunt en eindpunt van het achterpad vast te leggen. De lengte wordt automatisch berekend!
            </p>
            <div className="flex flex-wrap gap-2">
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
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Beginpunt vastgelegd
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    📍 Beginpunt markeren
                  </>
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
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Eindpunt vastgelegd
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    📍 Eindpunt markeren
                  </>
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
                  Reset GPS
                </button>
              )}
            </div>
            
            {/* Status weergave */}
            {(beginpunt || eindpunt) && (
              <div className="mt-3 space-y-3">
                <div className="text-sm space-y-1">
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
                  {beginpunt && eindpunt && form.lengte && (
                    <p className="text-blue-700 dark:text-blue-400 font-semibold">
                      📏 Berekende lengte: {form.lengte} meter
                    </p>
                  )}
                </div>

                {/* Interactieve kaart */}
                {beginpunt && eindpunt && (
                  <div className="border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
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
                        <RoutePolyline start={beginpunt} end={eindpunt} />
                      </Map>
                    </APIProvider>
                    <div className="bg-gray-50 dark:bg-dark-bg px-3 py-2 text-xs text-gray-600 dark:text-dark-text-secondary border-t border-gray-200 dark:border-dark-border">
                      🗺️ Route tussen begin- en eindpunt (blauwe lijn = {form.lengte}m)
                    </div>
                  </div>
                )}
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
