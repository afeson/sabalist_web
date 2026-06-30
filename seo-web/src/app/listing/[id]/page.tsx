import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { getListing, getRelatedListings } from '@/lib/listings';
import { getCategory } from '@/lib/taxonomy';
import { formatPrice } from '@/lib/pricing';
import { breadcrumbSchema, productSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListingGrid from '@/components/ListingGrid';

export const revalidate = 86400; // ISR daily; purge on edit via revalidate webhook

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let l = null; try { l = await getListing(id); } catch {}
  if (!l) return buildMetadata({ title: 'Listing not found', description: '', path: `/listing/${id}`, index: false });
  const price = formatPrice(l);
  const where = l.location ? ` in ${l.location}` : '';
  return buildMetadata({
    title: `${l.title}${price ? ' — ' + price : ''}${where}`,
    description: (l.description || l.title).slice(0, 160),
    path: `/listing/${id}`,
    ogImage: `/og/listing/${id}`, // dynamic 1200x630 branded card
    ogType: 'product',
    index: !l.status || l.status === 'active' || l.status === 'sold',
  });
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let l = null; try { l = await getListing(id); } catch {}
  if (!l) notFound();
  const cat = l.categoryId ? getCategory(l.categoryId) : undefined;
  const related = await getRelatedListings(l, 8).catch(() => []);
  const crumbs = [{ name: 'Home', url: '/' }];
  if (cat) crumbs.push({ name: cat.name, url: `/category/${cat.id}` });
  crumbs.push({ name: l.title, url: `/listing/${id}` });
  const images = [l.coverImage, ...(l.images || [])].filter(Boolean) as string[];
  return (
    <>
      <JsonLd data={[breadcrumbSchema(crumbs), productSchema(l, `/listing/${id}`)]} />
      <Breadcrumbs items={crumbs} />
      <article>
        <h1>{l.title}</h1>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand)', margin: '6px 0 14px' }}>{formatPrice(l)}</div>
        {images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={`${l.title}${l.location ? ' in ' + l.location : ''}`} width={800} height={600} style={{ maxWidth: '100%', height: 'auto', borderRadius: 10 }} />
        )}
        {l.location && <p style={{ color: '#555' }}>📍 {l.location}</p>}
        {l.description && <p className="intro" style={{ whiteSpace: 'pre-wrap' }}>{l.description}</p>}
        <p style={{ marginTop: 20 }}>
          {/* Interactive actions (contact/chat/favorite) live in the app */}
          <Link href={`/app/listing/${id}`} className="brand">Contact seller on Sabalist →</Link>
        </p>
      </article>
      {related.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2>Similar listings</h2>
          <ListingGrid listings={related} />
        </section>
      )}
    </>
  );
}
