// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"
import { GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSqnT6ZWjvS0BFc6tczEQrRPnWh7MfQjY",
  authDomain: "envision-demo-com.firebaseapp.com",
  projectId: "envision-demo-com",
  storageBucket: "envision-demo-com.firebasestorage.app",
  messagingSenderId: "190953866921",
  appId: "1:190953866921:web:ec06a80e6e5db58f608bb8",
  measurementId: "G-KG3E2XK5PQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore();

export {app, analytics, auth, provider, db};