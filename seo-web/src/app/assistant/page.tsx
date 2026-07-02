'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES } from '@/lib/taxonomy';

type Draft = {
  title: string;
  description: string;
  categoryId: string;
  subcategory: string;
  price: number | null;
  currency: string;
  condition: string;
};

function readImage(file: File): Promise<{ base64: string; mediaType: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read image'));
    r.onload = () => {
      const url = String(r.result || '');
      const base64 = url.split(',')[1] || '';
      resolve({ base64, mediaType: file.type || 'image/jpeg', preview: url });
    };
    r.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const [img, setImg] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [secret, setSecret] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<'gen' | 'pub' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);

  const subs = useMemo(
    () => CATEGORIES.find((c) => c.id === draft?.categoryId)?.subCategories || [],
    [draft?.categoryId]
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    try {
      setImg(await readImage(f));
    } catch {
      setError('Could not read that image.');
    }
  }

  async function generate() {
    setError(null);
    setPublished(null);
    if (!img && !notes.trim()) {
      setError('Add a photo or a short description first.');
      return;
    }
    setBusy('gen');
    try {
      const res = await fetch('/api/ai-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(secret ? { 'x-ai-secret': secret } : {}) },
        body: JSON.stringify({ imageBase64: img?.base64, mediaType: img?.mediaType, notes, country, city }),
      });
      const json = await res.json();
      if (json.ok) setDraft(json.draft);
      else setError(json.error || 'Generation failed.');
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!draft) return;
    setError(null);
    if (!draft.title.trim()) return setError('Give it a title.');
    setBusy('pub');
    try {
      const res = await fetch('/api/publish-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          imageBase64: img?.base64,
          mediaType: img?.mediaType,
          country,
          city,
          phone,
          sellerName,
        }),
      });
      const json = await res.json();
      if (json.ok) setPublished(json.url || json.id);
      else setError(json.error || 'Publish failed.');
    } catch {
      setError('Publish failed. Please try again.');
    } finally {
      setBusy(null);
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
    ghost: { background: '#fff', color: '#E6006E', border: '1px solid #E6006E', borderRadius: 8, padding: '11px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    row: { display: 'flex', gap: 12, flexWrap: 'wrap' } as React.CSSProperties,
    err: { color: '#b3261e', fontSize: 14, marginTop: 10 } as React.CSSProperties,
    prev: { width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8, background: '#f3f4f6' } as React.CSSProperties,
  };

  if (published) {
    return (
      <main style={S.page}>
        <h1 style={S.h1}>Listing published 🎉</h1>
        <p style={S.sub}>
          Your listing is live: <a href={published} style={{ color: '#E6006E' }}>{published}</a>
        </p>
        <button style={S.btn} onClick={() => { setPublished(null); setDraft(null); setImg(null); setNotes(''); }}>
          Create another
        </button>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <h1 style={S.h1}>AI Listing Assistant</h1>
      <p style={S.sub}>Snap a photo (and add a few words). We&apos;ll write the listing for you — you review, then publish.</p>

      <div style={S.card}>
        <label style={S.label}>Product photo</label>
        <input type="file" accept="image/*" onChange={onFile} />
        {img && <img src={img.preview} alt="preview" style={{ ...S.prev, marginTop: 10 }} />}

        <label style={S.label}>Anything to add? (optional)</label>
        <textarea style={{ ...S.input, minHeight: 64 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. barely used, 128GB, comes with charger" />

        <div style={S.row}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>City</label>
            <input style={S.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={S.label}>Country</label>
            <input style={S.input} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button style={S.btn} disabled={busy === 'gen'} onClick={generate}>
            {busy === 'gen' ? 'Writing your listing…' : '✨ Generate listing'}
          </button>
        </div>
      </div>

      {draft && (
        <div style={S.card}>
          <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Review &amp; edit</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>The AI drafted this from your photo — fix anything before publishing.</p>

          <label style={S.label}>Title</label>
          <input style={S.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />

          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, minHeight: 90 }} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Category</label>
              <select style={S.input} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value, subcategory: '' })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Subcategory</label>
              <select style={S.input} value={draft.subcategory} onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })}>
                <option value="">—</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={S.label}>Price</label>
              <input style={S.input} type="number" value={draft.price ?? ''} onChange={(e) => setDraft({ ...draft, price: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div style={{ width: 110 }}>
              <label style={S.label}>Currency</label>
              <input style={S.input} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={S.label}>Condition</label>
              <select style={S.input} value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })}>
                {['unspecified', 'new', 'used', 'refurbished'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Seller name</label>
              <input style={S.input} value={sellerName} onChange={(e) => setSellerName(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Contact phone</label>
              <input style={S.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button style={S.btn} disabled={busy === 'pub'} onClick={publish}>{busy === 'pub' ? 'Publishing…' : 'Publish listing'}</button>
            <button style={S.ghost} disabled={busy === 'gen'} onClick={generate}>↻ Regenerate</button>
          </div>
        </div>
      )}

      <details style={{ color: '#9ca3af', fontSize: 12 }}>
        <summary>Internal key (only if this tool is restricted)</summary>
        <input style={{ ...S.input, marginTop: 8 }} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="x-ai-secret" />
      </details>

      {error && <p style={S.err}>{error}</p>}
    </main>
  );
}
