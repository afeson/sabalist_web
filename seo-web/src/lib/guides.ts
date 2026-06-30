// Editorial guides for Sabalist (Article + FAQPage schema). Body lines that
// start with "## " render as <h2>. Each guide can carry an FAQ block which is
// emitted as FAQPage JSON-LD (strong for Google rich results and AI answers).
export type Guide = {
  slug: string;
  title: string;
  description: string;
  updated: string;
  body: string[];
  faqs?: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-sell-fast-in-africa',
    title: 'How to Sell Your Items Fast on Sabalist',
    description: 'Practical, proven tips to sell phones, cars, electronics and furniture quickly and safely on Africa’s marketplace.',
    updated: '2026-06-30',
    body: [
      'Selling quickly comes down to three things: a clear listing, honest photos, and a fair price. Get those right and good items often sell within days. Here is the playbook the best sellers on Sabalist follow.',
      '## Write a title that gets clicks',
      'Put the most important details first: brand, model, and condition. "iPhone 13 128GB — clean, unlocked" beats "phone for sale" every time. Buyers search for specific things, so specific titles get found.',
      '## Take photos that sell',
      'Add four to six photos in good daylight from multiple angles. Show any wear honestly — scratches, dents, or missing parts. Clear, truthful photos build trust and cut down on time-wasting questions.',
      '## Price it right',
      'Search Sabalist for the same item in your city and price against what is actually listed, not what you paid. If you have room to move, mark it negotiable — many buyers will not message a listing they think is overpriced.',
      '## Respond fast and stay reachable',
      'The first seller to reply usually gets the sale. Check your messages, answer questions directly, and propose a time and public place to meet.',
      '## Close the deal safely',
      'Meet in a busy public spot during the day, let the buyer inspect the item, and accept payment only on handover. For higher-value items, bring a friend.',
    ],
    faqs: [
      { q: 'How long does it take to sell on Sabalist?', a: 'Well-priced items with clear photos often sell within a few days. Niche or high-value items can take longer; refreshing the listing and adjusting the price helps.' },
      { q: 'Is it free to post a listing?', a: 'Yes. Posting a listing on Sabalist is free. You can add photos, set a price, choose a category and your city, and publish.' },
      { q: 'Should I mark my item negotiable?', a: 'If you have room to lower the price, yes — negotiable listings get more messages. If your price is firm, say so clearly in the description.' },
    ],
  },
  {
    slug: 'avoiding-scams-on-classifieds',
    title: 'How to Avoid Scams When Buying & Selling Online',
    description: 'A clear safety guide for African marketplaces: spot the red flags, meet safely, and pay smart — for both buyers and sellers.',
    updated: '2026-06-30',
    body: [
      'The vast majority of marketplace deals are honest, but a few simple habits keep you safe from the ones that are not. Here is how to buy and sell with confidence on Sabalist.',
      '## Know the common red flags',
      'Be cautious of anyone who refuses to meet in person, pressures you to act immediately, asks you to pay before you have seen the item, or offers a deal that seems too good to be true. Scammers rely on urgency — slow down.',
      '## Meet in a safe place',
      'Always meet in a busy, public location during daylight — a mall, a bank lobby, or a well-known landmark. Tell someone where you are going, and bring a friend for valuable items like phones, laptops, or vehicles.',
      '## Pay and get paid safely',
      'Inspect the item fully before any money changes hands. Never send money in advance to someone you have not met, and be wary of requests to pay by gift cards, crypto, or wire to a stranger. Cash on handover is simplest; for large amounts, meet at a bank.',
      '## Extra checks for big purchases',
      'For cars, verify the registration and ownership documents and confirm the chassis number matches. For property, never pay a deposit before viewing in person and confirming the landlord or agent is genuine.',
      '## For sellers',
      'Be wary of "buyers" who overpay and ask for a refund of the difference, or who want to use a courier you have never heard of. Confirm payment has actually cleared into your account before you hand over the item.',
      '## Report anything suspicious',
      'If a listing or message feels wrong, stop the conversation and report it. Trusting your instincts is the best protection you have.',
    ],
    faqs: [
      { q: 'What is the safest way to pay on a classifieds marketplace?', a: 'Inspect the item first, then pay cash on handover in a public place. For large amounts, meet at a bank. Avoid paying in advance, by gift card, or by crypto to someone you have not met.' },
      { q: 'A buyer wants to overpay and have me refund the difference — is that a scam?', a: 'Yes, this is a classic overpayment scam. Never refund a difference; only accept the exact agreed amount and confirm it has cleared before handing over the item.' },
      { q: 'How do I know a rental listing is real?', a: 'Never pay a deposit before viewing the property in person and confirming the landlord or agent’s identity. Genuine landlords expect you to see the home first.' },
    ],
  },
  {
    slug: 'how-sabalist-works',
    title: 'How Sabalist Works',
    description: 'Everything you need to know about buying and selling on Sabalist — Africa’s free classifieds marketplace.',
    updated: '2026-06-30',
    body: [
      'Sabalist is a free classifieds marketplace that connects buyers and sellers across Africa. Whether you are after a used car in Lagos, an apartment in Nairobi, or a phone in Accra, here is how it works.',
      '## Browse by category or city',
      'Explore listings by category — vehicles, real estate, electronics, phones, fashion, jobs and more — or narrow to your country and city to see what is for sale near you.',
      '## Contact sellers directly',
      'Found something? Message the seller through the app to ask questions and agree a time and place to meet. There is no middleman — you deal directly.',
      '## Post a listing for free',
      'Selling is free. Add a few clear photos, write an honest description, set your price, choose a category and your location, and publish. Your listing is visible to buyers right away.',
      '## Stay safe',
      'Meet in public places, inspect items before paying, and never send money in advance. See our scam-prevention guide for the full checklist.',
      '## On your phone',
      'Sabalist works on the web and as a mobile app, so you can browse, post, and message wherever you are.',
    ],
    faqs: [
      { q: 'Is Sabalist free?', a: 'Yes. Browsing and posting listings on Sabalist is free across Africa.' },
      { q: 'Which countries does Sabalist cover?', a: 'Sabalist is a pan-African marketplace. You can browse by country and city to find listings near you.' },
      { q: 'Do I need an account to browse?', a: 'You can browse listings freely. You will need an account to post a listing, save favourites, or message sellers.' },
    ],
  },
  {
    slug: 'buying-a-used-car-in-africa',
    title: 'Buying a Used Car on Sabalist: A Practical Guide',
    description: 'Step-by-step guide to buying a used car safely in Lagos, Nairobi, Accra and across Africa — inspection checklist, documents, and negotiation.',
    updated: '2026-06-30',
    body: [
      'A used car is one of the biggest purchases you will make on a marketplace. A little preparation protects your money and gets you a better deal. Here is how to buy with confidence on Sabalist.',
      '## Set a realistic budget',
      'Decide your total budget including registration transfer, insurance, and any immediate repairs — not just the sticker price. Search Sabalist in your city to see what your money actually buys.',
      '## Search by city and shortlist',
      'Filter to your country and city so you can inspect cars in person. Shortlist a few listings, and message sellers with specific questions: mileage, service history, accident history, and reason for selling.',
      '## Inspect the car (checklist)',
      'View the car in daylight. Check the body for mismatched paint or panel gaps (signs of accident repair), tyres for even wear, the engine bay for leaks, and the interior electronics. Start the engine cold and listen for unusual noises.',
      '## Verify the documents',
      'Confirm the seller’s ID matches the name on the registration, and that the chassis (VIN) and engine numbers match the papers. Walk away from any car whose ownership cannot be proven.',
      '## Take a test drive',
      'Drive on different road types. Check braking, steering, gear changes, the clutch, air conditioning, and that warning lights go off after starting. If you are unsure, pay a trusted mechanic to inspect it.',
      '## Negotiate and close',
      'Use anything you found — worn tyres, a service due, small dents — to negotiate. Agree the final price, complete the ownership transfer paperwork, and pay safely, ideally at a bank for large amounts.',
    ],
    faqs: [
      { q: 'How do I check if a used car has a clean history?', a: 'Verify the registration and ownership documents, confirm the chassis and engine numbers match the papers, look for signs of accident repair, and where possible have a trusted mechanic inspect it before you pay.' },
      { q: 'Should I pay for a car before seeing it?', a: 'Never. Always view and test-drive the car in person, verify the documents, and pay on completion of the ownership transfer — ideally at a bank for large amounts.' },
      { q: 'Where can I find used cars near me?', a: 'Browse the Vehicles category on Sabalist and filter to your city to see cars you can inspect in person.' },
    ],
  },
  {
    slug: 'pricing-your-phone-for-resale',
    title: 'How to Price and Sell Your Phone',
    description: 'Get the best price for your used phone on Sabalist — condition grading, comparable listings, reset steps, and a safe sale.',
    updated: '2026-06-30',
    body: [
      'Phones are among the fastest-moving items on any marketplace — if they are priced right and presented well. Here is how to get a fair price and a smooth sale on Sabalist.',
      '## Grade the condition honestly',
      'Note the screen condition, body wear, battery health, and whether the phone is unlocked. Buyers pay a premium for clean, unlocked phones with good battery health — and they trust honest sellers.',
      '## Research comparable listings',
      'Search Sabalist for the same model, storage size, and condition in your city. Price against what is actually listed now, not the original retail price.',
      '## Factor in the details that move price',
      'Storage size, battery health, whether it is network-unlocked, and whether you have the original box and charger all affect value. Mention each one in your description.',
      '## Back up and reset before selling',
      'Back up your data, sign out of your accounts, remove any SIM and memory card, and factory-reset the phone. This protects your privacy and reassures the buyer.',
      '## Photograph and sell',
      'Take clear photos of the front, back, sides, and the powered-on screen. Meet the buyer in a public place, let them test the phone, and accept payment only once it is in your hands.',
    ],
    faqs: [
      { q: 'How do I decide what price to list my phone at?', a: 'Search Sabalist for the same model, storage and condition in your city, and price against current live listings. Adjust for battery health, unlock status, and whether you have the box and charger.' },
      { q: 'What should I do before handing over my phone?', a: 'Back up your data, sign out of all accounts, remove your SIM and memory card, and factory-reset the device so none of your information remains.' },
    ],
  },
  {
    slug: 'renting-a-home-safely',
    title: 'Renting a House or Apartment Safely',
    description: 'How to find and rent a home on Sabalist without getting scammed — verifying landlords, viewing in person, and handling deposits.',
    updated: '2026-06-30',
    body: [
      'Rental scams are the most common property scam on any marketplace, and they are easy to avoid once you know the pattern. Here is how to rent safely on Sabalist.',
      '## Search by city and budget',
      'Filter to your city and the property type you need — apartments, houses for rent, or short lets. Shortlist a few and message the landlord or agent with your move-in date and questions.',
      '## Recognise rental scams',
      'The classic scam is a great home at a low price from someone who is "travelling" and wants a deposit before you can view it. No genuine landlord needs your money before you have seen the property.',
      '## Verify the landlord or agent',
      'Confirm who you are dealing with. Ask to meet at the property, check that they can actually let you in, and be cautious of anyone who only communicates by message and refuses calls or in-person meetings.',
      '## View in person before you pay',
      'Always visit the property yourself. Check water and power, the state of the building, security, and the neighbourhood. Photos can be stolen from other listings, so seeing it in person is non-negotiable.',
      '## Handle the deposit and agreement carefully',
      'Read the tenancy agreement, understand the deposit and notice terms, and get a receipt for any money you pay. For large deposits, pay in a way you can trace, and never wire money to someone you have not met at the property.',
    ],
    faqs: [
      { q: 'How do I avoid rental scams?', a: 'Never pay a deposit before viewing the property in person and confirming the landlord or agent is genuine. Be very cautious of below-market homes from someone who is "away" and wants money up front.' },
      { q: 'What should I check before renting?', a: 'Visit the property, test water and power, inspect the building and security, read the tenancy agreement, understand the deposit and notice terms, and get a receipt for any payment.' },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
