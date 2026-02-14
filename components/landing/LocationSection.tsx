"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LocationSection() {
    const [settings, setSettings] = useState({
        imageUrl: "",
        targetUrl: "",
        enabled: false,
        manualAddress: ""
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (error) {
                console.error("Error fetching location data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    if (loading || !settings.enabled || !settings.imageUrl) return null;

    const Content = (
        <section className="bg-slate-50 pb-0 pt-16">
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <div className="text-center">
                    <h2 className="text-5xl font-black text-slate-900 mb-4">Our Location</h2>
                    <p className="text-xl text-slate-600">Find us easily</p>
                </div>
            </div>

            <div className="w-full h-[60vh] min-h-[400px] relative group cursor-pointer overflow-hidden">
                <img
                    src={settings.imageUrl}
                    alt="Location Map"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <span className="text-lg font-black text-slate-900 flex items-center gap-2">
                            📍 Open in Maps
                        </span>
                    </div>
                </div>

                {/* Manual Address Overlay */}
                {settings.manualAddress && (
                    <div className="absolute bottom-0 left-0 p-6 md:p-12 pointer-events-none w-full flex justify-center md:justify-start bg-gradient-to-t from-black/50 to-transparent">
                        <div className="bg-white/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl max-w-md text-left transform transition-transform group-hover:scale-[1.02]">
                            <div className="flex items-start gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl">
                                    <span className="text-2xl">📍</span>
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Our Location</h3>
                                    <p className="text-slate-900 font-bold text-lg leading-relaxed whitespace-pre-line">
                                        {settings.manualAddress}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );

    if (settings.targetUrl) {
        return (
            <a href={settings.targetUrl} target="_blank" rel="noopener noreferrer" className="block">
                {Content}
            </a>
        );
    }

    return Content;
}
