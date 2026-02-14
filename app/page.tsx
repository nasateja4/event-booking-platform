"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { Venue } from "@/types";
import DealCountdown from "@/components/venue/DealCountdown";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ReviewsSection from "@/components/ReviewsSection";
import HeroSection from "@/components/landing/HeroSection";
import LocationSection from "@/components/landing/LocationSection";

export default function LandingPage() {
    const { data: session } = useSession();
    const [venues, setVenues] = useState<Venue[]>([]);

    // Fetch published venues from Firestore
    useEffect(() => {
        const q = query(collection(db, "venues"), where("isPublished", "==", true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const venuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dealEndTime: doc.data().dealEndTime?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
            })) as Venue[];
            setVenues(venuesData);
        });
        return () => unsubscribe();
    }, []);

    const features = [
        {
            emoji: "⚡",
            title: "Instant Booking",
            description: "Book your venue in seconds with our streamlined process"
        },
        {
            emoji: "💎",
            title: "Premium Venues",
            description: "Handpicked locations for your special occasions"
        },
        {
            emoji: "🎨",
            title: "Custom Packages",
            description: "Tailored solutions to match your vision perfectly"
        },
        {
            emoji: "🔒",
            title: "Secure Payments",
            description: " Multiple payment options with complete security"
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Navigation */}
            <Navbar />

            {/* Hero Section */}
            <HeroSection />



            {/* Venues Section */}
            <section id="venues" className="py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-black text-slate-900 mb-4">Premium Venues</h2>
                        <p className="text-xl text-slate-600">Discover our handpicked locations</p>
                    </div>
                    {venues.length === 0 ? (
                        <div className="text-center text-slate-500 py-12">
                            <p className="text-2xl font-bold">No venues available yet</p>
                            <p className="text-sm mt-2">Check back soon for amazing venues!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {venues.map((venue) => (
                                <div key={venue.id} className="group relative transition-all duration-300 hover:-translate-y-2">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-[2.2rem] blur opacity-0 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-white rounded-[2rem] shadow-xl border-2 border-white overflow-hidden hover:border-indigo-200 transition-all h-full flex flex-col">
                                        {/* Image */}
                                        <div className="relative h-64 bg-gradient-to-br from-indigo-100 to-purple-100">
                                            {venue.imageUrl && (
                                                <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                                            )}
                                            {/* Deal Countdown Overlay */}
                                            {venue.dealEnabled && venue.dealEndTime && venue.discount > 0 && (
                                                <div className="absolute top-4 right-4 transform scale-90 origin-top-right transition-transform hover:scale-100">
                                                    <DealCountdown dealEndTime={venue.dealEndTime} discount={venue.discount} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-8">
                                            {/* Title */}
                                            <h3 className="text-2xl font-black text-slate-900 mb-2">{venue.name}</h3>
                                            <p className="text-slate-600 mb-6 line-clamp-2">{venue.description}</p>

                                            {/* Key Details List */}
                                            <ul className="space-y-3 mb-8">
                                                <li className="flex items-center gap-3 text-slate-700 font-medium group">
                                                    <div className="bg-indigo-50 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        {venue.packageItems.length}
                                                    </div>
                                                    <span>Items included in package</span>
                                                </li>
                                                <li className="flex items-center gap-3 text-slate-700 font-medium group">
                                                    <div className="bg-purple-50 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                        👥
                                                    </div>
                                                    <span>Guest Capacity: {venue.capacity || "N/A"}</span>
                                                </li>
                                                <li className="flex items-center gap-3 text-slate-700 font-medium group">
                                                    <div className="bg-pink-50 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                                        ⏳
                                                    </div>
                                                    <span>Extra Hour Cost: ₹{venue.additionalHourCost}</span>
                                                </li>
                                            </ul>


                                            {/* Pricing */}
                                            {/* Pricing */}
                                            <div className="flex items-baseline justify-between pt-6 border-t border-slate-100">
                                                <div>
                                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">Starting From</div>
                                                    <div className="flex items-baseline gap-2">
                                                        {venue.dealEnabled && venue.dealEndTime && venue.discount > 0 ? (
                                                            <>
                                                                <span className="text-3xl font-black text-rose-600">
                                                                    ₹{Math.round((venue.basePrice || 0) * (1 - venue.discount / 100)).toLocaleString()}
                                                                </span>
                                                                <span className="text-sm text-slate-400 font-bold line-through">
                                                                    ₹{(venue.basePrice || 0).toLocaleString()}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-3xl font-black text-indigo-600">
                                                                ₹{(venue.basePrice || 0).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <Link
                                                href={`/booking/${venue.id}`}
                                                className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black text-center hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                                            >
                                                View Details & Book →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-5xl md:text-6xl font-black mb-6">Ready to Celebrate?</h2>
                    <p className="text-2xl mb-12 opacity-90">Book your dream venue today and make memories that last forever</p>
                    <a href="#venues" className="inline-block bg-white text-indigo-600 px-12 py-6 rounded-[2rem] font-black text-lg uppercase tracking-wider shadow-2xl hover:scale-105 transition-all">
                        Explore Venues Now 🚀
                    </a>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-black text-slate-900 mb-4">Why Choose Us?</h2>
                        <p className="text-xl text-slate-600">Everything you need for a perfect celebration</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-slate-50 to-white p-8 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:-translate-y-2 transition-all">
                                <div className="text-5xl mb-6">{feature.emoji}</div>
                                <h3 className="text-2xl font-black text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <div id="reviews">
                <ReviewsSection venues={venues} />
            </div>

            {/* Location Section */}
            <LocationSection />

            {/* Footer */}
            <Footer />
        </div>
    );
}
