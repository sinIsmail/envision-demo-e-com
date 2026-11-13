import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useTheme } from "@/components/theme-provider";
import { toast } from "@/components/ui/toast";
import { COLOR_PALETTES, DEFAULT_SETTINGS, type ColorPalette, type BillingFee } from "@/types/siteSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/themeUtils";
import {
  Globe,
  Image,
  Palette,
  Type,
  Share2,
  Save,
  Eye,
  Check,
  Sparkles,
  Mail,
  Layout,
  Sun,
  Moon,
  Laptop,
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Receipt,
} from "lucide-react";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
  return data.secure_url as string;
}

export function SiteSettingsTab() {
  const { settings, saveSettings, applyPreviewTheme } = useSiteSettings();
  const { setTheme } = useTheme();
  const [form, setForm] = useState({
    ...settings,
    billingFees:
      settings.billingFees && settings.billingFees.length > 0
        ? settings.billingFees
        : DEFAULT_SETTINGS.billingFees || [
            {
              id: "fee_delivery",
              name: "Delivery Charge",
              amount: 25,
              enabled: true,
              waiveAbove: 999,
            },
          ],
    emailServiceId:
      settings.emailServiceId === "service_eah3udd"
        ? "service_l42nxid"
        : settings.emailServiceId || "service_l42nxid",
    emailPublicKey: settings.emailPublicKey || "J_tUJ1nmVg3u2fMzj",
    emailTemplateOrderPlaced: settings.emailTemplateOrderPlaced || "template_mk6jk5e",
    emailTemplateOrderDelivered: settings.emailTemplateOrderDelivered || "template_mk6jk5e",
    emailTemplateOrderCancelled: settings.emailTemplateOrderCancelled || "template_mk6jk5e",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  // Billing Fees Management State & Handlers
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<BillingFee | null>(null);
  const [feeForm, setFeeForm] = useState<{
    name: string;
    amount: string;
    waiveAbove: string;
    enabled: boolean;
  }>({
    name: "",
    amount: "",
    waiveAbove: "",
    enabled: true,
  });

  const openAddFee = () => {
    setEditingFee(null);
    setFeeForm({ name: "", amount: "", waiveAbove: "", enabled: true });
    setFeeModalOpen(true);
  };

  const openEditFee = (fee: BillingFee) => {
    setEditingFee(fee);
    setFeeForm({
      name: fee.name,
      amount: String(fee.amount),
      waiveAbove: fee.waiveAbove !== undefined ? String(fee.waiveAbove) : "",
      enabled: fee.enabled,
    });
    setFeeModalOpen(true);
  };

  const handleSaveFee = () => {
    if (!feeForm.name.trim()) {
      toast.add({ title: "Name Required", description: "Please enter a fee title (e.g. Delivery Charge, Packaging)." });
      return;
    }
    const cleanAmount = parseFloat(feeForm.amount.replace(/,/g, ".")) || 0;
    const cleanWaive = feeForm.waiveAbove ? parseFloat(feeForm.waiveAbove.replace(/,/g, ".")) : undefined;

    if (editingFee) {
      setForm((prev) => ({
        ...prev,
        billingFees: (prev.billingFees || []).map((f) =>
          f.id === editingFee.id
            ? {
                ...f,
                name: feeForm.name.trim(),
                amount: cleanAmount,
                waiveAbove: cleanWaive,
                enabled: feeForm.enabled,
              }
            : f
        ),
      }));
      toast.add({ title: "Fee Updated", description: `Updated "${feeForm.name.trim()}". Click Save Settings to persist.` });
    } else {
      const newFee: BillingFee = {
        id: "fee_" + Date.now(),
        name: feeForm.name.trim(),
        amount: cleanAmount,
        waiveAbove: cleanWaive,
        enabled: feeForm.enabled,
      };
      setForm((prev) => ({
        ...prev,
        billingFees: [...(prev.billingFees || []), newFee],
      }));
      toast.add({ title: "Fee Added", description: `Added "${newFee.name}". Click Save Settings to persist.` });
    }
    setFeeModalOpen(false);
  };

  const toggleFeeEnabled = (id: string) => {
    setForm((prev) => ({
      ...prev,
      billingFees: (prev.billingFees || []).map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  };

  const deleteFee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      billingFees: (prev.billingFees || []).filter((f) => f.id !== id),
    }));
    toast.add({ title: "Fee Removed", description: "Click Save Settings to apply." });
  };

  // Keep form in sync when settings change or load from Firestore
  useEffect(() => {
    setForm({
      ...settings,
      billingFees:
        settings.billingFees && settings.billingFees.length > 0
          ? settings.billingFees
          : DEFAULT_SETTINGS.billingFees || [
              {
                id: "fee_delivery",
                name: "Delivery Charge",
                amount: 25,
                enabled: true,
                waiveAbove: 999,
              },
            ],
      emailServiceId:
        settings.emailServiceId === "service_eah3udd"
          ? "service_l42nxid"
          : settings.emailServiceId || "service_l42nxid",
      emailPublicKey: settings.emailPublicKey || "J_tUJ1nmVg3u2fMzj",
      emailTemplateOrderPlaced: settings.emailTemplateOrderPlaced || "template_mk6jk5e",
      emailTemplateOrderDelivered: settings.emailTemplateOrderDelivered || "template_mk6jk5e",
      emailTemplateOrderCancelled: settings.emailTemplateOrderCancelled || "template_mk6jk5e",
    });
  }, [settings]);

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

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setSocial = (key: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));

  const handleSave = async () => {
    try {
      setSaving(true);
      // Synchronize primary delivery fee with legacy deliveryCharge fields for full backward compatibility
      const primaryDeliveryFee = (form.billingFees || []).find(
        (f) => f.enabled && f.name.toLowerCase().includes("delivery")
      );
      const syncedDeliveryCharge = primaryDeliveryFee
        ? primaryDeliveryFee.amount
        : parseFloat(String(form.deliveryCharge).replace(/,/g, ".")) || 0;
      const syncedFreeAbove =
        primaryDeliveryFee && primaryDeliveryFee.waiveAbove !== undefined
          ? primaryDeliveryFee.waiveAbove
          : Number(form.freeDeliveryAbove) || 0;

      await saveSettings({
        ...form,
        billingFees: form.billingFees,
        deliveryCharge: syncedDeliveryCharge,
        freeDeliveryAbove: syncedFreeAbove,
      });
      toast.add({ title: "Saved!", description: "Site settings and billing configuration updated." });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      toast.add({ title: "Logo uploaded", description: "Click Save to apply." });
    } catch {
      toast.add({ title: "Upload failed", description: "Could not upload logo." });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, heroImageUrl: url }));
      toast.add({ title: "Hero image uploaded", description: "Click Save to apply." });
    } catch {
      toast.add({ title: "Upload failed", description: "Could not upload image." });
    } finally {
      setUploadingHero(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* BRANDING */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <CardTitle>Brand Identity</CardTitle>
          </div>
          <CardDescription>Set your store name, logo, and visual style.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={form.brandName}
              onChange={(e) => set("brandName", e.target.value)}
              placeholder="My Store"
            />
            <p className="text-xs text-muted-foreground">Shown in the navbar and browser tab.</p>
          </div>

          <Separator />

          {/* Logo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo Image
            </Label>
            <div className="flex items-center gap-4">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-auto rounded-md border object-contain bg-muted px-2"
                />
              ) : (
                <div className="flex h-12 w-24 items-center justify-center rounded-md border bg-muted text-sm font-bold text-muted-foreground">
                  {form.brandName || "Logo"}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
                {form.logoUrl && (
                  <button
                    className="text-xs text-destructive hover:underline text-left"
                    onClick={() => setForm((p) => ({ ...p, logoUrl: "" }))}
                  >
                    Remove logo (use text)
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If no logo image is set, the brand name text is shown instead.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Palette className="h-4 w-4 text-primary" />
                Store Color Palette & Theme
              </Label>
              <Badge variant="outline" className="text-xs">
                {form.colorPalettePreset && form.colorPalettePreset !== "custom"
                  ? COLOR_PALETTES.find((p) => p.id === form.colorPalettePreset)?.name || "Preset"
                  : "Custom Color"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Select a curated luxury color scheme or pick a custom brand color. Changes apply live to all buttons, badges, links, and accents.
            </p>

            {/* Curated Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {COLOR_PALETTES.map((p) => {
                const isSelected = form.primaryColor.toLowerCase() === p.primary.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPalette(p)}
                    className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
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
                    <span className="text-xs font-semibold leading-tight line-clamp-1">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {p.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex & Color Picker */}
            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Custom Color Picker
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    id="primaryColor"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => handleCustomColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border bg-background p-1"
                  />
                </div>
                <Input
                  value={form.primaryColor}
                  onChange={(e) => handleCustomColor(e.target.value)}
                  className="w-32 font-mono text-sm uppercase"
                  placeholder="#6366F1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreviewTheme(form.primaryColor)}
                  className="text-xs"
                >
                  Apply Live Preview
                </Button>
              </div>

              {/* Live Preview Box */}
              <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">UI Preview:</span>
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
          </div>
        </CardContent>
      </Card>

      {/* STOREFRONT DESIGN & LAYOUT (MOBILE-FIRST) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle>Storefront Design & Layout (Mobile-First)</CardTitle>
          </div>
          <CardDescription>
            Choose your active store design template and light/dark theme preference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Layout Options Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Select Store Design Template</Label>
              <Badge variant="outline" className="text-xs">
                Active:{" "}
                {(form.storeLayout ?? "aura-modern") === "aura-modern"
                  ? "Aura Modern (Flagship)"
                  : form.storeLayout === "urban-chic"
                  ? "Urban Chic / Editorial"
                  : form.storeLayout === "neo-luxe"
                  ? "Neo Luxe / Cyber Dark"
                  : "Default Classic"}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Aura Modern (Flagship Redesign) */}
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
                className={`relative flex flex-col p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  (form.storeLayout ?? "aura-modern") === "aura-modern"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                    Flagship Modern
                  </Badge>
                  {(form.storeLayout ?? "aura-modern") === "aura-modern" && (
                    <Badge className="text-[10px] bg-primary">Active</Badge>
                  )}
                </div>
                <h4 className="font-bold text-sm text-foreground">Aura Modern</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Flagship redesign with asymmetric hero, live product spotlight, dynamic category bento, trending reel, and VIP club.
                </p>
              </div>

              {/* Option 2: Default Classic */}
              <div
                onClick={() => setForm((prev) => ({ ...prev, storeLayout: "default" }))}
                className={`relative flex flex-col p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
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
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Balanced marketplace design with horizontal category carousels, responsive grid, and clean cards.
                </p>
              </div>

              {/* Option 2: Urban Chic (Editorial Monochrome) */}
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
                className={`relative flex flex-col p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  form.storeLayout === "urban-chic"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                    Editorial Monochrome
                  </Badge>
                  {form.storeLayout === "urban-chic" && (
                    <Badge className="text-[10px] bg-primary">Active</Badge>
                  )}
                </div>
                <h4 className="font-bold text-sm text-foreground">Urban Chic / Editorial</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  High-fashion editorial layout with dynamic category cards, real product thumbnails, live search, and customer guarantees.
                </p>
              </div>

              {/* Option 3: Neo Luxe (Cyber Dark) */}
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
                className={`relative flex flex-col p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
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
                <h4 className="font-bold text-sm text-foreground">Neo Luxe / Cyber Dark</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Futuristic cyber dark aesthetic with neon accents, dynamic category matrix, live inventory status, and glassmorphic cards.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme Mode (Light / Dark / System) */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Default Store Theme Mode</Label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, themeMode: "light" }));
                  setTheme("light");
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
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
                  setForm((prev) => ({ ...prev, themeMode: "dark" }));
                  setTheme("dark");
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
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
                  setForm((prev) => ({ ...prev, themeMode: "system" }));
                  setTheme("system");
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  (form.themeMode ?? "system") === "system"
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                <Laptop className="h-4 w-4" />
                System
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOP ANNOUNCEMENT & PROMO BANNERS */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle>Top Announcement Banners (Pre & Post Sign Up)</CardTitle>
          </div>
          <CardDescription>
            Configure two dedicated banners: one for visitors before signing up, and another for authenticated members after logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ── BANNER 1: PRE-SIGNUP (Visitors / Guests) ── */}
          <div className="rounded-2xl border p-4 sm:p-5 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold">Banner 1</Badge>
                  <h4 className="font-bold text-sm text-foreground">Before Sign Up (Visitors & Guests)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown only to logged-out visitors. Immediately disappears once a customer logs in.
                </p>
              </div>
              {/* Toggle 1 */}
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  form.promoBannerEnabled !== false ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
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
                <Label htmlFor="promoBannerLinkText">Action Button / Link Text (optional)</Label>
                <Input
                  id="promoBannerLinkText"
                  value={form.promoBannerLinkText ?? ""}
                  onChange={(e) => set("promoBannerLinkText", e.target.value)}
                  placeholder="Sign Up Now (or leave empty)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promoBannerLinkUrl">Destination URL</Label>
                <Input
                  id="promoBannerLinkUrl"
                  value={form.promoBannerLinkUrl ?? ""}
                  onChange={(e) => set("promoBannerLinkUrl", e.target.value)}
                  placeholder="/Signup or https://..."
                />
              </div>
            </div>

            {/* Live Preview 1 */}
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

          {/* ── BANNER 2: POST-SIGNUP (Logged-in Members) ── */}
          <div className="rounded-2xl border p-4 sm:p-5 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">Banner 2</Badge>
                  <h4 className="font-bold text-sm text-foreground">After Sign Up (Logged-in Customers)</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown only to authenticated accounts. If disabled, members will see no banner at all.
                </p>
              </div>
              {/* Toggle 2 */}
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  form.memberBannerEnabled === true ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
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
                placeholder="Welcome back! Free doorstep delivery on orders above ₹999."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberBannerLinkText">Action Button / Link Text (optional)</Label>
                <Input
                  id="memberBannerLinkText"
                  value={form.memberBannerLinkText ?? ""}
                  onChange={(e) => set("memberBannerLinkText", e.target.value)}
                  placeholder="Shop Collection (or leave empty)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberBannerLinkUrl">Destination URL</Label>
                <Input
                  id="memberBannerLinkUrl"
                  value={form.memberBannerLinkUrl ?? ""}
                  onChange={(e) => set("memberBannerLinkUrl", e.target.value)}
                  placeholder="/ or /Cart"
                />
              </div>
            </div>

            {/* Live Preview 2 */}
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
                <p className="mt-1 text-xs text-muted-foreground italic">Member banner is currently disabled (members will see no banner).</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HERO SECTION */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Hero Banner</CardTitle>
          </div>
          <CardDescription>The large banner shown at the top of the home page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Hero Title</Label>
            <Input
              id="heroTitle"
              value={form.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              placeholder="Discover Amazing Products"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
            <Textarea
              id="heroSubtitle"
              value={form.heroSubtitle}
              onChange={(e) => set("heroSubtitle", e.target.value)}
              placeholder="Shop the latest trends at unbeatable prices."
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
                <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploadingHero} />
              </label>
              {form.heroImageUrl && (
                <button
                  className="text-xs text-destructive hover:underline"
                  onClick={() => setForm((p) => ({ ...p, heroImageUrl: "" }))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOCALISATION */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Localisation</CardTitle>
          </div>
          <CardDescription>Currency and regional formatting.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency Symbol</Label>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              placeholder="₹"
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currencyLocale">Locale</Label>
            <Input
              id="currencyLocale"
              value={form.currencyLocale}
              onChange={(e) => set("currencyLocale", e.target.value)}
              placeholder="en-IN"
            />
            <p className="text-xs text-muted-foreground">e.g. en-US, en-GB, en-IN</p>
          </div>
        </CardContent>
      </Card>

      {/* DYNAMIC BILLING & ADDITIONAL FEES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Dynamic Billing & Additional Fees</CardTitle>
                <CardDescription className="mt-1">
                  Add, customize, enable/disable, or delete dynamic fees (delivery, packaging, platform fee, handling).
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddFee}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4 text-primary" />
              Add Billing Fee
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!form.billingFees || form.billingFees.length === 0) ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
              <p>No billing fees configured. Customers will only be charged for product items.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddFee}
                className="mt-3 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add First Fee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {form.billingFees.map((fee) => (
                <div
                  key={fee.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                    fee.enabled
                      ? "bg-card border-border/80"
                      : "bg-muted/30 border-muted opacity-70"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {fee.name}
                      </span>
                      <Badge
                        variant={fee.enabled ? "default" : "secondary"}
                        className="text-[10px] uppercase font-bold tracking-wider"
                      >
                        {fee.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">
                        Amount: {formatPrice(fee.amount, form.currency, form.currencyLocale)}
                      </span>
                      <span>•</span>
                      {fee.waiveAbove && fee.waiveAbove > 0 ? (
                        <span>
                          Free on orders above {formatPrice(fee.waiveAbove, form.currency, form.currencyLocale)}
                        </span>
                      ) : (
                        <span>Charged on all orders</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fee.enabled}
                      onClick={() => toggleFeeEnabled(fee.id)}
                      title={fee.enabled ? "Disable fee" : "Enable fee"}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        fee.enabled ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                          fee.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Edit Fee */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditFee(fee)}
                      title="Edit Fee"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete Fee */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteFee(fee.id)}
                      title="Delete Fee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Billing Live Preview */}
          <div className="rounded-xl bg-muted/50 p-4 border text-xs space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" /> Customer Bill Breakdown Preview
            </p>
            <div className="space-y-1 text-muted-foreground">
              {form.billingFees && form.billingFees.filter((f) => f.enabled).length > 0 ? (
                form.billingFees
                  .filter((f) => f.enabled)
                  .map((f) => (
                    <div key={f.id} className="flex justify-between">
                      <span>{f.name}:</span>
                      <span className="font-medium text-foreground">
                        {formatPrice(f.amount, form.currency, form.currencyLocale)}
                        {f.waiveAbove && f.waiveAbove > 0
                          ? ` (Free > ${formatPrice(f.waiveAbove, form.currency, form.currencyLocale)})`
                          : ""}
                      </span>
                    </div>
                  ))
              ) : (
                <p>No active fees. Cart total = Subtotal only.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRODUCT DISPLAY */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Product Display</CardTitle>
          </div>
          <CardDescription>
            Global rules for how products are shown to customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                Show Largest Quantity Only (Global)
              </p>
              <p className="text-xs text-muted-foreground">
                When ON, every variant product site-wide shows <strong>only its largest size</strong> and hides all smaller options. Overrides individual product settings.
              </p>
            </div>
            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(form.showMaxVariantOnly)}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  showMaxVariantOnly: !prev.showMaxVariantOnly,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                form.showMaxVariantOnly
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  form.showMaxVariantOnly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {form.showMaxVariantOnly && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              ⚡ Global max-quantity mode is <strong>ON</strong> — customers will only see the largest size for all variant products.
            </p>
          )}
        </CardContent>
      </Card>

      {/* CUSTOMER EMAIL NOTIFICATIONS SHORTCUT */}
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Customer Email Notifications & API Keys</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary font-semibold">
              Moved to Developer Tab ⚙️
            </Badge>
          </div>
          <CardDescription>
            EmailJS service keys, notification templates, and live connection testing have been reorganized into the dedicated <strong>Developer & API</strong> tab in Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Head over to the <strong>Developer & API</strong> tab in the admin menu to manage your EmailJS credentials, customize notification templates for placed, delivered, and cancelled orders, and run real-time email dispatch tests.
          </p>
        </CardContent>
      </Card>

      {/* FOOTER & SOCIAL */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <CardTitle>Footer & Social</CardTitle>
          </div>
          <CardDescription>Footer text and social media links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Input
              id="footerText"
              value={form.footerText}
              onChange={(e) => set("footerText", e.target.value)}
              placeholder="© 2024 Shop. All rights reserved."
            />
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            {(["instagram", "facebook", "twitter"] as const).map((platform) => (
              <div key={platform} className="space-y-2">
                <Label htmlFor={platform} className="capitalize">{platform}</Label>
                <Input
                  id={platform}
                  value={form.socialLinks[platform]}
                  onChange={(e) => setSocial(platform, e.target.value)}
                  placeholder={`https://${platform}.com/...`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SAVE */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto sm:px-8" size="lg">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* ADD / EDIT BILLING FEE MODAL DIALOG */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? "Edit Billing Fee" : "Add New Billing Fee"}
            </DialogTitle>
            <DialogDescription>
              Configure fee amount, label, and free-waiver threshold for checkout and PDF bills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="feeName">Fee Name *</Label>
              <Input
                id="feeName"
                placeholder="e.g. Delivery Charge, Packaging & Handling, Platform Fee"
                value={feeForm.name}
                onChange={(e) => setFeeForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="feeAmount">Amount ({form.currency || "₹"}) *</Label>
                <Input
                  id="feeAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={feeForm.amount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
                    setFeeForm((prev) => ({ ...prev, amount: clean }));
                  }}
                />
                <p className="text-[11px] text-muted-foreground">Supports decimals (e.g. 15.50)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeWaive">Free Above ({form.currency || "₹"})</Label>
                <Input
                  id="feeWaive"
                  type="text"
                  inputMode="decimal"
                  placeholder="999"
                  value={feeForm.waiveAbove}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
                    setFeeForm((prev) => ({ ...prev, waiveAbove: clean }));
                  }}
                />
                <p className="text-[11px] text-muted-foreground">0 or blank = always charge</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">Charge this fee immediately on cart & checkout</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={feeForm.enabled}
                onClick={() => setFeeForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  feeForm.enabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    feeForm.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveFee}>
              {editingFee ? "Update Fee" : "Add Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
