import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES, getCategory } from '@/lib/taxonomy';

export const runtime = 'nodejs';
export const maxDuration = 30;

// AI Listing Assistant — turns a product photo (+ optional notes) into a ready
// listing draft using the Claude API. The API key stays server-side.
//
// POST /api/ai-listing
//   { imageBase64?, mediaType?, notes?, country?, city? }
//   → { ok, draft: { title, description, categoryId, subcategory, price, currency, condition } }
//
// Config (Vercel env on the seo project):
//   ANTHROPIC_API_KEY   (required)
//   AI_MODEL            (optional, default claude-sonnet-5)
//   AI_ASSISTANT_SECRET (optional) — if set, callers must send it as
//                        x-ai-secret; makes the endpoint internal-only.

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5';

// Compact taxonomy string so Claude can only choose valid ids.
const TAXONOMY = CATEGORIES.map(
  (c) => `${c.id}: ${c.subCategories.map((s) => s.id).join(', ') || '(none)'}`
).join('\n');

function authorized(req: NextRequest): boolean {
  const secret = process.env.AI_ASSISTANT_SECRET;
  if (!secret) return true; // open unless a secret is configured
  return req.headers.get('x-ai-secret') === secret;
}

function extractJson(text: string): any | null {
  // Claude may wrap JSON in prose or a ```json fence — grab the first {...}.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: 'AI is not configured (missing ANTHROPIC_API_KEY).' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const notes = String(body.notes || '').trim().slice(0, 2000);
  const country = String(body.country || '').trim();
  const city = String(body.city || '').trim();
  const imageBase64: string | undefined = typeof body.imageBase64 === 'string' ? body.imageBase64 : undefined;
  const mediaType = String(body.mediaType || 'image/jpeg');

  if (!imageBase64 && !notes) {
    return NextResponse.json({ ok: false, error: 'Provide a photo or a description.' }, { status: 400 });
  }
  // ~7MB base64 ceiling to protect the model call.
  if (imageBase64 && imageBase64.length > 7_000_000) {
    return NextResponse.json({ ok: false, error: 'Image too large (max ~5MB).' }, { status: 413 });
  }

  const system =
    `You are a marketplace listing assistant for Sabalist, an Africa-focused classifieds site. ` +
    `Given a product photo and/or seller notes, write an accurate, appealing listing. ` +
    `Pick the single best category and subcategory from this taxonomy (use the exact ids; subcategory may be "" if none fits):\n${TAXONOMY}\n\n` +
    `Rules: be truthful — describe only what you can see or was stated; never invent brand, specs, or condition. ` +
    `Title <= 70 chars. Description 2–4 short sentences. If a price is not stated, estimate a reasonable local market price as a number (or null if you truly cannot). ` +
    `Respond with ONLY a JSON object, no prose, shaped exactly:\n` +
    `{"title": string, "description": string, "categoryId": string, "subcategory": string, "price": number|null, "currency": string, "condition": "new"|"used"|"refurbished"|"unspecified"}`;

  const userContent: any[] = [];
  if (imageBase64) {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
  }
  userContent.push({
    type: 'text',
    text:
      (notes ? `Seller notes: ${notes}\n` : '') +
      (country || city ? `Location: ${[city, country].filter(Boolean).join(', ')}\n` : '') +
      `Write the listing JSON now.`,
  });

  let aiText = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { ok: false, error: `AI request failed (${res.status})`, detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }
    const data: any = await res.json();
    aiText = (data?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'AI request error' }, { status: 502 });
  }

  const parsed = extractJson(aiText);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: 'AI returned an unreadable response.', raw: aiText.slice(0, 300) }, { status: 502 });
  }

  // Validate / clamp against the taxonomy.
  const cat = getCategory(String(parsed.categoryId || ''));
  const categoryId = cat ? cat.id : 'other';
  const subValid = cat?.subCategories.some((s) => s.id === parsed.subcategory);
  const draft = {
    title: String(parsed.title || '').slice(0, 90),
    description: String(parsed.description || '').slice(0, 1200),
    categoryId,
    subcategory: subValid ? String(parsed.subcategory) : '',
    price: typeof parsed.price === 'number' && isFinite(parsed.price) ? parsed.price : null,
    currency: String(parsed.currency || 'USD').toUpperCase().slice(0, 5),
    condition: ['new', 'used', 'refurbished', 'unspecified'].includes(parsed.condition) ? parsed.condition : 'unspecified',
  };

  return NextResponse.json({ ok: true, draft, model: MODEL });
}
