import React, { useEffect } from 'react';

type Props = {
  items: string[];
  captions?: string[];
  startIndex?: number;
  onClose: () => void;
};

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('alt=media') || url.includes('/v0/b/') || url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com');

const MediaGallery: React.FC<Props> = ({ items, captions = [], startIndex = 0, onClose }) => {
  const [index, setIndex] = React.useState(startIndex);
  const [downloading, setDownloading] = React.useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, items.length - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  useEffect(() => setIndex(startIndex), [startIndex]);

  if (!items || items.length === 0) return null;

  const getFilenameFromUrl = (url: string) => {
    try {
      const parts = url.split('/');
      const last = parts[parts.length - 1];
      return decodeURIComponent(last.split('?')[0]);
    } catch {
      return 'download';
    }
  };

  const handleDownload = async (url: string) => {
    setDownloading(true);
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Fetch failed');
      const blob = await resp.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = obj;
      const captionName = captions[index] ? `${captions[index]}` : getFilenameFromUrl(url);
      a.download = captionName || getFilenameFromUrl(url) || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
    } catch {
      // Download failed - fallback: open in new tab
      window.open(url, '_blank');
    }
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <button aria-label="Download" disabled={downloading} className="text-white bg-black/30 px-3 py-1 rounded" onClick={() => handleDownload(items[index])}>{downloading ? 'Downloading…' : 'Download'}</button>
        <button aria-label="Sluiten" className="text-white text-2xl" onClick={onClose}>×</button>
      </div>
      <button aria-label="Vorige" className="absolute left-4 text-white text-2xl" onClick={() => setIndex(i => Math.max(i - 1, 0))}>‹</button>
  <div className="max-w-[90vw] max-h-[90vh] w-full flex items-center justify-center flex-col">
        {isImage(items[index]) ? (
          // Image
          <img src={items[index]} alt={`media-${index}`} className="max-w-full max-h-full object-contain rounded" />
        ) : (
          <video controls aria-label="Media preview" className="max-w-full max-h-full rounded">
            <source src={items[index]} />
            {/* captions TODO */}
            <track kind="captions" src="" />
            Je browser ondersteunt video niet.
          </video>
        )}
        {captions[index] && (
          <div className="mt-4 text-sm text-white text-center max-w-[90vw]">{captions[index]}</div>
        )}
      </div>
      <button aria-label="Volgende" className="absolute right-4 text-white text-2xl" onClick={() => setIndex(i => Math.min(i + 1, items.length - 1))}>›</button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm">{index + 1} / {items.length}</div>
    </div>
  );
};

export default MediaGallery;
