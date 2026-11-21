#!/usr/bin/env node
/**
 * For the iOS app: keep the dataset (index + entries) and every thumbnail inside the app, and
 * drop full-size illustrations and audio from dist. The app fetches those on demand from
 * GitHub Pages and caches them on the device (src/lib/media.ts). Before deleting, record their
 * size in dist/atlas/media-manifest.json so the optional "download everything" button can show
 * the size and ask first.
 */
import fs from "node:fs";
import path from "node:path";

const atlas = "dist/atlas";
if (!fs.existsSync(path.join(atlas, "index.json"))) {
  console.error("dist/atlas/index.json is missing: run the web build first");
  process.exit(1);
}
if (!fs.existsSync(path.join(atlas, "thumb"))) {
  console.error("dist/atlas/thumb is missing: the iOS app must bundle thumbnails");
  process.exit(1);
}

function measure(dir) {
  let files = 0;
  let bytes = 0;
  if (!fs.existsSync(dir)) return { files, bytes };
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const s = measure(p);
      files += s.files;
      bytes += s.bytes;
    } else {
      files++;
      bytes += fs.statSync(p).size;
    }
  }
  return { files, bytes };
}

const manifest = { img: measure(path.join(atlas, "img")), audio: measure(path.join(atlas, "audio")) };
fs.writeFileSync(path.join(atlas, "media-manifest.json"), JSON.stringify(manifest));
for (const dir of ["img", "audio"]) fs.rmSync(path.join(atlas, dir), { recursive: true, force: true });

const kept = measure(atlas);
const mb = (b) => `${Math.round(b / 1048576)} MB`;
console.log(`iOS bundle keeps dist/atlas (${kept.files} files, ${mb(kept.bytes)}); on demand: img ${manifest.img.files} files ${mb(manifest.img.bytes)}, audio ${manifest.audio.files} files ${mb(manifest.audio.bytes)}`);
if (manifest.img.files === 0 || manifest.audio.files === 0) {
  console.error("expected full illustrations and audio in dist before stripping");
  process.exit(1);
}
