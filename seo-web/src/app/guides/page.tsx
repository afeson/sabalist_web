import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/metadata';
import { GUIDES } from '@/lib/guides';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = buildMetadata({
  title: 'Buying & Selling Guides',
  description: 'Guides for buying and selling safely on Sabalist across Africa.',
  path: '/guides',
});

export default function GuidesIndex() {
  return (
    <>
      <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Guides', url: '/guides' }]} />
      <h1>Marketplace guides</h1>
      <ul style={{ lineHeight: 2 }}>
        {GUIDES.map((g) => (
          <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title}</Link></li>
        ))}
      </ul>
    </>
  );
}
