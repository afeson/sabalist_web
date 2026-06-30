'use strict';
/**
 * Wikivoyage listings connector (CODE connector, load() hook).
 *
 * Fills the Travel category with REAL, reachable listings pulled from Wikivoyage
 * (CC-BY-SA), the free travel guide. Wikivoyage articles embed structured
 * listing templates ({{sleep}}, {{see}}, {{do}}, …) that carry a name plus a
 * contact (phone / email / url / address). We import only the ones a traveller
 * can actually reach:
 *   - {{sleep}}        -> travel / hotels   (hotels, lodges, guesthouses, hostels)
 *   - {{see}} / {{do}} -> travel / tours    (attractions, parks, tours, safaris)
 * Every imported listing MUST have a contact (phone OR email OR url) — listings
 * without one are dropped, satisfying the "every listing must be reachable" rule.
 * We skip {{eat}}/{{drink}}/{{buy}}/bare {{listing}} (embassies, shops) — they
 * don't belong in Travel.
 *
 * Source: Wikivoyage MediaWiki API (action=parse&prop=wikitext) over a BOUNDED,
 * curated set of major African destination articles (cities, parks, regions).
 * We fetch a bounded set rather than the full global listings dump because the
 * dump is impractically large to process here and most of it is non-African.
 * Per-article wikitext parsing keeps the import deterministic and polite.
 *
 * Attribution: Wikivoyage contributors, CC-BY-SA 4.0. Source article URL is kept
 * on each listing. We never synthesize data — every field is read from the
 * article's listing template.
 */
const API = 'https://en.wikivoyage.org/w/api.php';
const UA = 'Sabalist-data/1.0 (https://sabalist.com; afesonabebe@yahoo.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bounded, curated set of major African destination articles on Wikivoyage.
// Each entry: [article title, country]. Mix of capital/major cities, safari
// parks and regions across the continent — the high-listing-density articles.
const DESTINATIONS = [
  // North Africa
  ['Cairo', 'Egypt'], ['Alexandria', 'Egypt'], ['Luxor', 'Egypt'], ['Aswan', 'Egypt'],
  ['Marrakech', 'Morocco'], ['Fez', 'Morocco'], ['Casablanca', 'Morocco'], ['Tangier', 'Morocco'],
  ['Tunis', 'Tunisia'], ['Algiers', 'Algeria'],
  // West Africa
  ['Lagos', 'Nigeria'], ['Abuja', 'Nigeria'], ['Accra', 'Ghana'], ['Kumasi', 'Ghana'],
  ['Dakar', 'Senegal'], ['Abidjan', "Côte d'Ivoire"], ['Bamako', 'Mali'], ['Lomé', 'Togo'],
  ['Cotonou', 'Benin'], ['Ouagadougou', 'Burkina Faso'], ['Banjul', 'The Gambia'],
  // Central Africa
  ['Douala', 'Cameroon'], ['Yaoundé', 'Cameroon'], ['Libreville', 'Gabon'], ['Kinshasa', 'DR Congo'],
  // East Africa
  ['Nairobi', 'Kenya'], ['Mombasa', 'Kenya'], ['Maasai Mara', 'Kenya'], ['Amboseli National Park', 'Kenya'],
  ['Dar es Salaam', 'Tanzania'], ['Zanzibar', 'Tanzania'], ['Arusha', 'Tanzania'],
  ['Serengeti National Park', 'Tanzania'], ['Kilimanjaro National Park', 'Tanzania'],
  ['Kampala', 'Uganda'], ['Kigali', 'Rwanda'], ['Addis Ababa', 'Ethiopia'], ['Lalibela', 'Ethiopia'],
  ['Gondar', 'Ethiopia'], ['Bujumbura', 'Burundi'],
  // Southern Africa
  ['Cape Town', 'South Africa'], ['Johannesburg', 'South Africa'], ['Durban', 'South Africa'],
  ['Pretoria', 'South Africa'], ['Kruger National Park', 'South Africa'],
  ['Windhoek', 'Namibia'], ['Swakopmund', 'Namibia'], ['Etosha National Park', 'Namibia'],
  ['Victoria Falls', 'Zimbabwe'], ['Harare', 'Zimbabwe'], ['Lusaka', 'Zambia'],
  ['Maputo', 'Mozambique'], ['Gaborone', 'Botswana'], ['Maun', 'Botswana'],
  ['Antananarivo', 'Madagascar'], ['Port Louis', 'Mauritius'], ['Victoria (Seychelles)', 'Seychelles'],
  ['Lilongwe', 'Malawi'], ['Maseru', 'Lesotho'],
];

// {{sleep}} -> hotels; {{see}}/{{do}} -> tours. Others are not Travel.
const TYPE_SUB = { sleep: 'hotels', see: 'tours', do: 'tours' };

/** Parse one listing template body ("| name=… | url=… | …") into a flat object. */
function parseTemplateBody(body) {
  const fields = {};
  // Split on top-level "|" (templates here don't nest other templates inside fields).
  const parts = body.split(/\n?\s*\|/);
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    const key = p.slice(0, eq).trim().toLowerCase();
    let val = p.slice(eq + 1).trim();
    // Drop wiki markup that would leak into clean text.
    val = val
      .replace(/'''?/g, '')
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
      .replace(/\[\[([^\]]*)\]\]/g, '$1')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
      .replace(/<ref[^>]*\/>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (key) fields[key] = val;
  }
  return fields;
}

/**
 * Extract listing templates of the given types from article wikitext.
 * Walks brace depth so a template's full body (which may contain other braces
 * like {{flag|..}}) is captured correctly.
 */
function extractListings(wikitext, types) {
  const out = [];
  const re = /\{\{\s*(sleep|see|do)\b/gi;
  let m;
  while ((m = re.exec(wikitext))) {
    const type = m[1].toLowerCase();
    if (!types.includes(type)) continue;
    // Find the matching closing braces from the template start.
    let i = m.index + 2; // just inside the opening {{
    let depth = 1;
    while (i < wikitext.length && depth > 0) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i += 2; continue; }
      if (wikitext[i] === '}' && wikitext[i + 1] === '}') { depth--; i += 2; continue; }
      i++;
    }
    const full = wikitext.slice(m.index + 2, i - 2); // body between {{ and }}
    // Strip the leading "type" word so parseTemplateBody sees only fields.
    const body = full.replace(/^\s*(sleep|see|do)\b/i, '');
    out.push({ type, fields: parseTemplateBody(body) });
  }
  return out;
}

function isHttpUrl(u) { return /^https?:\/\/\S+/i.test(String(u || '')); }
function looksLikeEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }
function looksLikePhone(p) { return /\+?\d[\d\s().-]{6,}\d/.test(String(p || '')); }

module.exports = {
  source: {
    id: 'wikivoyage-listings-africa',
    name: 'Wikivoyage — African travel listings (MediaWiki API, CC-BY-SA)',
    enabled: true,
    ownerUserId: 'imported-listings',
    region: 'Africa',
    license:
      'Wikivoyage (© Wikivoyage contributors, CC-BY-SA 4.0). Listings carry a real contact ' +
      '(phone / email / url); the source article URL is retained for attribution.',
    thresholds: { autoPublishQuality: 0.5, autoPublishConfidence: 0.7 },
    mapping: {
      externalId: 'externalId',
      title: 'title',
      description: 'description',
      category: 'category',
      subcategory: 'subcategory',
      country: 'country',
      city: 'city',
      location: 'location',
      phoneNumber: 'phoneNumber',
      email: 'email',
      website: 'website',
      url: 'url',
      contact: 'contact',
      priceType: { const: 'none' },
    },

    async load({ httpRequest, opts }) {
      const out = [];
      const seen = new Set();
      const types = Object.keys(TYPE_SUB);

      for (const [title, country] of DESTINATIONS) {
        try {
          const url =
            `${API}?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=` +
            encodeURIComponent(title);
          const raw = await httpRequest(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
          const parsed = JSON.parse(raw);
          const wikitext = parsed && parsed.parse && parsed.parse.wikitext;
          if (!wikitext) continue;
          const articleTitle = (parsed.parse.title || title).replace(/\s+/g, '_');
          const articleUrl = `https://en.wikivoyage.org/wiki/${encodeURIComponent(articleTitle)}`;

          for (const { type, fields } of extractListings(wikitext, types)) {
            const name = (fields.name || '').trim();
            if (!name) continue;

            const phone = looksLikePhone(fields.phone) ? fields.phone.trim()
              : looksLikePhone(fields.tollfree) ? fields.tollfree.trim() : '';
            const email = looksLikeEmail(fields.email) ? fields.email.trim() : '';
            const website = isHttpUrl(fields.url) ? fields.url.trim() : '';
            // Contact required: phone OR email OR url. Otherwise drop the listing.
            const contact = phone || email || website;
            if (!contact) continue;

            const sub = TYPE_SUB[type];
            const dedupeKey = `${name}|${title}|${sub}`.toLowerCase();
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            const city = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
            const address = (fields.address || '').trim();
            const content = (fields.content || '').trim();
            const price = (fields.price || '').trim();
            const where = [address, city, country].filter(Boolean).join(', ');

            const kindLabel = type === 'sleep' ? 'Accommodation' : 'Attraction / activity';
            const description =
              `${name} — ${kindLabel} in ${city}, ${country}.` +
              (content ? ` ${content}` : '') +
              (price ? ` Price: ${price}.` : '') +
              ` Listed on Wikivoyage (CC-BY-SA). Source: ${articleUrl}`;

            out.push({
              externalId: `wikivoyage-${type}-${sub}-${name}-${city}`
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
              title: name,
              category: 'travel',
              subcategory: sub,
              country,
              city,
              location: where || city || country,
              phoneNumber: phone,
              email,
              website: website || articleUrl,
              url: website || articleUrl,
              contact, // phone / email / url — the reachable contact path
              description,
            });
          }
        } catch (e) {
          // A missing/renamed article must not stop the rest.
        }
        await sleep(700); // be polite to the Wikivoyage API
        if (opts && opts.limit && out.length >= opts.limit * 3) break;
      }
      return out;
    },
  },
};
