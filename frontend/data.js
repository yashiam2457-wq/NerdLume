// ============================
// SHOPVERSE DATA LAYER
// ============================

const PRODUCTS = {
  all: [
    { id: 'p001', title: 'Sony WH-1000XM5 Noise Cancelling Headphones', price: 22990, mrp: 34990, discount: 34, rating: 4.7, reviews: 12480, cat: 'Electronics', badge: 'Best Seller', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' },
    { id: 'p002', title: 'Apple MacBook Air M3 13-inch Laptop', price: 94990, mrp: 119990, discount: 21, rating: 4.8, reviews: 8920, cat: 'Electronics', badge: '21% OFF', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop' },
    { id: 'p003', title: 'Samsung 65-inch 4K QLED Smart TV', price: 64999, mrp: 89999, discount: 28, rating: 4.5, reviews: 6730, cat: 'Electronics', badge: 'Deal', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop' },
    { id: 'p004', title: 'Nike Air Max 270 Running Shoes', price: 7495, mrp: 12995, discount: 42, rating: 4.6, reviews: 9340, cat: 'Footwear', badge: '42% OFF', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop' },
    { id: 'p005', title: 'Dyson V15 Detect Cordless Vacuum', price: 38900, mrp: 56900, discount: 32, rating: 4.7, reviews: 4560, cat: 'Home', badge: 'Top Rated', img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=300&fit=crop' },
    { id: 'p006', title: 'boAt Airdopes 141 Wireless Earbuds', price: 799, mrp: 2990, discount: 73, rating: 4.2, reviews: 28900, cat: 'Electronics', badge: '73% OFF', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop' },
    { id: 'p007', title: 'Kindle Paperwhite 11th Gen 16GB', price: 13999, mrp: 17999, discount: 22, rating: 4.6, reviews: 11200, cat: 'Electronics', badge: '', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop' },
    { id: 'p008', title: 'Instant Pot Duo 7-in-1 Pressure Cooker', price: 6999, mrp: 12499, discount: 44, rating: 4.5, reviews: 7890, cat: 'Kitchen', badge: 'New', img: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&h=300&fit=crop' },
  ],
  deals: [
    { id: 'p009', title: 'OnePlus 12 5G 256GB Silky Black', price: 54999, mrp: 69999, discount: 21, rating: 4.4, reviews: 15670, cat: 'Smartphones', badge: 'Flash Deal', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop' },
    { id: 'p010', title: 'HP Pavilion 15 Intel Core i7 Laptop', price: 59990, mrp: 79990, discount: 25, rating: 4.3, reviews: 4310, cat: 'Laptops', badge: '', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop' },
    { id: 'p011', title: 'Fossil Gen 6 Hybrid Smartwatch', price: 12995, mrp: 19995, discount: 35, rating: 4.2, reviews: 3420, cat: 'Wearables', badge: '35% OFF', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' },
    { id: 'p012', title: 'Canon EOS R50 Mirrorless Camera', price: 49990, mrp: 64990, discount: 23, rating: 4.6, reviews: 2890, cat: 'Cameras', badge: 'Limited', img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop' },
  ],
  clothes: [
    { id: 'c001', title: 'Levis 511 Slim Fit Stretch Jeans', price: 1799, mrp: 3499, discount: 49, rating: 4.4, reviews: 18720, cat: "Men's Jeans", badge: '49% OFF', img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop' },
    { id: 'c002', title: 'Zara Floral Midi Dress Summer 2025', price: 2490, mrp: 3990, discount: 38, rating: 4.3, reviews: 9870, cat: "Women's Dress", badge: 'New Season', img: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=300&fit=crop' },
    { id: 'c003', title: 'Tommy Hilfiger Classic Polo T-Shirt', price: 1699, mrp: 2999, discount: 43, rating: 4.5, reviews: 22140, cat: "Men's T-Shirts", badge: '', img: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=300&fit=crop' },
    { id: 'c004', title: 'H&M Oversized Hoodie Grey Marl', price: 1499, mrp: 2499, discount: 40, rating: 4.2, reviews: 14500, cat: "Unisex Hoodies", badge: 'Trending', img: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&h=300&fit=crop' },
    { id: 'c005', title: 'Allen Solly Women Formal Blazer', price: 2299, mrp: 4499, discount: 49, rating: 4.4, reviews: 7230, cat: "Women's Blazers", badge: '49% OFF', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop' },
    { id: 'c006', title: 'ONLY Premium Skinny Fit Trousers', price: 1299, mrp: 2499, discount: 48, rating: 4.1, reviews: 11340, cat: "Women's Trousers", badge: '', img: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4492?w=400&h=300&fit=crop' },
    { id: 'c007', title: 'Peter England Men Business Shirt', price: 899, mrp: 1799, discount: 50, rating: 4.3, reviews: 19870, cat: "Men's Shirts", badge: '50% OFF', img: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=300&fit=crop' },
    { id: 'c008', title: 'Urbanic Puff Sleeve Crop Blouse', price: 799, mrp: 1599, discount: 50, rating: 4.0, reviews: 6780, cat: "Women's Tops", badge: 'New', img: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=300&fit=crop' },
  ],
  groceries: [
    { id: 'g001', title: 'Organic Fresh Vegetables Box 5kg', price: 349, mrp: 499, discount: 30, rating: 4.5, reviews: 8920, cat: 'Fresh Vegetables', badge: 'Organic', img: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&h=300&fit=crop' },
    { id: 'g002', title: 'Amul Full Cream Milk 1L Pack of 6', price: 384, mrp: 420, discount: 9, rating: 4.6, reviews: 24100, cat: 'Dairy', badge: '', img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop' },
    { id: 'g003', title: 'Basmati Gold Extra Long Rice 5kg', price: 549, mrp: 699, discount: 21, rating: 4.7, reviews: 12340, cat: 'Rice & Grains', badge: 'Top Pick', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop' },
    { id: 'g004', title: 'Tata Consumer Multi-Vitamin Cereals Pack', price: 299, mrp: 450, discount: 34, rating: 4.3, reviews: 6780, cat: 'Breakfast', badge: '34% OFF', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
    { id: 'g005', title: 'Tropicana 100% Pure Orange Juice 1L', price: 120, mrp: 165, discount: 27, rating: 4.4, reviews: 18900, cat: 'Beverages', badge: '', img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop' },
    { id: 'g006', title: 'Farm Fresh Mixed Fruits Combo 3kg', price: 399, mrp: 550, discount: 27, rating: 4.6, reviews: 9340, cat: 'Fresh Fruits', badge: 'Fresh', img: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400&h=300&fit=crop' },
    { id: 'g007', title: 'Nilgiris Butter Unsalted 500g', price: 250, mrp: 320, discount: 22, rating: 4.5, reviews: 11200, cat: 'Dairy', badge: '', img: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop' },
    { id: 'g008', title: 'Organic Turmeric & Spice Kit', price: 449, mrp: 699, discount: 36, rating: 4.4, reviews: 5680, cat: 'Spices', badge: 'Organic', img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop' },
  ],
  food: [
    { id: 'f001', title: 'Butter Chicken with Garlic Naan', price: 349, mrp: 450, discount: 22, rating: 4.7, reviews: 4320, cat: 'North Indian', badge: '30 min', img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop' },
    { id: 'f002', title: 'Masala Dosa with Sambar & Chutney', price: 149, mrp: 199, discount: 25, rating: 4.5, reviews: 8760, cat: 'South Indian', badge: '20 min', img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&h=300&fit=crop' },
    { id: 'f003', title: 'Sushi Premium Platter 20 pieces', price: 799, mrp: 999, discount: 20, rating: 4.8, reviews: 2340, cat: 'Japanese', badge: 'Chef Special', img: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop' },
    { id: 'f004', title: 'Pasta Arrabiata with Garlic Bread', price: 299, mrp: 399, discount: 25, rating: 4.4, reviews: 6780, cat: 'Italian', badge: '25 min', img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop' },
    { id: 'f005', title: 'Biryani Royal Hyderabadi (2 portions)', price: 449, mrp: 599, discount: 25, rating: 4.8, reviews: 12100, cat: 'Biryani', badge: 'Best Seller', img: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400&h=300&fit=crop' },
    { id: 'f006', title: 'Thai Green Curry Bowl with Rice', price: 349, mrp: 449, discount: 22, rating: 4.5, reviews: 3400, cat: 'Thai', badge: '35 min', img: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop' },
    { id: 'f007', title: 'Paneer Tikka Wrap with Mint Chutney', price: 199, mrp: 249, discount: 20, rating: 4.3, reviews: 7890, cat: 'Snacks', badge: 'Veg', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop' },
    { id: 'f008', title: 'Combo Family Meal for 4 Persons', price: 999, mrp: 1399, discount: 29, rating: 4.6, reviews: 5670, cat: 'Combo Meals', badge: 'Family Pack', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop' },
  ],
  pizza: [
    { id: 'pz001', title: 'Margherita Classica 12" Large Pizza', price: 349, mrp: 449, discount: 22, rating: 4.5, reviews: 18900, cat: 'Veg Pizza', badge: 'Classic', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop' },
    { id: 'pz002', title: 'BBQ Chicken Loaded 12" Large Pizza', price: 499, mrp: 649, discount: 23, rating: 4.7, reviews: 22400, cat: 'Non-Veg Pizza', badge: 'Best Seller', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop' },
    { id: 'pz003', title: 'Pepperoni Supreme 14" XL Pizza', price: 599, mrp: 799, discount: 25, rating: 4.6, reviews: 16700, cat: 'Non-Veg Pizza', badge: '25% OFF', img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop' },
    { id: 'pz004', title: 'Farmhouse Delight Extra Cheese Pizza', price: 449, mrp: 549, discount: 18, rating: 4.4, reviews: 11230, cat: 'Veg Pizza', badge: 'New', img: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop' },
    { id: 'pz005', title: 'Pizza Combo 2 Mediums + Garlic Bread', price: 699, mrp: 999, discount: 30, rating: 4.7, reviews: 9870, cat: 'Combo', badge: 'BOGO', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' },
    { id: 'pz006', title: 'Paneer Tikka Spicy Indian Pizza 12"', price: 429, mrp: 549, discount: 22, rating: 4.5, reviews: 13400, cat: 'Veg Pizza', badge: 'Spicy', img: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop' },
  ],
  burger: [
    { id: 'b001', title: 'Classic Double Smash Burger w/ Fries', price: 299, mrp: 399, discount: 25, rating: 4.7, reviews: 23100, cat: 'Beef Burger', badge: 'Smash Week', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
    { id: 'b002', title: 'Crispy Chicken Burger Combo Meal', price: 249, mrp: 349, discount: 29, rating: 4.5, reviews: 31200, cat: 'Chicken Burger', badge: 'Best Seller', img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop' },
    { id: 'b003', title: 'Veggie Supreme Black Bean Burger', price: 199, mrp: 279, discount: 29, rating: 4.3, reviews: 9870, cat: 'Veg Burger', badge: 'Plant Based', img: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&h=300&fit=crop' },
    { id: 'b004', title: 'Pulled Pork BBQ Loaded Burger', price: 329, mrp: 449, discount: 27, rating: 4.6, reviews: 7650, cat: 'Specialty', badge: 'Chef Pick', img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop' },
    { id: 'b005', title: 'Mini Slider Bundle 6 Pieces Combo', price: 399, mrp: 549, discount: 27, rating: 4.4, reviews: 12300, cat: 'Combo', badge: '27% OFF', img: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop' },
    { id: 'b006', title: 'Bacon Cheese Tower Burger 5-Layer', price: 379, mrp: 499, discount: 24, rating: 4.7, reviews: 8900, cat: 'Beef Burger', badge: 'New', img: 'https://images.unsplash.com/photo-1561758033-48d52648ae8b?w=400&h=300&fit=crop' },
  ],
  travel: [
    { id: 't001', title: 'Bali, Indonesia — 7N/8D Package', price: 42990, mrp: 65990, discount: 35, rating: 4.8, reviews: 3420, cat: 'International', badge: 'Hot Deal', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop' },
    { id: 't002', title: 'Goa Beach Holiday 3N/4D', price: 12990, mrp: 18990, discount: 32, rating: 4.6, reviews: 8970, cat: 'Domestic', badge: 'Weekend', img: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=300&fit=crop' },
    { id: 't003', title: 'Thailand Bangkok + Pattaya 5N/6D', price: 34990, mrp: 54990, discount: 36, rating: 4.7, reviews: 5670, cat: 'International', badge: '36% OFF', img: 'https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=400&h=300&fit=crop' },
    { id: 't004', title: 'Manali Himalayan Adventure 4N/5D', price: 15990, mrp: 24990, discount: 36, rating: 4.5, reviews: 7890, cat: 'Adventure', badge: 'Trending', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400&h=300&fit=crop' },
    { id: 't005', title: 'Dubai Luxury 5-Star 4N/5D Tour', price: 74990, mrp: 99990, discount: 25, rating: 4.9, reviews: 2340, cat: 'Luxury', badge: 'Luxury', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop' },
    { id: 't006', title: 'Kerala Backwaters Houseboats 3N/4D', price: 18990, mrp: 27990, discount: 32, rating: 4.7, reviews: 6540, cat: 'Domestic', badge: 'Popular', img: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=300&fit=crop' },
  ],
  bookingShows: [
    { id: 'bs001', title: 'Arijit Singh Live Concert Mumbai', price: 2499, mrp: 3500, discount: 29, rating: 4.9, reviews: 12100, cat: 'Live Concert', badge: 'Selling Fast', img: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop' },
    { id: 'bs002', title: 'Hamlet - Royal Shakespeare Theatre', price: 1299, mrp: 1999, discount: 35, rating: 4.7, reviews: 3450, cat: 'Theatre', badge: '35% OFF', img: 'https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=400&h=300&fit=crop' },
    { id: 'bs003', title: 'Mumbai Indians vs CSK - IPL 2025', price: 1800, mrp: 2500, discount: 28, rating: 4.8, reviews: 19800, cat: 'Cricket', badge: 'Hot!', img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&h=300&fit=crop' },
    { id: 'bs004', title: 'Zakir Khan Stand Up Comedy Night', price: 999, mrp: 1499, discount: 33, rating: 4.8, reviews: 7830, cat: 'Comedy', badge: 'Few Seats', img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=300&fit=crop' },
    { id: 'bs005', title: 'Coldplay Music of the Spheres Tour', price: 5999, mrp: 8000, discount: 25, rating: 5.0, reviews: 34100, cat: 'International Concert', badge: 'Must See', img: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=300&fit=crop' },
    { id: 'bs006', title: 'Ballet Cinderella - National Opera House', price: 1799, mrp: 2499, discount: 28, rating: 4.6, reviews: 2300, cat: 'Ballet', badge: '', img: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=400&h=300&fit=crop' },
  ],
  streamShows: [
    { id: 'ss001', title: 'Breaking Bad (Complete Series)', price: 0, mrp: 499, discount: 100, rating: 4.9, reviews: 98700, cat: 'Drama', badge: 'FREE', img: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop', duration: '5 Seasons', year: '2008' },
    { id: 'ss002', title: 'Stranger Things Season 5', price: 0, mrp: 299, discount: 100, rating: 4.8, reviews: 76500, cat: 'Sci-Fi', badge: 'FREE', img: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=300&fit=crop', duration: '5 Seasons', year: '2024' },
    { id: 'ss003', title: 'The Crown Final Season', price: 0, mrp: 299, discount: 100, rating: 4.6, reviews: 45600, cat: 'Historical', badge: 'FREE', img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop', duration: '6 Seasons', year: '2023' },
    { id: 'ss004', title: 'Game of Thrones Complete Collection', price: 0, mrp: 999, discount: 100, rating: 4.7, reviews: 124000, cat: 'Fantasy', badge: 'FREE', img: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop', duration: '8 Seasons', year: '2011' },
    { id: 'ss005', title: 'Panchayat Season 3', price: 0, mrp: 199, discount: 100, rating: 4.9, reviews: 43200, cat: 'Comedy', badge: 'FREE', img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop', duration: '3 Seasons', year: '2024' },
    { id: 'ss006', title: 'The Office Complete Bundle', price: 0, mrp: 499, discount: 100, rating: 4.8, reviews: 87900, cat: 'Comedy', badge: 'FREE', img: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop', duration: '9 Seasons', year: '2005' },
  ],
  anime: [
    { id: 'a001', title: 'Attack on Titan — Final Season Part 3', price: 0, mrp: 299, discount: 100, rating: 4.9, reviews: 156000, cat: 'Action / Anime', badge: 'FREE', img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=300&fit=crop', duration: '4 Seasons', year: '2013' },
    { id: 'a002', title: 'Demon Slayer Complete Arc 2024', price: 0, mrp: 299, discount: 100, rating: 4.8, reviews: 98700, cat: 'Action / Anime', badge: 'FREE', img: 'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=400&h=300&fit=crop', duration: '3 Seasons', year: '2019' },
    { id: 'a003', title: 'One Piece — Gear 5 Saga 1100+ Eps', price: 0, mrp: 499, discount: 100, rating: 4.9, reviews: 234000, cat: 'Adventure / Anime', badge: 'FREE', img: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&h=300&fit=crop', duration: '1000+ Eps', year: '1999' },
    { id: 'a004', title: 'Jujutsu Kaisen Season 2', price: 0, mrp: 199, discount: 100, rating: 4.8, reviews: 87600, cat: 'Action / Anime', badge: 'FREE', img: 'https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=400&h=300&fit=crop', duration: '2 Seasons', year: '2020' },
    { id: 'a005', title: 'Naruto + Shippuden Full Collection', price: 0, mrp: 799, discount: 100, rating: 4.7, reviews: 321000, cat: 'Adventure / Anime', badge: 'FREE', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop', duration: '700 Eps', year: '2002' },
    { id: 'a006', title: 'Blue Lock Season 2 — 2025', price: 0, mrp: 199, discount: 100, rating: 4.7, reviews: 45600, cat: 'Sports / Anime', badge: 'New', img: 'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=400&h=300&fit=crop', duration: '2 Seasons', year: '2022' },
  ],
  movies: [
    { id: 'm001', title: 'Oppenheimer (2023) — Christopher Nolan', price: 0, mrp: 299, discount: 100, rating: 4.9, reviews: 234000, cat: 'Biography / Drama', badge: 'FREE', img: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=300&fit=crop', duration: '3h 0m', year: '2023' },
    { id: 'm002', title: 'RRR — Ram Charan, NTR Jr. 4K HDR', price: 0, mrp: 199, discount: 100, rating: 4.8, reviews: 187000, cat: 'Action / Drama', badge: 'FREE', img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop', duration: '3h 7m', year: '2022' },
    { id: 'm003', title: 'Dune Part Two (2024) — Villeneuve', price: 0, mrp: 249, discount: 100, rating: 4.8, reviews: 145000, cat: 'Sci-Fi / Epic', badge: 'FREE', img: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&h=300&fit=crop', duration: '2h 46m', year: '2024' },
    { id: 'm004', title: 'Animal (2023) — Ranbir Kapoor', price: 0, mrp: 199, discount: 100, rating: 4.5, reviews: 98700, cat: 'Action / Thriller', badge: 'FREE', img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop', duration: '3h 21m', year: '2023' },
    { id: 'm005', title: 'Interstellar — Christopher Nolan 4K', price: 0, mrp: 299, discount: 100, rating: 4.9, reviews: 312000, cat: 'Sci-Fi / Epic', badge: 'FREE', img: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop', duration: '2h 49m', year: '2014' },
    { id: 'm006', title: 'Kalki 2898 AD — Telugu Blockbuster', price: 0, mrp: 199, discount: 100, rating: 4.6, reviews: 67800, cat: 'Sci-Fi / Action', badge: 'New', img: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=300&fit=crop', duration: '2h 58m', year: '2024' },
  ]
};

// Build lookup by ID
const PRODUCT_BY_ID = {};
Object.values(PRODUCTS).flat().forEach(p => { PRODUCT_BY_ID[p.id] = p; });
