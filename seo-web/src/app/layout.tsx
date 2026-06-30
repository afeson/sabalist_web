import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE } from '@/lib/site';
import JsonLd from '@/components/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/schema';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Buy & Sell across Africa`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  manifest: '/site.webmanifest',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.locale}>
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <header className="site">
          <div className="container">
            <Link href="/" className="brand">Sabalist</Link>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site">
          <div className="container">© {new Date().getFullYear()} Sabalist — Africa&apos;s marketplace.</div>
        </footer>
      </body>
    </html>
  );
}
