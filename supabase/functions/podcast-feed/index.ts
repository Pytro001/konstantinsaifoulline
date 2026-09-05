// Public episode feed for konstantinsaifoulline.com.
// YouTube's legacy XML feed is no longer available for this channel, so the
// function reads the channel's public Videos page and falls back to the
// podcast's Riverside RSS feed.

const CHANNEL_ID = 'UC9js4d6T-ItypOrzt-CBuHQ';
const CHANNEL_HANDLE = 'konstantinsaifo';
const RIVERSIDE_RSS = 'https://api.riverside.com/hosting/j7y3MJYD.rss';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
};

const KNOWN_VIDEO_IDS: Record<string, string> = {
  'the next decade of ai robots spacex robert scoble': 'bnI0JL5Pfw0',
  'how samsung became a design powerhouse gordon bruce': 'MO8nQZfo2TM',
  'we built the best humanoid robot possible in 2026 scott walter': 'GvvK0E_yO6Y',
  'spacex s 4th engineer will starship actually get us to mars hans koenigsmann': 'QDgwstGHhZo',
  'why 100 000 satellites will make space unusable jonathan mcdowell': 'D45UtYEQxS0',
  'how he turned 100k followers into a company robert gutierrez': 'JU3owSfVe5E',
  'why some people progress faster than everyone else': 'CFpKRfGyZWQ',
};

function decode(value: string): string {
  return String(value || '')
    .replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function normalize(value: string): string {
  return decode(value)
    .normalize('NFKD')
    .replace(/[’']/g, ' ')
    .replace(/&/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function initialData(html: string): unknown {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start < 0) continue;
    const jsonStart = start + marker.length;
    const jsonEnd = html.indexOf(';</script>', jsonStart);
    if (jsonEnd > jsonStart) return JSON.parse(html.slice(jsonStart, jsonEnd));
  }
  throw new Error('YouTube page did not include episode data');
}

function youtubeVideos(data: unknown): Array<{ id: string; title: string }> {
  const videos: Array<{ id: string; title: string }> = [];
  const seen = new Set<string>();

  function add(id: unknown, title: unknown) {
    if (typeof id !== 'string' || typeof title !== 'string' || !id || !title || seen.has(id)) return;
    seen.add(id);
    videos.push({ id, title: decode(title) });
  }

  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, any>;
    if (object.lockupViewModel) {
      const item = object.lockupViewModel;
      add(
        item.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId,
        item.metadata?.lockupMetadataViewModel?.title?.content,
      );
    }
    if (object.videoRenderer) {
      const item = object.videoRenderer;
      add(item.videoId, item.title?.runs?.map((run: { text?: string }) => run.text || '').join('') || item.title?.simpleText);
    }
    for (const child of Object.values(object)) walk(child);
  }

  walk(data);
  return videos;
}

async function fromYouTube() {
  const pages = [
    `https://www.youtube.com/@${CHANNEL_HANDLE}/videos?hl=en&gl=US`,
    `https://www.youtube.com/channel/${CHANNEL_ID}/videos?hl=en&gl=US`,
  ];
  for (const page of pages) {
    try {
      const response = await fetch(page, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const videos = youtubeVideos(initialData(await response.text()));
      if (!videos.length) continue;
      return videos.map((video, index) => ({
        id: video.id,
        title: video.title,
        published: '',
        source_index: index,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail: `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
        thumbnail_hq: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      }));
    } catch (_error) {
      // Try the canonical channel URL, then the podcast RSS fallback.
    }
  }
  return [];
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>'));
  return match ? decode(match[1]) : '';
}

async function fromRiverside() {
  const response = await fetch(RIVERSIDE_RSS, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Podcast RSS returned ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match, index) => {
    const item = match[1];
    const title = tag(item, 'title');
    const id = KNOWN_VIDEO_IDS[normalize(title)] || '';
    const image = item.match(/<itunes:image[^>]+href="([^"]+)"/)?.[1] || '';
    const audio = item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] || '';
    const youtubeUrl = id ? `https://www.youtube.com/watch?v=${id}` : '';
    return {
      id: id || `podcast-${index}`,
      title,
      published: tag(item, 'pubDate'),
      source_index: index,
      url: youtubeUrl || decode(audio),
      youtube_url: youtubeUrl,
      thumbnail: id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : decode(image),
      thumbnail_hq: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : decode(image),
    };
  }).filter((episode) => episode.title && episode.url);
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    let episodes = await fromYouTube();
    let source = 'youtube';
    if (!episodes.length) {
      episodes = await fromRiverside();
      source = 'riverside';
    }
    return new Response(JSON.stringify({ channel: CHANNEL_ID, source, count: episodes.length, episodes }), { headers: CORS });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error), episodes: [] }), { status: 200, headers: CORS });
  }
});
