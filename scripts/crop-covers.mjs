import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.join(__dirname, '../assets/books');
const TARGET_W = 540;
const TARGET_H = 960;

function getDimensions(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  return { w, h };
}

function cropTo916(file) {
  const { w, h } = getDimensions(file);
  const targetRatio = TARGET_W / TARGET_H;
  const srcRatio = w / h;
  let resizeW;
  let resizeH;

  if (srcRatio > targetRatio) {
    resizeH = TARGET_H;
    resizeW = Math.round(TARGET_H * srcRatio);
  } else {
    resizeW = TARGET_W;
    resizeH = Math.round(TARGET_W / srcRatio);
  }

  const tmp = `${file}.tmp.jpg`;
  execFileSync('sips', ['-z', String(resizeH), String(resizeW), file, '--out', tmp]);
  execFileSync('sips', ['-c', String(TARGET_H), String(TARGET_W), tmp, '--out', file]);
  fs.unlinkSync(tmp);
}

const files = fs.readdirSync(BOOKS_DIR).filter((f) => f.endsWith('.jpg'));
for (const file of files) {
  const full = path.join(BOOKS_DIR, file);
  cropTo916(full);
  console.log(`cropped ${file}`);
}

console.log(`Done: ${files.length} covers at ${TARGET_W}x${TARGET_H} (9:16)`);
