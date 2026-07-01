// Generates mobile-optimized media for the Wilder World landing page.
//
// - Extracts the first frame of the gameplay/token/map videos as a lightweight
//   poster image (so mobile can show a still instead of streaming the video).
// - Re-encodes the heavier landing images (the breach shots and faction art)
//   at a mobile-friendly width.
//
// Every source produces two outputs under public/images/wilder-world/mobile/:
//   <name>_mobile.webp  (preferred)
//   <name>_mobile.jpg   (served on slow / save-data connections)
//
// Requires ffmpeg on PATH. Usage: node scripts/optimize-mobile-media.mjs

import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, parse } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const WW_DIR = join(PUBLIC, 'images', 'wilder-world');
const OUT_DIR = join(WW_DIR, 'mobile');

// Target width for mobile assets. Height is auto (-2 keeps it even for the
// encoders) to preserve each source's aspect ratio.
const WIDTH = 1080;

// Videos whose first frame becomes a mobile poster (used behind tap-to-play).
// { src: public-relative source, name: output basename }
const VIDEO_POSTERS = [
  { src: 'videos/wiami-race.mp4', name: 'race' },
  { src: 'videos/wiami-fight.mp4', name: 'fight' },
  { src: 'images/wilder-world/meow_craft.mp4', name: 'explore' },
  { src: 'videos/wilder_construction.mp4', name: 'build' },
  { src: 'videos/wiami-map.mp4', name: 'map' },
  { src: 'videos/wiami-token.mp4', name: 'token' },
  { src: 'videos/midday.mp4', name: 'midday' },
  { src: 'videos/dawn.mp4', name: 'dawn' },
];

// Raster image extensions we downscale for mobile. All top-level images under
// public/images/wilder-world/ are processed via glob, keeping the basename.
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.avif', '.webp']);

// Text-heavy diagrams kept at full resolution (labels must stay legible), so
// they are referenced by their originals and never downscaled.
const IMAGE_SKIP = new Set(['resources.avif', 'mine_workflow.avif']);

function ffmpeg(args) {
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(res.stderr?.split('\n').slice(-6).join('\n') || 'ffmpeg failed');
  }
}

// Encodes one source (image or video first frame) to WebP + JPEG at WIDTH.
function encode(input, name, frame) {
  const scale = `scale=${WIDTH}:-2`;
  const frameArgs = frame ? ['-frames:v', '1'] : [];
  const webpOut = join(OUT_DIR, `${name}_mobile.webp`);
  const jpgOut = join(OUT_DIR, `${name}_mobile.jpg`);
  ffmpeg(['-y', '-i', input, ...frameArgs, '-vf', scale, '-quality', '80', webpOut]);
  ffmpeg(['-y', '-i', input, ...frameArgs, '-vf', scale, '-q:v', '4', jpgOut]);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const job of VIDEO_POSTERS) {
    const input = join(PUBLIC, job.src);
    if (!existsSync(input)) {
      console.warn(`SKIP  ${job.name.padEnd(20)} (missing ${job.src})`);
      continue;
    }
    try {
      encode(input, job.name, true);
      console.log(`OK    ${job.name.padEnd(20)} (poster)`);
    } catch (err) {
      console.warn(`FAIL  ${job.name.padEnd(20)} ${err.message}`);
    }
  }

  const entries = await readdir(WW_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const { name: base, ext } = parse(entry.name);
    if (!IMAGE_EXTS.has(ext.toLowerCase())) continue;
    if (IMAGE_SKIP.has(entry.name)) {
      console.log(`SKIP  ${entry.name.padEnd(20)} (diagram, kept crisp)`);
      continue;
    }
    try {
      encode(join(WW_DIR, entry.name), base, false);
      console.log(`OK    ${base.padEnd(20)} (image)`);
    } catch (err) {
      console.warn(`FAIL  ${entry.name.padEnd(20)} ${err.message}`);
    }
  }
}

run();
