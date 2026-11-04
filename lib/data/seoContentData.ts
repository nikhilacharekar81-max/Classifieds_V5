export interface SeoContentEntry {
  id: string;
  locationKey: string; // e.g. "mumbai", "delhi", "bengaluru", "pune", "hyderabad", "all-india"
  categoryKey: string; // e.g. "home", "cat_services", "sub_serv_education_training", "cat_cars", etc.
  title: string;
  content: string;
  wordCount: number;
  lastUpdated: string;
}

export const HANDCRAFTED_SEO_CONTENT: Record<string, SeoContentEntry> = {
  // === CITY HOMEPAGES ===
  'home:mumbai': {
    id: 'seo_home_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'home',
    title: 'Local Classifieds & Direct Service Directory in Mumbai',
    content:
      'Welcome to Chillyads Mumbai — financial capital\'s direct community marketplace. Whether buying a second-hand car in Bandra, searching for 1/2 BHK rental flats in Andheri and Thane, or listing commercial office spaces in BKC, connect directly with verified Mumbai owners. Find trusted local plumbers, split AC repair mechanics, home tutors, and packers & movers across Navi Mumbai and South Bombay. Post free classified ads in Mumbai to reach thousands of genuine local buyers without paying middleman brokerage or platform listing fees.',
    wordCount: 79,
    lastUpdated: '2026-09-23',
  },
  'home:delhi': {
    id: 'seo_home_delhi',
    locationKey: 'delhi',
    categoryKey: 'home',
    title: 'Verified Buy, Sell & Hire Directory across Delhi NCR',
    content:
      'Explore Chillyads Delhi NCR for buying, selling, and hiring across Delhi, Gurgaon, and Noida. Browse verified listings for used smartphones, laptops, second-hand cars, and budget 2/3 BHK apartments near metro corridors. Connect with doorstep AC repair technicians, deep home cleaning crews, competitive exam tutors, and legal advocates in South Delhi, Dwarka, and Rohini. Sell pre-owned items fast or offer local services by posting free classified ads directly to Delhi NCR buyers without paying broker commission fees.',
    wordCount: 76,
    lastUpdated: '2026-09-23',
  },
  'home:bengaluru': {
    id: 'seo_home_bengaluru',
    locationKey: 'bengaluru',
    categoryKey: 'home',
    title: 'Direct Local Marketplace & Service Finder in Bengaluru',
    content:
      'Chillyads Bengaluru is the Silicon Valley\'s direct local marketplace for tech professionals, students, and families. Buy and sell certified used cars, two-wheelers, smartphones, and ergonomically designed office furniture across Indiranagar, Koramangala, Whitefield, and HSR Layout. Discover move-in ready PG accommodations, flatmates, doorstep laptop repair shops, and move-in packers & movers. Deal directly with local Bengaluru buyers and sellers with complete transparency and zero platform transaction fees.',
    wordCount: 68,
    lastUpdated: '2026-09-23',
  },
  'home:pune': {
    id: 'seo_home_pune',
    locationKey: 'pune',
    categoryKey: 'home',
    title: 'Trusted Local Directory & Classifieds Hub in Pune',
    content:
      'Discover top deals across Pune on Chillyads — the cultural and IT hub\'s trusted local directory. Search verified listings for second-hand bikes, cars, laptops, and student-friendly PG rooms near Kothrud, Viman Nagar, and Hinjewadi IT Park. Connect directly with local Pune mechanics, deep cleaning experts, CA tax consultants, and private home tutors. Post free classified ads in Pune to connect with local buyers and sellers across the city without paying agency commission.',
    wordCount: 72,
    lastUpdated: '2026-09-23',
  },
  'home:hyderabad': {
    id: 'seo_home_hyderabad',
    locationKey: 'hyderabad',
    categoryKey: 'home',
    title: 'Direct Local Buying, Selling & Services in Hyderabad',
    content:
      'Welcome to Chillyads Hyderabad — your direct local hub for buying, selling, and hiring across Cyberabad and Greater Hyderabad. Find verified second-hand cars, budget smartphones, rental apartments, and plots near HITEC City, Gachibowli, and Kukatpally. Hire experienced AC repair technicians, wedding caterers, home tutors, and packers & movers in your neighborhood. Contact sellers and service providers directly with zero hidden middleman costs.',
    wordCount: 65,
    lastUpdated: '2026-09-23',
  },

  // === EDUCATION & TRAINING CATEGORY ===
  'sub_serv_education_training:mumbai': {
    id: 'seo_edu_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'sub_serv_education_training',
    title: 'Home Tutors & Academic Coaching Institutes in Mumbai',
    content:
      'Finding qualified home tutors and coaching institutes across Mumbai shouldn\'t be stressful. From CBSE and ICSE board exam preparation in Dadar and Borivali to competitive JEE, NEET, and CA foundation coaching in Thane and Navi Mumbai, Chillyads connects parents and students directly with experienced teachers. Find private home tutors for mathematics, science, accounts, and foreign languages or enroll in professional IT skill development courses. View tutor qualifications, discuss class timings, and negotiate monthly fees directly with teachers without paying agency commission fees in Mumbai.',
    wordCount: 82,
    lastUpdated: '2026-09-23',
  },
  'sub_serv_education_training:delhi': {
    id: 'seo_edu_delhi',
    locationKey: 'delhi',
    categoryKey: 'sub_serv_education_training',
    title: 'Private Tutors & Competitive Exam Coaching in Delhi NCR',
    content:
      'Delhi is a major educational hub with high demand for quality academic guidance. Whether preparing for UPSC civil services in Mukherjee Nagar and Karol Bagh, school board exams in South Delhi, or IIT-JEE and NEET foundation classes in Janakpuri and Preet Vihar, find top-rated local tutors and institutes on Chillyads. Connect with private home tutors for Class 9–12 subjects, spoken English trainers, computer coding instructors, and music academies. Speak directly with tutors across Delhi, review teaching credentials, and schedule free demo classes.',
    wordCount: 81,
    lastUpdated: '2026-09-23',
  },
  'sub_serv_education_training:bengaluru': {
    id: 'seo_edu_bengaluru',
    locationKey: 'bengaluru',
    categoryKey: 'sub_serv_education_training',
    title: 'Home Tutors & Coding Skill Academies in Bengaluru',
    content:
      'Bengaluru\'s thriving educational and IT environment demands specialized academic and skill coaching. Connect with qualified home tutors across Koramangala, Jayanagar, Indiranagar, and Malleshwaram for ICSE, CBSE, and State Board curriculums. Discover specialized coding bootcamps, data science academies, GATE coaching centers, and private music instructors. Speak directly with experienced tutors in Bengaluru, verify academic credentials, and arrange convenient home tuition schedules without third-party fees.',
    wordCount: 70,
    lastUpdated: '2026-09-23',
  },

  // === SERVICES MAIN CATEGORY ===
  'cat_services:mumbai': {
    id: 'seo_serv_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'cat_services',
    title: 'Local Service Professionals & Home Services in Mumbai',
    content:
      'Navigating home maintenance across Mumbai\'s fast-paced neighborhoods from Andheri and Bandra to Navi Mumbai and Thane requires quick, reliable local help. Chillyads connects you directly with verified Mumbai electricians, plumbers, split AC repair technicians, and deep cleaning staff who handle doorstep visits on short notice. Whether preparing your apartment for the monsoon with waterproofing services or booking private home tutors and legal documentation advocates near you, deal directly with local Mumbai professionals with zero middleman commissions.',
    wordCount: 76,
    lastUpdated: '2026-09-23',
  },
  'cat_services:delhi': {
    id: 'seo_serv_delhi',
    locationKey: 'delhi',
    categoryKey: 'cat_services',
    title: 'Doorstep Repair & Professional Services across Delhi NCR',
    content:
      'Managing residential and commercial service needs across Delhi, Gurgaon, and Noida demands experienced local technicians. Find verified Delhi NCR service providers for seasonal split AC servicing, winter geyser repairs, electrical rewiring, and deep sofa cleaning. Connect with experienced home tutors across South and West Delhi, tax consultants for GST filings, and packers & movers for hassle-free house shifting. View direct contact numbers, compare local quotes, and hire trusted doorstep experts across Delhi NCR.',
    wordCount: 71,
    lastUpdated: '2026-09-23',
  },
  'cat_services:bengaluru': {
    id: 'seo_serv_bengaluru',
    locationKey: 'bengaluru',
    categoryKey: 'cat_services',
    title: 'Verified Home & IT Tech Support Services in Bengaluru',
    content:
      'Living in IT hubs like Indiranagar, Koramangala, Whitefield, or HSR Layout requires prompt, professional home and tech services. Chillyads features trusted Bengaluru service experts for laptop and smartphone screen repairs, apartment deep cleaning, sofa sanitization, and move-in packers & movers. Discover experienced home tutors for competitive exams, freelance website developers, and reliable domestic help. Contact local Bengaluru service owners directly on WhatsApp or phone without paying platform booking surcharges.',
    wordCount: 71,
    lastUpdated: '2026-09-23',
  },
  'cat_services:pune': {
    id: 'seo_serv_pune',
    locationKey: 'pune',
    categoryKey: 'cat_services',
    title: 'Doorstep Repairs & Maintenance Services in Pune',
    content:
      'From student accommodations in Kothrud and Viman Nagar to IT corridors in Hinjewadi, Pune residents rely on dependable local services. Find top-rated Pune two-wheeler mechanics, home deep cleaning crews, cockroach pest control technicians, and interior painters. Connect with local CAs for tax return filing, rental agreement advocates, and private home tutors. Call verified service providers directly in Pune for transparent pricing and flexible scheduling.',
    wordCount: 66,
    lastUpdated: '2026-09-23',
  },

  // === HOME SERVICES & REPAIRS ===
  'sub_serv_home_repair:mumbai': {
    id: 'seo_repair_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'sub_serv_home_repair',
    title: 'Electricians, Plumbers & AC Repairs in Mumbai',
    content:
      'Need an urgent electrician, plumber, carpenter, or split AC technician in Mumbai? Contact experienced repair mechanics servicing apartments from Colaba and Dadar to Malad and Thane. Get fast doorstep assistance for AC gas refilling, electrical fuse repairs, pipe leakages, and custom carpentry. Call local Mumbai mechanics directly, review estimated charges, and fix doorstep repair appointments without paying broker convenience fees.',
    wordCount: 65,
    lastUpdated: '2026-09-23',
  },

  // === PROPERTIES CATEGORY ===
  'cat_housing_realestate:mumbai': {
    id: 'seo_prop_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'cat_housing_realestate',
    title: 'Flats, Apartments & Commercial Properties for Sale & Rent in Mumbai',
    content:
      'Explore real estate listings in Mumbai directly from flat owners, brokers, and developers. Find 1 BHK, 2 BHK, and 3 BHK residential apartments for rent or purchase in Bandra, Powai, Malad, Thane, and Navi Mumbai. Discover commercial retail shops, office spaces in BKC, and PG guest houses for working professionals. Connect directly with property owners in Mumbai to verify rental terms and arrange site visits with zero platform fees.',
    wordCount: 71,
    lastUpdated: '2026-09-23',
  },
  'sub_commercial_rent:mumbai': {
    id: 'seo_comm_rent_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'sub_commercial_rent',
    title: 'For Rent: Shops & Offices in Mumbai',
    content:
      'Renting a commercial office space or retail shop in Mumbai is vital for business expansion. Browse furnished office spaces in BKC and Lower Parel, commercial showrooms in Bandra and Andheri, and industrial godowns in Bhiwandi and Navi Mumbai. Connect directly with property owners and commercial brokers in Mumbai to compare monthly rent rates, deposit terms, and lease agreements with total clarity.',
    wordCount: 64,
    lastUpdated: '2026-09-23',
  },

  // === CARS CATEGORY ===
  'cat_cars:mumbai': {
    id: 'seo_cars_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'cat_cars',
    title: 'Buy & Sell Certified Used Cars in Mumbai',
    content:
      'Looking for a reliable second-hand car in Mumbai? Browse hundreds of pre-owned hatchbacks, sedans, SUVs, and luxury cars listed directly by individual owners and certified dealers across Mumbai, Thane, and Navi Mumbai. Inspect car service history, check insurance status, and schedule test drives in your neighborhood. Contact sellers directly to negotiate prices without paying third-party dealer markups in Mumbai.',
    wordCount: 63,
    lastUpdated: '2026-09-23',
  },

  // === BIKES CATEGORY ===
  'cat_bikes:mumbai': {
    id: 'seo_bikes_mumbai',
    locationKey: 'mumbai',
    categoryKey: 'cat_bikes',
    title: 'Second-Hand Motorcycles & Scooters for Sale in Mumbai',
    content:
      'Navigate Mumbai traffic with an affordable pre-owned motorcycle or scooter. Browse second-hand bikes from popular brands like Royal Enfield, Honda, TVS, Yamaha, and Bajaj across Mumbai and Thane. Find gearless scooties, commuter bikes, and electric scooters with complete registration details. Deal directly with local bike owners in Mumbai to arrange physical inspections and finalize deals seamlessly.',
    wordCount: 59,
    lastUpdated: '2026-09-23',
  },
};

/**
 * Dynamic content generator for unlisted cities or categories that avoids generic spinning,
 * using structured localized facts and human-styled sentence patterns.
 */
export function generateDynamicSeoContent(
  locationName: string,
  categoryName: string,
  categoryId: string
): SeoContentEntry {
  const loc = locationName && locationName !== 'All India' ? locationName : 'India';
  const isIndia = loc === 'India';

  const title = isIndia
    ? `${categoryName} Directory in India | Chillyads`
    : `Local ${categoryName} Listings & Service Directory in ${loc}`;

  let content = '';

  if (categoryId.startsWith('sub_serv_') || categoryId === 'cat_services') {
    content = isIndia
      ? `Finding verified local service professionals across India shouldn't involve calling multiple agencies or paying high commission fees. The Chillyads directory connects you directly with trusted electricians, plumbers, home tutors, deep cleaning technicians, and legal documentation agents operating near you. Browse updated listings, compare service offerings, check provider phone numbers, and arrange doorstep appointments on your schedule with zero platform fees.`
      : `Finding verified local service professionals in ${loc} shouldn't involve calling multiple agencies or paying high commission fees. The Chillyads ${loc} local directory connects you directly with trusted electricians, plumbers, home tutors, deep cleaning technicians, and legal documentation agents operating in your neighborhood. Browse updated listings, compare service offerings, check provider phone numbers, and arrange doorstep appointments in ${loc} on your schedule with zero platform fees.`;
  } else if (categoryId.includes('housing') || categoryId.includes('prop') || categoryId.includes('commercial') || categoryId.includes('house')) {
    content = isIndia
      ? `Searching for residential flats, commercial shops, plots, or PG accommodations across India? Chillyads connects property seekers directly with real estate owners, brokers, and developers. Browse 1/2/3 BHK apartments for sale or rent, commercial office spaces, and shared flatmate rooms. View property photos, verify location details, and schedule direct site visits without hidden platform charges.`
      : `Searching for residential flats, commercial shops, plots, or PG accommodations in ${loc}? Chillyads connects property seekers directly with real estate owners, brokers, and developers across ${loc}. Browse 1/2/3 BHK apartments for sale or rent, commercial office spaces, and shared flatmate rooms in ${loc}. View property photos, verify location details, and schedule direct site visits in ${loc} without hidden platform charges.`;
  } else if (categoryId.includes('car') || categoryId.includes('bike') || categoryId.includes('comm_vehicle')) {
    content = isIndia
      ? `Buy and sell pre-owned cars, motorcycles, scooters, and commercial vehicles across India on Chillyads. Connect directly with individual vehicle owners and certified dealers offering inspected automobiles. Check vehicle service history, insurance documents, and registration details. Contact sellers directly to schedule physical test drives and negotiate best prices with zero dealer markup.`
      : `Buy and sell pre-owned cars, motorcycles, scooters, and commercial vehicles in ${loc} on Chillyads. Connect directly with individual vehicle owners and certified dealers in ${loc} offering inspected automobiles. Check vehicle service history, insurance documents, and registration details in ${loc}. Contact sellers directly to schedule physical test drives and negotiate best prices with zero dealer markup.`;
  } else if (categoryId.includes('job')) {
    content = isIndia
      ? `Looking for job vacancies or hiring skilled staff across India? Chillyads features direct job openings in data entry, sales, IT engineering, driving, office administration, accounting, teaching, and hotel management. Job seekers can apply directly with employers, while local companies can post free job listings to recruit qualified candidates quickly.`
      : `Looking for job vacancies or hiring skilled staff in ${loc}? Chillyads features direct job openings in ${loc} across data entry, sales, IT engineering, driving, office administration, accounting, teaching, and hotel management. Job seekers in ${loc} can apply directly with employers, while local companies can post free job listings to recruit qualified candidates quickly.`;
  } else {
    content = isIndia
      ? `Welcome to Chillyads India — your direct community marketplace for buying, selling, and hiring across India. Find top deals on second-hand items, electronics, vehicles, real estate, jobs, and local professional services. Post free classified ads to reach interested local buyers and connect directly with sellers with total transparency and zero commission charges.`
      : `Welcome to Chillyads ${loc} — your direct community marketplace for buying, selling, and hiring across ${loc}. Find top deals on second-hand items, electronics, vehicles, real estate, jobs, and local professional services in ${loc}. Post free classified ads in ${loc} to reach interested local buyers and connect directly with sellers with total transparency and zero commission charges.`;
  }

  // Calculate approximate word count
  const words = content.trim().split(/\s+/).length;

  return {
    id: `seo_dyn_${categoryId}_${loc.toLowerCase().replace(/\s+/g, '_')}`,
    locationKey: loc.toLowerCase().replace(/\s+/g, '_'),
    categoryKey: categoryId,
    title,
    content,
    wordCount: words,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

/**
 * Retrieves the exact handcrafted SEO content block for a given category & location,
 * or dynamically synthesizes one if not handcrafted.
 */
export function getSeoContent(
  locationName: string,
  categoryName: string,
  categoryId: string
): SeoContentEntry {
  const cleanLoc = locationName ? locationName.toLowerCase().trim() : 'all-india';
  
  // Normalize location keys (e.g., "mumbai", "delhi", "bengaluru", "pune", "hyderabad")
  let locKey = 'all-india';
  if (cleanLoc.includes('mumbai')) locKey = 'mumbai';
  else if (cleanLoc.includes('delhi') || cleanLoc.includes('ncr') || cleanLoc.includes('gurgaon') || cleanLoc.includes('noida')) locKey = 'delhi';
  else if (cleanLoc.includes('bengaluru') || cleanLoc.includes('bangalore')) locKey = 'bengaluru';
  else if (cleanLoc.includes('pune')) locKey = 'pune';
  else if (cleanLoc.includes('hyderabad') || cleanLoc.includes('cyberabad')) locKey = 'hyderabad';

  const compositeKey = `${categoryId}:${locKey}`;
  if (HANDCRAFTED_SEO_CONTENT[compositeKey]) {
    return HANDCRAFTED_SEO_CONTENT[compositeKey];
  }

  // Fallback to homepage key if category is 'home'
  if (categoryId === 'home') {
    const homeKey = `home:${locKey}`;
    if (HANDCRAFTED_SEO_CONTENT[homeKey]) {
      return HANDCRAFTED_SEO_CONTENT[homeKey];
    }
  }

  // Fallback to category main key if available
  const catOnlyKey = `${categoryId}:mumbai`;
  if (HANDCRAFTED_SEO_CONTENT[catOnlyKey] && locKey === 'mumbai') {
    return HANDCRAFTED_SEO_CONTENT[catOnlyKey];
  }

  // Otherwise generate dynamic high-information block
  return generateDynamicSeoContent(locationName, categoryName, categoryId);
}
