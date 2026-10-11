// Turns the originals in brand-source/ into the small files the site loads.
// Re-run whenever the logo or emblem changes, then commit the outputs.
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'brand-source';
const OUT = 'src/assets/brand';
const PUBLIC = 'public';

function source(base) {
  const file = ['png', 'webp', 'jpg', 'jpeg']
    .map((ext) => `${SRC}/${base}.${ext}`)
    .find((path) => existsSync(path));
  if (!file) throw new Error(`Missing ${SRC}/${base}.(png|webp|jpg)`);
  return file;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(PUBLIC, { recursive: true });

const logo = source('logo');
const emblem = source('emblem');

// Header logo is 62px tall on desktop (spec 4.1): 1x / 2x / 3x.
for (const [height, suffix] of [
  [62, '1x'],
  [124, '2x'],
  [186, '3x'],
]) {
  await sharp(logo).resize({ height }).webp({ quality: 90 }).toFile(`${OUT}/logo-${suffix}.webp`);
}

// Effendi avatar is at most 96px (spec 4.4); 256px covers 3x screens.
await sharp(emblem).resize({ width: 256 }).webp({ quality: 90 }).toFile(`${OUT}/emblem-256.webp`);

const white = { r: 255, g: 255, b: 255, alpha: 1 };
await sharp(emblem)
  .resize(32, 32, { fit: 'contain', background: white })
  .flatten({ background: white })
  .png()
  .toFile(`${PUBLIC}/favicon-32.png`);
await sharp(emblem)
  .resize(180, 180, { fit: 'contain', background: white })
  .flatten({ background: white })
  .png()
  .toFile(`${PUBLIC}/apple-touch-icon.png`);

console.log('Brand assets written to', OUT, 'and', PUBLIC);
