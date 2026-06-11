/**
 * Generates CareMind AI app icon, adaptive icon, and splash from brand SVG.
 * Run: node scripts/generate-brand-assets.mjs
 */
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'assets', 'images');
const brandDir = join(root, 'assets', 'brand');

const ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="cm-bg" x1="192" y1="128" x2="832" y2="896" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38BDF8"/>
      <stop offset="0.45" stop-color="#0EA5E9"/>
      <stop offset="1" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="cm-pulse" x1="256" y1="512" x2="768" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#E0F2FE"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="256" fill="url(#cm-bg)"/>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="32"/>
  <path
    d="M192 512h102.4l57.6-166.4 115.2 332.8 115.2-249.6 70.4 83.2H832"
    fill="none"
    stroke="url(#cm-pulse)"
    stroke-width="77"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="784" cy="240" r="56" fill="#ffffff" fill-opacity="0.95"/>
</svg>`;

const ADAPTIVE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="cm-bg" x1="224" y1="224" x2="800" y2="800" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38BDF8"/>
      <stop offset="0.45" stop-color="#0EA5E9"/>
      <stop offset="1" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="cm-pulse" x1="300" y1="512" x2="724" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#E0F2FE"/>
    </linearGradient>
  </defs>
  <rect x="128" y="128" width="768" height="768" rx="192" fill="url(#cm-bg)"/>
  <rect x="152" y="152" width="720" height="720" rx="168" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="24"/>
  <path
    d="M256 512h76.8l43.2-124.8 86.4 249.6 86.4-187.2 52.8 62.4H768"
    fill="none"
    stroke="url(#cm-pulse)"
    stroke-width="58"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="708" cy="300" r="42" fill="#ffffff" fill-opacity="0.95"/>
</svg>`;

const SPLASH_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778" viewBox="0 0 1284 2778">
  <defs>
    <linearGradient id="splash-bg" x1="0" y1="0" x2="1284" y2="2778" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0284C7"/>
      <stop offset="0.35" stop-color="#0EA5E9"/>
      <stop offset="0.7" stop-color="#0EA5E9"/>
      <stop offset="1" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="cm-bg" x1="342" y1="1082" x2="942" y2="1682" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38BDF8"/>
      <stop offset="0.45" stop-color="#0EA5E9"/>
      <stop offset="1" stop-color="#6366F1"/>
    </linearGradient>
    <linearGradient id="cm-pulse" x1="420" y1="1382" x2="864" y2="1382" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#E0F2FE"/>
    </linearGradient>
  </defs>
  <rect width="1284" height="2778" fill="url(#splash-bg)"/>
  <circle cx="200" cy="420" r="180" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="1080" cy="2350" r="280" fill="#ffffff" fill-opacity="0.05"/>
  <rect x="342" y="1082" width="600" height="600" rx="150" fill="url(#cm-bg)"/>
  <rect x="362" y="1102" width="560" height="560" rx="140" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="20"/>
  <path
    d="M432 1382h60l33.6-97.2 67.2 194.4 67.2-145.8 41.4 48.6H852"
    fill="none"
    stroke="url(#cm-pulse)"
    stroke-width="45"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="786" cy="1208" r="33" fill="#ffffff" fill-opacity="0.95"/>
  <text x="642" y="1820" text-anchor="middle" font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">CareMind AI</text>
  <text x="642" y="1910" text-anchor="middle" font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" font-size="36" font-weight="500" fill="#ffffff" fill-opacity="0.82">Smarter care, powered by AI</text>
</svg>`;

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(brandDir, { recursive: true });

  await writeFile(join(brandDir, 'icon.svg'), ICON_SVG);
  await writeFile(join(brandDir, 'adaptive-icon.svg'), ADAPTIVE_SVG);
  await writeFile(join(brandDir, 'splash.svg'), SPLASH_SVG);

  await sharp(Buffer.from(ICON_SVG)).png().toFile(join(outDir, 'icon.png'));
  await sharp(Buffer.from(ADAPTIVE_SVG)).png().toFile(join(outDir, 'adaptive-icon.png'));
  await sharp(Buffer.from(SPLASH_SVG)).png().toFile(join(outDir, 'splash.png'));
  await sharp(Buffer.from(ICON_SVG)).resize(48, 48).png().toFile(join(outDir, 'favicon.png'));

  console.log('Generated:');
  console.log('  assets/images/icon.png (1024x1024)');
  console.log('  assets/images/adaptive-icon.png (1024x1024)');
  console.log('  assets/images/splash.png (1284x2778)');
  console.log('  assets/images/favicon.png (48x48)');
  console.log('  assets/brand/*.svg (source files)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
