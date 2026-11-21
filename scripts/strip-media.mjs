#!/usr/bin/env node
/** For the iOS wrapper: drop illustrations and audio from dist (they stream from GitHub Pages). */
import fs from "node:fs";
for (const dir of ["dist/atlas/img", "dist/atlas/thumb", "dist/atlas/audio"]) fs.rmSync(dir, { recursive: true, force: true });
console.log("stripped media from dist/ for the iOS build");
