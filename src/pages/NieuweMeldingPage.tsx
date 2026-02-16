import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { MeldingStatus } from '../types';
import { CameraIcon, MapPinIcon, TrashIcon } from '../components/Icons';
import { MOCK_WIJKEN } from '../data/mockData';
import { validate, createMeldingSchema } from '../utils/validation';

const NieuweMeldingPage: React.FC = () => {
  const { addMelding, uploadFile } = useAppContext();
  const navigate = useNavigate();

  const [titel, setTitel] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [wijk, setWijk] = useState('');
  const [locatie, setLocatie] = useState<any>(null);
  const [status, setStatus] = useState<MeldingStatus>(MeldingStatus.InBehandeling);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGetLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocatie wordt niet ondersteund door deze browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatie({ lat: position.coords.latitude, lon: position.coords.longitude });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Zod validatie
    const validation = validate(createMeldingSchema, {
      titel,
      omschrijving,
      wijk,
      locatie,
      categorie: 'Overig',
      status,
    });

    if (!validation.success) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsUploading(true);

    try {
      // Upload alle bijlagen en verzamel de urls
      const attachmentURLs = await Promise.all(
        attachments.map((file) => {
          const randomId = Math.random().toString(36).substring(2);
          const filePath = `meldingen/${randomId}_${file.name}`;
          return uploadFile(file, filePath);
        })
      );

      await addMelding({
        titel,
        omschrijving,
        locatie,
        attachments: attachmentURLs,
        wijk,
        categorie: 'Overig',
        status,
      });

  // Veilig navigeren terug naar overzicht (HashRouter verwacht een pad zonder #)
  navigate('/issues');
    } catch (err: any) {
      setError(err?.message || 'Aanmaken melding mislukt.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Nieuwe Melding</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white dark:bg-dark-surface p-4 sm:p-6 rounded-lg shadow">
        {error && (
          <div className="px-4 py-2 rounded bg-red-600 text-white text-sm">{error}</div>
        )}

        <div className="space-y-2">
          <label htmlFor="nm-title" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Titel</label>
          <input
            id="nm-title"
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>

        <div>
          <label htmlFor="nm-wijk" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Wijk</label>
          <select
            id="nm-wijk"
            value={wijk}
            onChange={(e) => setWijk(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
          >
            <option value="" disabled>Kies een wijk</option>
            {MOCK_WIJKEN.map((w) => (
              <option key={w} value={w} className="bg-white dark:bg-dark-surface">
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nm-status" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Status</label>
          <select
            id="nm-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MeldingStatus)}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
          >
            {Object.values(MeldingStatus).map((s) => (
              <option key={s} value={s} className="bg-white dark:bg-dark-surface">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="nm-description" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Omschrijving</label>
          <textarea
            id="nm-description"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            rows={4}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:space-x-4 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
            >
              <CameraIcon className="h-5 w-5 mr-2" /> Foto/Bestand
            </button>
            <button
              type="button"
              onClick={handleGetLocation}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
            >
              <MapPinIcon className="h-5 w-5 mr-2" /> GPS Locatie
            </button>
          </div>

          <input
            id="nm-files"
            ref={fileInputRef}
            className="hidden"
            type="file"
            multiple
            accept="image/*,application/pdf,video/*"
            onChange={handleFileChange}
          />

          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Bijlagen:</p>
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-dark-bg rounded-md">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(index)} className="text-red-500 hover:text-red-400">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate('/issues')}
            className="mr-3 inline-flex items-center px-6 py-2 border border-gray-300 dark:border-dark-border text-base font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-100 dark:hover:bg-dark-border"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
          >
            {isUploading ? 'Bezig met uploaden...' : 'Melding Aanmaken'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NieuweMeldingPage;
