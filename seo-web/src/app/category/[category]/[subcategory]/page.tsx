import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { INDEX_MIN_LISTINGS } from '@/lib/site';
import { getCategory, getSubCategory } from '@/lib/taxonomy';
import { getListingsBySubcategory } from '@/lib/listings';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingGrid from '@/components/ListingGrid';
import InternalLinks from '@/components/InternalLinks';

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ category: string; subcategory: string }> }): Promise<Metadata> {
  const { category, subcategory } = await params;
  const cat = getCategory(category); const sub = getSubCategory(category, subcategory);
  if (!cat || !sub) return buildMetadata({ title: 'Not found', description: '', path: `/category/${category}/${subcategory}`, index: false });
  let count = 0; try { count = (await getListingsBySubcategory(category, subcategory, 1000)).length; } catch {}
  return buildMetadata({
    title: `${sub.name} for Sale in Africa`,
    description: `Browse ${count ? count + '+ ' : ''}${sub.name.toLowerCase()} listings across Africa on Sabalist. Part of ${cat.name}.`,
    path: `/category/${category}/${subcategory}`,
    index: count >= INDEX_MIN_LISTINGS,
  });
}

export default async function SubcategoryPage({ params }: { params: Promise<{ category: string; subcategory: string }> }) {
  const { category, subcategory } = await params;
  const cat = getCategory(category); const sub = getSubCategory(category, subcategory);
  if (!cat || !sub) notFound();
  let listings = [] as Awaited<ReturnType<typeof getListingsBySubcategory>>;
  try { listings = await getListingsBySubcategory(category, subcategory, 60); } catch {}
  const crumbs = [{ name: 'Home', url: '/' }, { name: cat.name, url: `/category/${category}` }, { name: sub.name, url: `/category/${category}/${subcategory}` }];
  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), collectionPageSchema(`${sub.name} for sale on Sabalist`, `/category/${category}/${subcategory}`, listings)]} />
      <Breadcrumbs items={crumbs} />
      <h1>{sub.name} for sale in Africa</h1>
      <p className="intro">Buy and sell {sub.name.toLowerCase()} across Africa on Sabalist.</p>
      <ListingGrid listings={listings} />
      <InternalLinks activeCategory={category} />
    </>
  );
}
