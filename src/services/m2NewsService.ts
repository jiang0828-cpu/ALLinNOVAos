export interface M2NewsItem {
  id: string;
  source: string;
  time: string;
  title: string;
  url: string;
}

export const M2NEWS_LATEST_URL =
  'https://lifeos-personal-manager.github.io/M2news/latest.html';

function textContent(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export async function getLatestM2News(): Promise<M2NewsItem[]> {
  const response = await fetch(M2NEWS_LATEST_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`M2news HTTP ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const generatedAt = textContent(doc.querySelector('header .meta')).match(/生成于\s*([^·]+)/)?.[1];
  const items = Array.from(doc.querySelectorAll('.highlights ol li'))
    .map((item) => textContent(item))
    .filter(Boolean)
    .slice(0, 5);

  if (items.length === 0) {
    throw new Error('M2news highlights not found');
  }

  return items.map((title, index) => ({
    id: `m2news-latest-${index + 1}`,
    source: 'M2NEWS',
    time: generatedAt ? '今日大事' : '动态更新',
    title,
    url: M2NEWS_LATEST_URL,
  }));
}
