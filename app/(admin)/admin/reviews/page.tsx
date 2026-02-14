"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import type { Review, Venue } from "@/types";

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        customerName: "",
        rating: 5,
        reviewText: "",
        venueId: "",
        status: "approved" as "pending" | "approved" | "rejected",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        // Fetch Reviews
        const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const unsubscribeBox = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().date) // Handle legacy string dates
            })) as Review[];
            setReviews(reviewsData);
        });

        // Fetch Venues for Dropdown
        const fetchVenues = async () => {
            const snapshot = await getDocs(collection(db, "venues"));
            const venuesData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Venue[];
            setVenues(venuesData);
            if (venuesData.length > 0) setFormData(prev => ({ ...prev, venueId: venuesData[0].id }));
        };
        fetchVenues();

        return () => unsubscribeBox();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Delete this review?")) {
            await deleteDoc(doc(db, "reviews", id));
        }
    };

    const updateStatus = async (id: string, newStatus: Review["status"]) => {
        await updateDoc(doc(db, "reviews", id), {
            status: newStatus,
            approved: newStatus === "approved" // Sync for backward compatibility
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedVenue = venues.find(v => v.id === formData.venueId);

        await addDoc(collection(db, "reviews"), {
            customerName: formData.customerName,
            rating: Number(formData.rating),
            reviewText: formData.reviewText,
            venueId: formData.venueId,
            venueName: selectedVenue?.name || "Unknown Venue",
            status: formData.status,
            approved: formData.status === "approved",
            createdAt: new Date(formData.date),
            date: formData.date // Legacy support
        });

        setShowModal(false);
        setFormData({
            customerName: "",
            rating: 5,
            reviewText: "",
            venueId: venues[0]?.id || "",
            status: "approved",
            date: new Date().toISOString().split('T')[0]
        });
    };

    const filteredReviews = filter === "all" ? reviews : reviews.filter(r => r.status === filter);
    const avgRating = reviews.filter(r => r.status === 'approved').length > 0
        ? (reviews.filter(r => r.status === 'approved').reduce((acc, r) => acc + r.rating, 0) / reviews.filter(r => r.status === 'approved').length).toFixed(1)
        : "0.0";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Reviews</h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">⭐ Customer feedback</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all"
                >
                    + Add Review
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Avg Rating (Approved)</p>
                    <p className="text-4xl font-black mt-2">⭐ {avgRating}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Total Reviews</p>
                    <p className="text-4xl font-black mt-2">{reviews.length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Pending</p>
                    <p className="text-4xl font-black mt-2">{reviews.filter(r => r.status === "pending").length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Approved</p>
                    <p className="text-4xl font-black mt-2">{reviews.filter(r => r.status === "approved").length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 border-b-2 border-slate-100 pb-4">
                {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all ${filter === s
                            ? "bg-slate-900 text-white shadow-lg"
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredReviews.map((review) => (
                    <div key={review.id} className={`bg-white rounded-[2rem] border-2 p-8 shadow-xl transition-all ${review.status === 'pending' ? 'border-amber-200 bg-amber-50/30' :
                            review.status === 'rejected' ? 'border-rose-200 opacity-75' : 'border-slate-200'
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg">{review.customerName}</h3>
                                <p className="text-sm text-slate-500 font-bold">{review.venueName}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`text-sm ${i < review.rating ? "text-amber-500" : "text-slate-200"}`}>⭐</span>
                                ))}
                            </div>
                        </div>

                        <p className="text-slate-700 font-medium mb-6 leading-relaxed italic">"{review.reviewText || review.comment}"</p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                            <span className="text-xs text-slate-400 font-bold">
                                {review.createdAt instanceof Date ? review.createdAt.toLocaleDateString() : new Date(review.date || Date.now()).toLocaleDateString()}
                            </span>

                            <div className="flex gap-2">
                                {review.status === "pending" && (
                                    <>
                                        <button onClick={() => updateStatus(review.id, "approved")} className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-200" title="Approve">✓</button>
                                        <button onClick={() => updateStatus(review.id, "rejected")} className="bg-rose-100 text-rose-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-200" title="Reject">✕</button>
                                    </>
                                )}
                                {review.status === "rejected" && (
                                    <button onClick={() => updateStatus(review.id, "approved")} className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-200">Result</button>
                                )}
                                {review.status === "approved" && (
                                    <button onClick={() => updateStatus(review.id, "rejected")} className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-200">Unapprove</button>
                                )}
                                <button onClick={() => handleDelete(review.id)} className="bg-slate-100 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-100 hover:text-rose-600" title="Delete">🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
                        <h2 className="text-3xl font-black text-slate-900 mb-6">Write Review</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Customer Name</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
                                    value={formData.customerName}
                                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-1">Venue</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
                                        value={formData.venueId}
                                        onChange={e => setFormData({ ...formData, venueId: e.target.value })}
                                    >
                                        {venues.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-1">Rating</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
                                        value={formData.rating}
                                        onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })}
                                    >
                                        {[5, 4, 3, 2, 1].map(r => (
                                            <option key={r} value={r}>{r} Stars</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Review</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none resize-none"
                                    value={formData.reviewText}
                                    onChange={e => setFormData({ ...formData, reviewText: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Status</label>
                                <select
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl font-black text-slate-400 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700"
                                >
                                    Save Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
