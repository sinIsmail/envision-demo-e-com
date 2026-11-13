import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { sendOrderPlacedEmail } from "@/lib/emailService";
import {
  Mail,
  Send,
  HelpCircle,
  Check,
  Save,
  Code,
  Globe,
  ExternalLink,
  Flame,
  GitBranch,
} from "lucide-react";

export function DeveloperTab() {
  const { settings, saveSettings } = useSiteSettings();

  const [form, setForm] = useState({
    emailServiceId: settings.emailServiceId || "service_l42nxid",
    emailPublicKey: settings.emailPublicKey || "J_tUJ1nmVg3u2fMzj",
    emailTemplateOrderPlaced: settings.emailTemplateOrderPlaced || "template_mk6jk5e",
    emailTemplateOrderDelivered: settings.emailTemplateOrderDelivered || "template_mk6jk5e",
    emailTemplateOrderCancelled: settings.emailTemplateOrderCancelled || "template_mk6jk5e",
  });

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings(form);
      toast.add({
        title: "Developer Settings Saved! ⚙️",
        description: "EmailJS credentials and API configurations updated successfully.",
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Save Failed",
        description: "Could not update developer settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.add({
        title: "Recipient Required",
        description: "Please enter a valid email address to send the test notification.",
      });
      return;
    }

    setSendingTest(true);
    try {
      const res = await sendOrderPlacedEmail(
        {
          toEmail: testEmail.trim(),
          toName: "Test Administrator",
          orderId: "#01",
          orderDate: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          itemsList: "1. Sample Test Item × 1 — ₹49.00",
          subtotal: "₹49.00",
          shipping: "Free",
          total: "₹49.00",
          deliveryAddress: "Test Address, Floor 1, City — 400001",
          brandName: settings.brandName || "Shop.",
        },
        {
          ...settings,
          ...form,
        }
      );

      if (res.success) {
        toast.add({
          title: "Test Email Dispatched! ✉️",
          description: `Sent successfully to ${testEmail}. Check your inbox or spam folder.`,
        });
      } else {
        toast.add({
          title: "Test Failed",
          description: res.message || "Failed to deliver test email.",
        });
      }
    } catch (err: any) {
      toast.add({
        title: "Error",
        description: err.message || "Failed to trigger EmailJS test.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isConfigured = Boolean(
    form.emailServiceId &&
      form.emailPublicKey &&
      form.emailTemplateOrderPlaced &&
      form.emailTemplateOrderDelivered
  );

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Developer & API Integrations
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure third-party services, EmailJS automation, and monitor system diagnostics.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 shrink-0 font-semibold"
          size="sm"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving Changes..." : "Save Developer Settings"}
        </Button>
      </div>

      {/* ── CARD 1: Automated EmailJS Notifications ── */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Automated Customer Email Notifications (EmailJS)</CardTitle>
            </div>
            <Badge
              variant="secondary"
              className={`text-xs font-semibold ${
                isConfigured
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {isConfigured ? "⚡ Fully Operational" : "⚠ Configuration Required"}
            </Badge>
          </div>
          <CardDescription>
            Transactional emails dispatch automatically when customers place orders, when orders are delivered, and if an order is cancelled.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Status Banner */}
          {isConfigured ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Automated Email System Active
                </p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  Every order placed or updated will automatically dispatch confirmation emails to the customer&apos;s registered address.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-200">
              <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Setup Required for Automated Dispatch
                </p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300 leading-relaxed">
                  Provide your EmailJS Service ID, Public Key, and Template IDs below so customer emails can be delivered automatically.
                </p>
              </div>
            </div>
          )}

          {/* Quick Guide */}
          <div className="rounded-xl border bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-primary" /> Setup Guide (EmailJS — Free 200 emails/month):
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>
                Log in to your account at{" "}
                <a
                  href="https://www.emailjs.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-medium"
                >
                  emailjs.com
                </a>
                .
              </li>
              <li>
                Under <strong>Email Services</strong>, find your Service ID (e.g. <code>service_l42nxid</code>).
              </li>
              <li>
                Under <strong>Account → API Keys</strong>, copy your <strong>Public Key</strong> (e.g. <code>J_tUJ1nmVg3u2fMzj</code>).
              </li>
              <li>
                Under <strong>Email Templates</strong>, copy your Template ID (e.g. <code>template_mk6jk5e</code>).
              </li>
            </ol>
          </div>

          {/* Credentials Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emailServiceId">EmailJS Service ID</Label>
              <Input
                id="emailServiceId"
                value={form.emailServiceId}
                onChange={(e) => set("emailServiceId", e.target.value)}
                placeholder="service_l42nxid"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailPublicKey">EmailJS Public Key</Label>
              <Input
                id="emailPublicKey"
                value={form.emailPublicKey}
                onChange={(e) => set("emailPublicKey", e.target.value)}
                placeholder="J_tUJ1nmVg3u2fMzj"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailTemplateOrderPlaced">1. Order Placed Template ID (Automatic)</Label>
              <Input
                id="emailTemplateOrderPlaced"
                value={form.emailTemplateOrderPlaced}
                onChange={(e) => set("emailTemplateOrderPlaced", e.target.value)}
                placeholder="template_mk6jk5e"
              />
              <p className="text-[11px] text-muted-foreground">
                Sent automatically on checkout. Variables: <code>{"{{to_email}}"}</code>, <code>{"{{to_name}}"}</code>, <code>{"{{order_id}}"}</code>, <code>{"{{items_list}}"}</code>, <code>{"{{total}}"}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailTemplateOrderDelivered">2. Order Delivered Template ID (Automatic)</Label>
              <Input
                id="emailTemplateOrderDelivered"
                value={form.emailTemplateOrderDelivered}
                onChange={(e) => set("emailTemplateOrderDelivered", e.target.value)}
                placeholder="template_mk6jk5e"
              />
              <p className="text-[11px] text-muted-foreground">
                Sent automatically when order marked Delivered in admin.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emailTemplateOrderCancelled">3. Order Cancelled Template ID (Automatic)</Label>
              <Input
                id="emailTemplateOrderCancelled"
                value={form.emailTemplateOrderCancelled}
                onChange={(e) => set("emailTemplateOrderCancelled", e.target.value)}
                placeholder="template_mk6jk5e"
              />
              <p className="text-[11px] text-muted-foreground">
                Sent automatically when an order is cancelled & inventory stock is restored.
              </p>
            </div>
          </div>

          {/* Test Live Connection */}
          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="testEmailInput" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-primary" /> Live Connection Test
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Send an instant test email right now to verify that your EmailJS credentials connect and deliver properly.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                id="testEmailInput"
                type="email"
                placeholder="Enter your personal email (e.g. you@gmail.com)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingTest}
                onClick={handleSendTest}
                className="text-xs shrink-0 gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingTest ? "Sending Test..." : "Send Test Email"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 2: Environment & Production Diagnostics ── */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>System Diagnostics & Environment</CardTitle>
          </div>
          <CardDescription>
            Live deployment endpoints, database sync, and version control links.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" /> Firebase Project
                </span>
                <Badge variant="outline" className="text-[10px]">Production</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono">envision-demo-com</p>
              <a
                href="https://console.firebase.google.com/project/envision-demo-com/overview"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                Open Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-500" /> Production URL
                </span>
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Live</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono truncate">envision-demo-com.web.app</p>
              <a
                href="https://envision-demo-com.web.app"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                Visit Site <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-purple-500" /> Git Repository
                </span>
                <Badge variant="outline" className="text-[10px]">GitHub</Badge>
              </div>
              <p className="text-sm font-bold text-foreground font-mono truncate">sinIsmail/envision-demo-e-com</p>
              <a
                href="https://github.com/sinIsmail/envision-demo-e-com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5"
              >
                View Repository <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

