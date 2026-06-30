import { ImageResponse } from 'next/og';
import { getListingRest } from '@/lib/firestore-rest';
import { formatPrice } from '@/lib/pricing';

export const runtime = 'edge';
const W = 1200, H = 630, BRAND = '#E50914';

// Branded 1200×630 social card per listing: photo + title + price + location.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let l: any = null;
  try { l = await getListingRest(id); } catch {}
  const title = (l?.title || 'Sabalist').slice(0, 90);
  const price = l ? formatPrice(l) : '';
  const location = l?.location || '';
  const photo = l?.coverImage || (Array.isArray(l?.images) ? l.images[0] : undefined);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0f1115', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', width: '52%', height: '100%', background: '#1b1f27', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={W * 0.52} height={H} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', fontSize: 48, color: '#444' }}>Sabalist</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: '48%', height: '100%', padding: 56, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', color: BRAND, fontSize: 30, fontWeight: 800 }}>Sabalist</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
            {price ? <div style={{ display: 'flex', marginTop: 18, fontSize: 40, fontWeight: 800, color: BRAND }}>{price}</div> : null}
            {location ? <div style={{ display: 'flex', marginTop: 10, fontSize: 26, color: '#9aa0ab' }}>📍 {location}</div> : null}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#9aa0ab' }}>Buy &amp; Sell across Africa</div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable' } },
  );
}
