'use strict';
/**
 * Category query packs — maps EXISTING Sabalist categories to product searches
 * for product sources (eBay, AliExpress). Only categories that real PRODUCT
 * feeds can legitimately fill are here. Each pack targets items that are genuine,
 * purchasable products (not services, not live animals, not catalog-only).
 *
 * NOT fillable by product feeds (left out on purpose — need organic/local supply):
 *   services, repair-services, community, education(tutoring/courses),
 *   travel(flights/hotels/tours), vehicles(actual cars), real-estate(sale/land),
 *   jobs + events (already have inventory).
 *
 * Subcategory is refined per item by taxonomy.classifySubcategory(title).
 */
const QUERY_PACKS = [
  { cat: 'electronics',         q: 'tv OR speaker OR camera OR headphones OR soundbar' },
  { cat: 'phones-tablets',      q: 'smartphone unlocked OR tablet OR phone case' },
  { cat: 'computers',           q: 'laptop OR desktop OR monitor OR keyboard OR ssd' },
  { cat: 'fashion',             q: 'mens womens clothing OR shoes OR handbag OR watch' },
  { cat: 'home-furniture',      q: 'furniture OR home decor OR cookware OR bedding' },
  { cat: 'beauty',              q: 'makeup OR skincare OR fragrance OR haircare' },
  { cat: 'sports-fitness',      q: 'fitness OR gym equipment OR dumbbell OR yoga' },
  { cat: 'baby-kids',           q: 'baby OR kids toys OR stroller OR diaper bag' },
  { cat: 'business-industrial', q: 'industrial machinery OR generator OR power tool' },
  { cat: 'vehicles',            q: 'car parts OR car accessories OR tyres OR car battery', note: 'parts/accessories only — not whole vehicles' },
  // Expanded coverage — real products that map to otherwise-empty categories:
  { cat: 'animals-pets',        q: 'pet supplies OR dog collar OR cat bed OR pet food', note: 'supplies only — not live animals' },
  { cat: 'agriculture',         q: 'garden tools OR seeds OR irrigation OR farm equipment' },
  { cat: 'construction',        q: 'power drill OR cement mixer OR hand tools OR safety gear' },
  { cat: 'entertainment',       q: 'guitar OR keyboard piano OR vinyl record OR board game' },
  { cat: 'education',           q: 'textbook OR used books OR stationery', note: 'used books for sale — not courses/tutoring' },
  { cat: 'travel',              q: 'luggage OR suitcase OR travel backpack OR travel gear', note: 'gear only — not flights/hotels/tours' },
];

module.exports = { QUERY_PACKS };
