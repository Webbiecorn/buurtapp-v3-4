import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcArg = process.argv[2];
const src = srcArg || process.env.ICON_SRC || path.resolve('public/icons/source.png');
const outDir = path.resolve('public/icons');

async function main() {
  if (!fs.existsSync(src)) {
    console.error(`Bronbestand niet gevonden: ${src}`);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const sizes = [192, 512];
  for (const size of sizes) {
    const out = path.join(outDir, `icon-${size}.png`);
    await sharp(src)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`✔  gegenereerd: ${out}`);
  }
}

main().catch((e) => {
  console.error('Fout bij genereren iconen:', e);
  process.exit(1);
});
