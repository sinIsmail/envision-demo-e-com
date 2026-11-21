import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useTheme } from "@/components/theme-provider";
import {
  COLOR_PALETTES,
  type ColorPalette,
  type StoreLayoutType,
  type ThemeModeType,
} from "@/types/siteSettings";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "@/components/ui/toast";
import {
  Palette,
  Layout,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  Check,
  Megaphone,
  Eye,
  Save,
  CheckCircle2,
  Smartphone,
} from "lucide-react";

export function DesignTab() {
  const { settings, saveSettings, applyPreviewTheme } = useSiteSettings();
  const { setTheme } = useTheme();

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSelectPalette = (palette: ColorPalette) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: palette.primary,
      colorPalettePreset: palette.id,
    }));
    applyPreviewTheme(palette.primary);
  };

  const handleCustomColor = (colorHex: string) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: colorHex,
      colorPalettePreset: "custom",
    }));
    if (/^#[0-9A-Fa-f]{6}$/.test(colorHex) || /^#[0-9A-Fa-f]{3}$/.test(colorHex)) {
      applyPreviewTheme(colorHex);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, heroImageUrl: url }));
      toast.add({ title: "Hero image uploaded", description: "Click Save Design Changes to persist." });
    } catch {
      toast.add({ title: "Upload failed", description: "Could not upload hero image." });
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({
        storeLayout: form.storeLayout ?? "aura-modern",
        themeMode: form.themeMode ?? "light",
        primaryColor: form.primaryColor,
        colorPalettePreset: form.colorPalettePreset,
        heroTitle: form.heroTitle,
        heroSubtitle: form.heroSubtitle,
        heroImageUrl: form.heroImageUrl,
        promoBannerEnabled: form.promoBannerEnabled,
        promoBannerText: form.promoBannerText,
        promoBannerLinkText: form.promoBannerLinkText,
        promoBannerLinkUrl: form.promoBannerLinkUrl,
        memberBannerEnabled: form.memberBannerEnabled,
        memberBannerText: form.memberBannerText,
        memberBannerLinkText: form.memberBannerLinkText,
        memberBannerLinkUrl: form.memberBannerLinkUrl,
      });
      toast.add({
        title: "Design Settings Saved ✓",
        description: "Storefront appearance and layout updated live.",
      });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Could not save design settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-card border shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Palette className="h-5 w-5 text-primary" />
            Storefront Design & Appearance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize layouts, themes, color palettes, hero headers, and announcement banners.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 shrink-0 text-xs font-bold"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Design Changes"}
        </Button>
      </div>

      {/* 1. STOREFRONT LAYOUT PRESET */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Storefront Layout Engine</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Active:{" "}
              {(form.storeLayout ?? "aura-modern") === "aura-modern"
                ? "Aura Modern (Flagship)"
                : form.storeLayout === "urban-chic"
                ? "Urban Chic (Editorial)"
                : form.storeLayout === "neo-luxe"
                ? "Neo Luxe (Cyber Dark)"
                : "Default Classic"}
            </Badge>
          </div>
          <CardDescription>
            Choose the customer-facing shopping experience. Tap any template to preview its styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Option 1: Aura Modern */}
            <div
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  storeLayout: "aura-modern",
                  primaryColor: "#2563eb",
                  colorPalettePreset: "electric-cobalt",
                }));
                applyPreviewTheme("#2563eb");
              }}
              className={`relative flex flex-col p-4 rounded-xl border text-left cursor-pointer transition-all ${
                (form.storeLayout ?? "aura-modern") === "aura-modern"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                  Flagship
                </Badge>
                {(form.storeLayout ?? "aura-modern") === "aura-modern" && (
                  <Badge className="text-[10px] bg-primary">Active</Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-foreground">Aura Modern</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Asymmetric split hero, interactive product spotlight slider, dynamic category bento, trending reel, and VIP club.
              </p>
            </div>

            {/* Option 2: Default Classic */}
            <div
              onClick={() => setForm((prev) => ({ ...prev, storeLayout: "default" as StoreLayoutType }))}
              className={`relative flex flex-col p-4 rounded-xl border text-left cursor-pointer transition-all ${
                form.storeLayout === "default"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[10px]">Classic</Badge>
                {form.storeLayout === "default" && (
                  <Badge className="text-[10px] bg-primary">Active</Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-foreground">Default Classic</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Balanced marketplace design with horizontal category tracks, responsive catalog grid, and clean card styling.
              </p>
            </div>

            {/* Option 3: Urban Chic */}
            <div
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  storeLayout: "urban-chic",
                  primaryColor: "#000000",
                  colorPalettePreset: "urban-chic",
                }));
                applyPreviewTheme("#000000");
              }}
              className={`relative flex flex-col p-4 rounded-xl border text-left cursor-pointer transition-all ${
                form.storeLayout === "urban-chic"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                  Editorial
                </Badge>
                {form.storeLayout === "urban-chic" && (
                  <Badge className="text-[10px] bg-primary">Active</Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-foreground">Urban Chic</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                High-fashion editorial aesthetic with dynamic category cards, real product thumbnails, live search, and guarantees strip.
              </p>
            </div>

            {/* Option 4: Neo Luxe */}
            <div
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  storeLayout: "neo-luxe",
                  primaryColor: "#84cc16",
                  colorPalettePreset: "cyber-lime",
                }));
                applyPreviewTheme("#84cc16");
              }}
              className={`relative flex flex-col p-4 rounded-xl border text-left cursor-pointer transition-all ${
                form.storeLayout === "neo-luxe"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-[10px] bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 font-semibold">
                  Cyber Dark
                </Badge>
                {form.storeLayout === "neo-luxe" && (
                  <Badge className="text-[10px] bg-primary">Active</Badge>
                )}
              </div>
              <h4 className="font-bold text-sm text-foreground">Neo Luxe</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Futuristic cyber-dark atmosphere with neon accents, dynamic matrix, live inventory status, and glassmorphic cards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. THEME MODE */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Theme Mode (Atmosphere)</CardTitle>
          </div>
          <CardDescription>
            Choose whether the store defaults to clean light mode, immersive dark mode, or matches the visitor's device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, themeMode: "light" as ThemeModeType }));
                setTheme("light");
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                form.themeMode === "light"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, themeMode: "dark" as ThemeModeType }));
                setTheme("dark");
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                form.themeMode === "dark"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, themeMode: "system" as ThemeModeType }));
                setTheme("system");
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                (form.themeMode ?? "system") === "system"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <Laptop className="h-4 w-4" />
              System
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 3. COLOR PALETTES & ACCENTS */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Color Palettes & Accent Themes</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {form.colorPalettePreset && form.colorPalettePreset !== "custom"
                ? COLOR_PALETTES.find((p) => p.id === form.colorPalettePreset)?.name || "Preset"
                : "Custom Color"}
            </Badge>
          </div>
          <CardDescription>
            Select from 10 curated color schemes or pick a custom hex color. Updates all buttons, badges, links, and accents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Palettes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {COLOR_PALETTES.map((p) => {
              const isSelected = form.primaryColor.toLowerCase() === p.primary.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPalette(p)}
                  className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                      : "border-border/70 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className="h-6 w-6 rounded-full shadow-inner border border-black/10 shrink-0"
                      style={{ backgroundColor: p.primary }}
                    />
                    {isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold leading-tight line-clamp-1">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Color Picker */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Custom Color Swatch & Hex Picker
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="primaryColor"
                type="color"
                value={form.primaryColor}
                onChange={(e) => handleCustomColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border bg-background p-1"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => handleCustomColor(e.target.value)}
                className="w-32 font-mono text-sm uppercase"
                placeholder="#2563EB"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreviewTheme(form.primaryColor)}
                className="text-xs font-semibold"
              >
                Apply Live Preview
              </Button>
            </div>

            {/* Live Component Preview */}
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Live Button Preview:</span>
              <Button size="sm" type="button" className="text-xs pointer-events-none">
                Primary Button
              </Button>
              <Button size="sm" variant="outline" type="button" className="text-xs pointer-events-none">
                Outline Button
              </Button>
              <Badge className="pointer-events-none">
                Badge Highlight
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. HERO BANNER */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Hero Showcase Banner</CardTitle>
          </div>
          <CardDescription>
            The large headline, subtitle, and backdrop photo displayed at the top of the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Hero Headline</Label>
            <Input
              id="heroTitle"
              value={form.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              placeholder="Curated Aesthetics. Uncompromising Quality."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
            <Textarea
              id="heroSubtitle"
              value={form.heroSubtitle}
              onChange={(e) => set("heroSubtitle", e.target.value)}
              placeholder="Explore our latest season arrivals with verified authenticity and rapid dispatch."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Hero Background Image</Label>
            <div className="flex items-center gap-4">
              {form.heroImageUrl && (
                <img
                  src={form.heroImageUrl}
                  alt="Hero preview"
                  className="h-16 w-28 rounded-md object-cover border"
                />
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                  {uploadingHero ? "Uploading..." : form.heroImageUrl ? "Change Image" : "Upload Image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeroUpload}
                  disabled={uploadingHero}
                />
              </label>
              {form.heroImageUrl && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setForm((p) => ({ ...p, heroImageUrl: "" }))}
                >
                  Remove image
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Optional background photograph. If omitted, a clean modern gradient backdrop is used.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. TOP ANNOUNCEMENT BANNERS */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Top Announcement & Promo Banners</CardTitle>
          </div>
          <CardDescription>
            Two dedicated ribbons: one for guests/visitors, and another for authenticated members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Banner 1: Pre-Signup (Visitors) */}
          <div className="rounded-2xl border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold">Banner 1</Badge>
                  <h4 className="font-bold text-sm text-foreground">Before Sign Up (Visitors & Guests)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown only to logged-out visitors. Disappears automatically once a customer logs in.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(form.promoBannerEnabled)}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    promoBannerEnabled: prev.promoBannerEnabled === false ? true : false,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  form.promoBannerEnabled !== false ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    form.promoBannerEnabled !== false ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoBannerText">Guest Announcement Text</Label>
              <Input
                id="promoBannerText"
                value={form.promoBannerText ?? ""}
                onChange={(e) => set("promoBannerText", e.target.value)}
                placeholder="Sign up and get 20% off your first order."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promoBannerLinkText">Action Link Text (optional)</Label>
                <Input
                  id="promoBannerLinkText"
                  value={form.promoBannerLinkText ?? ""}
                  onChange={(e) => set("promoBannerLinkText", e.target.value)}
                  placeholder="Sign Up Now"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promoBannerLinkUrl">Destination URL</Label>
                <Input
                  id="promoBannerLinkUrl"
                  value={form.promoBannerLinkUrl ?? ""}
                  onChange={(e) => set("promoBannerLinkUrl", e.target.value)}
                  placeholder="/Signup"
                />
              </div>
            </div>

            {/* Guest Preview */}
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground font-medium">Guest Preview (Logged Out):</Label>
              {form.promoBannerEnabled !== false && form.promoBannerText ? (
                <div className="mt-1.5 rounded-lg bg-foreground text-background text-xs py-2 px-4 text-center font-medium flex items-center justify-center">
                  <span>
                    {form.promoBannerText}{" "}
                    {form.promoBannerLinkText && (
                      <span className="underline font-bold ml-1">{form.promoBannerLinkText}</span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground italic">Guest banner is currently disabled.</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Banner 2: Post-Signup (Logged-in Members) */}
          <div className="rounded-2xl border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">Banner 2</Badge>
                  <h4 className="font-bold text-sm text-foreground">After Sign Up (Logged-in Customers)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown only to authenticated members.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(form.memberBannerEnabled)}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    memberBannerEnabled: prev.memberBannerEnabled === true ? false : true,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  form.memberBannerEnabled === true ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    form.memberBannerEnabled === true ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberBannerText">Member Announcement Text</Label>
              <Input
                id="memberBannerText"
                value={form.memberBannerText ?? ""}
                onChange={(e) => set("memberBannerText", e.target.value)}
                placeholder="Welcome back! Enjoy free delivery on orders above ₹999."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberBannerLinkText">Action Link Text (optional)</Label>
                <Input
                  id="memberBannerLinkText"
                  value={form.memberBannerLinkText ?? ""}
                  onChange={(e) => set("memberBannerLinkText", e.target.value)}
                  placeholder="Shop Collection"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberBannerLinkUrl">Destination URL</Label>
                <Input
                  id="memberBannerLinkUrl"
                  value={form.memberBannerLinkUrl ?? ""}
                  onChange={(e) => set("memberBannerLinkUrl", e.target.value)}
                  placeholder="/"
                />
              </div>
            </div>

            {/* Member Preview */}
            <div className="pt-1">
              <Label className="text-xs text-muted-foreground font-medium">Member Preview (Logged In):</Label>
              {form.memberBannerEnabled === true && form.memberBannerText ? (
                <div className="mt-1.5 rounded-lg bg-foreground text-background text-xs py-2 px-4 text-center font-medium flex items-center justify-center">
                  <span>
                    {form.memberBannerText}{" "}
                    {form.memberBannerLinkText && (
                      <span className="underline font-bold ml-1">{form.memberBannerLinkText}</span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground italic">Member banner is currently disabled.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. SMARTPHONE SLIDER & MOBILE OPTIMIZATION HIGHLIGHT */}
      <Card className="shadow-sm border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Mobile & Smartphone Touch Optimization</CardTitle>
          </div>
          <CardDescription>
            Optimized for smartphones with enlarged horizontal sliding cards, thumb-friendly touch targets, and card-peek momentum scrolling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border bg-background space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Spacious Mobile Cards
              </span>
              <p className="text-muted-foreground">
                Sliding product cards enlarged from 180px to 230px–260px for prominent imagery on phones.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-background space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                App-Style Card Peek
              </span>
              <p className="text-muted-foreground">
                Next item peeks from screen edge, signaling horizontal swipe gesture just like native apps.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-background space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Thumb-Friendly Buttons
              </span>
              <p className="text-muted-foreground">
                Enlarged buttons and prices make adding items to cart effortless on any smartphone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="gap-2 text-sm font-bold px-6"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Design Changes"}
        </Button>
      </div>
    </div>
  );
}
