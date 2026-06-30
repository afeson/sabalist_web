import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { INDEX_MIN_LISTINGS } from '@/lib/site';
import { getCountry, getCity } from '@/lib/locations';
import { getCategory } from '@/lib/taxonomy';
import { getListingsByCity, countListingsByCity } from '@/lib/listings';
import { breadcrumbSchema, collectionPageSchema, cityPlaceSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingGrid from '@/components/ListingGrid';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ country: string; city: string; category: string }> }): Promise<Metadata> {
  const { country, city, category } = await params;
  const co = getCountry(country); const ci = getCity(country, city); const cat = getCategory(category);
  if (!co || !ci || !cat) return buildMetadata({ title: 'Not found', description: '', path: `/${country}/${city}/${category}`, index: false });
  let count = 0; try { count = await countListingsByCity(co, ci, category); } catch {}
  return buildMetadata({
    title: `${cat.name} for Sale in ${ci.name}, ${co.name}`,
    description: `${count ? count + '+ ' : ''}${cat.name.toLowerCase()} listings in ${ci.name}, ${co.name} on Sabalist.`,
    path: `/${country}/${city}/${category}`,
    index: count >= INDEX_MIN_LISTINGS,
  });
}

export default async function CityCategoryPage({ params }: { params: Promise<{ country: string; city: string; category: string }> }) {
  const { country, city, category } = await params;
  const co = getCountry(country); const ci = getCity(country, city); const cat = getCategory(category);
  if (!co || !ci || !cat) notFound();
  let listings = [] as Awaited<ReturnType<typeof getListingsByCity>>;
  try { listings = await getListingsByCity(co, ci, category, 60); } catch {}
  const crumbs = [
    { name: 'Home', url: '/' }, { name: co.name, url: `/${country}` },
    { name: ci.name, url: `/${country}/${city}` }, { name: cat.name, url: `/${country}/${city}/${category}` },
  ];
  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), cityPlaceSchema(ci.name, co.name), collectionPageSchema(`${cat.name} in ${ci.name}, ${co.name}`, `/${country}/${city}/${category}`, listings)]} />
      <Breadcrumbs items={crumbs} />
      <h1>{cat.name} for sale in {ci.name}, {co.name}</h1>
      <p className="intro">Browse {cat.name.toLowerCase()} listings in {ci.name} on Sabalist.</p>
      <ListingGrid listings={listings} />
    </>
  );
}
