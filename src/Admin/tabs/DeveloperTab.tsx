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
import {
  sendTestOrderPlacedEmail,
  sendTestOrderCancelledEmail,
} from "@/lib/emailService";
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
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ORDER_PLACED_HTML = `<div style="background-color: #f9fafb; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #16a34a; padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Order Confirmed! 🎉</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Thank you for shopping with {{brand_name}}</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #374151; margin-top: 0;">Hi <strong>{{to_name}}</strong>,</p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Your order has been placed successfully and is being prepared for dispatch.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #166534; font-weight: 600;">Order ID:</td>
            <td style="text-align: right; font-weight: bold; font-family: monospace; color: #166534;">{{order_id}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding-top: 4px;">Date:</td>
            <td style="text-align: right; color: #374151; padding-top: 4px;">{{order_date}}</td>
          </tr>
        </table>
      </div>
      <h3 style="font-size: 13px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 8px;">Items Ordered</h3>
      <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; color: #374151; white-space: pre-line; line-height: 1.6;">
{{items_list}}
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-bottom: 20px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #6b7280; padding: 3px 0;">Subtotal:</td>
            <td style="text-align: right; color: #374151; padding: 3px 0;">{{subtotal}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 3px 0;">Shipping / Fees:</td>
            <td style="text-align: right; color: #374151; padding: 3px 0;">{{shipping}}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 16px;">
            <td style="color: #111827; padding-top: 8px; border-top: 1px dashed #d1d5db;">Total:</td>
            <td style="text-align: right; color: #16a34a; padding-top: 8px; border-top: 1px dashed #d1d5db;">{{total}}</td>
          </tr>
        </table>
      </div>
      <h3 style="font-size: 13px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 8px;">Delivery Address</h3>
      <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #4b5563; line-height: 1.5; white-space: pre-line;">
{{delivery_address}}
      </div>
    </div>
    <div style="background: #f3f4f6; padding: 14px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
      This is an automated confirmation from {{brand_name}}.
    </div>
  </div>
</div>`;

const ORDER_CANCELLED_HTML = `<div style="background-color: #f9fafb; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #dc2626; padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Order Cancelled ⚠️</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Notice from {{brand_name}}</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #374151; margin-top: 0;">Hi <strong>{{to_name}}</strong>,</p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Your order has been cancelled by the store administrator.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; color: #991b1b; font-weight: 600;">Cancellation Reason:</p>
        <p style="margin: 0; font-size: 13px; color: #b91c1c; font-weight: 500;">{{cancel_reason}}</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">Order ID: <strong>{{order_id}}</strong></p>
      </div>
      <h3 style="font-size: 13px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 8px;">Cancelled Items</h3>
      <div style="background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; color: #374151; white-space: pre-line; line-height: 1.6;">
{{items_list}}
      </div>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-bottom: 20px;">
        <table style="width: 100%; font-size: 14px;">
          <tr style="font-weight: bold; font-size: 15px;">
            <td style="color: #111827;">Order Total:</td>
            <td style="text-align: right; color: #374151;">{{total}}</td>
          </tr>
        </table>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
        <strong>Refund Policy:</strong> If any payment was collected, your refund or store credit will be processed promptly according to policy.
      </div>
    </div>
    <div style="background: #f3f4f6; padding: 14px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
      Please contact {{brand_name}} support if you have any questions.
    </div>
  </div>
</div>`;

export function DeveloperTab() {
  const { settings, saveSettings } = useSiteSettings();

  const [form, setForm] = useState({
    emailServiceId: settings.emailServiceId || "service_l42nxid",
    emailPublicKey: settings.emailPublicKey || "J_tUJ1nmVg3u2fMzj",
    emailTemplateOrderPlaced: settings.emailTemplateOrderPlaced || "template_mk6jk5e",
    emailTemplateOrderCancelled: settings.emailTemplateOrderCancelled || "template_mk6jk5e",
  });

  const [testEmail, setTestEmail] = useState("");
  const [testingPlaced, setTestingPlaced] = useState(false);
  const [testingCancelled, setTestingCancelled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"placed" | "cancelled">("placed");

  const set = (key: keyof typeof form, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings(form);
      toast.add({
        title: "Developer Settings Saved! ⚙️",
        description: "EmailJS Service ID, Public Key, and Template IDs updated successfully.",
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

  const handleTestPlaced = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.add({
        title: "Recipient Required",
        description: "Please enter a valid email address to send the test notification.",
      });
      return;
    }

    setTestingPlaced(true);
    try {
      const res = await sendTestOrderPlacedEmail(testEmail, {
        ...settings,
        ...form,
      });

      if (res.success) {
        toast.add({
          title: "Order Placed Email Sent! ✉️",
          description: `Dispatched to ${testEmail}. Please check inbox & spam folder.`,
        });
      } else {
        toast.add({
          title: "Send Failed",
          description: res.message,
        });
      }
    } catch (err: any) {
      toast.add({
        title: "Error",
        description: err.message || "Failed to trigger EmailJS test.",
      });
    } finally {
      setTestingPlaced(false);
    }
  };

  const handleTestCancelled = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.add({
        title: "Recipient Required",
        description: "Please enter a valid email address to send the test notification.",
      });
      return;
    }

    setTestingCancelled(true);
    try {
      const res = await sendTestOrderCancelledEmail(testEmail, {
        ...settings,
        ...form,
      });

      if (res.success) {
        toast.add({
          title: "Order Cancelled Email Sent! ✉️",
          description: `Dispatched to ${testEmail}. Please check inbox & spam folder.`,
        });
      } else {
        toast.add({
          title: "Send Failed",
          description: res.message,
        });
      }
    } catch (err: any) {
      toast.add({
        title: "Error",
        description: err.message || "Failed to trigger EmailJS test.",
      });
    } finally {
      setTestingCancelled(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.add({
      title: "Copied to Clipboard! 📋",
      description: `${label} HTML copied. Paste into EmailJS template editor.`,
    });
  };

  const isConfigured = Boolean(
    form.emailServiceId &&
      form.emailPublicKey &&
      form.emailTemplateOrderPlaced &&
      form.emailTemplateOrderCancelled
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
            Configure EmailJS automation, test live email delivery, and view system endpoints.
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
              <CardTitle>Customer Email Notifications (EmailJS)</CardTitle>
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
            Transactional emails dispatch automatically from your connected Gmail via EmailJS (no custom domain DNS required).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Status Alert */}
          {isConfigured ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Email Automation Active (Order Placed & Order Cancelled)
                </p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  Confirmation receipts dispatch on checkout, and cancellation notices dispatch if an order is cancelled in Orders Management.
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

          {/* Credentials Inputs (Clean & Clearly Labeled) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emailServiceId" className="font-semibold">
                EmailJS Service ID
              </Label>
              <Input
                id="emailServiceId"
                value={form.emailServiceId}
                onChange={(e) => set("emailServiceId", e.target.value)}
                placeholder="service_l42nxid"
              />
              <p className="text-[11px] text-muted-foreground">
                From EmailJS &rarr; Email Services (e.g. your connected Gmail service).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailPublicKey" className="font-semibold">
                EmailJS Public Key
              </Label>
              <Input
                id="emailPublicKey"
                value={form.emailPublicKey}
                onChange={(e) => set("emailPublicKey", e.target.value)}
                placeholder="J_tUJ1nmVg3u2fMzj"
              />
              <p className="text-[11px] text-muted-foreground">
                From EmailJS &rarr; Account &rarr; API Keys &rarr; Public Key.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailTemplateOrderPlaced" className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Order Placed Template ID
              </Label>
              <Input
                id="emailTemplateOrderPlaced"
                value={form.emailTemplateOrderPlaced}
                onChange={(e) => set("emailTemplateOrderPlaced", e.target.value)}
                placeholder="template_mk6jk5e"
              />
              <p className="text-[11px] text-muted-foreground">
                Sent automatically when a customer completes checkout.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emailTemplateOrderCancelled" className="font-semibold text-destructive flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> Order Cancelled Template ID
              </Label>
              <Input
                id="emailTemplateOrderCancelled"
                value={form.emailTemplateOrderCancelled}
                onChange={(e) => set("emailTemplateOrderCancelled", e.target.value)}
                placeholder="template_mk6jk5e"
              />
              <p className="text-[11px] text-muted-foreground">
                Sent automatically when an admin cancels an order in Orders management.
              </p>
            </div>
          </div>

          {/* Live Test Console */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-muted/20 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-primary" /> Live Connection Test
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Send a real test email to verify your EmailJS connection and template formatting.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="Enter recipient email (e.g. yourname@gmail.com)"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 text-xs h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testingPlaced || testingCancelled}
                onClick={handleTestPlaced}
                className="text-xs shrink-0 gap-1.5 h-9 font-medium"
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                {testingPlaced ? "Testing Placed..." : "Test Order Placed"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testingPlaced || testingCancelled}
                onClick={handleTestCancelled}
                className="text-xs shrink-0 gap-1.5 h-9 font-medium"
              >
                <Send className="h-3.5 w-3.5 text-destructive" />
                {testingCancelled ? "Testing Cancelled..." : "Test Order Cancelled"}
              </Button>
            </div>
          </div>

          {/* Expandable Template HTML & Variables Helper */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTemplateGuide(!showTemplateGuide)}
              className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Code className="h-4 w-4 text-primary" />
                EmailJS Template HTML & Settings Guide (Click to View & Copy)
              </span>
              {showTemplateGuide ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showTemplateGuide && (
              <div className="p-4 bg-background border-t space-y-4 text-xs">
                {/* Critical Note */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-200 space-y-1">
                  <p className="font-bold">⚠️ CRITICAL: EmailJS Template Settings Requirement</p>
                  <p className="leading-relaxed">
                    In your EmailJS template editor, open the <strong>Settings tab</strong> on the right and make sure:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    <li><strong>To Email</strong> is set to <code>{"{{to_email}}"}</code> (NOT your own email, so it reaches the customer!)</li>
                    <li><strong>Subject</strong> can be <code>{"Order Confirmed: {{order_id}} - {{brand_name}}"}</code></li>
                    <li><strong>From Name</strong> can be <code>{"{{brand_name}}"}</code></li>
                  </ul>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 border-b pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab("placed")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      activeGuideTab === "placed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    1. Order Placed HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab("cancelled")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                      activeGuideTab === "cancelled"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    2. Order Cancelled HTML
                  </button>
                </div>

                {/* HTML Viewer & Copy Button */}
                {activeGuideTab === "placed" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Order Placed HTML Template:</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(ORDER_PLACED_HTML, "Order Placed")}
                        className="h-7 text-xs gap-1.5"
                      >
                        <Copy className="h-3 w-3" /> Copy HTML
                      </Button>
                    </div>
                    <pre className="max-h-60 overflow-y-auto p-3 bg-muted/60 rounded-lg text-[11px] font-mono text-foreground border whitespace-pre-wrap select-all">
                      {ORDER_PLACED_HTML}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Order Cancelled HTML Template:</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(ORDER_CANCELLED_HTML, "Order Cancelled")}
                        className="h-7 text-xs gap-1.5"
                      >
                        <Copy className="h-3 w-3" /> Copy HTML
                      </Button>
                    </div>
                    <pre className="max-h-60 overflow-y-auto p-3 bg-muted/60 rounded-lg text-[11px] font-mono text-foreground border whitespace-pre-wrap select-all">
                      {ORDER_CANCELLED_HTML}
                    </pre>
                  </div>
                )}
              </div>
            )}
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
