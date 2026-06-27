'use strict';
/**
 * Sabalist category taxonomy + keyword-based auto-categorization.
 *
 * Category ids mirror src/config/categories.js (the app filters listings by the
 * lowercase `categoryId`). Keep this list in sync with that file. Each category
 * carries keyword cues used to auto-assign a category/subcategory when a source
 * doesn't provide one (or provides one we don't recognize).
 */

// Canonical top-level categories (id must match the app's category ids).
const CATEGORIES = [
  { id: 'real-estate', label: 'Real Estate',
    subs: ['houses-sale', 'houses-rent', 'apartments', 'commercial-property', 'land'],
    keywords: ['house', 'home', 'apartment', 'flat', 'condo', 'villa', 'rent', 'for sale', 'bedroom', 'studio', 'land', 'plot', 'acre', 'commercial property', 'office space', 'warehouse'] },
  { id: 'vehicles', label: 'Vehicles',
    subs: ['cars', 'motorcycles', 'trucks', 'buses', 'bicycles', 'boats', 'spare-parts'],
    keywords: ['car', 'sedan', 'suv', 'toyota', 'honda', 'bmw', 'mercedes', 'motorcycle', 'bike', 'truck', 'lorry', 'bus', 'boat', 'yacht', 'auto part', 'spare part', 'tyre', 'mileage', 'engine'] },
  { id: 'electronics', label: 'Electronics',
    subs: ['tvs', 'audio-speakers', 'cameras', 'gaming-consoles', 'accessories'],
    keywords: ['tv', 'television', 'speaker', 'camera', 'playstation', 'xbox', 'console', 'headphone', 'electronic'] },
  { id: 'phones-tablets', label: 'Phones & Tablets',
    subs: ['phones', 'tablets', 'accessories'],
    keywords: ['phone', 'smartphone', 'iphone', 'samsung galaxy', 'tablet', 'ipad', 'android'] },
  { id: 'computers', label: 'Computers',
    subs: ['laptops', 'desktops', 'accessories', 'networking'],
    keywords: ['laptop', 'desktop', 'computer', 'pc', 'macbook', 'monitor', 'keyboard', 'router'] },
  { id: 'fashion', label: 'Fashion',
    subs: ['mens-clothing', 'womens-clothing', 'shoes', 'bags', 'watches-jewelry'],
    keywords: ['clothing', 'dress', 'shirt', 'shoes', 'sneaker', 'bag', 'handbag', 'watch', 'jewelry', 'fashion'] },
  { id: 'beauty', label: 'Beauty',
    subs: ['skincare', 'makeup', 'hair', 'fragrance'],
    keywords: ['beauty', 'makeup', 'skincare', 'cosmetic', 'perfume', 'wig', 'hair'] },
  { id: 'home-furniture', label: 'Home & Furniture',
    subs: ['sofas', 'beds', 'tables', 'appliances', 'decor'],
    keywords: ['furniture', 'sofa', 'couch', 'bed', 'mattress', 'table', 'chair', 'fridge', 'refrigerator', 'washing machine', 'decor'] },
  { id: 'jobs', label: 'Jobs',
    subs: ['full-time', 'part-time', 'freelance', 'internships', 'remote'],
    keywords: ['job', 'hiring', 'vacancy', 'position', 'salary', 'full-time', 'part-time', 'internship', 'recruit', 'employment'] },
  { id: 'services', label: 'Services',
    subs: ['cleaning', 'electrical', 'plumbing', 'repair', 'tutoring', 'design'],
    keywords: ['service', 'cleaning', 'plumber', 'electrician', 'repair', 'tutor', 'design', 'consulting'] },
  { id: 'agriculture', label: 'Agriculture',
    subs: ['crops', 'equipment', 'seeds', 'produce'],
    keywords: ['farm', 'agriculture', 'crop', 'tractor', 'seed', 'harvest', 'fertilizer', 'produce'] },
  { id: 'animals-pets', label: 'Animals & Pets',
    subs: ['dogs', 'cats', 'birds', 'livestock', 'accessories'],
    keywords: ['dog', 'puppy', 'cat', 'kitten', 'pet', 'bird', 'goat', 'cattle', 'cow', 'sheep', 'poultry', 'livestock'] },
  { id: 'business-industrial', label: 'Business & Industrial',
    subs: ['construction-equipment', 'business-opportunities', 'machinery', 'supplies'],
    keywords: ['construction equipment', 'excavator', 'generator', 'machinery', 'industrial', 'business opportunity', 'franchise'] },
  { id: 'events-tickets', label: 'Events & Tickets',
    subs: ['concerts', 'community', 'sports', 'workshops'],
    keywords: ['event', 'ticket', 'concert', 'festival', 'workshop', 'community event', 'meetup'] },
  { id: 'baby-kids', label: 'Baby & Kids',
    subs: ['toys', 'clothing', 'gear', 'furniture'],
    keywords: ['baby', 'kids', 'toy', 'stroller', 'diaper', 'children'] },
  { id: 'food', label: 'Food',
    subs: ['groceries', 'restaurants', 'catering'],
    keywords: ['food', 'grocery', 'restaurant', 'catering', 'meal'] },
  { id: 'education', label: 'Education',
    subs: ['universities', 'colleges', 'schools', 'training', 'tutoring'],
    keywords: ['university', 'universities', 'college', 'school', 'institute', 'polytechnic', 'academy', 'education', 'campus'] },
  { id: 'travel', label: 'Travel',
    subs: ['hotels', 'attractions', 'tours', 'guesthouses'],
    keywords: ['hotel', 'guesthouse', 'lodge', 'resort', 'tour', 'travel', 'attraction', 'museum', 'safari', 'tourism'] },
  { id: 'sports-fitness', label: 'Sports & Fitness',
    subs: ['gyms', 'equipment', 'clubs'],
    keywords: ['gym', 'fitness', 'stadium', 'sports', 'football', 'workout'] },
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const SUB_IDS = new Set(CATEGORIES.flatMap((c) => c.subs));

// Common aliases sources use → our category id.
const CATEGORY_ALIASES = {
  property: 'real-estate', 'real estate': 'real-estate', housing: 'real-estate', homes: 'real-estate',
  autos: 'vehicles', cars: 'vehicles', automotive: 'vehicles', 'motors': 'vehicles',
  mobile: 'phones-tablets', phones: 'phones-tablets', cellphones: 'phones-tablets',
  it: 'computers', laptops: 'computers',
  clothing: 'fashion', apparel: 'fashion',
  pets: 'animals-pets', livestock: 'animals-pets', animals: 'animals-pets',
  employment: 'jobs', careers: 'jobs',
  furniture: 'home-furniture', 'home & garden': 'home-furniture', appliances: 'home-furniture',
  farming: 'agriculture',
};

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

/**
 * Resolve a source-provided category string to a canonical category id, or null.
 */
function resolveCategory(raw) {
  const n = normalize(raw);
  if (!n) return null;
  if (CATEGORY_IDS.has(n)) return n;
  const slug = n.replace(/[\s_]+/g, '-');
  if (CATEGORY_IDS.has(slug)) return slug;
  if (CATEGORY_ALIASES[n]) return CATEGORY_ALIASES[n];
  return null;
}

/**
 * Auto-categorize from free text (title + description). Returns
 * { categoryId, subcategory, confidence } — confidence in [0,1].
 */
function categorize({ title = '', description = '', rawCategory = '' } = {}) {
  // 1) Trust an explicit, recognized source category first.
  const explicit = resolveCategory(rawCategory);
  if (explicit) return { categoryId: explicit, subcategory: null, confidence: 0.95 };

  // 2) Keyword scoring over text.
  const text = `${normalize(title)} ${normalize(description)}`;
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) score += kw.includes(' ') ? 2 : 1; // multi-word cues weigh more
    }
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  if (!best) return { categoryId: null, subcategory: null, confidence: 0 };

  // Try a subcategory by matching its slug words in text.
  let sub = null;
  for (const s of best.subs) {
    const words = s.split('-');
    if (words.every((w) => text.includes(w))) { sub = s; break; }
  }
  // Confidence scales with keyword hits, capped.
  const confidence = Math.min(0.9, 0.4 + bestScore * 0.12);
  return { categoryId: best.id, subcategory: sub, confidence };
}

module.exports = { CATEGORIES, CATEGORY_IDS, SUB_IDS, resolveCategory, categorize };
