"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled
                    ? "bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-sm py-3"
                    : "bg-transparent border-transparent py-5"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className={`p-2.5 rounded-xl transition-all duration-300 ${scrolled ? "bg-indigo-50 text-indigo-600" : "bg-white/10 backdrop-blur-md text-slate-900 shadow-sm"}`}>
                            <span className="text-2xl group-hover:scale-110 block transition-transform">🎉</span>
                        </div>
                        <div>
                            <h1 className={`text-xl font-black tracking-tight transition-colors ${scrolled ? "text-slate-900" : "text-slate-900"}`}>
                                PartyPlanner
                            </h1>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="flex items-center gap-2">
                    <Link
                        href="/store"
                        className={`px-4 py-2 bg-white/50 hover:bg-white rounded-full font-bold transition-all flex items-center gap-2 text-sm ${scrolled ? "text-slate-600" : "text-slate-700 backdrop-blur-sm"}`}
                    >
                        <span>🛍️</span> Store
                    </Link>

                    {session ? (
                        <>
                            {session.user.role === "admin" || session.user.role === "super_admin" ? (
                                <Link
                                    href="/admin/dashboard"
                                    className="hidden sm:block bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Dashboard
                                </Link>
                            ) : null}

                            <Link
                                href="/profile"
                                className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/80 transition-all border ${scrolled ? "border-slate-100 bg-slate-50" : "border-white/20 bg-white/40 backdrop-blur-md"}`}
                            >
                                {session.user.image ? (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-8 h-8 rounded-full ring-2 ring-white"
                                    />
                                ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                        {session.user.name?.charAt(0) || "U"}
                                    </div>
                                )}
                                <span className={`text-sm font-bold truncate max-w-[100px] ${scrolled ? "text-slate-700" : "text-slate-800"}`}>
                                    {session.user.name?.split(" ")[0]}
                                </span>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/api/auth/signin"
                                className={`hidden md:block px-5 py-2.5 rounded-full font-bold text-sm transition-all ${scrolled ? "text-slate-600 hover:bg-slate-100" : "text-slate-700 hover:bg-white/50"}`}
                            >
                                Partner Login
                            </Link>
                            <Link
                                href="/login"
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                            >
                                Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
