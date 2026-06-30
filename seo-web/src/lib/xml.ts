export function urlset(urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string; images?: { loc: string; caption?: string }[] }[]): string {
  const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
  const body = urls.map((u) => {
    const parts = [`<loc>${esc(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) parts.push(`<priority>${u.priority}</priority>`);
    for (const img of u.images || []) {
      parts.push(`<image:image><image:loc>${esc(img.loc)}</image:loc>${img.caption ? `<image:caption>${esc(img.caption)}</image:caption>` : ''}</image:image>`);
    }
    return `<url>${parts.join('')}</url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`;
}
export const XML_HEADERS = { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' };
