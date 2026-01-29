import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { getWijkFromPostcode } from '../utils/wijkMapping';
import { formatSafe } from '../utils/dateHelpers';

interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
  straat: string;
  huisnummer?: string;
  wijk: string;
  postcode: string;
}

interface FixiLog {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  location?: GPSLocation;
  note?: string;
}

const FixiIntegration: React.FC = () => {
  const { currentUser } = useAppContext();
  const [showIframe, setShowIframe] = useState(false); // Start met registraties view
  const [iframeError, setIframeError] = useState(true); // Fixi staat geen iframes toe
  const [logs, setLogs] = useState<FixiLog[]>([]);
  const [note, setNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // GPS Modal state
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  // Get GPS location and reverse geocode
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS is niet beschikbaar op dit apparaat');
      return;
    }

    setIsGettingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log('GPS Positie:', lat, lng, 'Nauwkeurigheid:', accuracy);

        // Gebruik PDOK Locatieserver (gratis Nederlandse geocoding service)
        try {
          const response = await fetch(
            `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat=${lat}&lon=${lng}&rows=1`
          );
          const data = await response.json();

          console.log('PDOK response:', data);

          if (data.response && data.response.docs && data.response.docs.length > 0) {
            const doc = data.response.docs[0];

            console.log('PDOK document:', doc);
            console.log('Alle beschikbare velden:', Object.keys(doc));

            // Parse adres uit PDOK response - probeer meerdere velden
            const straat = doc.straatnaam || doc.weergavenaam?.split(',')[0] || doc.type || 'Onbekende locatie';
            const huisnummer = doc.huisnummer ? String(doc.huisnummer) : undefined;
            const postcode = doc.postcode || '';
            const woonplaats = doc.woonplaatsnaam || 'Lelystad';

            // Wijk bepalen via postcode of via woonplaats
            let wijk = getWijkFromPostcode(postcode);
            if (wijk === 'Onbekend' && doc.wijk) {
              wijk = doc.wijk;
            }

            console.log('Parsed address:', { straat, huisnummer, postcode, wijk, woonplaats, docType: doc.type });

            setGpsLocation({
              lat,
              lng,
              accuracy: Math.round(accuracy),
              straat,
              huisnummer,
              wijk,
              postcode
            });
            setIsGettingGPS(false);
          } else {
            console.error('Geen docs in PDOK response');
            setGpsError('Kon geen adresgegevens vinden voor deze locatie');
            setIsGettingGPS(false);
          }
        } catch (error) {
          console.error('PDOK error:', error);
          setGpsError('Fout bij ophalen adresgegevens: ' + (error as Error).message);
          setIsGettingGPS(false);
        }
      },
      (error) => {
        console.error('GPS error:', error);
        let errorMsg = 'Kon GPS locatie niet bepalen. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Locatietoegang geweigerd.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Locatie niet beschikbaar.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Timeout - probeer het opnieuw.';
            break;
          default:
            errorMsg += 'Onbekende fout.';
        }
        setGpsError(errorMsg);
        setIsGettingGPS(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const loadLogs = async () => {
    try {
      const q = query(collection(db, 'fixiLogs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FixiLog));
      setLogs(logsData);
    } catch (error) {
      console.error('Fout bij laden Fixi logs:', error);
    }
  };

  const handleLogFixiMelding = async () => {
    if (!currentUser || !gpsLocation) return;

    setIsLogging(true);
    try {
      // Clean location object: verwijder undefined waarden
      const cleanLocation: any = {
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
        accuracy: gpsLocation.accuracy,
        straat: gpsLocation.straat,
        wijk: gpsLocation.wijk,
        postcode: gpsLocation.postcode
      };

      // Voeg huisnummer alleen toe als het bestaat
      if (gpsLocation.huisnummer) {
        cleanLocation.huisnummer = gpsLocation.huisnummer;
      }

      const logData: any = {
        timestamp: Timestamp.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        location: cleanLocation
      };

      // Voeg note alleen toe als het bestaat
      if (note.trim()) {
        logData.note = note.trim();
      }

      await addDoc(collection(db, 'fixiLogs'), logData);

      setNote('');
      setGpsLocation(null);
      setShowGPSModal(false);
      await loadLogs();
      alert('✅ Fixi melding geregistreerd!');
    } catch (error) {
      console.error('Fout bij registreren Fixi melding:', error);
      alert('❌ Er ging iets mis bij het registreren');
    } finally {
      setIsLogging(false);
    }
  };

  const openGPSModal = () => {
    setShowGPSModal(true);
    setGpsLocation(null);
    setGpsError(null);
    setNote('');
  };

  const closeGPSModal = () => {
    setShowGPSModal(false);
    setGpsLocation(null);
    setGpsError(null);
    setNote('');
  };

  const handleIframeError = () => {
    setIframeError(true);
    setShowIframe(false);
  };

  return (
    <div className="space-y-6">
      {/* Statistieken Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🔧 Fixi Meldingen</h2>
            <p className="text-purple-100">Externe meldingen via Fixi.nl</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{logs.length}</div>
            <div className="text-purple-100 text-sm">Totaal geregistreerd</div>
          </div>
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-3 items-center">
        <button
          onClick={() => setShowIframe(true)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showIframe
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          📱 Fixi Website
        </button>
        <button
          onClick={() => setShowIframe(false)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !showIframe
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          📊 Registraties
        </button>
      </div>

      {/* Iframe Weergave */}
      {showIframe && !iframeError && (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b dark:border-dark-border">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              ℹ️ Dit is de officiële Fixi website. Je kunt hier direct meldingen maken.
              <strong> Vergeet niet om hieronder je melding te registreren!</strong>
            </p>
          </div>
          <div className="relative" style={{ height: '70vh' }}>
            <iframe
              src="https://www.fixi.nl/#/lelystad/issue/new+map"
              className="w-full h-full border-0"
              title="Fixi Meldingen"
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>
      )}

      {/* Fallback als iframe niet werkt */}
      {iframeError && showIframe && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Fixi website kan niet worden weergegeven
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            De Fixi website staat iframes niet toe. Je kunt Fixi in een nieuw tabblad openen.
          </p>
          <a
            href="https://www.fixi.nl/#/lelystad/issue/new+map"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors gap-2"
          >
            🔧 Open Fixi in nieuw tabblad
          </a>
        </div>
      )}

      {/* Registratie Sectie */}
      {!showIframe && (
        <div className="space-y-6">
          {/* Registreer nieuwe melding */}
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              ➕ Nieuwe Fixi Melding Registreren
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Heb je een melding gemaakt via Fixi? Registreer het hier met GPS locatie zodat we het kunnen bijhouden in onze statistieken.
            </p>

            <div className="flex gap-3">
              <button
                onClick={openGPSModal}
                disabled={!currentUser}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                📍 Registreer Melding
              </button>
              <a
                href="https://www.fixi.nl/#/lelystad/issue/new+map"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-center"
              >
                🔧 Open Fixi
              </a>
            </div>
          </div>

          {/* GPS Modal */}
          {showGPSModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    📍 Fixi Melding Registreren
                  </h3>

                  {!gpsLocation ? (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Klik op de knop hieronder om je huidige GPS locatie vast te leggen.
                      </p>

                      {gpsError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                          ⚠️ {gpsError}
                        </div>
                      )}

                      <button
                        onClick={getGPSLocation}
                        disabled={isGettingGPS}
                        className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
                      >
                        {isGettingGPS ? '🔍 GPS Zoeken...' : '📍 GPS Positie Vastleggen'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                          ✅ GPS Locatie Vastgelegd
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">📍 Locatie: </span>
                          {gpsLocation.huisnummer
                            ? `ter hoogte van ${gpsLocation.straat} ${gpsLocation.huisnummer}`
                            : gpsLocation.straat
                          }
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notitie (optioneel)
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Bijv: Lantaarnpaal kapot, Zwerfvuil, Losliggende stoeptegel..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleLogFixiMelding}
                          disabled={isLogging}
                          className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {isLogging ? '⏳ Opslaan...' : '✅ Opslaan'}
                        </button>
                        <button
                          onClick={() => setGpsLocation(null)}
                          disabled={isLogging}
                          className="px-6 py-3 bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                          🔄 Opnieuw
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={closeGPSModal}
                    disabled={isLogging}
                    className="w-full px-6 py-2 bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Geschiedenis */}
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              📋 Registratie Geschiedenis
            </h3>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>Nog geen Fixi meldingen geregistreerd</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {log.userName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatSafe(log.timestamp, 'dd-MM-yyyy HH:mm', '—')}
                      </div>
                    </div>

                    {log.location && (
                      <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">📍 Locatie: </span>
                        {log.location.huisnummer
                          ? `ter hoogte van ${log.location.straat} ${log.location.huisnummer}`
                          : log.location.straat
                        }
                      </div>
                    )}

                    {log.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        💬 {log.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FixiIntegration;
