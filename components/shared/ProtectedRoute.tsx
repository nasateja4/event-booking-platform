"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
    children,
    allowedRoles = ["admin", "super_admin"],
}: {
    children: React.ReactNode;
    allowedRoles?: string[];
}) {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            redirect("/auth/signin");
        }

        if (session.user.role && !allowedRoles.includes(session.user.role)) {
            redirect("/"); // Redirect unauthorized users
        }
    }, [session, status, allowedRoles]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session || (session.user.role && !allowedRoles.includes(session.user.role))) {
        return null;
    }

    return <>{children}</>;
}
