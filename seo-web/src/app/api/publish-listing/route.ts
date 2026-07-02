import { NextRequest, NextResponse } from 'next/server';
import { db, fbApp } from '@/lib/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCategory } from '@/lib/taxonomy';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Publishes a listing produced by the AI assistant. The photo (if any) is
// uploaded to Firebase Storage under listings/<id>/ (storage.rules allow
// unauthenticated image create) and its download URL is stored on the doc.
// The `listings` create rule permits a write that carries a userId string.

const SUB_MEDIA: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req: NextRequest) {
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const title = String(b.title || '').trim().slice(0, 90);
  if (!title) return NextResponse.json({ ok: false, error: 'Title is required' }, { status: 400 });
  const cat = getCategory(String(b.categoryId || ''));
  if (!cat) return NextResponse.json({ ok: false, error: 'Valid category is required' }, { status: 400 });

  const price = typeof b.price === 'number' && isFinite(b.price) ? b.price : 0;
  const country = String(b.country || '').trim();
  const city = String(b.city || '').trim();
  const extraUrls: string[] = Array.isArray(b.imageUrls)
    ? b.imageUrls.filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 8)
    : [];

  try {
    // Pre-generate the id so the photo can live under listings/<id>/.
    const listingRef = doc(collection(db(), 'listings'));
    const id = listingRef.id;

    const images: string[] = [];
    if (typeof b.imageBase64 === 'string' && b.imageBase64.length > 0) {
      if (b.imageBase64.length > 14_000_000) {
        return NextResponse.json({ ok: false, error: 'Image too large (max ~10MB).' }, { status: 413 });
      }
      const mediaType = String(b.mediaType || 'image/jpeg');
      const ext = SUB_MEDIA[mediaType] || 'jpg';
      const bytes = new Uint8Array(Buffer.from(b.imageBase64, 'base64'));
      const storage = getStorage(fbApp());
      const sref = ref(storage, `listings/${id}/photo-1.${ext}`);
      await uploadBytes(sref, bytes, { contentType: mediaType });
      images.push(await getDownloadURL(sref));
    }
    images.push(...extraUrls);

    const now = new Date().toISOString();
    const listing = {
      title,
      description: String(b.description || '').slice(0, 1200),
      price,
      amount: price || null,
      priceType: price > 0 ? 'fixed' : 'none',
      currency: String(b.currency || 'USD').toUpperCase().slice(0, 5),
      categoryId: cat.id,
      category: cat.id,
      subcategory: cat.subCategories.some((s) => s.id === b.subcategory) ? String(b.subcategory) : '',
      condition: ['new', 'used', 'refurbished', 'unspecified'].includes(b.condition) ? b.condition : 'unspecified',
      country,
      city,
      location: [city, country].filter(Boolean).join(', '),
      images,
      coverImage: images[0] || '',
      hasImage: images.length > 0,
      phoneNumber: String(b.phone || '').trim(),
      sellerName: String(b.sellerName || '').trim(),
      userId: 'ai-assistant',
      source: 'ai-assistant',
      status: 'active',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(listingRef, listing);
    return NextResponse.json({ ok: true, id, url: `https://www.sabalist.com/listing/${id}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'could not publish' }, { status: 500 });
  }
}
