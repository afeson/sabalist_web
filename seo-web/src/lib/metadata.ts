import type { Metadata } from 'next';
import { SITE, canonical } from './site';

type Args = {
  title: string; description: string; path: string;
  index?: boolean; ogImage?: string; ogType?: 'website' | 'article' | 'product';
};
// Central metadata builder → keeps title/canonical/OG/Twitter/robots consistent.
export function buildMetadata({ title, description, path, index = true, ogImage, ogType = 'website' }: Args): Metadata {
  const url = canonical(path);
  const image = ogImage || SITE.defaultOgImage;
  return {
    title, description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title, description, url, siteName: SITE.name, type: ogType === 'article' ? 'article' : 'website', images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
