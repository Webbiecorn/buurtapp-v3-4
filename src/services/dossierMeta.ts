// Lightweight enrichment for WoningDossier using PDOK Locatieserver (no key).
// - Fills woningType if missing based on verblijfsobject.gebruiksdoel
// - Returns energyLabel as null (placeholder) — requires EP-Online/other source.

export interface DossierMeta {
  woningType?: string | null;
  bagId?: string | null; // nummeraanduiding_id
  location?: { lat: number; lon: number } | null;
}

const PDOK_FREE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

// Try to get nummeraanduiding id and coordinates from an address string
async function resolveAdresToNummeraanduidingId(adres: string): Promise<{ naId: string | null; location: { lat: number; lon: number } | null }> {
  const q = encodeURIComponent(adres);
  const url = `${PDOK_FREE}?fq=type:adres&q=${q}&rows=1`;
  const data = await fetchJson(url);
  const doc = data?.response?.docs?.[0];
  if (!doc) return { naId: null, location: null };
  // For 'adres' type, the id is usually the nummeraanduiding id
  const naId: string | null = doc.id || doc.nummeraanduiding_id || null;
  // Parse coordinates from 'centroide_ll' e.g., "POINT(4.899 52.372)" -> lon, lat
  let location: { lat: number; lon: number } | null = null;
  const point = doc.centroide_ll as string | undefined;
  if (point) {
    const m = /POINT\(([-0-9.]+) ([-0-9.]+)\)/.exec(point);
    if (m) {
      const lon = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) location = { lat, lon };
    }
  }
  return { naId, location };
}

// With nummeraanduiding_id, find verblijfsobject and its gebruiksdoel
async function getWoningTypeFromPDOK(naId: string): Promise<string | null> {
  // Query verblijfsobject by nummeraanduiding_id
  const url = `${PDOK_FREE}?fq=type:verblijfsobject&fq=nummeraanduiding_id:${encodeURIComponent(naId)}&rows=1`;
  const data = await fetchJson(url);
  const doc = data?.response?.docs?.[0];
  const gebruiksdoel = doc?.gebruiksdoel as string | string[] | undefined;
  if (!gebruiksdoel) return null;
  const gd = Array.isArray(gebruiksdoel) ? gebruiksdoel : [gebruiksdoel];
  // Map BAG gebruiksdoel to a friendly woning type (coarse)
  if (gd.includes('woonfunctie')) return 'Woonfunctie';
  if (gd.includes('logiesfunctie')) return 'Logies';
  if (gd.includes('bijeenkomstfunctie')) return 'Bijeenkomst';
  return gd[0] || null;
}


function normalize(str?: string | null) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
function onlyAlnum(str: string) {
  return (str || '').replace(/[^a-z0-9]/gi, '');
}
function buildAddressKey(
  straat: string,
  huisnummer: string,
  toevoeging: string,
  postcode: string,
  woonplaats: string
) {
  const s = normalize(straat);
  const nr = onlyAlnum(huisnummer.toString());
  const tv = onlyAlnum(toevoeging);
  const pc = onlyAlnum(postcode);
  const wp = normalize(woonplaats);
  return [s, nr, tv, pc, wp].filter(Boolean).join('|');
}

export async function fetchDossierMeta(adres: string): Promise<DossierMeta> {
  try {
  const { naId, location } = await resolveAdresToNummeraanduidingId(adres);
    let woningType: string | null = null;
    if (naId) {
      woningType = await getWoningTypeFromPDOK(naId);
    }
  return { woningType, bagId: naId, location };
  } catch (e) {
    console.warn('fetchDossierMeta failed', e);
  return { woningType: null, bagId: null, location: null };
  }
}
