import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function createAd(payload) {
  const ref = await addDoc(collection(db, "ads"), {
    ...payload,
    status: "active",
    boost: { level: 0, expiresAt: null },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function boostAd(adId, level, expiresAt) {
  await updateDoc(doc(db, "ads", adId), {
    boost: { level, expiresAt },
    updatedAt: serverTimestamp()
  });
}

export async function searchAds({ text, country, category, pageSize = 20, cursor = null }) {
  // Firestore fallback search (title_en prefix)
  const constraints = [
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  ];
  if (country) constraints.unshift(where("country", "==", country));
  if (category) constraints.unshift(where("category", "==", category));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, "ads"), ...constraints);
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(a => (a.title?.en || "").toLowerCase().includes((text||"").toLowerCase()));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}
