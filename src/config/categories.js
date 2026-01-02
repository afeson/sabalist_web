export const CATEGORIES_WITH_SUBS = {
  Electronics: {
    icon: 'phone-portrait',
    subCategories: [
      { id: 'mobile-phones', labelKey: 'subCategories.mobilePhones', icon: 'phone-portrait' },
      { id: 'laptops-computers', labelKey: 'subCategories.laptopsComputers', icon: 'laptop' },
      { id: 'tablets', labelKey: 'subCategories.tablets', icon: 'tablet-portrait' },
      { id: 'tvs', labelKey: 'subCategories.tvs', icon: 'tv' },
      { id: 'audio-speakers', labelKey: 'subCategories.audioSpeakers', icon: 'volume-high' },
      { id: 'cameras', labelKey: 'subCategories.cameras', icon: 'camera' },
      { id: 'gaming-consoles', labelKey: 'subCategories.gamingConsoles', icon: 'game-controller' },
      { id: 'accessories', labelKey: 'subCategories.accessories', icon: 'headset' },
    ],
  },
  Vehicles: {
    icon: 'car',
    subCategories: [
      { id: 'cars', labelKey: 'subCategories.cars', icon: 'car-sport' },
      { id: 'motorcycles', labelKey: 'subCategories.motorcycles', icon: 'bicycle' },
      { id: 'trucks', labelKey: 'subCategories.trucks', icon: 'bus' },
      { id: 'buses', labelKey: 'subCategories.buses', icon: 'bus' },
      { id: 'bicycles', labelKey: 'subCategories.bicycles', icon: 'bicycle' },
      { id: 'spare-parts', labelKey: 'subCategories.spareParts', icon: 'build' },
    ],
  },
  Furniture: {
    icon: 'bed',
    subCategories: [
      { id: 'sofas-chairs', labelKey: 'subCategories.sofasChairs', icon: 'home' },
      { id: 'beds-mattresses', labelKey: 'subCategories.bedsMattresses', icon: 'bed' },
      { id: 'tables-desks', labelKey: 'subCategories.tablesDesks', icon: 'grid' },
      { id: 'wardrobes', labelKey: 'subCategories.wardrobes', icon: 'archive' },
      { id: 'office-furniture', labelKey: 'subCategories.officeFurniture', icon: 'briefcase' },
    ],
  },
  'Home Appliances': {
    icon: 'home',
    subCategories: [
      { id: 'refrigerators', labelKey: 'subCategories.refrigerators', icon: 'snow' },
      { id: 'washing-machines', labelKey: 'subCategories.washingMachines', icon: 'water' },
      { id: 'microwaves', labelKey: 'subCategories.microwaves', icon: 'square' },
      { id: 'air-conditioners', labelKey: 'subCategories.airConditioners', icon: 'snow' },
      { id: 'cookers-ovens', labelKey: 'subCategories.cookersOvens', icon: 'flame' },
    ],
  },
  'Construction Equipment': {
    icon: 'construct',
    subCategories: [
      { id: 'cement-mixers', labelKey: 'subCategories.cementMixers', icon: 'reload' },
      { id: 'generators', labelKey: 'subCategories.generators', icon: 'flash' },
      { id: 'excavators', labelKey: 'subCategories.excavators', icon: 'hammer' },
      { id: 'drilling-machines', labelKey: 'subCategories.drillingMachines', icon: 'build' },
      { id: 'power-tools', labelKey: 'subCategories.powerTools', icon: 'hardware-chip' },
      { id: 'building-materials', labelKey: 'subCategories.buildingMaterials', icon: 'cube' },
    ],
  },
  'Art & Collectibles': {
    icon: 'color-palette',
    subCategories: [
      { id: 'paintings', labelKey: 'subCategories.paintings', icon: 'brush' },
      { id: 'sculptures', labelKey: 'subCategories.sculptures', icon: 'hand-left' },
      { id: 'handmade-art', labelKey: 'subCategories.handmadeArt', icon: 'hand-right' },
      { id: 'antiques', labelKey: 'subCategories.antiques', icon: 'trophy' },
      { id: 'crafts', labelKey: 'subCategories.crafts', icon: 'color-palette' },
    ],
  },
  Fashion: {
    icon: 'shirt',
    subCategories: [
      { id: 'mens-clothing', labelKey: 'subCategories.mensClothing', icon: 'person' },
      { id: 'womens-clothing', labelKey: 'subCategories.womensClothing', icon: 'woman' },
      { id: 'shoes', labelKey: 'subCategories.shoes', icon: 'footsteps' },
      { id: 'bags', labelKey: 'subCategories.bags', icon: 'bag' },
      { id: 'watches-jewelry', labelKey: 'subCategories.watchesJewelry', icon: 'watch' },
    ],
  },
  Services: {
    icon: 'construct',
    subCategories: [
      { id: 'cleaning', labelKey: 'subCategories.cleaning', icon: 'sparkles' },
      { id: 'electrical', labelKey: 'subCategories.electrical', icon: 'flash' },
      { id: 'plumbing', labelKey: 'subCategories.plumbing', icon: 'water' },
      { id: 'car-repair', labelKey: 'subCategories.carRepair', icon: 'car' },
      { id: 'graphic-design', labelKey: 'subCategories.graphicDesign', icon: 'color-palette' },
      { id: 'tutoring', labelKey: 'subCategories.tutoring', icon: 'school' },
    ],
  },
  Jobs: {
    icon: 'briefcase',
    subCategories: [
      { id: 'full-time', labelKey: 'subCategories.fullTime', icon: 'briefcase' },
      { id: 'part-time', labelKey: 'subCategories.partTime', icon: 'time' },
      { id: 'freelance', labelKey: 'subCategories.freelance', icon: 'laptop' },
      { id: 'internships', labelKey: 'subCategories.internships', icon: 'school' },
      { id: 'remote', labelKey: 'subCategories.remote', icon: 'globe' },
    ],
  },
  'Real Estate': {
    icon: 'home',
    subCategories: [
      { id: 'houses-sale', labelKey: 'subCategories.housesSale', icon: 'home' },
      { id: 'houses-rent', labelKey: 'subCategories.housesRent', icon: 'key' },
      { id: 'apartments', labelKey: 'subCategories.apartments', icon: 'business' },
      { id: 'land', labelKey: 'subCategories.land', icon: 'map' },
      { id: 'commercial-property', labelKey: 'subCategories.commercialProperty', icon: 'storefront' },
    ],
  },
};

export function getSubCategories(mainCategory) {
  return CATEGORIES_WITH_SUBS[mainCategory]?.subCategories || [];
}

export function getCategoryIcon(mainCategory) {
  return CATEGORIES_WITH_SUBS[mainCategory]?.icon || 'apps';
}
