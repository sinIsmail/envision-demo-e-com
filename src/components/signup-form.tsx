import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth, provider, db } from "@/firebase/fb"
import { signInWithPopup, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"

function getAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
  };
  return map[code] ?? `Error: ${code}`;
}

// Save user to Firestore after auth is confirmed
async function saveUserToFirestore(uid: string, name: string, email: string, photoURL: string = "") {
  try {
    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      photoURL,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Don't block login if Firestore write fails — log silently
    console.error("Could not save user to Firestore:", err);
  }
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwordErr, setPasswordErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", confpassword: "" });

  useEffect(() => {
    if (form.confpassword && form.confpassword !== form.password) {
      setPasswordErr("confpass");
    } else {
      setPasswordErr("");
    }
  }, [form.confpassword, form.password]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confpassword) {
      toast.add({ title: "Passwords don't match", description: "Please make sure both passwords are the same." });
      return;
    }
    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(res.user, { displayName: form.name });
      // Auth is now confirmed — safe to write to Firestore
      await saveUserToFirestore(res.user.uid, form.name, form.email);
      toast.add({ title: "Account created!", description: "Welcome to the store." });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.add({ title: "Sign up failed", description: getAuthError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, provider);
      // Auth confirmed — safe to write to Firestore
      await saveUserToFirestore(
        res.user.uid,
        res.user.displayName ?? "",
        res.user.email ?? "",
        res.user.photoURL ?? ""
      );
      toast.add({ title: "Welcome!", description: "Signed in with Google." });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.add({ title: "Google sign-in failed", description: getAuthError(err.code) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your information below to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSignup}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signup-name">Full Name</FieldLabel>
              <Input id="signup-name" type="text" placeholder="John Doe" required
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input id="signup-email" type="email" placeholder="john@example.com" required
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FieldDescription>We won&apos;t share your email with anyone.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input id="signup-password" type="password" required
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <FieldDescription>At least 6 characters.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-confpassword">Confirm Password</FieldLabel>
              <Input id="signup-confpassword" type="password" required
                onChange={(e) => setForm({ ...form, confpassword: e.target.value })} />
              {passwordErr === "confpass"
                ? <FieldDescription className="text-destructive">Passwords do not match</FieldDescription>
                : form.confpassword
                  ? <FieldDescription className="text-green-600">Passwords match ✓</FieldDescription>
                  : null}
            </Field>

            <FieldGroup>
              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignup} disabled={loading}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" />
                  </svg>
                  Sign up with Google
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link to="/Login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
