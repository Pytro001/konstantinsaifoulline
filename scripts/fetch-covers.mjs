import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { BOOKS } = require('../books.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../assets/books');
const TIMEOUT_MS = 25000;

const SEARCH_OVERRIDES = {
  'our-oriental-heritage': { title: 'The Story of Civilization Volume 1', author: 'Will Durant' },
  'structures': { title: 'Structures', author: 'J E Gordon' },
  'blitzscaling': { title: 'Blitzscaling', author: 'Reid Hoffman' },
  'the-wealth-of-nations': { title: 'Wealth of Nations', author: 'Adam Smith' },
  'hitler': { title: 'Hitler 1889-1936 Hubris', author: 'Ian Kershaw' },
  '100-million-dollar-leads': { title: '$100M Leads', author: 'Alex Hormozi' },
  '100-million-dollar-offers': { title: '$100M Offers', author: 'Alex Hormozi' },
  'house-of-huawei': { title: 'House of Huawei', author: 'Eva Dou' },
  'the-nvidia-way': { title: 'The Nvidia Way', author: 'Tae Kim' },
  'the-algorithm': { title: 'The Algorithm', author: 'Jon McNeill' },
  'the-case-for-space': { title: 'The Case for Space', author: 'Robert Zubrin' },
  'how-to-build-your-own-space-ship': { title: 'How to Build Your Own Spaceship', author: 'Piers Bizony' },
  'the-book-of-elon': { title: 'Elon Musk', author: 'Walter Isaacson' },
  'decline-and-fall-roman-empire': { title: 'The Decline and Fall of the Roman Empire', author: 'Moses Hadas' },
  'the-goal': { title: 'The Goal', author: 'Eliyahu Goldratt' },
  'something-deeply-hidden': { title: 'Something Deeply Hidden', author: 'Sean Carroll' },
  'excellent-advice-for-living': { title: 'Excellent Advice for Living', author: 'Kevin Kelly' },
  'the-nvidia-way': { title: 'The Nvidia Way', author: 'Tae Kim' },
  'how-to-succeed-mr-beast': { title: 'How to Succeed in MrBeast Production', author: 'James Donaldson' },
  'evolution-series': { title: 'Evolution', author: 'Thomas Thiemeyer' },
  'ijon-tichy-raumpilot': { title: 'The Star Diaries', author: 'Stanislaw Lem' },
  'make-something-wonderful': { title: 'Make Something Wonderful', author: 'Steve Jobs' },
  'the-biggest-ideas-in-the-universe': { title: 'The Biggest Ideas in the Universe', author: 'Sean Carroll' },
  'how-to-be-a-genius': { title: 'The Science of Being Great', author: 'Wallace Wattles' },
  'water': { title: 'Water A Biography', author: 'Giulio Boccaletti' },
  'hitler': { title: 'Hitler Hubris', author: 'Ian Kershaw' },
  'titan': { title: 'Titan', author: 'Ron Chernow' },
  'wizard': { title: 'Wizard', author: 'Marc Seifer' },
  'that-will-never-work': { title: 'That Will Never Work', author: 'Marc Randolph' },
  'the-optimist': { title: 'The Optimist Sam Altman OpenAI', author: 'Keach Hagey' },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'konstantinsaifoulline-cover-fetch/1.0',
        ...(options.headers || {}),
      },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function searchGoogleBooks(title, author) {
  const q = encodeURIComponent(`${title} ${author}`);
  const res = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`);
  if (!res.ok) return null;
  const data = await res.json();
  for (const item of data.items || []) {
    const links = item.volumeInfo?.imageLinks;
    if (!links) continue;
    const url = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
    if (url) {
      return url.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=0');
    }
  }
  return null;
}

async function searchOpenLibrary(title, author) {
  const params = new URLSearchParams({ title, author, limit: '3', fields: 'cover_i,title,author_name' });
  const res = await fetchWithTimeout(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.docs?.find((d) => d.cover_i);
  if (!doc?.cover_i) return null;
  return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
}

async function downloadImage(url, dest) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) return false;
  fs.writeFileSync(dest, buf);
  return true;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function createPlaceholder(dest, title, author) {
  const svgPath = dest.replace(/\.(jpg|jpeg|png)$/i, '.svg');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
  <rect width="540" height="960" fill="#171717"/>
  <rect x="24" y="24" width="492" height="912" fill="none" stroke="#404040" stroke-width="2"/>
  <text x="270" y="420" fill="#d4d4d4" font-family="Arial, sans-serif" font-size="26" text-anchor="middle">${escapeXml(title.slice(0, 42))}</text>
  <text x="270" y="470" fill="#737373" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">${escapeXml(author.slice(0, 36))}</text>
</svg>`;
  fs.writeFileSync(svgPath, svg);
  return path.basename(svgPath);
}

async function fetchCover(book) {
  const override = SEARCH_OVERRIDES[book.id];
  const title = override?.title || book.title;
  const author = override?.author || book.author;
  const dest = path.join(OUT_DIR, `${book.id}.jpg`);

  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) {
    return { id: book.id, status: 'cached', file: `${book.id}.jpg` };
  }

  const svgPath = path.join(OUT_DIR, `${book.id}.svg`);
  if (fs.existsSync(svgPath)) {
    return { id: book.id, status: 'placeholder', file: `${book.id}.svg` };
  }

  let url = null;
  try {
    url = await searchGoogleBooks(title, author);
  } catch (err) {
    console.warn(`Google Books failed for ${book.id}:`, err.message);
  }

  if (!url) {
    try {
      await sleep(150);
      url = await searchOpenLibrary(title, author);
    } catch (err) {
      console.warn(`Open Library failed for ${book.id}:`, err.message);
    }
  }

  if (!url) {
    const firstAuthor = author.split(/,| and /)[0].trim();
    try {
      await sleep(150);
      url = await searchGoogleBooks(title, firstAuthor);
    } catch (err) {
      console.warn(`Google Books retry failed for ${book.id}:`, err.message);
    }
  }

  if (url) {
    try {
      const ok = await downloadImage(url, dest);
      if (ok) return { id: book.id, status: 'ok', file: `${book.id}.jpg` };
    } catch (err) {
      console.warn(`Download failed for ${book.id}:`, err.message);
    }
  }

  const file = createPlaceholder(dest, book.title, book.author);
  return { id: book.id, status: 'placeholder', file };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const book of BOOKS) {
    try {
      const result = await fetchCover(book);
      results.push(result);
      console.log(`${result.status.padEnd(12)} ${book.id} -> ${result.file}`);
    } catch (err) {
      const file = createPlaceholder(path.join(OUT_DIR, `${book.id}.jpg`), book.title, book.author);
      results.push({ id: book.id, status: 'error', file });
      console.log(`error        ${book.id} -> ${file} (${err.message})`);
    }
    await sleep(250);
  }
  const manifest = Object.fromEntries(results.map((r) => [r.id, r.file]));
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const placeholders = results.filter((r) => r.status === 'placeholder' || r.status === 'error');
  console.log(`\nDone: ${results.length} books, ${placeholders.length} placeholders`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
