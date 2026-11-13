import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { auth, db } from "@/firebase/fb"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"

function getAuthError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? `Error: ${code}`;
}

// Save user to Firestore after auth is confirmed
async function saveUserToFirestore(uid: string, name: string, email: string, phone: string, photoURL: string = "") {
  try {
    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      phone,
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
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confpassword: "" });

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
      await saveUserToFirestore(res.user.uid, form.name, form.email, form.phone);
      toast.add({ title: "Account created!", description: "Welcome to the store." });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.add({ title: "Sign up failed", description: getAuthError(err.code) });
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
              <FieldLabel htmlFor="signup-phone">Phone Number</FieldLabel>
              <Input id="signup-phone" type="tel" placeholder="+1 234 567 8900" required
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FieldDescription>Used for order updates and support.</FieldDescription>
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
                <Button type="submit" className="w-full text-white font-bold" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center text-zinc-300">
                  Already have an account?{" "}
                  <Link to="/Login" className="text-white hover:underline font-semibold underline-offset-4 ml-1">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
