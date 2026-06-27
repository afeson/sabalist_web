'use strict';
/**
 * Quality scoring + spam detection for normalized listings.
 *
 * Produces a score in [0,1] and a list of issues. The pipeline uses the score
 * (plus categorization confidence and dedup certainty) to decide auto-publish
 * vs. review queue vs. reject.
 */

const SPAM_PATTERNS = [
  /\b(viagra|casino|porn|crypto giveaway|forex signal|work from home \$\d)/i,
  /\b(click here|act now|100% free|guaranteed income)\b/i,
  /(https?:\/\/\S+){4,}/i, // many links
  /(.)\1{9,}/, // long character runs (aaaaaaaaaa)
];

const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/;

function scoreQuality(listing) {
  const issues = [];
  let score = 1.0;

  const title = String(listing.title || '').trim();
  const desc = String(listing.description || '').trim();

  // Required fields.
  if (!title) { issues.push('missing_title'); score -= 0.5; }
  else if (title.length < 6) { issues.push('title_too_short'); score -= 0.15; }
  if (!listing.categoryId) { issues.push('missing_category'); score -= 0.25; }
  if (!listing.country && !listing.location) { issues.push('missing_location'); score -= 0.2; }

  // Description depth.
  if (!desc) { issues.push('missing_description'); score -= 0.15; }
  else if (desc.length < 30) { issues.push('thin_description'); score -= 0.08; }

  // Price sanity (listings without price are allowed but scored lower).
  const amount = Number(listing.amount ?? listing.price);
  const priceless = ['free', 'call-for-price', 'none', 'job']; // categories where "no price" is normal (jobs, services, free items)
  if (!Number.isFinite(amount) || amount <= 0) {
    if (!priceless.includes(listing.priceType) && listing.categoryId !== 'jobs' && listing.categoryId !== 'services') {
      issues.push('no_price'); score -= 0.08;
    }
  } else if (amount > 0 && amount < 1) {
    issues.push('suspicious_price'); score -= 0.05;
  }

  // Images.
  const images = Array.isArray(listing.images) ? listing.images : [];
  if (images.length === 0) { issues.push('no_images'); score -= 0.12; }

  // Contact present (phone or a contact field) — helps real-listing confidence.
  const hasContact = listing.phoneNumber || PHONE_RE.test(desc) || listing.contact;
  if (!hasContact) { issues.push('no_contact'); score -= 0.05; }

  // Spam signals (hard penalties).
  const blob = `${title}\n${desc}`;
  for (const re of SPAM_PATTERNS) {
    if (re.test(blob)) { issues.push('spam_pattern'); score -= 0.6; break; }
  }
  // All-caps shouting title.
  if (title.length > 12 && title === title.toUpperCase()) { issues.push('all_caps_title'); score -= 0.05; }

  score = Math.max(0, Math.min(1, score));
  return { score: Number(score.toFixed(3)), issues, isSpam: issues.includes('spam_pattern') };
}

module.exports = { scoreQuality };
