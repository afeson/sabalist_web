'use client';

import { useState } from 'react';

type Row = {
  id: string;
  title: string;
  sellerName: string;
  businessId: string;
  city: string;
  country: string;
  coverImage: string;
  claimed: boolean;
};

type SearchResult = {
  ok: boolean;
  businessId?: string;
  total?: number;
  unclaimed?: number;
  listings?: Row[];
  error?: string;
};

export default function ClaimPage() {
  const [name, setName] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [claimant, setClaimant] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setDone(null);
    if (name.trim().length < 2) {
      setError('Enter at least 2 characters.');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/claim?name=${encodeURIComponent(name.trim())}`);
      const json: SearchResult = await res.json();
      setResult(json);
      if (!json.ok) setError(json.error || 'Search failed.');
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!claimant.trim()) return setError('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: result?.businessId,
          sellerName: name.trim(),
          listingIds: (result?.listings || []).filter((r) => !r.claimed).map((r) => r.id),
          claimantName: claimant.trim(),
          email: email.trim(),
          phone: phone.trim(),
          note: note.trim(),
        }),
      });
      const json = await res.json();
      if (json.ok) setDone(json.claimId);
      else setError(json.error || 'Could not submit claim.');
    } catch {
      setError('Could not submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const S = {
    page: { maxWidth: 720, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#1f2430' } as React.CSSProperties,
    h1: { fontSize: 26, margin: '0 0 6px' } as React.CSSProperties,
    sub: { color: '#6b7280', margin: '0 0 24px' } as React.CSSProperties,
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 16 } as React.CSSProperties,
    label: { display: 'block', fontSize: 13, color: '#6b7280', margin: '10px 0 4px' } as React.CSSProperties,
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' } as React.CSSProperties,
    btn: { background: '#E6006E', color: '#fff', border: 0, borderRadius: 8, padding: '11px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    err: { color: '#b3261e', fontSize: 14, marginTop: 10 } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginTop: 12 } as React.CSSProperties,
    tile: { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', fontSize: 12 } as React.CSSProperties,
    img: { width: '100%', height: 90, objectFit: 'cover', background: '#f3f4f6' } as React.CSSProperties,
  };

  if (done) {
    return (
      <main style={S.page}>
        <h1 style={S.h1}>Claim submitted ✅</h1>
        <p style={S.sub}>
          Thanks, {claimant}. Your claim for <b>{name}</b> is now pending review. We&apos;ll email{' '}
          <b>{email}</b> once it&apos;s verified. Reference: <code>{done}</code>
        </p>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <h1 style={S.h1}>Claim your business on Sabalist</h1>
      <p style={S.sub}>
        Find the listings we&apos;ve published for your business and claim them. Once verified you get a
        verified badge and control over your listings.
      </p>

      <div style={S.card}>
        <form onSubmit={search}>
          <label style={S.label}>Business name</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Electronics" />
            <button style={S.btn} disabled={searching} type="submit">{searching ? 'Searching…' : 'Search'}</button>
          </div>
        </form>

        {result?.ok && (
          <div style={{ marginTop: 16 }}>
            {result.total === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                No listings found for “{name}”. Check the exact spelling, or contact us to get listed.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14 }}>
                  Found <b>{result.total}</b> listing(s) — <b>{result.unclaimed}</b> available to claim.
                </p>
                <div style={S.grid}>
                  {result.listings!.slice(0, 12).map((r) => (
                    <div key={r.id} style={S.tile}>
                      {r.coverImage ? <img src={r.coverImage} alt="" style={S.img} /> : <div style={S.img} />}
                      <div style={{ padding: 6 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                        <div style={{ color: '#6b7280' }}>{[r.city, r.country].filter(Boolean).join(', ')}</div>
                        {r.claimed && <div style={{ color: '#0a7d33' }}>✓ already claimed</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {result?.ok && (result.unclaimed || 0) > 0 && (
        <div style={S.card}>
          <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Confirm it&apos;s you</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>
            We&apos;ll verify before transferring the {result.unclaimed} unclaimed listing(s).
          </p>
          <form onSubmit={submit}>
            <label style={S.label}>Your full name *</label>
            <input style={S.input} value={claimant} onChange={(e) => setClaimant(e.target.value)} />
            <label style={S.label}>Business email *</label>
            <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" />
            <label style={S.label}>Phone (optional)</label>
            <input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label style={S.label}>Anything that proves ownership? (optional)</label>
            <textarea style={{ ...S.input, minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Website, social handle, business registration no., etc." />
            <div style={{ marginTop: 14 }}>
              <button style={S.btn} disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Submit claim'}</button>
            </div>
          </form>
        </div>
      )}

      {error && <p style={S.err}>{error}</p>}
    </main>
  );
}
