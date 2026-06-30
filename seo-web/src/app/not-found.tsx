import Link from 'next/link';
// Returns a real HTTP 404 (fixes the SPA soft-404 issue, audit T5).
export default function NotFound() {
  return (
    <div style={{ padding: '60px 0' }}>
      <h1>Page not found</h1>
      <p className="intro">That listing or page doesn&apos;t exist or has been removed.</p>
      <p><Link href="/">← Back to Sabalist</Link></p>
    </div>
  );
}
