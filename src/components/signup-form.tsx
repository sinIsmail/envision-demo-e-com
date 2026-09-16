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

import { auth, provider } from "../firebase/fb"
import { signInWithPopup } from 'firebase/auth'
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"

import { toast } from "@/components/ui/toast"

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
        try {
            let res = await createUserWithEmailAndPassword(auth, form.email, form.password);
            let user = await res.user;
            await updateProfile(user, {
                displayName:form.name
            });
            console.log(res);
            if (res.user) {
                localStorage.setItem("token", "some-token");
                navigate("/");
                toast.add({
                    title: "Welcum!",
                    description: "Thank you for siging in"
                });
            }
        } catch (err) {
            console.log(err);
            toast.add({
                title: "Account alreday exist",
                description: "You should stop messing around"
            });

        }
    };
    const signupwithgooglehandler = async () => {
       
        try {
            console.log("using google auth provider...");
            let res = await signInWithPopup(auth, provider);
            console.log(res);
            if (res.user) {
                navigate("/Home");
                toast.add({
                    title: "Welcum!",
                    description: "Thank you for siging in"
                });
            }
        } catch (error) {
            console.log(err);
            toast.add({
                title: "Account alreday exist",
                description: "You should stop messing around"
            });
        }
    }
        useEffect(() => {
            if (form.confpassword != form.password) {
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
                                    placeholder="jhon@lennon.com"
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
                                    Must be at least 8 characters long.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirm-password">
                                    Confirm Password
                                </FieldLabel>
                                <Input id="confirm-password" type="password" onChange={(e) => { setform({ ...form, confpassword: e.target.value }) }} required />

                                {err === "confpass" ? <FieldDescription className="text-red-500">The password is not matching</FieldDescription> :
                                    <FieldDescription>The password is matching!</FieldDescription>}
                            </Field>
                            <FieldGroup>
                                <Field>
                                    <Button type="submit">Create Account</Button>
                                    <Button variant="outline" onClick={signupwithgooglehandler}>
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
