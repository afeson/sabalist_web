/**
 * City Routes Configuration for SEO
 * Defines country/city/category combinations for location-based landing pages.
 * URL pattern: /:country/:city/:category
 */

import { CATEGORY_ID_MAP, CATEGORY_NAME_MAP } from './categoryMapping';

// Countries and their cities with URL slugs and location match terms
export const SEO_COUNTRIES = {
  ethiopia: {
    name: 'Ethiopia',
    cities: {
      'addis-ababa': { name: 'Addis Ababa', matchTerms: ['Addis Ababa', 'Addis'] },
      'dire-dawa': { name: 'Dire Dawa', matchTerms: ['Dire Dawa'] },
      'mekelle': { name: 'Mekelle', matchTerms: ['Mekelle', 'Mekele'] },
      'gondar': { name: 'Gondar', matchTerms: ['Gondar', 'Gonder'] },
    },
  },
  kenya: {
    name: 'Kenya',
    cities: {
      'nairobi': { name: 'Nairobi', matchTerms: ['Nairobi'] },
      'mombasa': { name: 'Mombasa', matchTerms: ['Mombasa'] },
      'kisumu': { name: 'Kisumu', matchTerms: ['Kisumu'] },
      'nakuru': { name: 'Nakuru', matchTerms: ['Nakuru'] },
    },
  },
  nigeria: {
    name: 'Nigeria',
    cities: {
      'lagos': { name: 'Lagos', matchTerms: ['Lagos'] },
      'abuja': { name: 'Abuja', matchTerms: ['Abuja'] },
      'kano': { name: 'Kano', matchTerms: ['Kano'] },
      'ibadan': { name: 'Ibadan', matchTerms: ['Ibadan'] },
      'port-harcourt': { name: 'Port Harcourt', matchTerms: ['Port Harcourt'] },
    },
  },
  ghana: {
    name: 'Ghana',
    cities: {
      'accra': { name: 'Accra', matchTerms: ['Accra'] },
      'kumasi': { name: 'Kumasi', matchTerms: ['Kumasi'] },
      'tamale': { name: 'Tamale', matchTerms: ['Tamale'] },
      'takoradi': { name: 'Takoradi', matchTerms: ['Takoradi', 'Sekondi'] },
    },
  },
};

// Categories available for city pages (uses existing category ID system)
export const SEO_CATEGORY_SLUGS = {
  'electronics': 'Electronics',
  'vehicles': 'Vehicles',
  'furniture': 'Furniture',
  'home-appliances': 'Home Appliances',
  'construction-equipment': 'Construction Equipment',
  'art-collectibles': 'Art & Collectibles',
  'fashion': 'Fashion',
  'services': 'Services',
  'jobs': 'Jobs',
  'real-estate': 'Real Estate',
};

export function getCountryBySlug(slug) {
  return SEO_COUNTRIES[slug] || null;
}

export function getCityBySlug(countrySlug, citySlug) {
  const country = SEO_COUNTRIES[countrySlug];
  if (!country) return null;
  return country.cities[citySlug] || null;
}

export function getCategoryForSeoSlug(categorySlug) {
  const name = SEO_CATEGORY_SLUGS[categorySlug];
  if (!name) return null;
  return { slug: categorySlug, name };
}

export function isValidCityRoute(countrySlug, citySlug, categorySlug) {
  return !!(
    SEO_COUNTRIES[countrySlug] &&
    SEO_COUNTRIES[countrySlug].cities[citySlug] &&
    SEO_CATEGORY_SLUGS[categorySlug]
  );
}

/**
 * Returns flat array of all city+category route combinations for sitemap generation.
 */
export function getAllCityRoutes() {
  const routes = [];
  for (const [countrySlug, country] of Object.entries(SEO_COUNTRIES)) {
    for (const [citySlug, city] of Object.entries(country.cities)) {
      for (const [categorySlug, categoryName] of Object.entries(SEO_CATEGORY_SLUGS)) {
        routes.push({
          countrySlug,
          citySlug,
          categorySlug,
          countryName: country.name,
          cityName: city.name,
          categoryName,
          path: `/${countrySlug}/${citySlug}/${categorySlug}`,
        });
      }
    }
  }
  return routes;
}

// Category-specific content templates
const CATEGORY_CONTENT = {
  'Electronics': {
    items: 'smartphones, laptops, tablets, TVs, cameras, and gaming consoles',
    popularItems: 'iPhones, Samsung Galaxy phones, HP and Dell laptops, and smart TVs',
    priceContext: 'Prices for used electronics vary widely — you can find budget smartphones from local sellers or premium devices at competitive rates',
    buyTip: 'Always check the device condition, battery health, and ask for a demo before purchasing used electronics',
  },
  'Vehicles': {
    items: 'cars, motorcycles, trucks, buses, bicycles, and spare parts',
    popularItems: 'Toyota Corolla, Toyota Vitz, Suzuki motorcycles, and Bajaj three-wheelers',
    priceContext: 'Vehicle prices depend on the make, model, year, and mileage. Used cars offer significant savings compared to new ones',
    buyTip: 'Inspect the vehicle in person, verify ownership documents, and take a test drive before making any purchase',
  },
  'Furniture': {
    items: 'sofas, beds, tables, desks, wardrobes, and office furniture',
    popularItems: 'L-shaped sofas, queen-size beds, dining tables, and office desks',
    priceContext: 'Locally crafted furniture is often more affordable and customizable than imported options',
    buyTip: 'Check the material quality, measurements, and whether delivery is included before buying furniture',
  },
  'Home Appliances': {
    items: 'refrigerators, washing machines, microwaves, air conditioners, and cookers',
    popularItems: 'Samsung refrigerators, LG washing machines, and Midea air conditioners',
    priceContext: 'Brand-name appliances hold their value well. Second-hand options can save you 30-50% off retail prices',
    buyTip: 'Test appliances before purchase and ask about warranty transfers for recently bought items',
  },
  'Construction Equipment': {
    items: 'cement mixers, generators, excavators, drilling machines, power tools, and building materials',
    popularItems: 'portable generators, concrete mixers, power drills, and construction scaffolding',
    priceContext: 'Renting vs buying depends on your project timeline. For ongoing projects, buying used equipment is more cost-effective',
    buyTip: 'Verify the working condition and maintenance history of heavy equipment before committing to a purchase',
  },
  'Art & Collectibles': {
    items: 'paintings, sculptures, handmade art, antiques, and traditional crafts',
    popularItems: 'traditional African paintings, wood carvings, beadwork, and contemporary art pieces',
    priceContext: 'Art prices vary significantly based on the artist, medium, and cultural significance of the piece',
    buyTip: 'Ask about the origin and authenticity of art pieces, especially for antiques and traditional crafts',
  },
  'Fashion': {
    items: "men's clothing, women's clothing, shoes, bags, watches, and jewelry",
    popularItems: 'designer shoes, traditional clothing, leather bags, and gold jewelry',
    priceContext: 'Local fashion offers unique styles at great prices. Designer brands can be found at significant discounts secondhand',
    buyTip: 'Check sizes carefully, inspect for wear and tear, and verify authenticity for designer items',
  },
  'Services': {
    items: 'cleaning, electrical work, plumbing, car repair, graphic design, and tutoring',
    popularItems: 'home cleaning, electrical installations, plumbing repairs, and graphic design projects',
    priceContext: 'Service prices are competitive and often negotiable. Compare multiple providers before choosing',
    buyTip: 'Read reviews, ask for references, and agree on pricing upfront before hiring any service provider',
  },
  'Jobs': {
    items: 'full-time positions, part-time work, freelance gigs, internships, and remote opportunities',
    popularItems: 'IT and tech roles, sales positions, administrative jobs, and customer service roles',
    priceContext: 'Salaries vary by industry and experience level. Remote positions often offer competitive compensation',
    buyTip: 'Verify the employer, research the company, and confirm job details before accepting any position',
  },
  'Real Estate': {
    items: 'houses for sale, houses for rent, apartments, land, and commercial properties',
    popularItems: 'apartments for rent, residential houses, commercial spaces, and vacant land plots',
    priceContext: 'Property prices vary significantly by neighborhood and proximity to city centers and amenities',
    buyTip: 'Visit properties in person, verify ownership documents, and consult with a local real estate expert',
  },
};

// Country-specific market context
const COUNTRY_CONTEXT = {
  'Ethiopia': 'one of the fastest growing economies in East Africa, with a vibrant local marketplace',
  'Kenya': "East Africa's largest economy, known for its tech-savvy consumers and mobile-first marketplace",
  'Nigeria': "Africa's largest economy, with a massive consumer market and thriving e-commerce sector",
  'Ghana': "West Africa's rising star, with a stable economy and growing middle class driving consumer demand",
};

/**
 * Generates rich SEO content for a city+category page.
 * Returns title, description, h1, introText, bodyParagraphs, faqs, and related data.
 */
export function generateSeoContent(countryName, cityName, categoryName) {
  const catContent = CATEGORY_CONTENT[categoryName] || CATEGORY_CONTENT['Electronics'];
  const countryContext = COUNTRY_CONTEXT[countryName] || 'a growing marketplace in Africa';
  const catLower = categoryName.toLowerCase();

  const introText = `Looking for ${catLower} in ${cityName}? Sabalist is your trusted marketplace to buy and sell ${catContent.items} in ${cityName}, ${countryName}. Browse verified listings from local sellers and find exactly what you need.`;

  const bodyParagraphs = [
    `${cityName} is a major commercial hub in ${countryName}, ${countryContext}. Whether you are looking to buy or sell ${catLower}, Sabalist connects you with real people in your area. Popular items include ${catContent.popularItems}, all available from sellers right here in ${cityName}.`,
    `${catContent.priceContext}. On Sabalist, you can compare listings from multiple sellers in ${cityName} to ensure you get the best value. All listings include seller contact information so you can communicate directly and negotiate prices.`,
    `${catContent.buyTip}. Sabalist makes it easy to find trusted sellers in ${cityName} and surrounding areas. New listings are added daily, so check back often for the latest deals on ${catLower} in ${countryName}.`,
    `Ready to sell your ${catLower}? Post a free listing on Sabalist and reach thousands of buyers in ${cityName} and across ${countryName}. Simply create an account, upload photos, set your price, and start getting inquiries from interested buyers.`,
  ];

  const faqs = [
    {
      q: `Where can I buy ${catLower} in ${cityName}?`,
      a: `You can buy ${catLower} in ${cityName} on Sabalist. Browse hundreds of listings from local sellers, compare prices, and contact sellers directly. Sabalist is the easiest way to find ${catContent.items} in ${cityName}, ${countryName}.`,
    },
    {
      q: `How much do ${catLower} cost in ${cityName}?`,
      a: `${catContent.priceContext}. Browse Sabalist listings in ${cityName} to compare current prices from local sellers and find the best deals on ${catLower}.`,
    },
    {
      q: `How do I sell ${catLower} in ${cityName}?`,
      a: `To sell ${catLower} in ${cityName}, create a free account on Sabalist, take clear photos of your item, write a description, set your price, and publish your listing. Buyers in ${cityName} will be able to find and contact you directly.`,
    },
    {
      q: `Is it safe to buy ${catLower} online in ${cityName}?`,
      a: `Sabalist encourages safe transactions. Always meet sellers in public places, inspect items before payment, and use trusted payment methods. ${catContent.buyTip}.`,
    },
    {
      q: `What are the most popular ${catLower} in ${cityName}?`,
      a: `The most popular ${catLower} in ${cityName} include ${catContent.popularItems}. Check Sabalist regularly for the latest listings and trending items.`,
    },
    {
      q: `Can I find cheap ${catLower} in ${cityName}?`,
      a: `Yes, Sabalist has ${catLower} at every price point in ${cityName}. Filter listings by price, browse different sellers, and negotiate directly to find affordable ${catLower} that fit your budget.`,
    },
  ];

  return {
    title: `${categoryName} in ${cityName}, ${countryName} | Sabalist`,
    description: `Find ${catLower} for sale in ${cityName}, ${countryName} on Sabalist. Browse listings from local sellers and get the best deals on ${catContent.items}.`,
    h1: `${categoryName} for Sale in ${cityName}`,
    introText,
    bodyParagraphs,
    faqs,
  };
}
