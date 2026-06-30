import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/metadata';
import { SITE } from '@/lib/site';
import { CATEGORIES } from '@/lib/taxonomy';
import { getRecentListings } from '@/lib/listings';
import ListingGrid from '@/components/ListingGrid';
import InternalLinks from '@/components/InternalLinks';

export const revalidate = 3600; // ISR: refresh featured inventory hourly

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — Buy & Sell across Africa`,
  description: SITE.description,
  path: '/',
});

export default async function HomePage() {
  let recent = [] as Awaited<ReturnType<typeof getRecentListings>>;
  try { recent = await getRecentListings(24); } catch {}
  return (
    <>
      <h1>Buy &amp; Sell across Africa</h1>
      <p className="intro">
        Sabalist is Africa&apos;s marketplace for electronics, vehicles, real estate, phones, fashion,
        jobs and more. Browse {recent.length ? 'fresh' : ''} listings near you, or post your own for free.
      </p>
      <h2 style={{ marginTop: 28 }}>Browse categories</h2>
      <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, listStyle: 'none', padding: 0 }}>
        {CATEGORIES.map((c) => (
          <li key={c.id}><Link href={`/category/${c.id}`}>{c.name}</Link></li>
        ))}
      </ul>
      <h2 style={{ marginTop: 28 }}>Latest listings</h2>
      <ListingGrid listings={recent} />
      <InternalLinks />
    </>
  );
}
