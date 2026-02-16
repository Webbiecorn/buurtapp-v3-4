#!/usr/bin/env node

/**
 * Bundle Size Tracker
 * 
 * Analyzes Vite build output and tracks bundle size metrics.
 * Run after: npm run build
 * 
 * Features:
 * - Parses dist/ folder for bundle sizes
 * - Compares with previous build (if exists)
 * - Warns about large chunks (>500KB)
 * - Saves metrics to .bundle-stats.json for tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const STATS_FILE = path.join(__dirname, '../.bundle-stats.json');
const LARGE_CHUNK_THRESHOLD = 500 * 1024; // 500KB
const SIZE_INCREASE_THRESHOLD = 10; // 10% increase warning

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBundle() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('❌ No dist/assets folder found. Run "npm run build" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_DIR);
  const assets = [];
  let totalSize = 0;

  // Analyze all assets
  files.forEach(file => {
    const filePath = path.join(ASSETS_DIR, file);
    const size = getFileSize(filePath);
    const ext = path.extname(file);
    
    totalSize += size;
    
    assets.push({
      name: file,
      size,
      type: ext === '.js' ? 'javascript' : ext === '.css' ? 'stylesheet' : 'other',
      isLarge: size > LARGE_CHUNK_THRESHOLD
    });
  });

  // Sort by size descending
  assets.sort((a, b) => b.size - a.size);

  const stats = {
    timestamp: new Date().toISOString(),
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    assetCount: assets.length,
    largestAssets: assets.slice(0, 10),
    largeChunks: assets.filter(a => a.isLarge),
    byType: {
      javascript: assets.filter(a => a.type === 'javascript').reduce((sum, a) => sum + a.size, 0),
      stylesheet: assets.filter(a => a.type === 'stylesheet').reduce((sum, a) => sum + a.size, 0),
      other: assets.filter(a => a.type === 'other').reduce((sum, a) => sum + a.size, 0)
    }
  };

  return stats;
}

function loadPreviousStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️  Could not load previous stats:', error.message);
  }
  return null;
}

function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('❌ Failed to save stats:', error.message);
  }
}

function printReport(stats, previousStats) {
  console.log('\n📦 Bundle Size Analysis\n');
  console.log(`Total Size: ${stats.totalSizeFormatted} (${stats.assetCount} assets)`);
  
  // Compare with previous build
  if (previousStats) {
    const sizeDiff = stats.totalSize - previousStats.totalSize;
    const percentChange = ((sizeDiff / previousStats.totalSize) * 100).toFixed(2);
    const arrow = sizeDiff > 0 ? '📈' : sizeDiff < 0 ? '📉' : '➡️';
    const sign = sizeDiff > 0 ? '+' : '';
    
    console.log(`Change: ${arrow} ${sign}${formatBytes(sizeDiff)} (${sign}${percentChange}%)`);
    
    if (Math.abs(parseFloat(percentChange)) > SIZE_INCREASE_THRESHOLD) {
      console.warn(`⚠️  Bundle size changed by more than ${SIZE_INCREASE_THRESHOLD}%!`);
    }
  }

  console.log('\nBy Type:');
  console.log(`  JavaScript: ${formatBytes(stats.byType.javascript)}`);
  console.log(`  Stylesheets: ${formatBytes(stats.byType.stylesheet)}`);
  console.log(`  Other: ${formatBytes(stats.byType.other)}`);

  console.log('\n🔝 Top 10 Largest Assets:');
  stats.largestAssets.forEach((asset, index) => {
    const warning = asset.isLarge ? ' ⚠️' : '';
    console.log(`  ${index + 1}. ${asset.name.padEnd(50)} ${formatBytes(asset.size)}${warning}`);
  });

  if (stats.largeChunks.length > 0) {
    console.log(`\n⚠️  ${stats.largeChunks.length} chunk(s) larger than ${formatBytes(LARGE_CHUNK_THRESHOLD)}:`);
    stats.largeChunks.forEach(chunk => {
      console.log(`  - ${chunk.name}: ${formatBytes(chunk.size)}`);
    });
    console.log('\n💡 Consider code splitting or lazy loading for these chunks.');
  }

  console.log('\n✅ Bundle analysis complete!\n');
}

// Main execution
const currentStats = analyzeBundle();
const previousStats = loadPreviousStats();

printReport(currentStats, previousStats);
saveStats(currentStats);
