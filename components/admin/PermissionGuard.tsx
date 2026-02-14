"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser, TeamMember } from "@/types";

const ROUTE_PERMISSIONS: { [key: string]: string } = {
    "/admin/dashboard": "dashboard",
    "/admin/inventory": "inventory",
    "/admin/venues": "venues",
    "/admin/store": "store",
    "/admin/timeslots": "timeslots",
    "/admin/coupons": "coupons",
    "/admin/bookings": "bookings",
    "/admin/reviews": "reviews",
    "/admin/settings": "settings",
    "/admin/users": "users",
    "/admin/team": "team",
    // "/admin/account" is typically open to all admins
};

export default function PermissionGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [authorized, setAuthorized] = useState(true); // Default to true while checking
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            if (status === "loading") return;

            if (!session?.user) {
                // Should be handled by layout/middleware, but double check
                setAuthorized(false);
                setChecking(false);
                return;
            }

            console.log("Checking permissions for:", session.user.id, session.user.email);

            // Super Admin bypass (Session check - FAST)
            if (session.user.role === "super_admin") {
                console.log("Super Admin Bypass (Session)");
                setAuthorized(true);
                setChecking(false);
                return;
            }

            // For regular admins, fetch latest permissions from TEAM collection
            try {
                const q = query(collection(db, "team_members"), where("uid", "==", session.user.id));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const teamData = snapshot.docs[0].data() as TeamMember;
                    console.log("Found in Team Members:", teamData.role);

                    // Super Admin Bypass (Check real-time data - SECURE)
                    if (teamData.role === 'super_admin') {
                        setAuthorized(true);
                        setChecking(false);
                        return;
                    }

                    const permissions = teamData.permissions || [];

                    // Determine required permission for current route
                    const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route => pathname?.startsWith(route));

                    if (matchedRoute) {
                        const requiredPermission = ROUTE_PERMISSIONS[matchedRoute];

                        if (requiredPermission === "dashboard" || matchedRoute === "/admin/account") {
                            setAuthorized(true);
                        } else if (permissions.includes(requiredPermission)) {
                            setAuthorized(true);
                        } else {
                            console.log("Access Denied: Missing permission", requiredPermission);
                            // Block access
                            setAuthorized(false);
                        }
                    } else {
                        // Route not strictly protected by this map (e.g. /admin/account or new routes)
                        setAuthorized(true);
                    }
                } else {
                    // Fallback: Check 'users' collection for legacy admins/super_admins
                    console.log("Not in Team Members. Checking Users collection fallback...");
                    try {
                        const userDoc = await getDoc(doc(db, "users", session.user.id));

                        if (userDoc.exists()) {
                            const userData = userDoc.data() as FirebaseUser;
                            console.log("Found in Users:", userData.role);

                            if (userData.role === 'super_admin' || userData.role === 'admin') {
                                // Allow access for legacy admins
                                console.log("Legacy Admin Access Granted");
                                setAuthorized(true);
                            } else {
                                console.log("User found but not admin/super_admin");
                                setAuthorized(false);
                            }
                        } else {
                            console.log("User not found in Users collection either.");
                            setAuthorized(false);
                        }
                    } catch (fallbackError) {
                        console.error("Fallback check failed:", fallbackError);
                        setAuthorized(false);
                    }
                }
            } catch (error) {
                console.error("Error checking permissions:", error);
                setAuthorized(false);
            } finally {
                setChecking(false);
            }
        };

        checkAccess();
    }, [pathname, session, status]);

    if (checking) {
        return <div className="p-8 text-center text-slate-500">Checking permissions...</div>;
    }

    if (!authorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="bg-rose-50 p-6 rounded-full mb-4">
                    <span className="text-4xl">🚫</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-500 max-w-md">
                    You do not have permission to access this area. Please contact the Super Admin if you believe this is a mistake.
                </p>
                <div className="mt-8 text-xs text-slate-400 font-mono">
                    ID: {session?.user?.id}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
