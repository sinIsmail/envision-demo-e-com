import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { auth, provider, db } from "../firebase/fb"
import { signInWithPopup } from 'firebase/auth'
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { toast } from "@/components/ui/toast"

// Map Firebase error codes to readable messages
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

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {

    const navigate = useNavigate();
    const [err, seterr] = useState("");
    const [form, setform] = useState({
        name: "",
        email: "",
        password: "",
        confpassword: ""
    });

    const signupformHandler = async (e: any) => {
        e.preventDefault();
        if (form.password !== form.confpassword) {
            toast.add({ title: "Passwords don't match", description: "Please make sure both passwords are the same." });
            return;
        }
        try {
            let res = await createUserWithEmailAndPassword(auth, form.email, form.password);
            await updateProfile(res.user, { displayName: form.name });

            // Save user to Firestore
            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                name: form.name,
                email: form.email,
                createdAt: serverTimestamp(),
            });

            localStorage.setItem("token", "some-token");
            navigate("/");
            toast.add({ title: "Welcome!", description: "Account created successfully." });
        } catch (err: any) {
            console.error(err);
            toast.add({
                title: "Sign up failed",
                description: getAuthError(err.code),
            });
        }
    };

    const signupwithgooglehandler = async () => {
        try {
            let res = await signInWithPopup(auth, provider);
            if (res.user) {
                // Save/update user to Firestore
                await setDoc(doc(db, "users", res.user.uid), {
                    uid: res.user.uid,
                    name: res.user.displayName ?? "",
                    email: res.user.email ?? "",
                    createdAt: serverTimestamp(),
                }, { merge: true });

                localStorage.setItem("token", "user-token");
                navigate("/");
                toast.add({ title: "Welcome!", description: "Signed in with Google." });
            }
        } catch (error: any) {
            console.error(error);
            toast.add({
                title: "Google sign-in failed",
                description: getAuthError(error.code),
            });
        }
    }

    useEffect(() => {
        if (form.confpassword !== "" && form.confpassword !== form.password) {
            seterr("confpass");
        } else {
            seterr("")
        }
    }, [form.confpassword, form.password])


    return (
        <Card {...props}>

            <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                    Enter your information below to create your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={signupformHandler}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">Full Name</FieldLabel>
                            <Input id="name" type="text" placeholder="John Lennon" onChange={(e) => { setform({ ...form, name: e.target.value }) }} required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                onChange={(e) => { setform({ ...form, email: e.target.value }) }}
                                required
                            />
                            <FieldDescription>
                                We&apos;ll use this to contact you. We will not share your email
                                with anyone else.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <Input id="password" type="password" onChange={(e) => { setform({ ...form, password: e.target.value }) }} required />
                            <FieldDescription>
                                Must be at least 6 characters long.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="confirm-password">
                                Confirm Password
                            </FieldLabel>
                            <Input id="confirm-password" type="password" onChange={(e) => { setform({ ...form, confpassword: e.target.value }) }} required />

                            {err === "confpass" ? <FieldDescription className="text-red-500">Passwords do not match</FieldDescription> :
                                form.confpassword !== "" ? <FieldDescription className="text-green-500">Passwords match!</FieldDescription> : null}
                        </Field>
                        <FieldGroup>
                            <Field>
                                <Button type="submit">Create Account</Button>
                                <Button variant="outline" type="button" onClick={signupwithgooglehandler}>
                                    Sign up with Google
                                </Button>
                                <FieldDescription className="px-6 text-center">
                                    Already have an account? <Link to={"/Login"}>Sign in</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
