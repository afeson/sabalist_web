import Link from 'next/link';
import { CATEGORIES } from '@/lib/taxonomy';
import { COUNTRIES } from '@/lib/locations';

// Footer interlink block: connects categories ↔ locations so crawlers always
// find a real <a href> graph regardless of which page they land on.
export default function InternalLinks({ activeCategory }: { activeCategory?: string }) {
  return (
    <section aria-label="Browse Sabalist" style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Categories</h2>
          <ul style={{ listStyle: 'none', padding: 0, columns: 2, fontSize: 14 }}>
            {CATEGORIES.map((c) => (
              <li key={c.id}><Link href={`/category/${c.id}`} style={{ fontWeight: c.id === activeCategory ? 700 : 400 }}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', color: '#888' }}>Popular locations</h2>
          <ul style={{ listStyle: 'none', padding: 0, columns: 2, fontSize: 14 }}>
            {COUNTRIES.flatMap((co) =>
              co.cities.map((ci) => (
                <li key={`${co.slug}/${ci.slug}`}><Link href={`/${co.slug}/${ci.slug}`}>{ci.name}</Link></li>
              )),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
