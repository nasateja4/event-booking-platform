"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser, TeamMember } from "@/types";

const menuItems = [
    { key: "dashboard", name: "Dashboard", href: "/admin/dashboard", emoji: "📊" },
    { key: "inventory", name: "Inventory", href: "/admin/inventory", emoji: "📦" },
    { key: "venues", name: "Venues", href: "/admin/venues", emoji: "🏛️" },
    { key: "store", name: "Store", href: "/admin/store", emoji: "🛍️" },
    { key: "timeslots", name: "Time Slots", href: "/admin/timeslots", emoji: "⏰" },
    { key: "coupons", name: "Coupons", href: "/admin/coupons", emoji: "🎫" },
    { key: "bookings", name: "Bookings", href: "/admin/bookings", emoji: "📋" },
    { key: "reviews", name: "Reviews", href: "/admin/reviews", emoji: "⭐" },
    { key: "settings", name: "Settings", href: "/admin/settings", emoji: "⚙️" },
    { key: "users", name: "Users", href: "/admin/users", emoji: "👥" },
    { key: "team", name: "Team", href: "/admin/team", emoji: "🛡️" }, // Only Super Admin
    { key: "account", name: "Account", href: "/admin/account", emoji: "👤" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [teamData, setTeamData] = useState<TeamMember | null>(null);

    // Fetch real-time permissions (with fallback)
    useEffect(() => {
        if (!session?.user?.id) return;

        // 1. Try fetching from team_members
        const q = query(collection(db, "team_members"), where("uid", "==", session.user.id));
        const unsubTeam = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setTeamData(snapshot.docs[0].data() as TeamMember);
            } else {
                // 2. Fallback: Fetch from users collection if not in team
                getDoc(doc(db, "users", session.user.id)).then((userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as FirebaseUser;
                        // Map user data to team member structure for compatibility
                        if (userData.role === 'admin' || userData.role === 'super_admin') {
                            setTeamData({
                                ...userData,
                                // @ts-ignore
                                uid: userData.uid || session.user.id,
                                permissions: userData.permissions || []
                            } as TeamMember);
                        }
                    }
                });
            }
        });

        return () => unsubTeam();
    }, [session?.user?.id]);

    // Filter menu items based on role and permissions
    const visibleItems = menuItems.filter(item => {
        if (!teamData) return false;

        // Super Admin sees everything
        if (teamData.role === "super_admin") return true;

        // Standard Admin checks permissions
        // Always show Dashboard and Account for basic access
        if (item.key === "dashboard" || item.key === "account") return true;

        // "Team" is strictly Super Admin only
        if (item.key === "team") return false;

        // Check if permission exists
        return teamData.permissions?.includes(item.key);
    });

    return (
        <div className="w-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col h-screen sticky top-0 shadow-2xl border-r border-slate-700/50 z-50">
            {/* Logo/Header */}
            <div className="p-6 border-b border-slate-700/50">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20 mb-3 w-fit">
                    <span className="text-2xl">🎉</span>
                </div>
                <h1 className="text-lg font-black text-white tracking-tight leading-none">Business Console</h1>
                {session?.user && (
                    <div className="mt-2">
                        <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-widest opacity-70">
                            {session.user.email}
                        </p>
                        <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest mt-0.5">
                            {teamData?.role?.replace("_", " ")}
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <span className={`text-lg transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>{item.emoji}</span>
                            <span className="font-bold text-[11px] uppercase tracking-wider">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Sign Out */}
            <div className="p-4 border-t border-slate-700/50">
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-200 font-bold text-[11px] uppercase tracking-wider border border-rose-500/20 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                >
                    <span className="text-base">🚪</span>
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
