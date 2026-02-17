"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function HeroSection() {
    const [heroData, setHeroData] = useState({
        title: "Plan Your Dream Celebration",
        subtitle: "From intimate proposals to grand celebrations, we make every moment magical with our premium venues and personalized packages",
        images: [] as string[]
    });

    useEffect(() => {
        const fetchHeroData = async () => {
            try {
                const docRef = doc(db, "settings", "landingPage");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setHeroData(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (error) {
                console.error("Error fetching hero data:", error);
            }
        };

        fetchHeroData();
    }, []);

    const hasImages = heroData.images && heroData.images.length > 0;

    return (
        <section className="relative overflow-hidden py-20 md:py-32 min-h-[90vh] flex items-center justify-center">
            {/* Dynamic Background */}
            {hasImages ? (
                <>
                    <div className="absolute inset-0 bg-black/40 z-10"></div>
                    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
                        {/* Row 1 - Scroll Left */}
                        <div className="flex relative w-full h-full">
                            <div className="flex animate-infinite-scroll h-full w-[200%]">
                                {[...heroData.images, ...heroData.images, ...heroData.images, ...heroData.images].map((img, idx) => (
                                    <div key={idx} className="h-full w-screen flex-shrink-0">
                                        <img src={img} alt="Hero Background" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Fallback Animated Gradient Background */
                <>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-60 z-0"></div>
                    <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob z-0"></div>
                    <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 z-0"></div>
                    <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 z-0"></div>
                </>
            )}

            <div className="relative z-20 max-w-7xl mx-auto px-6 text-center">
                <div className="inline-block bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ring-4 ring-indigo-50 mb-8 backdrop-blur-sm bg-opacity-80">
                    ✨ Premium Event Booking Platform
                </div>
                <h1 className="text-4xl md:text-8xl font-black tracking-tight text-slate-900 leading-tight mb-8 drop-shadow-sm">
                    {hasImages ? (
                        <span className="text-white drop-shadow-lg">{heroData.title}</span>
                    ) : (
                        <>
                            Plan Your Dream
                            <br />
                            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Celebration
                            </span>
                        </>
                    )}
                </h1>

                {hasImages ? (
                    <p className="text-lg md:text-2xl text-white/90 font-medium mb-12 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
                        {heroData.subtitle}
                    </p>
                ) : (
                    <p className="text-lg md:text-2xl text-slate-600 font-medium mb-12 max-w-3xl mx-auto leading-relaxed">
                        From intimate proposals to grand celebrations, we make every moment magical with our premium venues and personalized packages
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                    <a href="#venues" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 md:px-12 md:py-6 rounded-[2rem] font-black text-base md:text-lg uppercase tracking-wider shadow-2xl shadow-indigo-300/50 hover:scale-105 hover:shadow-indigo-400/50 transition-all">
                        Explore Venues 🎯
                    </a>
                    <Link href="/login" className={`px-8 py-4 md:px-12 md:py-6 rounded-[2rem] font-black text-base md:text-lg uppercase tracking-wider shadow-xl border-4 transition-all hover:scale-105 ${hasImages ? "bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30" : "bg-white text-slate-900 border-slate-100 hover:border-indigo-200"}`}>
                        Start Planning ✨
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
                    {[
                        { emoji: "🎉", number: "500+", label: "Events Hosted" },
                        { emoji: "⭐", number: "4.9/5", label: "Client Rating" },
                        { emoji: "🏆", number: "100%", label: "Satisfaction" },
                    ].map((stat, idx) => (
                        <div key={idx} className={`rounded-[2rem] p-6 md:p-8 shadow-xl border transition-all hover:-translate-y-2 ${hasImages ? "bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20" : "bg-white border-slate-100 hover:shadow-2xl"}`}>
                            <span className="text-4xl md:text-5xl mb-4 block">{stat.emoji}</span>
                            <div className={`text-3xl md:text-4xl font-black mb-2 ${hasImages ? "text-white" : "text-slate-900"}`}>{stat.number}</div>
                            <div className={`text-sm font-bold uppercase tracking-widest ${hasImages ? "text-white/70" : "text-slate-500"}`}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
