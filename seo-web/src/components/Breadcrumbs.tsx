import Link from 'next/link';
export type Crumb = { name: string; url: string };
// Visible, crawlable breadcrumb trail (pairs with breadcrumbSchema()).
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 14, margin: '12px 0' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((it, i) => (
          <li key={it.url} style={{ display: 'flex', gap: 6 }}>
            {i < items.length - 1 ? <Link href={it.url}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
