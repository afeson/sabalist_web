import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { INDEX_MIN_LISTINGS } from '@/lib/site';
import { getCountry, getCity } from '@/lib/locations';
import { CATEGORIES } from '@/lib/taxonomy';
import { getListingsByCity, countListingsByCity } from '@/lib/listings';
import { breadcrumbSchema, collectionPageSchema, cityPlaceSchema, faqSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingGrid from '@/components/ListingGrid';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ country: string; city: string }> }): Promise<Metadata> {
  const { country, city } = await params;
  const co = getCountry(country); const ci = getCity(country, city);
  if (!co || !ci) return buildMetadata({ title: 'Not found', description: '', path: `/${country}/${city}`, index: false });
  let count = 0; try { count = await countListingsByCity(co, ci); } catch {}
  return buildMetadata({
    title: `Buy & Sell in ${ci.name}, ${co.name}`,
    description: `${count ? count + '+ ' : ''}free classifieds in ${ci.name}, ${co.name}. Cars, phones, property, electronics and more on Sabalist.`,
    path: `/${country}/${city}`,
    index: count >= INDEX_MIN_LISTINGS,
  });
}

export default async function CityPage({ params }: { params: Promise<{ country: string; city: string }> }) {
  const { country, city } = await params;
  const co = getCountry(country); const ci = getCity(country, city);
  if (!co || !ci) notFound();
  let listings = [] as Awaited<ReturnType<typeof getListingsByCity>>;
  try { listings = await getListingsByCity(co, ci, undefined, 60); } catch {}
  const crumbs = [{ name: 'Home', url: '/' }, { name: co.name, url: `/${country}` }, { name: ci.name, url: `/${country}/${city}` }];
  const faqs = [
    { q: `Is Sabalist free to use in ${ci.name}?`, a: `Yes. Browsing and posting classified listings in ${ci.name}, ${co.name} on Sabalist is free.` },
    { q: `How do I buy safely in ${ci.name}?`, a: `Meet sellers in public places, inspect items before paying, and never send money in advance to someone you haven't met.` },
  ];
  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), cityPlaceSchema(ci.name, co.name), collectionPageSchema(`Listings in ${ci.name}, ${co.name}`, `/${country}/${city}`, listings), faqSchema(faqs)].filter(Boolean) as object[]} />
      <Breadcrumbs items={crumbs} />
      <h1>Buy &amp; sell in {ci.name}, {co.name}</h1>
      <p className="intro">Browse free classified listings in {ci.name}. Find cars, phones, property, electronics, furniture and more near you on Sabalist.</p>
      <nav aria-label="Categories in city" style={{ margin: '14px 0' }}>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10, listStyle: 'none', padding: 0 }}>
          {CATEGORIES.slice(0, 12).map((c) => (
            <li key={c.id}><Link href={`/${country}/${city}/${c.id}`}>{c.name} in {ci.name}</Link></li>
          ))}
        </ul>
      </nav>
      <ListingGrid listings={listings} />
    </>
  );
}
