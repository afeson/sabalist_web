// Edge-safe Firestore reader using the public REST API (no SDK), for the OG
// image route which runs on the edge runtime. The `listings` collection is
// world-readable, so the public API key is sufficient.
const PROJECT = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

function decode(fields: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries<any>(fields || {})) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = Number(v.doubleValue);
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('arrayValue' in v) out[k] = (v.arrayValue.values || []).map((x: any) => (x.stringValue ?? x.integerValue ?? x.doubleValue));
    else if ('mapValue' in v) out[k] = decode(v.mapValue.fields);
    else if ('timestampValue' in v) out[k] = v.timestampValue;
  }
  return out;
}

export async function getListingRest(id: string): Promise<any | null> {
  if (!PROJECT || !KEY) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/listings/${encodeURIComponent(id)}?key=${KEY}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const json: any = await res.json();
  if (!json.fields) return null;
  return { id, ...decode(json.fields) };
}
