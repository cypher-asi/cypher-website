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

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const OUT_DIR = join(PUBLIC, 'images', 'wilder-world', 'mobile');

// Target width for mobile assets. Height is auto (-2 keeps it even for the
// encoders) to preserve each source's aspect ratio.
const WIDTH = 1080;

// { src: public-relative source, name: output basename, frame: is a video }
const JOBS = [
  { src: 'videos/wiami-race.mp4', name: 'race', frame: true },
  { src: 'videos/wiami-fight.mp4', name: 'fight', frame: true },
  { src: 'images/wilder-world/meow_craft.mp4', name: 'explore', frame: true },
  { src: 'videos/wilder_construction.mp4', name: 'build', frame: true },
  { src: 'videos/wiami-map.mp4', name: 'map', frame: true },
  { src: 'videos/wiami-token.mp4', name: 'token', frame: true },
  { src: 'images/wilder-world/spartan_attack.png', name: 'spartan_attack', frame: false },
  { src: 'images/wilder-world/trinity_fire.png', name: 'trinity_fire', frame: false },
  { src: 'images/wilder-world/auric.png', name: 'auric', frame: false },
  { src: 'images/wilder-world/nova_switch.png', name: 'nova_switch', frame: false },
  { src: 'images/wilder-world/trinity.png', name: 'trinity', frame: false },
  { src: 'images/wilder-world/ant.png', name: 'ant', frame: false },
  { src: 'images/wilder-world/agents.png', name: 'agents', frame: false },
  { src: 'images/wilder-world/spartans.png', name: 'spartans', frame: false },
  { src: 'images/wilder-world/wape.jpeg', name: 'wape', frame: false },
];

function ffmpeg(args) {
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(res.stderr?.split('\n').slice(-6).join('\n') || 'ffmpeg failed');
  }
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const job of JOBS) {
    const input = join(PUBLIC, job.src);
    if (!existsSync(input)) {
      console.warn(`SKIP  ${job.name.padEnd(16)} (missing ${job.src})`);
      continue;
    }

    const scale = `scale=${WIDTH}:-2`;
    // For videos, grab only the very first frame.
    const frameArgs = job.frame ? ['-frames:v', '1'] : [];
    const webpOut = join(OUT_DIR, `${job.name}_mobile.webp`);
    const jpgOut = join(OUT_DIR, `${job.name}_mobile.jpg`);

    try {
      ffmpeg(['-y', '-i', input, ...frameArgs, '-vf', scale, '-quality', '80', webpOut]);
      ffmpeg(['-y', '-i', input, ...frameArgs, '-vf', scale, '-q:v', '4', jpgOut]);
      console.log(`OK    ${job.name.padEnd(16)} -> ${job.name}_mobile.{webp,jpg}`);
    } catch (err) {
      console.warn(`FAIL  ${job.name.padEnd(16)} ${err.message}`);
    }
  }
}

run();
