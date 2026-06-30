// AUTO-PORTED from ../../../src/config/categories.js (single source of truth).
// Keep in sync via scripts/sync-taxonomy.mjs when categories.js changes.

export type SubCategory = { id: string; name: string };
export type Category = { id: string; key: string; name: string; subCategories: SubCategory[] };

export const CATEGORIES: Category[] = [
  {
    "id": "vehicles",
    "key": "Vehicles",
    "name": "Vehicles",
    "subCategories": [
      {
        "id": "cars",
        "name": "Cars"
      },
      {
        "id": "motorcycles",
        "name": "Motorcycles"
      },
      {
        "id": "trucks",
        "name": "Trucks"
      },
      {
        "id": "buses",
        "name": "Buses"
      },
      {
        "id": "bicycles",
        "name": "Bicycles"
      },
      {
        "id": "boats",
        "name": "Boats"
      },
      {
        "id": "spare-parts",
        "name": "Spare Parts"
      }
    ]
  },
  {
    "id": "real-estate",
    "key": "Real Estate",
    "name": "Real Estate",
    "subCategories": [
      {
        "id": "houses-sale",
        "name": "Houses for Sale"
      },
      {
        "id": "houses-rent",
        "name": "Houses for Rent"
      },
      {
        "id": "apartments",
        "name": "Apartments"
      },
      {
        "id": "land",
        "name": "Land"
      },
      {
        "id": "commercial-property",
        "name": "Commercial Property"
      },
      {
        "id": "short-let",
        "name": "Short Let"
      }
    ]
  },
  {
    "id": "electronics",
    "key": "Electronics",
    "name": "Electronics",
    "subCategories": [
      {
        "id": "tvs",
        "name": "TVs"
      },
      {
        "id": "audio-speakers",
        "name": "Audio & Speakers"
      },
      {
        "id": "cameras",
        "name": "Cameras"
      },
      {
        "id": "gaming-consoles",
        "name": "Gaming Consoles"
      },
      {
        "id": "smart-devices",
        "name": "Smart Devices"
      },
      {
        "id": "wearables",
        "name": "Wearables"
      },
      {
        "id": "accessories",
        "name": "Accessories"
      }
    ]
  },
  {
    "id": "phones-tablets",
    "key": "Phones & Tablets",
    "name": "Phones & Tablets",
    "subCategories": [
      {
        "id": "smartphones",
        "name": "Smartphones"
      },
      {
        "id": "feature-phones",
        "name": "Feature Phones"
      },
      {
        "id": "tablets",
        "name": "Tablets"
      },
      {
        "id": "phone-accessories",
        "name": "Phone Accessories"
      },
      {
        "id": "sim-cards",
        "name": "SIM Cards & Plans"
      }
    ]
  },
  {
    "id": "computers",
    "key": "Computers",
    "name": "Computers",
    "subCategories": [
      {
        "id": "laptops",
        "name": "Laptops"
      },
      {
        "id": "desktops",
        "name": "Desktops"
      },
      {
        "id": "components",
        "name": "Components"
      },
      {
        "id": "printers",
        "name": "Printers & Scanners"
      },
      {
        "id": "networking",
        "name": "Networking"
      },
      {
        "id": "software",
        "name": "Software"
      }
    ]
  },
  {
    "id": "fashion",
    "key": "Fashion",
    "name": "Fashion",
    "subCategories": [
      {
        "id": "mens-clothing",
        "name": "Shoes"
      },
      {
        "id": "bags",
        "name": "Bags"
      },
      {
        "id": "accessories",
        "name": "Accessories"
      },
      {
        "id": "watches-jewelry",
        "name": "Watches & Jewelry"
      },
      {
        "id": "traditional-wear",
        "name": "Traditional Wear"
      }
    ]
  },
  {
    "id": "beauty",
    "key": "Beauty",
    "name": "Beauty",
    "subCategories": [
      {
        "id": "skincare",
        "name": "Skincare"
      },
      {
        "id": "makeup",
        "name": "Makeup"
      },
      {
        "id": "haircare",
        "name": "Haircare"
      },
      {
        "id": "fragrances",
        "name": "Fragrances"
      },
      {
        "id": "beauty-tools",
        "name": "Beauty Tools"
      }
    ]
  },
  {
    "id": "home-furniture",
    "key": "Home & Furniture",
    "name": "Home & Furniture",
    "subCategories": [
      {
        "id": "sofas-chairs",
        "name": "Sofas & Chairs"
      },
      {
        "id": "beds-mattresses",
        "name": "Beds & Mattresses"
      },
      {
        "id": "tables-desks",
        "name": "Tables & Desks"
      },
      {
        "id": "wardrobes",
        "name": "Wardrobes & Storage"
      },
      {
        "id": "kitchen",
        "name": "Kitchen & Dining"
      },
      {
        "id": "decor",
        "name": "Home Decor"
      },
      {
        "id": "home-appliances",
        "name": "Home Appliances"
      },
      {
        "id": "office-furniture",
        "name": "Office Furniture"
      }
    ]
  },
  {
    "id": "jobs",
    "key": "Jobs",
    "name": "Jobs",
    "subCategories": [
      {
        "id": "full-time",
        "name": "Full-Time"
      },
      {
        "id": "part-time",
        "name": "Part-Time"
      },
      {
        "id": "freelance",
        "name": "Freelance"
      },
      {
        "id": "internships",
        "name": "Internships"
      },
      {
        "id": "remote",
        "name": "Remote"
      }
    ]
  },
  {
    "id": "services",
    "key": "Services",
    "name": "Services",
    "subCategories": [
      {
        "id": "cleaning",
        "name": "Cleaning"
      },
      {
        "id": "electrical",
        "name": "Electrical"
      },
      {
        "id": "plumbing",
        "name": "Plumbing"
      },
      {
        "id": "graphic-design",
        "name": "Graphic Design"
      },
      {
        "id": "tutoring",
        "name": "Tutoring"
      },
      {
        "id": "photography",
        "name": "Photography"
      },
      {
        "id": "beauty-services",
        "name": "Beauty Services"
      }
    ]
  },
  {
    "id": "food",
    "key": "Food",
    "name": "Food",
    "subCategories": [
      {
        "id": "restaurants",
        "name": "Restaurants"
      },
      {
        "id": "catering",
        "name": "Catering"
      },
      {
        "id": "groceries",
        "name": "Groceries"
      },
      {
        "id": "bakery",
        "name": "Bakery & Sweets"
      },
      {
        "id": "beverages",
        "name": "Beverages"
      }
    ]
  },
  {
    "id": "agriculture",
    "key": "Agriculture",
    "name": "Agriculture",
    "subCategories": [
      {
        "id": "crops",
        "name": "Crops & Produce"
      },
      {
        "id": "seeds",
        "name": "Seeds"
      },
      {
        "id": "fertilizers",
        "name": "Fertilizers"
      },
      {
        "id": "farm-equipment",
        "name": "Farm Equipment"
      },
      {
        "id": "livestock-feed",
        "name": "Livestock Feed"
      }
    ]
  },
  {
    "id": "animals-pets",
    "key": "Animals & Pets",
    "name": "Animals & Pets",
    "subCategories": [
      {
        "id": "dogs",
        "name": "Dogs"
      },
      {
        "id": "cats",
        "name": "Cats"
      },
      {
        "id": "birds",
        "name": "Birds"
      },
      {
        "id": "livestock",
        "name": "Livestock"
      },
      {
        "id": "pet-accessories",
        "name": "Pet Accessories"
      },
      {
        "id": "pet-food",
        "name": "Pet Food"
      }
    ]
  },
  {
    "id": "baby-kids",
    "key": "Baby & Kids",
    "name": "Baby & Kids",
    "subCategories": [
      {
        "id": "baby-clothing",
        "name": "Baby Clothing"
      },
      {
        "id": "toys",
        "name": "Toys"
      },
      {
        "id": "strollers",
        "name": "Strollers & Car Seats"
      },
      {
        "id": "school-supplies",
        "name": "School Supplies"
      },
      {
        "id": "baby-food",
        "name": "Baby Food"
      }
    ]
  },
  {
    "id": "sports-fitness",
    "key": "Sports & Fitness",
    "name": "Sports & Fitness",
    "subCategories": [
      {
        "id": "gym-equipment",
        "name": "Gym Equipment"
      },
      {
        "id": "cycling",
        "name": "Cycling"
      },
      {
        "id": "outdoor",
        "name": "Outdoor & Camping"
      },
      {
        "id": "team-sports",
        "name": "Team Sports"
      },
      {
        "id": "sports-apparel",
        "name": "Sports Apparel"
      }
    ]
  },
  {
    "id": "business-industrial",
    "key": "Business & Industrial",
    "name": "Business & Industrial",
    "subCategories": [
      {
        "id": "office-equipment",
        "name": "Office Equipment"
      },
      {
        "id": "machinery",
        "name": "Machinery"
      },
      {
        "id": "wholesale",
        "name": "Wholesale"
      },
      {
        "id": "industrial-tools",
        "name": "Industrial Tools"
      }
    ]
  },
  {
    "id": "events-tickets",
    "key": "Events & Tickets",
    "name": "Events & Tickets",
    "subCategories": [
      {
        "id": "concerts",
        "name": "Concerts"
      },
      {
        "id": "sports-events",
        "name": "Sports Events"
      },
      {
        "id": "theater",
        "name": "Theater & Arts"
      },
      {
        "id": "festivals",
        "name": "Festivals"
      },
      {
        "id": "conferences",
        "name": "Conferences"
      }
    ]
  },
  {
    "id": "education",
    "key": "Education",
    "name": "Education",
    "subCategories": [
      {
        "id": "books",
        "name": "Books"
      },
      {
        "id": "courses",
        "name": "Courses"
      },
      {
        "id": "tutoring-edu",
        "name": "Tutoring"
      },
      {
        "id": "stationery",
        "name": "Stationery"
      }
    ]
  },
  {
    "id": "travel",
    "key": "Travel",
    "name": "Travel",
    "subCategories": [
      {
        "id": "flights",
        "name": "Flights"
      },
      {
        "id": "hotels",
        "name": "Hotels & Lodges"
      },
      {
        "id": "tours",
        "name": "Tours & Safaris"
      },
      {
        "id": "luggage",
        "name": "Luggage"
      },
      {
        "id": "travel-gear",
        "name": "Travel Gear"
      }
    ]
  },
  {
    "id": "construction",
    "key": "Construction",
    "name": "Construction",
    "subCategories": [
      {
        "id": "building-materials",
        "name": "Building Materials"
      },
      {
        "id": "cement-mixers",
        "name": "Cement Mixers"
      },
      {
        "id": "generators",
        "name": "Generators"
      },
      {
        "id": "excavators",
        "name": "Excavators"
      },
      {
        "id": "power-tools",
        "name": "Power Tools"
      },
      {
        "id": "drilling-machines",
        "name": "Drilling Machines"
      }
    ]
  },
  {
    "id": "repair-services",
    "key": "Repair Services",
    "name": "Repair Services",
    "subCategories": [
      {
        "id": "car-repair",
        "name": "Car Repair"
      },
      {
        "id": "phone-repair",
        "name": "Phone Repair"
      },
      {
        "id": "appliance-repair",
        "name": "Appliance Repair"
      },
      {
        "id": "plumbing-repair",
        "name": "Plumbing"
      },
      {
        "id": "electrical-repair",
        "name": "Electrical"
      }
    ]
  },
  {
    "id": "rentals",
    "key": "Rentals",
    "name": "Rentals",
    "subCategories": [
      {
        "id": "equipment-rentals",
        "name": "Equipment Rentals"
      },
      {
        "id": "car-rentals",
        "name": "Car Rentals"
      },
      {
        "id": "property-rentals",
        "name": "Property Rentals"
      },
      {
        "id": "event-rentals",
        "name": "Event Rentals"
      }
    ]
  },
  {
    "id": "entertainment",
    "key": "Entertainment",
    "name": "Entertainment",
    "subCategories": [
      {
        "id": "music",
        "name": "Music"
      },
      {
        "id": "movies",
        "name": "Movies & DVDs"
      },
      {
        "id": "games",
        "name": "Games"
      },
      {
        "id": "instruments",
        "name": "Musical Instruments"
      },
      {
        "id": "art-collectibles",
        "name": "Art & Collectibles"
      }
    ]
  },
  {
    "id": "community",
    "key": "Community",
    "name": "Community",
    "subCategories": [
      {
        "id": "lost-found",
        "name": "Lost & Found"
      },
      {
        "id": "free-items",
        "name": "Free Items"
      },
      {
        "id": "volunteers",
        "name": "Volunteers"
      },
      {
        "id": "announcements",
        "name": "Announcements"
      }
    ]
  },
  {
    "id": "other",
    "key": "Other",
    "name": "Other",
    "subCategories": []
  }
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export function getCategory(id: string): Category | undefined { return CATEGORY_BY_ID[id]; }
export function getSubCategory(catId: string, subId: string): SubCategory | undefined {
  return getCategory(catId)?.subCategories.find((s) => s.id === subId);
}
