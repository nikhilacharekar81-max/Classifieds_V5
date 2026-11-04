import { Listing, Category } from '../types';

interface SeedTemplate {
  titles: string[];
  descriptions: string[];
  prices: number[];
  images: string[][];
  subcategoryId: string;
}

const CATEGORY_TEMPLATES: Record<string, SeedTemplate[]> = {
  cat_services: [
    {
      subcategoryId: 'sub_serv_home_repair',
      titles: [
        'Professional AC Service & Gas Charging',
        'Expert Electrician Services - Home Wiring & Repairs',
        'Certified Plumber - Leakage Repair & Pipe Fitting',
        'Best Carpenter Service - Custom Sofa & Furniture Work',
      ],
      descriptions: [
        'Get top-rated home AC servicing, filter cleaning, gas charging, and general repairs at your doorstep with a 30-day warranty.',
        'High-quality electrical work including home wiring, switchboard replacement, fan installation, and short-circuit troubleshooting.',
        'Emergency plumbing repairs, bathroom fittings installation, tap repairs, drainage cleaning, and complete pipe maintenance.',
        'Experienced carpenters for sofa manufacturing, kitchen cabinet repair, wardrobe polishing, and generic wooden repairs.',
      ],
      prices: [399, 199, 249, 499],
      images: [
        ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1452827073306-6e6e661baf57?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_serv_cleaning_pest',
      titles: [
        'Deep Home Cleaning Services - 1BHK/2BHK/3BHK',
        'Sofa & Dry Cleaning Service at Doorstep',
        'Herbal Pest Control Service - Cockroach & Bedbug Treatment',
      ],
      descriptions: [
        'Complete home deep cleaning utilizing professional grade disinfectants, vacuuming, window cleaning, and floor scrubbing.',
        'Say goodbye to stains and dirt with our highly effective sofa vacuuming, shampooing, and wet extraction dry cleaning service.',
        '100% odorless herbal gel pest control treatment targeting cockroaches, termites, bedbugs, and ants with a 1-year guarantee.',
      ],
      prices: [1899, 699, 1200],
      images: [
        ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_serv_education_training',
      titles: [
        'Class 1-10 Home Tuition & Mathematics Tutors',
        'Spoken English & Personality Development Classes',
        'Direct Admission Guidance for Engineering & MBA',
      ],
      descriptions: [
        'Experienced school home tutors for all subjects including Maths, Science, and English. Tailored test series and exam preparation.',
        'Fluency-focused spoken English training, group discussions, email writing, interview preparation, and stage confidence programs.',
        'Professional counseling and premium admission support for top tier private engineering and MBA colleges in Maharashtra.',
      ],
      prices: [2500, 1500, 5000],
      images: [
        ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_cars: [
    {
      subcategoryId: 'sub_cars_cars',
      titles: [
        'Maruti Suzuki Swift VXI Petrol 2021 Mint Condition',
        'Hyundai Creta SX 1.5 Petrol 2020 Manual Sunroof',
        'Honda City VX i-VTEC Automatic 2019 Single Owner',
        'Mahindra Thar LX 4WD Diesel Automatic 2022 Convertible',
        'Toyota Fortuner 2.8 4x2 Automatic 2018 White Colour',
        'Tata Nexon EV Max XZ+ Luxury 2023 Electric Car',
        'Volkswagen Polo GT TSI Automatic 2017 Red Hot Sporty',
        'Renault Kwid RXT Opt 1.0 Easy-R 2021 Automatic',
        'Kia Seltos HTX 1.5 Diesel 2021 Panoramic Sunroof',
        'Skoda Octavia L&K 2.0 TSI DSG 2022 Ultimate Premium',
      ],
      descriptions: [
        'Driven only 24,000 kms with full service history. Single owner, no accidents, brand new tyres, valid insurance, ready to drive.',
        'Equipped with electronic sunroof, cruise control, leatherette seat covers, alloy wheels, and premium infotainment screen.',
        'Immaculate condition premium sedan in metallic silver. Dual airbags, paddle shifters, push button start, very neat cabin.',
        'High performance off roader with alloy rims, infotainment screen upgrade, off road bumper, and soft-top convertible roof.',
        'Very well maintained executive family SUV. 85,000 kms driven, luxury brown leather interiors, powerful engine, premium drive.',
        'Eco-friendly electric SUV with a certified range of 437 kms. Fast charging support, electric sunroof, auto-dimming mirror.',
        'A performance enthusiast dream! Famous GT TSI engine with DSG gear shift. Aftermarket alloy wheels and exhaust system.',
        'Perfect hatchback for city commuting. Extremely fuel efficient, very spacious boot, touchscreen media, backup parking camera.',
        'Spacious, premium and clean. First owner, comprehensive zero-dep insurance, premium sound system, smart air purifier.',
        'Luxury premium sedan packed with digital cockpit, Canton surround sound, ambient lighting, and high-speed stability control.',
      ],
      prices: [545000, 1180000, 725000, 1490000, 2150000, 1380000, 485000, 360000, 1245000, 2580000],
      images: [
        ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_bikes: [
    {
      subcategoryId: 'sub_bikes_motorcycles',
      titles: [
        'Royal Enfield Classic 350 Reborn (Gunmetal Grey)',
        'Yamaha FZS V3 FI BS6 2021 Model Single Owner',
        'KTM RC 200 ABS Racing Bike Sporty Look',
        'Bajaj Pulsar 150 Twin Disc 2022 Matte Black',
        'Honda Activa 6G Deluxe Automatic Scooter',
        'Suzuki Access 125 SE Alloy Wheels Disc Brake',
        'TVS Apache RTR 160 4V Dual Channel ABS',
        'Hero Splendor Plus self i3S Alloy Wheels',
        'Kawasaki Ninja 300 Racing Green Superbike',
        'Ola S1 Pro Gen 2 Electric Scooter Like New',
      ],
      descriptions: [
        'Equipped with retro design, disc brakes, custom alloy wheels, premium exhausts, and smooth dual channel ABS technology.',
        'Extremely fuel efficient sporty commuter with single-channel ABS, LED headlamps, Bluetooth console and digital speedometer.',
        'Pure aerodynamic racing performance. Zero scratches, brand new Michelin tires, recently serviced at KTM service point.',
        'Iconic sports commuter, double disc variant, stylish matte graphics, highly robust engine, perfect daily commuter.',
        'India’s most trusted family scooter with programed fuel injection, smart start key, and comfortable suspension.',
        'Extremely high fuel mileage and comfortable seating posture. Retro design headlight with Bluetooth navigation console.',
        'Powerful racing tuned engine, 3 riding modes, digital screen telemetry, great performance, and amazing sound signature.',
        'The undisputed king of Indian roads. Unbelievably high mileage, low maintenance, fully serviced, pristine engine.',
        'Imported sporty look, parallel-twin engine, liquid-cooled, dual-channel ABS, slipper clutch, customized exhaust.',
        'Full digital touch screen with map navigation, party mode music speakers, hyper mode speed, and a certified range of 195km.',
      ],
      prices: [175000, 85000, 165000, 78000, 62000, 68000, 94000, 42000, 275000, 115000],
      images: [
        ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_electronics: [
    {
      subcategoryId: 'sub_elec_tvs_audio',
      titles: [
        'Sony Bravia 55 Inch 4K Ultra HD Smart LED TV',
        'OnePlus 43-inch Y Series Full HD Android Smart TV',
        'JBL Cinema SB170 Wireless Dolby Soundbar Subwoofer',
      ],
      descriptions: [
        'Immersive cinema-grade sound and display. High dynamic range with HDR10, built-in Google Assistant, and Netflix support.',
        'Bezel-less premium smart TV with Android OS, Dolby Audio, chrome-cast, high speed HDMI ports and fast streaming engines.',
        'Powerful home theater audio system. 220W peak power, wireless subwoofer, optical & HDMI ARC input, rich bass.',
      ],
      prices: [42500, 19500, 8999],
      images: [
        ['https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_elec_computers_laptops',
      titles: [
        'HP Pavilion 15 Ryzen 5 Hexa Core Thin Laptop',
        'Apple MacBook Air M1 8GB RAM 256GB Space Grey',
        'Dell Vostro i5 11th Gen Laptop for Business & Office',
        'Asus ROG Strix G15 Gaming Laptop (RTX 3050)',
      ],
      descriptions: [
        'Fast and sleek multitasking laptop with AMD Ryzen 5, 8GB RAM, 512GB NVMe SSD, backlit keyboard, and pre-installed Windows 11.',
        'Iconic silent ultra-book with incredible 18-hour battery life, beautiful Retina display, premium metal body, and pristine condition.',
        'Professional business laptop with powerful Intel Core i5 processor, high speed typing keyboard, webcam cover, and MS Office Home.',
        'A beast for hardcore gamers and video editors. 144Hz high refresh rate screen, Nvidia graphics card, custom liquid cooling system.',
      ],
      prices: [38500, 62000, 31500, 54999],
      images: [
        ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_elec_kitchen_appliances',
      titles: [
        'Samsung 253L Double Door Inverter Refrigerator',
        'LG 7.0 Kg Fully Automatic Front Load Washing Machine',
        'IFB 20 Litre Grill Microwave Oven (Silver)',
      ],
      descriptions: [
        'Digital inverter, frost-free auto defrosting, 3-star energy rating, moist-fresh zone drawer, very silent operation.',
        'Smart Inverter Direct Drive technology with custom motion washing cycles, built-in water heater, and steel drum cleaner.',
        'Compact multi-functional microwave oven for uniform grilling, reheating, and fast-thawing frozen food items.',
      ],
      prices: [18499, 23500, 5200],
      images: [
        ['https://images.unsplash.com/photo-1571175432247-fe03a571a506?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_mobiles: [
    {
      subcategoryId: 'sub_mob_phones',
      titles: [
        'Apple iPhone 14 Pro Max 256GB Gold (99% BH)',
        'Samsung Galaxy S23 Ultra 5G 12GB/256GB Green',
        'OnePlus Nord CE 3 Lite 5G Pastel Lime 128GB',
        'Redmi Note 12 Pro 5G Frosted Blue 8GB RAM',
        'Google Pixel 7a 128GB Charcoal Black (Unlocked)',
        'Realme Narzo 60 Pro 5G Cosmic Black Curved OLED',
      ],
      descriptions: [
        'Purchased from Apple Premium Reseller. Scratchless showroom condition, with case, tempered glass, original invoice & box.',
        'Equipped with 200MP Quad Camera, built-in S-Pen, gorgeous 120Hz AMOLED display, exceptional zoom, and full brand warranty.',
        'Sleek 5G phone with fast 67W SUPERVOOC charging, powerful Snapdragon 695 processor, and a rich 108MP main camera.',
        'High performance mid-ranger with premium 50MP Sony IMX766 camera sensor, smooth display and robust battery backup.',
        'Exceptional photo experience with Google Tensor G2 processor, Google smart photo eraser, and vanilla stock Android UI.',
        'Stunning ultra-thin design with 120Hz curved display, high-speed gaming engine, and high premium leather back cover.',
      ],
      prices: [84500, 78999, 14999, 17500, 28500, 16999],
      images: [
        ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1565849328610-724a13404445?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_mob_tablets',
      titles: [
        'Apple iPad Air 5th Gen M1 Processor Space Grey',
        'Samsung Galaxy Tab S6 Lite with S-Pen LTE',
      ],
      descriptions: [
        'High-speed computing with M1 chip, 10.9-inch liquid retina display, support for Apple Pencil 2nd gen, immaculate shape.',
        'Slim educational and study tablet with bundled S-Pen stylus, dual AKG premium speakers, and full sim slot 4G connectivity.',
      ],
      prices: [42500, 18999],
      images: [
        ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_mob_accessories',
      titles: [
        'Apple AirPods Pro 2nd Gen with MagSafe Case',
        'OnePlus Buds Pro Dual Driver ANC Earbuds',
      ],
      descriptions: [
        'Cinematic active noise cancellation, adaptive transparency, personalized audio, with custom warranty remaining.',
        'High resolution smart audio buds with deep active noise canceling, extreme quick warp charge, dual driver speakers.',
      ],
      prices: [14500, 5200],
      images: [
        ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_comm_vehicles: [
    {
      subcategoryId: 'sub_comm_vehicles_list',
      titles: [
        'Tata Ace Gold Petrol High Deck BS6 Tempo',
        'Mahindra Bolero Pickup 1.3T Payload Truck',
        'Force Traveller 3050 12 Seater Luxury Van',
        'Eicher Pro 2049 10 Feet Payload Loading Truck',
        'Mahindra Arjun 555 DI Powerful 4WD Tractor',
        'Ashok Leyland Dost Strong Diesel Pickup',
      ],
      descriptions: [
        'Perfect commercial mini truck for intra-city logistics. Very high fuel efficiency, pristine engine health, single driver owned.',
        'Powerful robust workhorse for transporting agricultural products, construction gear or industrial cargo easily.',
        'Ideal for corporate travel, tour operators or school transport. Comfortable reclining luxury leather seats, high cooling AC.',
        'Heavy-duty loading truck with strong chassis, high-capacity cargo deck, fuel efficient common rail CRDI diesel engine.',
        'High performance farm tractor with multi-speed power steering, double clutch, digital dash, robust mechanical parts.',
        'Highly economical loading pickup. High volume payload deck, zero accidents, verified service logs, commercial permits active.',
      ],
      prices: [385000, 540000, 890000, 750000, 480000, 420000],
      images: [
        ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1597486414704-5f89c6708b14?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_comm_spare_parts',
      titles: [
        'Set of 4 Alloy Wheels for Heavy Trucks',
        'Heavy Duty Hydraulic Jacks & Tool Kits',
        'Tractor Trailer Hook & Agriculture Rigs',
        'Premium Quality Cargo Loading Belts',
      ],
      descriptions: [
        'Toughened high-grade forged steel alloy wheels designed for maximum load distribution in heavy dumper trucks.',
        'Industrial standard 10-ton capacity hydraulic jacks suitable for trucks, buses, tempos, and emergency road service.',
        'Heavy-duty rust-proof iron hooks and couplings designed for standard tractor trailer towing operations on farms.',
        'Pack of 6 premium durable nylon ratchet straps with safety locks, designed for tying down industrial goods securely.',
      ],
      prices: [18000, 3200, 4500, 1200],
      images: [
        ['https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_jobs: [
    {
      subcategoryId: 'sub_job_data_entry',
      titles: [
        'Urgent Hiring: Back Office & Data Entry Operator',
        'Work From Home Content Writer & Blog Editor',
        'Urgent Requirement: Swiggy/Zomato Delivery Rider',
        'School Bus Driver Required - Bandra Location',
        'Office Receptionist / Front Desk Executive',
        'Security Guard Required for Private Corporate Society',
        'Retail Store Sales Executive - BKC Mall',
        'Telecaller & Customer Support Executive (Bilingual)',
        'Junior Accountant - Tally & GST Filing Experience',
        'Graphic Designer & Social Media Manager Intern',
      ],
      descriptions: [
        'Must have good speed typing skills (30+ wpm) and basic knowledge of Microsoft Excel and Tally. Friendly team environment.',
        'Write high-quality SEO-optimized blogs, articles, and product reviews. Full guidance provided. Immediate joining.',
        'Earn up to ₹35,000 monthly with active delivery bonuses, daily payouts, flexible shifts and free medical insurance.',
        'Requires valid commercial driving license, absolute sobriety record, and 5+ years driving experience. Clean records.',
        'Handle incoming telephone calls, manage visitor logbooks, receive courier dispatches, and coordinate meetings.',
        '12-hour day/night shifts. Responsible for security logs, monitoring CCTV camera screens, and visitor verification.',
        'Engage customers, manage inventory displays, explain ongoing premium brand discounts, and process cash billing.',
        'Receive client feedback, handle incoming customer product enquiries, and log support tickets in the CRM system.',
        'Requires strong knowledge of Tally Prime, GST invoice calculations, TDS deductions, and daily petty cash tracking.',
        'Design beautiful promotional banners, social media marketing creatives, and reels. High learning potential.',
      ],
      prices: [18000, 22000, 35000, 25000, 20000, 16000, 19000, 17500, 28000, 12000],
      images: [
        ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_furniture: [
    {
      subcategoryId: 'sub_furn_sofa_dining',
      titles: [
        'Luxury L-Shape 5-Seater Sofa (Beige Suede Leather)',
        'Premium 6-Seater Solid Teak Wood Dining Table',
        'Modern Tempered Glass Top Coffee Table',
      ],
      descriptions: [
        'Super-comfortable high-density foam cushions with premium wooden frame and scratchproof luxury suede fabric casing.',
        'Beautiful hand-carved teak wood dining set with 6 comfortable cushioned chairs, scratchproof glass protective layer.',
        'Chic designer coffee table for living room. Geometric metal base, tempered safety glass, minimalist aesthetic.',
      ],
      prices: [24500, 38000, 4500],
      images: [
        ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_furn_beds_wardrobes',
      titles: [
        'King Size Hydraulic Storage Bed (Sheesham Wood)',
        '3-Door Spacious Wardrobe with Dresser Mirror',
        'Orthopedic Coir & Memory Foam Double Bed Mattress',
        'Minimalist Wooden Study Desk & Bookshelf Combo',
      ],
      descriptions: [
        'Made of premium heavy sheesham wood, equipped with easy-lift hydraulic pumps for huge under-bed blanket storage.',
        'Elegant matte-finish wardrobe with multiple lockable drawers, clothes hanging rods, and integrated side mirror.',
        'High performance dual-layer mattress for perfect back posture support, breathable cotton cover, like brand new.',
        'Sleek study desk with 3 shelves, key-lockable drawer, wire management hole, perfect for work-from-home.',
      ],
      prices: [22000, 14500, 6800, 5200],
      images: [
        ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_furn_home_decor',
      titles: [
        'Handwoven Traditional Kashmiri Silk Area Rug',
        'Designer Metal Floor Lamp with Warm LED Bulb',
        'Premium Anti-Rust Wall Mount Metal Planters',
      ],
      descriptions: [
        'Beautiful intricate floral patterns, handcrafted by local artisans. Highly durable silk thread weave, very soft.',
        'Sleek golden stand with elegant black fabric shade, includes energy-saving warm white smart LED lightbulb.',
        'Set of 3 stylish wall geometric brackets with flower pots, great for indoor money plants and small succulents.',
      ],
      prices: [12500, 2400, 899],
      images: [
        ['https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_fashion: [
    {
      subcategoryId: 'sub_fash_men',
      titles: [
        'Levis 511 Slim Fit Blue Denim Jeans',
        'Woodland Genuine Leather Outdoor Boots (Khaki)',
        'Casio Edifice Premium Chronograph Quartz Watch',
        'Solid Black Genuine Sheepskin Leather Jacket',
      ],
      descriptions: [
        'Original stretchable blue jeans, classic 5-pocket styling, heavy-duty stitching, imported cotton weave.',
        'Highly durable all-terrain premium leather boots with anti-slip rubber traction soles. Perfect for hiking and winter.',
        'Elegant high-speed stopwatch dial, water-resistant up to 100m, scratch-resistant mineral glass, solid stainless steel.',
        'Super-sleek leather jacket with smooth polyester inner lining, heavy-duty YKK zippers, comfortable collar.',
      ],
      prices: [1899, 3499, 8500, 4200],
      images: [
        ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_fash_women',
      titles: [
        'Sabyasachi Design Premium Georgette Saree',
        'Michael Kors Jet Set Large Saffiano Leather Tote Bag',
        'Traditional Bridal Kundan Necklace Set with Earrings',
      ],
      descriptions: [
        'Exquisite golden zari embroidery work with beautiful heavy sequined designer blouse piece, ideal for weddings.',
        'Iconic luxury shoulder bag. Durable saffiano texture leather, multiple compartment pockets, silver-tone hardware.',
        'Intricate hand-painted kundan stone work with premium green beads drops, adjustable back thread clasp, flawless finish.',
      ],
      prices: [4500, 14999, 3200],
      images: [
        ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_fash_kids',
      titles: [
        'Kids Soft Cotton Summer Dungaree & T-Shirt Set',
        'Disney Mickey Mouse Character Light-Up Sneakers',
        'Stylish Woolen Cardigan Jacket for Little Girls',
      ],
      descriptions: [
        'Ultra-soft organic cotton breathable dungaree. Safe non-toxic snap buttons, adorable animal print layout.',
        'Vibrant red kids sneakers with flashing LED light heels, comfortable slip-on fit, flexible rubber sole.',
        'Beautiful hand-knit floral pattern cardigan with warm woolen weave, smooth front buttons, absolute comfort.',
      ],
      prices: [799, 1200, 1100],
      images: [
        ['https://images.unsplash.com/photo-1519457431-44cac6c7a141?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1621452773781-0f992fd1f5cb?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_books_sports: [
    {
      subcategoryId: 'sub_bsh_books',
      titles: [
        'Complete UPSC IAS Prelims & Mains General Studies Book Set',
        'The Alchemist & Other Best Selling Novels Combo',
        'Concepts of Physics by HC Verma (Volume 1 & 2)',
      ],
      descriptions: [
        'Set of 12 essential textbooks for civil services preparation. Includes Laxmikanth Polity, Ramesh Singh Economy, clean condition.',
        'Pack of 5 inspiring paperbacks including The Alchemist, Atomic Habits, Ikigai, and Rich Dad Poor Dad. Brand new.',
        'The most popular physics textbooks for JEE preparation. Zero annotations, includes comprehensive solved questions.',
      ],
      prices: [2499, 799, 450],
      images: [
        ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_bsh_gym_fitness',
      titles: [
        'Home Gym Dumbbell Weight Set (20kg PVC with Rods)',
        'Anti-Slip Premium 6mm TPE Yoga Mat with Carry Strap',
        'Multi-Functional Heavy Duty Pull-Up Bar for Doorway',
      ],
      descriptions: [
        'Includes 4x3kg + 4x2kg PVC plates, 2 x dumbbell rods, star collars, and 1 x connector bar. Perfect for home workouts.',
        'Eco-friendly non-toxic TPE padding, excellent knee joints support, dual-sided non-slip traction pattern, washable.',
        'Sturdy solid steel pull-up bar, supports up to 130kg, comfortable foam grips, easily fits standard door frames.',
      ],
      prices: [1299, 699, 999],
      images: [
        ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_bsh_musical_instruments',
      titles: [
        'Yamaha F310 Natural Acoustic Folk Guitar',
        'Casio SA-77 44-Key Portable Musical Keyboard',
        'Handmade Indian Sheesham Wood Tabla Pair with Cushions',
        'Bose QuietComfort Wireless Noise Canceling Headphones',
      ],
      descriptions: [
        'Crisp and bright rich sound signature. Comfortable steel strings, spruce wood body, includes guitar cover bag & plectrums.',
        'Perfect electronic keyboard for kids and beginners. 100 tones, 50 rhythms, clear digital screen, dynamic speakers.',
        'Professionally tuned heavy sheesham wood Dayan and heavy metal Bayan. Includes high quality safety covers and cushions.',
        'Absolute block of active external noise. High resolution stereo, comfortable soft ear pads, 24-hour battery charge life.',
      ],
      prices: [8900, 3200, 5800, 16500],
      images: [
        ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1552422535-c45813c61732?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_pets: [
    {
      subcategoryId: 'sub_pets_dogs',
      titles: [
        'Healthy Golden Retriever Puppies for Loving Homes',
        'Pedigree Pro Active Adult Dog Food (20kg Bag)',
        'Comfortable Large Cushioned Orthopedic Dog Bed',
      ],
      descriptions: [
        'KCI registered, vaccinated, dewormed, highly playful and active family puppies. Looking for genuine pet lovers.',
        'Professional nutrition for high performance active dogs. Loaded with vitamins, proteins and healthy omega fatty acids.',
        'High density therapeutic foam supporting joint muscles, ultra soft washable velvet fleece zip cover, waterproof base.',
      ],
      prices: [22000, 3600, 1899],
      images: [
        ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1541599540903-216a46ca1bf0?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_pets_cats',
      titles: [
        'Super Cute Double Coat Persian Kitten (White)',
        'Premium Quality Multi-Tier Cat Scratching Tree House',
        'Whiskas Wet Cat Food Pack (Tuna in Jelly - 12 Packs)',
      ],
      descriptions: [
        'Beautiful blue-eyed white fluffy kitten. Extremely friendly, litter-trained, healthy and playful structure.',
        'Comfortable soft plush activity tower with natural sisal scratching posts, dangling mouse toy and sleeping hammocks.',
        'Nourishing wet food containing real chunks of fish, keeping your cat hydrated and providing a healthy glossy coat.',
      ],
      prices: [15000, 3200, 480],
      images: [
        ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_pets_fish_aquariums',
      titles: [
        'Clear Glass Fish Aquarium with LED Light & Filter',
        'Set of 10 Colorful Live Freshwater Aquarium Fishes',
        'Sobbo Submersible Water Pump & Aerator for Tanks',
        'NutriGrow Floating Aquarium Fish Food Pellets',
      ],
      descriptions: [
        'Sturdy curved glass tank, includes low noise top filter system, colorful night mode LED light strip, perfect home decor.',
        'Pack of 10 active freshwater fishes including Guppies, Neon Tetras, Zebra Danios, and Goldfishes. Easy to feed.',
        'Silent high-performance oxygenator pump, completely waterproof, energy efficient, designed for optimal water flow.',
        'Daily highly digestible floating nutrition pellets formulated to enhance natural body colors of goldfish and guppies.',
      ],
      prices: [3800, 499, 650, 249],
      images: [
        ['https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
  cat_housing_realestate: [
    {
      subcategoryId: 'sub_house_apt_sale',
      titles: [
        'Luxury 3 BHK Sea View Apartment in Bandra West',
        'Modern 2 BHK Gated Community Flat in Koregaon Park',
        'Independent 4 BHK Villa with Private Swimming Pool',
        'Penthouse Apartment with Wrap-Around Terrace',
      ],
      descriptions: [
        'Expansive carpet area with panoramic views, Vastu compliant layout, Italian marble flooring, 2 covered parking slots.',
        'East facing apartment with modular kitchen, gym, swimming pool, and 24x7 security.',
        'Luxurious independent villa featuring private garden, Italian fittings, servant quarters, and clubhouse access.',
        'Spacious duplex penthouse with private sky deck, solar backup, and high-speed elevator access.',
      ],
      prices: [42500000, 9800000, 32000000, 27500000],
      images: [
        ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_house_apt_rent',
      titles: [
        'Furnished 2 BHK Apartment for Rent in Indiranagar',
        'Spacious 1 BHK Flat for Rent in South Extension Delhi',
        '3 BHK Executive Flat in Hiranandani Gardens Powai',
      ],
      descriptions: [
        'Tastefully furnished home with all appliances, modular kitchen, fiber internet, and covered car parking.',
        'Sunlit flat with terrace garden, 24-hour water supply, and walking distance to metro station.',
        'Premium gated township with clubhouse, sports courts, international school, and hospital within campus.',
      ],
      prices: [45000, 22000, 75000],
      images: [
        ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80'],
      ],
    },
    {
      subcategoryId: 'sub_shops_offices_sale',
      titles: [
        'Prime Commercial Corner Retail Shop in Connaught Place',
        'Plug & Play IT Office Space in Whitefield',
        'High Footfall Commercial Showroom on Main Road',
      ],
      descriptions: [
        'Ground floor retail shop with high footfall frontage, suitable for boutique, cafe, or electronics showroom.',
        'Fully furnished 40-workstation commercial office with conference room, cabins, cafeteria, and DG backup.',
        'Spacious multi-level commercial showroom with glass facade, parking for 15 cars, and all approvals.',
      ],
      prices: [18500000, 17500000, 29000000],
      images: [
        ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80'],
        ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'],
      ],
    },
  ],
};

const SELLER_ACCOUNTS = [
  { id: 'usr_101', name: 'Vikramaditya Roy', phone: '+91 98201 44521', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'usr_102', name: 'Rajesh Sharma', phone: '+91 91234 56789', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'usr_103', name: 'Ananya Deshmukh', phone: '+91 97692 88410', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { id: 'usr_104', name: 'Priya Patel', phone: '+91 98980 12345', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
];

const LOCATIONS = [
  { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra West', lat: 19.0596, lng: 72.8295 },
  { city: 'Pune', state: 'Maharashtra', locality: 'Koregaon Park', lat: 18.5362, lng: 73.8940 },
  { city: 'Delhi', state: 'Delhi', locality: 'Connaught Place', lat: 28.6304, lng: 77.2177 },
  { city: 'Bengaluru', state: 'Karnataka', locality: 'Indiranagar', lat: 12.9716, lng: 77.5946 },
  { city: 'Chennai', state: 'Tamil Nadu', locality: 'Adyar', lat: 13.0063, lng: 80.2574 },
];

export function seedCategoriesWithTenAds(existingListings: Listing[]): Listing[] {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return existingListings;
  }

  const seededListings = [...existingListings];
  let currentIdCounter = 2001;

  // For each main category in our templates
  for (const [categoryId, subcatTemplates] of Object.entries(CATEGORY_TEMPLATES)) {
    // Count how many listings currently exist under this main category
    const currentCountForCategory = seededListings.filter((l) => l.categoryId === categoryId).length;
    
    // If we have fewer than 10, fill up to 10 ads
    const adsToGenerate = Math.max(0, 10 - currentCountForCategory);
    
    if (adsToGenerate > 0) {
      for (let i = 0; i < adsToGenerate; i++) {
        // Distribute across the subcategory templates
        const templateIndex = i % subcatTemplates.length;
        const template = subcatTemplates[templateIndex];
        
        // Pick a title and description
        const titleIndex = i % template.titles.length;
        const title = template.titles[titleIndex];
        const description = template.descriptions[titleIndex % template.descriptions.length];
        const price = template.prices[titleIndex % template.prices.length];
        const images = template.images[titleIndex % template.images.length];
        
        // Pick a random seller
        const seller = SELLER_ACCOUNTS[i % SELLER_ACCOUNTS.length];
        // Pick a random location
        const loc = LOCATIONS[i % LOCATIONS.length];
        
        const listingId = `lst_${currentIdCounter++}`;
        
        const newListing: Listing = {
          id: listingId,
          title: title,
          description: description,
          price: price,
          categoryId: categoryId,
          subcategoryId: template.subcategoryId,
          sellerId: seller.id,
          sellerName: seller.name,
          sellerType: 'user',
          sellerPhone: seller.phone,
          sellerAvatar: seller.avatar,
          images: images,
          location: {
            state: loc.state,
            city: loc.city,
            locality: loc.locality,
            latitude: loc.lat,
            longitude: loc.lng,
          },
          status: 'approved',
          isFeatured: i === 0 || i === 4, // Make some of them featured naturally
          featuredUntil: i === 0 || i === 4 ? '2026-10-30' : undefined,
          isBoosted: false,
          views: Math.floor(Math.random() * 45) + 5,
          likes: Math.floor(Math.random() * 8),
          chatsCount: Math.floor(Math.random() * 3),
          customAttributes: {},
          createdAt: `2026-09-20 10:${String(10 + i).padStart(2, '0')} AM`,
          expiresAt: '2026-10-20',
          spamScore: 0,
        };
        
        seededListings.push(newListing);
      }
    }
  }

  return seededListings;
}
