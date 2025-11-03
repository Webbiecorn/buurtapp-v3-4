import * as fs from "fs";
import * as readline from "readline";
import {db} from "../firebase-admin-init";

type HeaderMap = { [key: string]: number };

function normalize(str: string | null | undefined) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function onlyAlnum(str: string) {
  return (str || "").replace(/[^a-z0-9]/gi, "");
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
  return [s, nr, tv, pc, wp].filter(Boolean).join("|");
}

function detectDelimiter(line: string) {
  if (line.includes(";")) return ";";
  return ",";
}

function buildHeaderMap(headers: string[]): HeaderMap {
  const map: HeaderMap = {};
  headers.forEach((h, i) => {
    map[h.trim().toLowerCase()] = i;
  });
  return map;
}

function getField(row: string[], map: HeaderMap, names: string[], fallback = "") {
  for (const n of names) {
    const idx = map[n];
    if (idx !== undefined && row[idx] !== undefined) return row[idx];
  }
  return fallback;
}

async function main() {
  const fileArgIdx = process.argv.findIndex((a) => a === "--file");
  const cityArgIdx = process.argv.findIndex((a) => a === "--woonplaats");
  if (fileArgIdx === -1 || !process.argv[fileArgIdx + 1]) {
    console.error("Usage: node importEnergyLabels.js --file /path/to/labels.csv");
    process.exit(1);
  }
  const filePath = process.argv[fileArgIdx + 1];
  const cityFilter = cityArgIdx !== -1 ? String(process.argv[cityArgIdx + 1] || "").toLowerCase() : "";
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const rl = readline.createInterface({input: fs.createReadStream(filePath), crlfDelay: Infinity});
  let delimiter = ",";
  let headerMap: HeaderMap | null = null;
  let count = 0;
  let batch = db.batch();
  let batchCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headerMap) {
      delimiter = detectDelimiter(line);
      const headers = line.split(delimiter).map((h) => h.replace(/^\uFEFF/, ""));
      headerMap = buildHeaderMap(headers.map((h) => h.toLowerCase()));
      continue;
    }
    const parts = line.split(delimiter);
    const postcode = getField(parts, headerMap, ["postcode", "post_code", "pc4pc2", "pc6"]);
    const huisnummer = getField(parts, headerMap, ["huisnummer", "hnr", "huis_nr"]);
    const huisletter = getField(parts, headerMap, ["huisletter", "hnrl"]);
    const toevoeging = getField(parts, headerMap, ["huisnummertoevoeging", "toevoeging", "hnrt"]);
    const woonplaats = getField(parts, headerMap, ["woonplaats", "plaats", "city"]);
    const straat = getField(parts, headerMap, ["straat", "straatnaam", "street"]);
    const label = getField(parts, headerMap, ["labelklasse", "energielabel", "label", "label_klasse"]).toUpperCase();

    if (!postcode || !huisnummer || !woonplaats || !straat || !label) continue;
    // Woonplaats filter (bijv. alleen Lelystad)
    if (cityFilter && (woonplaats || "").toLowerCase() !== cityFilter) continue;
    const tv = huisletter || toevoeging || "";
    const key = buildAddressKey(straat, huisnummer, tv, postcode, woonplaats);
    const ref = db.collection("energyLabels").doc(key);
    batch.set(ref, {
      key,
      label,
      postcode,
      huisnummer,
      huisletter: huisletter || null,
      toevoeging: toevoeging || null,
      woonplaats,
      straat,
      updatedAt: new Date(),
    }, {merge: true});
    batchCount++;
    count++;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      console.log(`Imported ${count} rows...`);
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log(`Done. Imported ~${count} rows.`);
}

main().catch((err) => {
  console.error("Import failed", err);
  process.exit(1);
});
