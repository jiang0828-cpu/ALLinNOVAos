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

function firstText(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const text = textContent(doc.querySelector(selector));
    if (text) return text;
  }
  return '';
}

function absoluteUrl(url: string | null): string {
  if (!url) return M2NEWS_LATEST_URL;
  try {
    return new URL(url, M2NEWS_LATEST_URL).toString();
  } catch {
    return M2NEWS_LATEST_URL;
  }
}

export async function getLatestM2News(): Promise<M2NewsItem[]> {
  const response = await fetch(`${M2NEWS_LATEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`M2news HTTP ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const generatedAt = firstText(doc, ['.header-meta span', 'header .meta']).match(
    /(?:最后更新|生成于)[:：]?\s*([^·|]+)/,
  )?.[1];

  const topCards = Array.from(doc.querySelectorAll('.top-section .top-card'))
    .map((card, index) => {
      const link = card.querySelector<HTMLAnchorElement>('.top-title a, h3 a, a');
      const title = textContent(link) || textContent(card.querySelector('.top-title, h3'));
      return {
        id: `m2news-latest-${index + 1}`,
        source: textContent(card.querySelector('.source-badge')) || 'M2NEWS',
        time: textContent(card.querySelector('.relative-time')) || generatedAt || '今日大事',
        title,
        url: absoluteUrl(link?.getAttribute('href') || null),
      };
    })
    .filter((item) => item.title);

  const legacyItems = Array.from(doc.querySelectorAll('.highlights ol li'))
    .map((item, index) => ({
      id: `m2news-latest-${index + 1}`,
      source: 'M2NEWS',
      time: generatedAt || '今日大事',
      title: textContent(item),
      url: M2NEWS_LATEST_URL,
    }))
    .filter((item) => item.title);

  const items = (topCards.length > 0 ? topCards : legacyItems).slice(0, 5);

  if (items.length === 0) {
    throw new Error('M2news highlights not found');
  }

  return items;
}
