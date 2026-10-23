import { readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const inventory = JSON.parse(readFileSync('docs/shooting-drive-inventory.json', 'utf8'));
const publicFile = url => `public${url}`;
for (const asset of inventory.assets) {
  const bytes = readFileSync(publicFile(asset.url));
  if (!bytes.length || bytes.length !== asset.size_bytes) throw Error(`Invalid size: ${asset.url}`);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw Error(`Corrupt asset: ${asset.url}`);
  if (asset.asset_type === 'image' && (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP')) throw Error(`Invalid WebP: ${asset.url}`);
  if (asset.asset_type === 'video' && (bytes.toString('ascii', 4, 8) !== 'ftyp' || !(asset.duration > 0))) throw Error(`Invalid MP4: ${asset.url}`);
  if (asset.poster && !statSync(publicFile(asset.poster)).size) throw Error(`Empty poster: ${asset.poster}`);
}
for (const file of [...inventory.photos, ...inventory.videos]) if (!existsSync(publicFile(file.asset))) throw Error(`Missing source mapping: ${file.id}`);
const campaign = JSON.parse(readFileSync('src/components/marketing/campaign-images.json', 'utf8'));
for (const [source, entry] of Object.entries(campaign)) {
  if (!statSync(publicFile(source)).size) throw Error(`Empty campaign source: ${source}`);
  for (const variant of entry.variants) if (!statSync(publicFile(variant.src)).size) throw Error(`Empty srcset: ${variant.src}`);
}
const catalogue = JSON.parse(readFileSync('docs/noel-shooting-catalogue.json', 'utf8'));
for (const product of catalogue) for (const index of product.photos) {
  const source = inventory.photos.find(photo => photo.index === index);
  if (!source || !statSync(publicFile(source.asset)).size) throw Error(`Missing product photo: ${product.slug}`);
}
console.log(`PASS: ${inventory.assets.length} media hashes, 80 source mappings, campaign srcsets, ${catalogue.length} product galleries.`);
