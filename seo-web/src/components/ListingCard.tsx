import Link from 'next/link';
import { formatPrice } from '@/lib/pricing';
import type { Listing } from '@/lib/listings';

// Crawlable listing card: real <a href>, descriptive alt, eager dimensions.
export default function ListingCard({ listing }: { listing: Listing }) {
  const img = listing.coverImage || listing.images?.[0];
  const alt = `${listing.title}${listing.category ? ' — ' + listing.category : ''}${listing.location ? ' in ' + listing.location : ''}`;
  return (
    <Link href={`/listing/${listing.id}`} className="card">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={alt} width={400} height={300} loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: 8 }} />
      ) : (
        <div className="ph" aria-hidden style={{ aspectRatio: '4/3', borderRadius: 8, background: '#f1f1f1' }} />
      )}
      <h3 style={{ fontSize: 15, margin: '8px 0 2px' }}>{listing.title}</h3>
      <div style={{ fontWeight: 700 }}>{formatPrice(listing)}</div>
      {listing.location && <div style={{ color: '#666', fontSize: 13 }}>{listing.location}</div>}
    </Link>
  );
}
