import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, limit as qlimit, getDocs, addDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

// Business Claim intake.
//
// GET  /api/claim?name=Acme Electronics
//   → finds the auto-imported / bulk-uploaded listings that belong to a business
//     so the owner can confirm before claiming. Matches on businessId
//     (business-<slug>, set by the bulk uploader) and on an exact sellerName.
//
// POST /api/claim  { businessId?, sellerName, listingIds[], claimantName, email, phone, note }
//   → records a pending claim in `business_claims`. An admin approves it in the
//     admin dashboard, which flips businessVerified + assigns ownership.
//
// All Firestore access is server-side with the public read-only client (the
// EXPO_PUBLIC_* config is server-only in Next), so no key reaches the browser.

const slug = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function pick(d: any) {
  return {
    id: d.id,
    title: d.title || '',
    sellerName: d.sellerName || '',
    businessId: d.businessId || '',
    city: d.city || '',
    country: d.country || '',
    coverImage: d.coverImage || (Array.isArray(d.images) ? d.images[0] : '') || '',
    claimed: d.businessVerified === true,
  };
}

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get('name') || '').trim();
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: 'Enter at least 2 characters' }, { status: 400 });
  }
  try {
    const bizId = 'business-' + slug(name);
    const col = collection(db(), 'listings');
    const [byId, byName] = await Promise.all([
      getDocs(query(col, where('businessId', '==', bizId), qlimit(200))),
      getDocs(query(col, where('sellerName', '==', name), qlimit(200))),
    ]);
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const snap of [byId, byName]) {
      snap.forEach((s) => {
        if (seen.has(s.id)) return;
        seen.add(s.id);
        rows.push(pick({ id: s.id, ...s.data() }));
      });
    }
    return NextResponse.json({
      ok: true,
      businessId: bizId,
      total: rows.length,
      unclaimed: rows.filter((r) => !r.claimed).length,
      listings: rows.slice(0, 60),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'search failed' }, { status: 500 });
  }
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const claimantName = String(body.claimantName || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const note = String(body.note || '').trim().slice(0, 1000);
  const sellerName = String(body.sellerName || '').trim();
  const businessId = String(body.businessId || '').trim();
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((x: any) => typeof x === 'string').slice(0, 50)
    : [];

  if (!claimantName) return NextResponse.json({ ok: false, error: 'Your name is required' }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ ok: false, error: 'A valid email is required' }, { status: 400 });
  if (!sellerName && !businessId)
    return NextResponse.json({ ok: false, error: 'Business is required' }, { status: 400 });

  try {
    const ref = await addDoc(collection(db(), 'business_claims'), {
      businessId,
      sellerName,
      listingIds,
      listingCount: listingIds.length,
      claimantName,
      email,
      phone,
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'claim-web',
    });
    return NextResponse.json({ ok: true, claimId: ref.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'could not submit claim' }, { status: 500 });
  }
}
