// Downloads the OpenSea collection banner ("header") image for each Wilder
// World industry and saves it under public/images/wilder-world/industries/.
//
// OpenSea's v2 `/collections/{slug}` endpoint needs the *real* collection slug,
// which differs from the display slugs in src/lib/wilderCollections.ts. We
// resolve the real slug from a single NFT (its `collection` field) fetched by
// the industry's onchain contract, then read `banner_image_url`.
//
// Usage: node scripts/fetch-industry-heroes.mjs
// Requires OPENSEA_API_KEY (read from the environment or .env.local).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://api.opensea.io/api/v2';
const OUT_DIR = join(process.cwd(), 'public', 'images', 'wilder-world', 'industries');

// First (primary) collection per industry, from src/lib/wilderCollections.ts.
const INDUSTRIES = [
  { id: 'land', chain: 'ethereum', contract: '0xd396ca541F501f5D303166C509e2045848df356b' },
  { id: 'wheels', chain: 'ethereum', contract: '0xc2e9678A71e50E5AeD036e00e9c5caeb1aC5987D' },
  { id: 'beasts', chain: 'ethereum', contract: '0x1a178cfd768f74b3308cbca9998c767f4e5b2cf8' },
  { id: 'moto', chain: 'ethereum', contract: '0x51bd5948cf84a1041d2720f56dED5E173396fc95' },
  { id: 'pals', chain: 'ethereum', contract: '0x90a1f4B78Fa4198BB620b7686f510FD476Ec7A0B' },
  { id: 'crafts', chain: 'ethereum', contract: '0xE4954E4FB3C448f4eFBC1f8EC40eD54a2A1cc1f5' },
  { id: 'cribs', chain: 'ethereum', contract: '0xfEA385B9E6e4fdfA3508aE6863d540c4a8Ccc0fE' },
  { id: 'kicks', chain: 'ethereum', contract: '0x4d8165cb6861253e9edFBAC2f41A386BA1a0A175' },
];

async function loadKey() {
  if (process.env.OPENSEA_API_KEY) return process.env.OPENSEA_API_KEY;
  try {
    const env = await readFile(join(process.cwd(), '.env.local'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.startsWith('OPENSEA_API_KEY='));
    if (line) return line.slice('OPENSEA_API_KEY='.length).trim();
  } catch {
    /* no .env.local */
  }
  return null;
}

async function api(key, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-KEY': key, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// Detect the real image format from the file's magic bytes. The seadn CDN
// serves AVIF even when the URL ends in .png, so sniffing the buffer is the
// only reliable way to pick a correct extension.
function extForBuffer(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('latin1');
    if (brand.startsWith('avi') || brand === 'mif1') return 'avif';
  }
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP')
    return 'webp';
  return 'png';
}

async function run() {
  const key = await loadKey();
  if (!key) {
    console.error('Missing OPENSEA_API_KEY (env or .env.local).');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const results = [];
  for (const ind of INDUSTRIES) {
    try {
      const nftData = await api(
        key,
        `/chain/${ind.chain}/contract/${ind.contract}/nfts?limit=1`
      );
      const slug = nftData?.nfts?.[0]?.collection;
      if (!slug) throw new Error('could not resolve collection slug');

      const col = await api(key, `/collections/${encodeURIComponent(slug)}`);
      const imgUrl = col.banner_image_url || col.image_url;
      if (!imgUrl) throw new Error(`no banner/image for ${slug}`);

      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error(`image ${imgUrl} -> HTTP ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const ext = extForBuffer(buf);
      const file = `${ind.id}.${ext}`;
      await writeFile(join(OUT_DIR, file), buf);

      const publicPath = `/images/wilder-world/industries/${file}`;
      results.push({ id: ind.id, slug, publicPath });
      console.log(`${ind.id.padEnd(8)} slug=${slug.padEnd(24)} -> ${publicPath} (${buf.length} bytes)`);
    } catch (err) {
      console.warn(`${ind.id.padEnd(8)} FAILED: ${err.message}`);
    }
  }

  console.log('\nHERO_MAP=' + JSON.stringify(Object.fromEntries(results.map((r) => [r.id, r.publicPath]))));
}

run();
