export type StoreLayoutType = "aura-modern" | "default" | "urban-chic" | "neo-luxe";
export type ThemeModeType = "light" | "dark" | "system";

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  primary: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { id: "electric-cobalt", name: "Aura Cobalt", description: "Vibrant high-contrast electric cobalt & clean glass", primary: "#2563eb" },
  { id: "sunset-coral", name: "Sunset Coral", description: "Warm, energetic high-fashion coral & rose", primary: "#f43f5e" },
  { id: "urban-chic", name: "Shop.co Monochrome", description: "High-contrast editorial black & white styling", primary: "#000000" },
  { id: "cyber-lime", name: "Neo Luxe Lime", description: "Modern neon lime & deep obsidian styling", primary: "#84cc16" },
  { id: "nordic-emerald", name: "Nordic Emerald", description: "Organic, fresh & premium Scandinavian green", primary: "#059669" },
  { id: "indigo", name: "Modern Indigo", description: "Clean & tech-forward", primary: "#6366f1" },
  { id: "amber", name: "Artisan Gold", description: "Warm, energetic e-commerce & handcrafted goods", primary: "#d97706" },
  { id: "violet", name: "Cosmic Violet", description: "Creative & boutique elegance", primary: "#7c3aed" },
  { id: "teal", name: "Teal Horizon", description: "Calm, wellness & modern", primary: "#0d9488" },
  { id: "obsidian", name: "Obsidian Slate", description: "Minimalist dark slate", primary: "#0f172a" },
];

export interface BillingFee {
  id: string;               // Unique id e.g. "fee_delivery", "fee_handling_1"
  name: string;             // Label e.g. "Delivery Charge", "Packaging & Handling"
  amount: number;           // Fee amount in currency units (supports decimals e.g. 10.50)
  enabled: boolean;         // Active / Disabled toggle
  waiveAbove?: number;      // Optional threshold above which fee is waived (0 = never waived)
}

export interface SiteSettings {
  brandName: string;
  logoUrl: string;
  logoText: string;
  primaryColor: string;
  colorPalettePreset?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  currency: string;
  currencyLocale: string;
  footerText: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
  };
  // Storefront Layout & Theme Selection
  storeLayout?: StoreLayoutType; // "default" | "urban-chic" | "neo-luxe"
  themeMode?: ThemeModeType;     // "light" | "dark" | "system"

  // Delivery charge settings — controlled by admin
  deliveryCharge: number;       // Fixed delivery fee (e.g. 25)
  freeDeliveryAbove: number;    // Order subtotal above which delivery is free (e.g. 999). Set to 0 to always charge.
  deliveryChargeLabel: string;  // Custom label shown to customers (e.g. "Delivery", "Shipping", "Other Expenses")

  // Dynamic Billing & Additional Fees (Admin can add, modify, toggle, delete fees)
  billingFees?: BillingFee[];

  // Product Display (global variant rules)
  showMaxVariantOnly?: boolean; // When true: all variant products globally show only their largest size

  // Top Announcement & Promo Banner (Guest / Pre-Signup)
  promoBannerEnabled?: boolean;
  promoBannerText?: string;
  promoBannerLinkText?: string;
  promoBannerLinkUrl?: string;

  // Member Announcement Banner (Authenticated / Post-Signup)
  memberBannerEnabled?: boolean;
  memberBannerText?: string;
  memberBannerLinkText?: string;
  memberBannerLinkUrl?: string;

  // Customer Email Notifications (powered by EmailJS)
  emailServiceId?: string;
  emailPublicKey?: string;
  emailTemplateOrderPlaced?: string;
  emailTemplateOrderDelivered?: string;
  emailTemplateOrderCancelled?: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: "Shop.",
  logoUrl: "",
  logoText: "Shop.",
  primaryColor: "#2563eb",
  colorPalettePreset: "electric-cobalt",
  heroTitle: "Curated Aesthetics. Uncompromising Quality.",
  heroSubtitle: "Explore our latest season arrivals with verified authenticity and rapid dispatch.",
  heroImageUrl: "",
  currency: "₹",
  currencyLocale: "en-IN",
  footerText: "© 2026 Shop. All rights reserved.",
  socialLinks: {
    instagram: "",
    facebook: "",
    twitter: "",
  },
  storeLayout: "aura-modern",
  themeMode: "light",
  deliveryCharge: 25,
  freeDeliveryAbove: 999,
  deliveryChargeLabel: "Delivery",
  billingFees: [
    {
      id: "fee_delivery",
      name: "Delivery Charge",
      amount: 25,
      enabled: true,
      waiveAbove: 999,
    },
    {
      id: "fee_handling",
      name: "Packaging & Handling",
      amount: 10,
      enabled: false,
      waiveAbove: 0,
    },
  ],
  showMaxVariantOnly: false,
  promoBannerEnabled: true,
  promoBannerText: "Sign up and get 20% off your first order.",
  promoBannerLinkText: "Sign Up Now",
  promoBannerLinkUrl: "/Signup",
  memberBannerEnabled: true,
  memberBannerText: "Welcome back! Enjoy free delivery on orders above ₹999.",
  memberBannerLinkText: "Shop Collection",
  memberBannerLinkUrl: "/",
  emailServiceId: "service_l42nxid",
  emailPublicKey: "J_tUJ1nmVg3u2fMzj",
  emailTemplateOrderPlaced: "template_mk6jk5e",
  emailTemplateOrderDelivered: "template_mk6jk5e",
  emailTemplateOrderCancelled: "template_mk6jk5e",
};
