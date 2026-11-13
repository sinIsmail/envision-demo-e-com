# DESIGN.md — Aura Modern E-Commerce Design System

## 1. Visual Philosophy & Thesis
- **Style:** Aura Modern (Next-Gen E-Commerce)
- **Hierarchy:** Asymmetric split hero, dynamic bento category explorer, unified command filter dock, and high-density responsive product cards.
- **Craft Principles:**
  - Elevation declared once via crisp 1px borders (`border-border/80`) and subtle hover lifts (`hover:-translate-y-1 hover:border-primary/50`).
  - No gradient text; emphasis achieved through balanced font weights and typography scale.
  - WCAG AA compliant contrast across light and dark modes.
  - Consistent 12–16px container radiuses with standard border radii tokens.

## 2. Color Palettes
- **Electric Cobalt (Primary Flagship):** `#2563EB` — Vibrant, modern, high-trust digital blue.
- **Sunset Coral (High Energy / Fashion):** `#F43F5E` — Warm luxury accent.
- **Nordic Emerald (Organic / Fresh):** `#059669` — Calming, premium green.
- **Shop.co Monochrome (Editorial):** `#000000` — Timeless black & white minimalism.
- **Neo Luxe (Cyber Dark):** `#84CC16` — Futuristic neon lime on deep obsidian.

## 3. Component Architecture
1. **Asymmetric Hero Section:**
   - Seasonal live badge with animated status ping.
   - 60ch headline with high-contrast text.
   - Dynamic category quick-tags derived strictly from active products.
   - "Spotlight of the Week" dynamic card with 1-click Add-to-Bag and Details route.
2. **Dynamic Category Bento:**
   - Visual category cards featuring real product photography automatically scraped from Firestore.
   - Dynamic inventory count badges (`{count} items`).
   - 1-click active state toggle with instant filtering.
3. **Command Filter Bar:**
   - Real-time search with clear button.
   - Multi-option sort selector (Featured, Price Low-High, Price High-Low, Rating, In-Stock First).
   - Active filter tags with 1-click "Reset All".
4. **Supercharged Product Cards (`ProductHomeList.tsx`):**
   - 4:3 / aspect-square image container with smooth micro-scale hover zoom.
   - Inventory urgency badges (`Only X left` in amber, `In Stock` in green, `Out of Stock` overlay).
   - Star rating with numerical score and review counts.
   - Multi-image count indicator badge (`+N photos`).
   - Currency-formatted pricing with variant handling.
5. **Trending Snap Carousel:**
   - Smooth horizontal snap-scroll track with directional chevron controls.
6. **Customer Trust & Proof Grid:**
   - 4 micro-cards for Express Shipping, 256-Bit SSL Checkout, 7-Day Hassle-Free Returns, and 24/7 Support.
7. **VIP Club & Rewards Card:**
   - High-contrast interactive coupon reveal with promo code `AURA15`.
8. **Modern Multi-Column Footer:**
   - Brand narrative, department links, account navigation, payment badges (UPI, Visa, Mastercard, RuPay), and social links.

