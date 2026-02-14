import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { cert } from "firebase-admin/app";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                try {
                    // Check if user exists in Firestore
                    const userRef = doc(db, "users", user.id);
                    const userDoc = await getDoc(userRef);

                    if (!userDoc.exists()) {
                        // Create new user document
                        await setDoc(userRef, {
                            uid: user.id,
                            email: user.email,
                            name: user.name,
                            photoURL: user.image,
                            role: "customer", // Default role
                            createdAt: new Date(),
                            totalBookings: 0,
                        });
                    }
                    return true;
                } catch (error) {
                    console.error("Error during sign-in:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // Fetch user role from Firestore
                const userRef = doc(db, "users", user.id);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    token.role = userData.role || "customer";
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "admin" | "super_admin" | "customer";
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
