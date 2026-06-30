import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { COUNTRIES, getCountry } from '@/lib/locations';
import { breadcrumbSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';
import InternalLinks from '@/components/InternalLinks';

export const revalidate = 3600;
export function generateStaticParams() { return COUNTRIES.map((c) => ({ country: c.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  const co = getCountry(country);
  if (!co) return buildMetadata({ title: 'Not found', description: '', path: `/${country}`, index: false });
  return buildMetadata({
    title: `Buy & Sell in ${co.name}`,
    description: `Free classifieds in ${co.name}. Browse listings in ${co.cities.map((c) => c.name).slice(0, 4).join(', ')} and more on Sabalist.`,
    path: `/${country}`,
  });
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const co = getCountry(country);
  if (!co) notFound();
  const crumbs = [{ name: 'Home', url: '/' }, { name: co.name, url: `/${country}` }];
  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <h1>Buy &amp; sell in {co.name}</h1>
      <p className="intro">Browse free classifieds across {co.name} on Sabalist. Choose a city to see listings near you.</p>
      <h2>Cities in {co.name}</h2>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 12, listStyle: 'none', padding: 0 }}>
        {co.cities.map((c) => (
          <li key={c.slug}><Link href={`/${country}/${c.slug}`}>{c.name}</Link></li>
        ))}
      </ul>
      <InternalLinks />
    </>
  );
}
