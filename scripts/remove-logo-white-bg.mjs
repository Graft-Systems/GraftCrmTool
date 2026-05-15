/**
 * Makes near-white pixels transparent on the Graft wordmark PNG.
 * Run: node scripts/remove-logo-white-bg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputPath = path.join(root, "public/brand/graft-systems-wordmark.png");
const outPath = path.join(root, "public/brand/graft-systems-wordmark.png");

const THRESH = 248; // pixels >= this on all RGB channels become transparent

const image = sharp(inputPath);
const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 4) {
  throw new Error(`Expected 4 channels, got ${channels}`);
}

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r >= THRESH && g >= THRESH && b >= THRESH) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: {
    width,
    height,
    channels: 4,
  },
})
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outPath + ".tmp");

fs.renameSync(outPath + ".tmp", outPath);
console.log("Wrote transparent PNG:", outPath);
