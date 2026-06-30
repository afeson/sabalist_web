import ListingCard from './ListingCard';
import type { Listing } from '@/lib/listings';
export default function ListingGrid({ listings }: { listings: Listing[] }) {
  if (!listings.length) return <p style={{ color: '#666' }}>No listings yet — check back soon.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
      {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
    </div>
  );
}
