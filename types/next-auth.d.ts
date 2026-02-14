import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: "admin" | "super_admin" | "customer";
        } & DefaultSession["user"];
    }

    interface User {
        role?: "admin" | "super_admin" | "customer";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role?: "admin" | "super_admin" | "customer";
    }
}
