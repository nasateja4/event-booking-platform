"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import type { Review, Venue, Booking } from "@/types";

interface ReviewsSectionProps {
    venues: Venue[];
}

export default function ReviewsSection({ venues }: ReviewsSectionProps) {
    const { data: session } = useSession();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [userBookings, setUserBookings] = useState<Booking[]>([]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [formData, setFormData] = useState({
        rating: 5,
        reviewText: "",
        venueId: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Fetch Approved Reviews
    useEffect(() => {
        const q = query(
            collection(db, "reviews"),
            where("status", "==", "approved")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().date)
            })) as Review[];

            // Sort client-side to avoid composite index requirement
            setReviews(reviewsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        });

        return () => unsubscribe();
    }, []);

    // Fetch User Bookings to check eligibility
    useEffect(() => {
        if (!session?.user?.id) return;

        const checkEligibility = async () => {
            // Fetch all bookings for user and filter client-side to avoid index requirement
            const q = query(
                collection(db, "bookings"),
                where("userId", "==", session.user.id)
            );

            try {
                const snapshot = await getDocs(q);
                const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];

                // Filter for confirmed/completed bookings client-side
                const eligibleBookings = allBookings.filter(b =>
                    ["confirmed", "completed"].includes(b.status)
                );

                setUserBookings(eligibleBookings);

                // Set default venue if available
                if (eligibleBookings.length > 0 && !formData.venueId) {
                    setFormData(prev => ({ ...prev, venueId: eligibleBookings[0].venueId }));
                }
            } catch (error) {
                console.error("Error fetching bookings:", error);
            }
        };

        checkEligibility();
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user) return;

        setSubmitting(true);
        try {
            const selectedVenue = venues.find(v => v.id === formData.venueId);
            const venueName = selectedVenue?.name || userBookings.find(b => b.venueId === formData.venueId)?.venueName || "Venue";

            await addDoc(collection(db, "reviews"), {
                userId: session.user.id,
                customerName: session.user.name || "Anonymous",
                customerImage: session.user.image,
                rating: Number(formData.rating),
                reviewText: formData.reviewText,
                venueId: formData.venueId,
                venueName: venueName,
                status: "pending",
                approved: false,
                createdAt: new Date(),
                date: new Date().toISOString().split('T')[0] // Legacy
            });

            setSubmitSuccess(true);
            setShowReviewForm(false);
            setFormData({ rating: 5, reviewText: "", venueId: "" });
            setTimeout(() => setSubmitSuccess(false), 5000);
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Get unique venues user has booked
    const bookedVenueIds = Array.from(new Set(userBookings.map(b => b.venueId)));
    const canReview = bookedVenueIds.length > 0;

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-black text-slate-900 mb-4">Client Stories</h2>
                    <p className="text-xl text-slate-600">Hear from our happy customers</p>
                </div>

                {/* Reviews Infinite Scroll */}
                <div className="relative py-12 space-y-8 overflow-hidden">
                    {reviews.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-[3rem] border-2 border-slate-100 border-dashed max-w-4xl mx-auto">
                            <p className="text-slate-400 font-bold text-xl">No reviews yet. Be the first!</p>
                        </div>
                    ) : (
                        <>
                            {/* Row 1 - Scroll Left */}
                            <div className="flex relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                                <div className="flex gap-8 animate-infinite-scroll hover:[animation-play-state:paused] py-4">
                                    {[...reviews, ...reviews, ...reviews].map((review, idx) => (
                                        <div key={`${review.id}-1-${idx}`} className="w-[400px] flex-shrink-0 bg-slate-50 rounded-[2rem] p-8 relative group hover:bg-white hover:shadow-xl transition-all border-2 border-transparent hover:border-slate-100">
                                            <div className="absolute top-8 right-8 text-6xl text-slate-200 font-serif leading-none opacity-50">"</div>
                                            <div className="flex items-center gap-1 mb-4">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i} className={`text-xl ${i < review.rating ? "text-amber-400" : "text-slate-300"}`}>★</span>
                                                ))}
                                            </div>
                                            <p className="text-slate-700 font-medium mb-6 leading-relaxed relative z-10 italic line-clamp-4 min-h-[6rem]">
                                                "{review.reviewText || review.comment}"
                                            </p>
                                            <div className="flex items-center gap-4">
                                                {review.customerImage ? (
                                                    <img src={review.customerImage} alt={review.customerName} className="w-12 h-12 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                                                        {review.customerName.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-black text-slate-900">{review.customerName}</p>
                                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{review.venueName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Row 2 - Scroll Right (Reverse) */}
                            {reviews.length > 2 && (
                                <div className="flex relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                                    <div className="flex gap-8 animate-infinite-scroll-reverse hover:[animation-play-state:paused] py-4">
                                        {[...reviews].reverse().concat([...reviews].reverse()).concat([...reviews].reverse()).map((review, idx) => (
                                            <div key={`${review.id}-2-${idx}`} className="w-[400px] flex-shrink-0 bg-slate-50 rounded-[2rem] p-8 relative group hover:bg-white hover:shadow-xl transition-all border-2 border-transparent hover:border-slate-100">
                                                <div className="absolute top-8 right-8 text-6xl text-slate-200 font-serif leading-none opacity-50">"</div>
                                                <div className="flex items-center gap-1 mb-4">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <span key={i} className={`text-xl ${i < review.rating ? "text-amber-400" : "text-slate-300"}`}>★</span>
                                                    ))}
                                                </div>
                                                <p className="text-slate-700 font-medium mb-6 leading-relaxed relative z-10 italic line-clamp-4 min-h-[6rem]">
                                                    "{review.reviewText || review.comment}"
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    {review.customerImage ? (
                                                        <img src={review.customerImage} alt={review.customerName} className="w-12 h-12 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                                                            {review.customerName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-black text-slate-900">{review.customerName}</p>
                                                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{review.venueName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Integration with Booking Logic */}
                {submitSuccess && (
                    <div className="max-w-2xl mx-auto mb-12 bg-green-50 border-2 border-green-200 text-green-700 p-6 rounded-2xl text-center font-bold animate-pulse">
                        ✅ Review submitted successfully! It will appear after moderation.
                    </div>
                )}

                {/* Conditionally Show Review Button/Form */}
                {!showReviewForm && canReview && !submitSuccess && (
                    <div className="text-center">
                        <button
                            onClick={() => setShowReviewForm(true)}
                            className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-105 hover:bg-slate-800 transition-all"
                        >
                            ✍️ Write a Review
                        </button>
                        <p className="text-slate-500 text-sm font-bold mt-4">
                            You are eligible to review because you booked with us!
                        </p>
                    </div>
                )}

                {/* Review Form Modal/Inline */}
                {showReviewForm && (
                    <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-2 border-slate-100 relative">
                        <button
                            onClick={() => setShowReviewForm(false)}
                            className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center font-black hover:bg-rose-100 hover:text-rose-600 transition-colors"
                        >
                            ✕
                        </button>

                        <h3 className="text-3xl font-black text-slate-900 mb-8 text-center">Share Your Experience</h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Select Venue</label>
                                <select
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                                    value={formData.venueId}
                                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Choose a venue you visited...</option>
                                    {bookedVenueIds.map(vid => {
                                        const booking = userBookings.find(b => b.venueId === vid);
                                        // Try to find name from venues fetch, fallback to booking data
                                        const venueName = venues.find(v => v.id === vid)?.name || booking?.venueName || "Venue";
                                        return <option key={vid} value={vid}>{venueName}</option>
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Rating</label>
                                <div className="flex gap-4 justify-center py-4 bg-slate-50 rounded-xl border-2 border-slate-100">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className={`text-4xl transition-transform hover:scale-125 ${formData.rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Your Review</label>
                                <textarea
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all resize-none h-32"
                                    placeholder="Tell us what you loved about your event..."
                                    value={formData.reviewText}
                                    onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !formData.venueId}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-black text-lg hover:scale-[1.02] shadow-xl hover:shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Submitting..." : "Submit Review ✨"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
}
