import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { CameraIcon, MapPinIcon, TrashIcon, XIcon } from './Icons';
import { MOCK_WIJKEN } from '../data/mockData';

interface FixiMeldingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIXI_CATEGORIEEN = [
  'Kapotte straatverlichting',
  'Gat in de weg',
  'Zwerfvuil',
  'Graffiti',
  'Losliggende stoeptegel',
  'Kapotte bank/speeltoestel',
  'Beschadigde verkeersborden',
  'Overig'
];

const URGENTIE_LEVELS = [
  { value: 'laag', label: 'Laag - Niet urgent', color: 'text-green-600' },
  { value: 'normaal', label: 'Normaal - Standaard', color: 'text-blue-600' },
  { value: 'hoog', label: 'Hoog - Spoedig afhandelen', color: 'text-orange-600' },
  { value: 'spoed', label: 'Spoed - Direct actie vereist', color: 'text-red-600' }
];

export const FixiMeldingModal: React.FC<FixiMeldingModalProps> = ({ isOpen, onClose }) => {
  const { addMelding, uploadFile, currentUser } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [wijk, setWijk] = useState('');
  const [categorie, setCategorie] = useState('');
  const [urgentie, setUrgentie] = useState('normaal');
  const [locatie, setLocatie] = useState<{ lat: number; lon: number } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactPersoon, setContactPersoon] = useState(currentUser?.name || '');
  const [contactTelefoon, setContactTelefoon] = useState(currentUser?.phone || '');

  const handleGetLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocatie wordt niet ondersteund door deze browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatie({ lat: position.coords.latitude, lon: position.coords.longitude });
        setError(null);
      },
      (err) => {
        setError(`Fout bij ophalen locatie: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitel('');
    setOmschrijving('');
    setWijk('');
    setCategorie('');
    setUrgentie('normaal');
    setLocatie(null);
    setAttachments([]);
    setError(null);
    setContactPersoon(currentUser?.name || '');
    setContactTelefoon(currentUser?.phone || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      // Validatie
      if (!locatie) {
        throw new Error('GPS locatie is verplicht voor Fixi meldingen');
      }

      // Upload alle bijlagen
      const attachmentURLs = await Promise.all(
        attachments.map((file) => {
          const randomId = Math.random().toString(36).substring(2);
          const filePath = `fixi-meldingen/${randomId}_${file.name}`;
          return uploadFile(file, filePath);
        })
      );

      // Maak omschrijving met extra Fixi metadata
      const fixiOmschrijving = `${omschrijving}

📋 FIXI MELDING DETAILS:
• Urgentie: ${URGENTIE_LEVELS.find(u => u.value === urgentie)?.label}
• Contactpersoon: ${contactPersoon}
• Telefoon: ${contactTelefoon}
• Categorie: ${categorie}`;

      await addMelding({
        titel: `[FIXI] ${titel}`,
        omschrijving: fixiOmschrijving,
        locatie,
        attachments: attachmentURLs,
        wijk,
        categorie,
        status: MeldingStatus.FixiMeldingGemaakt,
      });

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Aanmaken Fixi melding mislukt.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-dark-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-purple-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold">🔧 Fixi Melding Maken</h2>
              <p className="text-sm text-purple-100 mt-1">Voor spoedige gemeentelijke meldingen</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="px-4 py-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Urgentie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Urgentie *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {URGENTIE_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      urgentie === level.value
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-300 dark:border-dark-border hover:border-purple-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgentie"
                      value={level.value}
                      checked={urgentie === level.value}
                      onChange={(e) => setUrgentie(e.target.value)}
                      className="mr-3"
                    />
                    <span className={`text-sm font-medium ${level.color}`}>
                      {level.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Titel */}
            <div>
              <label htmlFor="fixi-titel" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Korte titel *
              </label>
              <input
                id="fixi-titel"
                type="text"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Bijv: Kapotte straatverlichting Parklaan"
                required
                className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Categorie */}
            <div>
              <label htmlFor="fixi-categorie" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Categorie *
              </label>
              <select
                id="fixi-categorie"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                required
                className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Kies een categorie</option>
                {FIXI_CATEGORIEEN.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Wijk */}
            <div>
              <label htmlFor="fixi-wijk" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Wijk *
              </label>
              <select
                id="fixi-wijk"
                value={wijk}
                onChange={(e) => setWijk(e.target.value)}
                required
                className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Kies een wijk</option>
                {MOCK_WIJKEN.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Omschrijving */}
            <div>
              <label htmlFor="fixi-omschrijving" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Gedetailleerde omschrijving *
              </label>
              <textarea
                id="fixi-omschrijving"
                value={omschrijving}
                onChange={(e) => setOmschrijving(e.target.value)}
                rows={4}
                placeholder="Beschrijf het probleem zo gedetailleerd mogelijk..."
                required
                className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Contactgegevens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fixi-contact-persoon" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Contactpersoon
                </label>
                <input
                  id="fixi-contact-persoon"
                  type="text"
                  value={contactPersoon}
                  onChange={(e) => setContactPersoon(e.target.value)}
                  placeholder="Naam"
                  className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label htmlFor="fixi-contact-telefoon" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Telefoonnummer
                </label>
                <input
                  id="fixi-contact-telefoon"
                  type="tel"
                  value={contactTelefoon}
                  onChange={(e) => setContactTelefoon(e.target.value)}
                  placeholder="06-12345678"
                  className="block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Locatie & Foto's */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className={`flex-1 inline-flex items-center justify-center px-4 py-3 border-2 text-sm font-medium rounded-md shadow-sm transition-all ${
                    locatie
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }`}
                >
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  {locatie ? '✓ GPS Locatie Vastgelegd' : 'GPS Locatie Opvragen *'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-purple-600 text-sm font-medium rounded-md shadow-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                >
                  <CameraIcon className="h-5 w-5 mr-2" />
                  Foto's Toevoegen ({attachments.length})
                </button>
              </div>

              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
              />

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijgevoegde foto's:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 dark:bg-dark-bg rounded-md overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>ℹ️ Let op:</strong> Fixi meldingen worden direct doorgezet naar de gemeente. 
                GPS locatie en foto's helpen bij snelle afhandeling.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-6 py-2 border border-gray-300 dark:border-dark-border text-base font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-border transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={isUploading || !locatie}
                className="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? 'Bezig met uploaden...' : '🔧 Fixi Melding Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FixiMeldingModal;
