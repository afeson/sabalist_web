import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/metadata';
import { canonical, SITE } from '@/lib/site';
import { GUIDES, guideBySlug } from '@/lib/guides';
import { breadcrumbSchema, faqSchema } from '@/lib/schema';
import JsonLd from '@/components/JsonLd';
import Breadcrumbs from '@/components/Breadcrumbs';

export function generateStaticParams() { return GUIDES.map((g) => ({ slug: g.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return buildMetadata({ title: 'Not found', description: '', path: `/guides/${slug}`, index: false });
  return buildMetadata({ title: g.title, description: g.description, path: `/guides/${slug}`, ogType: 'article' });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Guides', url: '/guides' }, { name: g.title, url: `/guides/${slug}` }];
  const article = {
    '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description,
    datePublished: g.updated, dateModified: g.updated, mainEntityOfPage: canonical(`/guides/${slug}`),
    author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.name },
  };
  const schemas: object[] = [breadcrumbSchema(crumbs), article];
  const faq = g.faqs ? faqSchema(g.faqs) : null;
  if (faq) schemas.push(faq);

  return (
    <>
      <JsonLd data={schemas} />
      <Breadcrumbs items={crumbs} />
      <article style={{ maxWidth: 760 }}>
        <h1>{g.title}</h1>
        <p style={{ color: '#888', fontSize: 13 }}>Updated {g.updated}</p>
        {g.body.map((line, i) =>
          line.startsWith('## ')
            ? <h2 key={i} style={{ marginTop: 26 }}>{line.slice(3)}</h2>
            : <p key={i} className="intro">{line}</p>,
        )}
        {g.faqs && g.faqs.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2>Frequently asked questions</h2>
            {g.faqs.map((f, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 4 }}>{f.q}</h3>
                <p className="intro" style={{ marginTop: 0 }}>{f.a}</p>
              </div>
            ))}
          </section>
        )}
      </article>
    </>
  );
}
