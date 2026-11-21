import { cn } from "cn";

const ADMIN_UID = "TupK2gYT3tg9ZMCtpDLjPavLVgE2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth } from "@/firebase/fb";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Mail, CheckCircle2, RefreshCw } from "lucide-react";

function getAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? `Authentication error: ${code}`;
}

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Forgot Password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await signInWithEmailAndPassword(auth, form.email, form.password);
      // Admin always goes to the admin dashboard
      navigate(res.user.uid === ADMIN_UID ? "/Admin" : "/");
    } catch (err: any) {
      console.error(err);
      toast.add({ title: "Login failed", description: getAuthError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setResetEmail(form.email || "");
    setResetSent(false);
    setResetModalOpen(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      toast.add({ title: "Invalid Email", description: "Please enter a valid email address." });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSent(true);
      toast.add({
        title: "Reset Link Dispatched ✉️",
        description: `Password reset link sent to ${targetEmail}. Please check your inbox.`,
      });
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.add({
        title: "Reset Request Failed",
        description: getAuthError(err.code),
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-[32px] border border-slate-200/80 dark:border-white/15 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-500 border border-amber-400/20">
            Secure Account
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-xs">Login with your email and password</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleEmailLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-full px-4.5"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <button
                    type="button"
                    onClick={openResetModal}
                    className="ml-auto text-xs sm:text-sm text-primary hover:text-primary/80 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-full px-4.5"
                />
              </Field>

              <Field>
                <Button type="submit" className="w-full rounded-full h-12 text-sm font-bold active:scale-95 transition-all shadow-md" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <FieldDescription className="text-center text-zinc-500 dark:text-zinc-400 mt-2">
                  Don&apos;t have an account?{" "}
                  <Link to="/Signup" className="text-primary hover:underline font-bold underline-offset-4 ml-1">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs">
        By signing in, you agree to our <a href="#" className="underline">Terms</a> and{" "}
        <a href="#" className="underline">Privacy Policy</a>.
      </FieldDescription>

      {/* ── FORGOT PASSWORD DIALOG ── */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset Your Password
            </DialogTitle>
            <DialogDescription>
              {resetSent
                ? "Password reset instructions have been dispatched to your email."
                : "Enter your registered email address and we'll send you a secure link to reset your password."}
            </DialogDescription>
          </DialogHeader>

          {resetSent ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Reset link sent!</span>
                </div>
                <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-200">
                  We've sent an email to <strong>{resetEmail}</strong> with a secure link to create a new password.
                </p>
                <p className="text-[11px] opacity-80 pt-1">
                  💡 Didn't receive it? Check your spam/junk folder, or wait a minute and click resend below.
                </p>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendResetEmail}
                  disabled={resetLoading}
                  className="gap-1.5 text-xs w-full sm:w-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resetLoading ? "animate-spin" : ""}`} />
                  Resend Link
                </Button>
                <Button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="text-xs w-full sm:w-auto text-white font-bold"
                >
                  Back to Sign In
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSendResetEmail} className="space-y-4 pt-1">
              <div className="space-y-2">
                <FieldLabel htmlFor="reset-email">Account Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="m@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full sm:w-auto gap-1.5 font-semibold text-white"
                >
                  {resetLoading ? "Sending link..." : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
