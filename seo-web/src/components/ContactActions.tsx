import { SITE } from '@/lib/site';
import type { Listing } from '@/lib/listings';

// Turns a listing's contact fields into one-tap actions so buyers arriving from
// Google can reach the seller directly (WhatsApp is dominant across Africa),
// instead of bouncing to the app. Server-rendered plain links — no JS.

function digits(s?: string): string {
  return String(s || '').replace(/[^\d]/g, '');
}

export default function ContactActions({ listing, path }: { listing: Listing; path: string }) {
  const url = `${SITE.url}${path}`;
  const waNum = digits(listing.whatsapp || listing.phoneNumber);
  const tel = (listing.phoneNumber || '').trim();
  const email = (listing.email || '').trim();
  const website = (listing.website || '').trim();

  const waText = encodeURIComponent(`Hi, I'm interested in your listing "${listing.title}" on Sabalist — ${url}`);
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10,
    fontWeight: 700, fontSize: 15, textDecoration: 'none', color: '#fff',
  };

  const actions: React.ReactNode[] = [];
  if (waNum.length >= 8) actions.push(
    <a key="wa" href={`https://wa.me/${waNum}?text=${waText}`} style={{ ...btn, background: '#25D366' }} rel="nofollow">
      💬 WhatsApp the seller
    </a>
  );
  if (tel) actions.push(
    <a key="call" href={`tel:${tel}`} style={{ ...btn, background: 'var(--brand)' }} rel="nofollow">📞 Call</a>
  );
  if (email) actions.push(
    <a key="mail" href={`mailto:${email}?subject=${encodeURIComponent('Sabalist: ' + listing.title)}`} style={{ ...btn, background: '#374151' }} rel="nofollow">✉️ Email</a>
  );
  if (website) actions.push(
    <a key="web" href={/^https?:\/\//i.test(website) ? website : `https://${website}`} style={{ ...btn, background: '#374151' }} rel="nofollow noopener" target="_blank">🌐 Website</a>
  );

  if (!actions.length) {
    // No direct contact on the doc — fall back to the app listing.
    return (
      <p style={{ marginTop: 20 }}>
        <a href={`${SITE.appUrl}/listing/${listing.id}`} className="brand">Contact seller on Sabalist →</a>
      </p>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{actions}</div>
      <p style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
        ⚠️ Never pay before you inspect the item. Meet in a public place.{' '}
        <a href={`${SITE.appUrl}/listing/${listing.id}`} style={{ color: 'var(--brand)' }}>Open in the Sabalist app →</a>
      </p>
    </div>
  );
}
