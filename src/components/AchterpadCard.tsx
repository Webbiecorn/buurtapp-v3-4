import React from 'react';

type Props = {
  registratie: any;
  onSelect: (r: any) => void;
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  return /(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('alt=media') || url.includes('/v0/b/') || url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com');
};

const truncate = (s: string | undefined, n = 100) => {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

const AchterpadCard: React.FC<Props> = ({ registratie, onSelect }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const getFilename = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      return decodeURIComponent(last.split('?')[0]);
    } catch {
      return 'download';
    }
  };

  const handleDownload = async (url: string | undefined) => {
    if (!url) return;
    try {
      setToast({ type: 'success', message: 'Download gestart...' });
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Fetch failed');
      const blob = await resp.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = obj;
      a.download = getFilename(url) || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
      setToast({ type: 'success', message: 'Download voltooid' });
      setTimeout(() => setToast(null), 1800);
    } catch {
      // Download failed
      setToast({ type: 'error', message: 'Download mislukt, open in nieuwe tab...' });
      setTimeout(() => setToast(null), 2500);
      window.open(url, '_blank');
    }
  };
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadAll = async (urls: string[]) => {
    if (!urls || urls.length === 0) return;
    setDownloading(true);
    setToast({ type: 'success', message: `Downloading ${urls.length} bestanden...` });
    for (const u of urls) {
      try {
        // reuse handleDownload but avoid repeated toasts per item
        const resp = await fetch(u, { mode: 'cors' });
        if (!resp.ok) throw new Error('Fetch failed');
        const blob = await resp.blob();
        const obj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = obj;
        a.download = getFilename(u) || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(obj);
      } catch {
        // Error downloading
      }
    }
    setDownloading(false);
    setToast({ type: 'success', message: 'Alle downloads gestart' });
    setTimeout(() => setToast(null), 1800);
  };
  const baseMedia = Array.isArray(registratie.media) ? registratie.media : [];
  const updateMedia = Array.isArray(registratie.updates)
    ? registratie.updates.flatMap((u: any) => Array.isArray(u.attachments) ? u.attachments : [])
    : [];
  // unieke reeks met eerst media uit hoofdveld, dan updates
  const media = Array.from(new Set([...baseMedia, ...updateMedia]));
  const firstImage = media.find((m: string) => isImageUrl(m));
  const updatesCount = Array.isArray(registratie.updates) ? registratie.updates.length : 0;
  const padCount = Array.isArray(registratie.paden) ? registratie.paden.length : 0;
  const lastUpdate = updatesCount > 0 ? registratie.updates[registratie.updates.length - 1] : null;

  return (
    <>
    <button onClick={() => onSelect(registratie)} className="group text-left p-3 bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-gray-200 dark:border-dark-border hover:shadow-md transition flex gap-3 w-full relative">
      <div className="w-20 h-20 bg-gray-100 dark:bg-dark-surface rounded overflow-hidden flex-shrink-0">
        {firstImage ? (
          <img src={firstImage} alt={registratie.straat || 'afbeelding'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">📷</div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold text-brand-primary">{registratie.straat} - {registratie.wijk}</div>
            <div className="text-sm text-gray-600 dark:text-dark-text-secondary">{truncate(registratie.beschrijving, 120)}</div>
          </div>
          <div className="flex items-start gap-2">
            {updatesCount > 0 && (
              <div className="bg-brand-primary text-white text-xs px-2 py-1 rounded-md">{updatesCount} updates</div>
            )}
            <div className="relative">
              <button
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                aria-label="menu"
                title="Meer opties"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border rounded shadow z-20">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onSelect(registratie);
                    }}
                  >
                    Open
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      const first = (registratie.media || [])[0];
                      handleDownload(first);
                    }}
                  >
                    Download afbeelding
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      const all = Array.isArray(registratie.media) ? registratie.media : [];
                      handleDownloadAll(all.filter(Boolean));
                    }}
                    disabled={downloading}
                  >
                    Download alle media
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-secondary">
          <div>Aantal paden: {padCount}</div>
          <div>{registratie.createdAt?.seconds ? new Date(registratie.createdAt.seconds * 1000).toLocaleDateString() : ''}</div>
        </div>
        {lastUpdate && (
          <div className="mt-2 text-xs text-gray-500">Laatste update: {lastUpdate.timestamp ? (lastUpdate.timestamp.seconds ? new Date(lastUpdate.timestamp.seconds * 1000).toLocaleString() : new Date(lastUpdate.timestamp).toLocaleString()) : ''}</div>
        )}
      </div>
    </button>
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg ${toast?.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast?.message}
        </div>
      )}
    </>
  );
};

export default AchterpadCard;
