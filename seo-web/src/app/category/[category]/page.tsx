import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { INDEX_MIN_LISTINGS } from '@/lib/site';
import { CATEGORIES, getCategory } from '@/lib/taxonomy';
import { getListingsByCategory } from '@/lib/listings';
import { breadcrumbSchema, collectionPageSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingGrid from '@/components/ListingGrid';
import InternalLinks from '@/components/InternalLinks';

export const revalidate = 1800;
export function generateStaticParams() { return CATEGORIES.map((c) => ({ category: c.id })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return buildMetadata({ title: 'Not found', description: '', path: `/category/${category}`, index: false });
  let count = 0; try { count = (await getListingsByCategory(category, 1000)).length; } catch {}
  return buildMetadata({
    title: `Buy & Sell ${cat.name} in Africa`,
    description: `Browse ${count ? count + '+ ' : ''}${cat.name.toLowerCase()} listings across Africa. ${cat.subCategories.slice(0, 3).map((s) => s.name).join(', ')} and more on Sabalist.`,
    path: `/category/${category}`,
    index: count >= INDEX_MIN_LISTINGS,
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();
  let listings = [] as Awaited<ReturnType<typeof getListingsByCategory>>;
  try { listings = await getListingsByCategory(category, 60); } catch {}
  const crumbs = [{ name: 'Home', url: '/' }, { name: cat.name, url: `/category/${category}` }];
  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), collectionPageSchema(`${cat.name} for sale on Sabalist`, `/category/${category}`, listings)]} />
      <Breadcrumbs items={crumbs} />
      <h1>{cat.name} for sale in Africa</h1>
      <p className="intro">Buy and sell {cat.name.toLowerCase()} across Africa on Sabalist — {cat.subCategories.map((s) => s.name).slice(0, 5).join(', ')} and more.</p>
      {cat.subCategories.length > 0 && (
        <nav aria-label="Subcategories" style={{ margin: '14px 0' }}>
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10, listStyle: 'none', padding: 0 }}>
            {cat.subCategories.map((s) => (
              <li key={s.id}><Link href={`/category/${category}/${s.id}`}>{s.name}</Link></li>
            ))}
          </ul>
        </nav>
      )}
      <ListingGrid listings={listings} />
      <InternalLinks activeCategory={category} />
    </>
  );
}
