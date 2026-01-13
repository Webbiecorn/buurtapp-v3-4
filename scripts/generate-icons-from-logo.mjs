#!/usr/bin/env node
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const sizes = [
  { size: 192, output: 'icons/icon-192.png' },
  { size: 512, output: 'icons/icon-512.png' },
  { size: 180, output: 'apple-touch-icon.png' }
];

async function generateIcons() {
  const inputFile = join(publicDir, 'brand-logo.png');
  
  console.log('🎨 Generating icons from brand-logo.png...');
  
  for (const { size, output } of sizes) {
    const outputPath = join(publicDir, output);
    await sharp(inputFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`✅ Created ${output} (${size}x${size})`);
  }
  
  console.log('✨ All icons generated successfully!');
}

generateIcons().catch(console.error);
