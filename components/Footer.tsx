"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FooterLink {
    name: string;
    url: string;
    enabled: boolean;
}

interface FooterSettings {
    customLinks: FooterLink[];
}

export default function Footer() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<FooterSettings>({
        customLinks: [
            { name: "Home", url: "/", enabled: true },
            { name: "Features", url: "/#features", enabled: true },
            { name: "Venues", url: "/#venues", enabled: true },
        ]
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "settings", "footer"), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as FooterSettings);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <footer className="bg-slate-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-6 text-center">
                {/* Brand */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-2xl">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <h3 className="text-2xl font-black">PartyPlanner</h3>
                </div>
                <p className="text-slate-400 mb-6">Making every celebration magical</p>

                {/* Dynamic Links */}
                <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
                    {settings.customLinks?.filter(link => link.enabled).map((link, index) => (
                        <Link key={index} href={link.url} className="text-slate-400 hover:text-white transition-all font-medium">
                            {link.name}
                        </Link>
                    ))}
                    {session && (
                        <Link href="/profile" className="text-slate-400 hover:text-white transition-all font-medium">
                            Profile
                        </Link>
                    )}
                </div>

                <div className="text-slate-500 text-sm pt-8 border-t border-slate-800">
                    © {new Date().getFullYear()} Party Planner. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
