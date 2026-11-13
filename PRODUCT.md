# PRODUCT.md — Envision E-Commerce Platform

## 1. Product Truth
- **Name:** Envision E-Commerce (Shop.)
- **Category:** Modern Full-Stack E-Commerce Storefront & Admin Portal
- **Core Technology:** React 18, Vite, TypeScript, Tailwind CSS, Firebase Firestore & Authentication, Lucide Icons
- **Target Audience:** Modern digital-native shoppers seeking curated fashion, accessories, electronics, and lifestyle goods with instant checkout, mobile-first responsiveness, and real-time order tracking.

## 2. Core Mechanism & Architecture
- **Dynamic Storefront:** 100% dynamic product catalog fetched from Firebase Firestore. Categories are computed on the fly from active product inventory.
- **Theme & Layout Engine:** Configurable via Admin Site Settings (`SiteSettingsContext`), supporting custom brand colors, light/dark mode, and customizable layouts:
  1. Default Classic (Balanced marketplace)
  2. Urban Chic (Editorial Monochrome)
  3. Neo Luxe (Cyber Dark)
  4. Aura Modern (Flagship next-gen interactive experience)
- **Cart & Checkout Flow:** Seamless dual-state cart (guest local storage synced upon login into Firestore `cart/{uid}/items`), real-time stock deduction with Firestore transactions, customer address book, and automated EmailJS receipts.
- **Admin Management:** Comprehensive admin suite with Order Management, Inventory Tracking, Variant Editing, Excel Export, PDF Bill Generation, and Site Settings.

