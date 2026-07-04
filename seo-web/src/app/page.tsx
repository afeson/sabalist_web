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
  title: `${SITE.name} — Africa's Business Directory & Classified Marketplace`,
  description: SITE.description,
  path: '/',
});

// Sabalist's two sides, expressed as category groupings.
const BUSINESS_CATS = ['food', 'travel', 'services', 'education', 'beauty', 'community', 'agriculture', 'sports-fitness', 'construction', 'repair-services'];
const CLASSIFIED_CATS = ['vehicles', 'real-estate', 'electronics', 'phones-tablets', 'computers', 'fashion', 'home-furniture', 'jobs', 'rentals', 'baby-kids'];
const nameOf = (id: string) => CATEGORIES.find((c) => c.id === id)?.name || id;

function CatGrid({ ids }: { ids: string[] }) {
  return (
    <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, listStyle: 'none', padding: 0 }}>
      {ids.filter((id) => CATEGORIES.some((c) => c.id === id)).map((id) => (
        <li key={id}><Link href={`/category/${id}`}>{nameOf(id)}</Link></li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  let recent = [] as Awaited<ReturnType<typeof getRecentListings>>;
  try { recent = await getRecentListings(24); } catch {}

  return (
    <>
      <h1>Africa&apos;s Business Directory &amp; Classified Marketplace</h1>
      <p className="intro">
        <strong>Sabalist is Africa&apos;s business directory and classified marketplace.</strong>{' '}
        Find African businesses — restaurants, hotels, hospitals, schools, banks and shops — or buy
        and sell in the marketplace. Two products, one Sabalist.
      </p>

      {/* What you can do — both sides, up front */}
      <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, listStyle: 'none', padding: 0, marginTop: 18 }}>
        <li><Link href="#search-businesses"><strong>🔎 Find African businesses</strong><br />Search millions of real businesses</Link></li>
        <li><Link href="#latest-listings"><strong>🛒 Browse marketplace listings</strong><br />Cars, phones, rentals, jobs &amp; more</Link></li>
        <li><Link href={SITE.appUrl}><strong>📢 Post a free ad</strong><br />Sell your item in minutes</Link></li>
        <li><Link href="/claim"><strong>✅ Claim or update your business</strong><br />Take ownership of your profile</Link></li>
      </ul>

      {/* SECTION 1 — Search businesses (Business Directory) */}
      <section id="search-businesses" style={{ marginTop: 34 }}>
        <h2>1. Search businesses</h2>
        <p>Africa&apos;s largest directory of real businesses — find and contact restaurants, hotels,
          hospitals, schools, service providers and more across 54 countries.</p>
        <CatGrid ids={BUSINESS_CATS} />
      </section>

      {/* SECTION 2 — Browse classifieds (Marketplace) */}
      <section id="browse-classifieds" style={{ marginTop: 34 }}>
        <h2>2. Browse classifieds</h2>
        <p>The marketplace for buying and selling — cars, electronics, phones, property, fashion and
          jobs. <Link href={SITE.appUrl}>Post your own ad free →</Link></p>
        <CatGrid ids={CLASSIFIED_CATS} />
      </section>

      {/* SECTION 3 — Popular business categories */}
      <section id="popular-business" style={{ marginTop: 34 }}>
        <h2>3. Popular business categories</h2>
        <CatGrid ids={['food', 'travel', 'services', 'education', 'beauty', 'community']} />
      </section>

      {/* SECTION 4 — Latest marketplace listings */}
      <section id="latest-listings" style={{ marginTop: 34 }}>
        <h2>4. Latest marketplace listings</h2>
        <ListingGrid listings={recent} />
      </section>

      <InternalLinks />
    </>
  );
}
