// Lightweight enrichment for WoningDossier using PDOK Locatieserver (no key).
// - Fills woningType if missing based on verblijfsobject.gebruiksdoel
// - Returns energyLabel as null (placeholder) — requires EP-Online/other source.

export interface DossierMeta {
  woningType?: string | null;
  energieLabel?: string | null;
  bagId?: string | null; // nummeraanduiding_id
}

const PDOK_FREE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

// Try to get nummeraanduiding id from an address string
async function resolveAdresToNummeraanduidingId(adres: string): Promise<string | null> {
  const q = encodeURIComponent(adres);
  const url = `${PDOK_FREE}?fq=type:adres&q=${q}&rows=1`;
  const data = await fetchJson(url);
  const doc = data?.response?.docs?.[0];
  if (!doc) return null;
  // For 'adres' type, the id is usually the nummeraanduiding id
  return doc.id || doc.nummeraanduiding_id || null;
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

// Placeholder: energy labels typically come from EP-Online (RVO). Often requires API/token or preprocessing.
async function getEnergieLabelForAdres(_adres: string): Promise<string | null> {
  try {
    // We must reconstruct the normalized address key by asking PDOK for parts.
    const q = encodeURIComponent(_adres);
    const data = await fetchJson(`${PDOK_FREE}?fq=type:adres&q=${q}&rows=1`);
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    const straat = doc.straatnaam || doc.weergavenaam || '';
    const huisnummer = String(doc.huisnummer || '');
    const toevoeging = doc.huisnummertoevoeging || doc.huisletter || '';
    const postcode = (doc.postcode || '').toString();
    const woonplaats = doc.woonplaatsnaam || '';
    const key = buildAddressKey(straat, huisnummer, toevoeging, postcode, woonplaats);
    // Lazy import Firestore client to avoid bundling issues in non-browser contexts
    const { db } = await import('../firebase');
    const { doc: fsDoc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(fsDoc(db, 'energyLabels', key));
    if (snap.exists()) {
      const label = (snap.data() as any)?.label as string | undefined;
      return label || null;
    }
    return null;
  } catch {
    return null;
  }
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
    const naId = await resolveAdresToNummeraanduidingId(adres);
    let woningType: string | null = null;
    if (naId) {
      woningType = await getWoningTypeFromPDOK(naId);
    }
    // Prefer Firestore (CSV import) first so it works offline/API-less
    let energieLabel: string | null = await getEnergieLabelForAdres(adres);
    // Fallback to server proxy if not present in Firestore
    if (!energieLabel) {
      try {
        const url = `/api/energyLabel?adres=${encodeURIComponent(adres)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          energieLabel = data?.label ?? null;
        }
      } catch {}
    }
    return { woningType, energieLabel, bagId: naId };
  } catch (e) {
    console.warn('fetchDossierMeta failed', e);
    return { woningType: null, energieLabel: null, bagId: null };
  }
}
