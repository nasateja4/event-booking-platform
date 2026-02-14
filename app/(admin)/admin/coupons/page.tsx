"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore";

interface Coupon {
    id: string;
    code: string;
    discount: number;
    type: "percentage" | "fixed";
    minAmount: number;
    maxUses: number;
    usedCount: number;
    expiryDate: string;
    status: "active" | "expired";
    applicableVenueIds?: string[];
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        code: "",
        discount: 0,
        type: "percentage" as "percentage" | "fixed",
        minAmount: 0,
        maxUses: 100,
        usedCount: 0,
        expiryDate: "",
        status: "active" as "active" | "expired",
        applicableVenueIds: [] as string[]
    });

    const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const unsubscribeidx = onSnapshot(collection(db, "coupons"), (snapshot) => {
            const couponsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Coupon[];
            setCoupons(couponsData);
        });

        // Fetch Venues
        const fetchVenues = async () => {
            const querySnapshot = await getDocs(collection(db, "venues"));
            setVenues(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        };
        fetchVenues();

        return () => unsubscribeidx();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDoc(collection(db, "coupons"), formData);
        setFormData({ code: "", discount: 0, type: "percentage", minAmount: 0, maxUses: 100, usedCount: 0, expiryDate: "", status: "active", applicableVenueIds: [] });
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this coupon?")) {
            await deleteDoc(doc(db, "coupons", id));
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-black text-slate-900">Coupons</h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">🎫 Discount codes</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-10 py-5 rounded-[2rem] flex items-center gap-3 font-black shadow-2xl hover:scale-105 transition-all">
                    <span className="text-2xl">➕</span> Add Coupon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Active Coupons</p>
                    <p className="text-4xl font-black mt-2">{coupons.filter(c => c.status === "active").length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Total Redemptions</p>
                    <p className="text-4xl font-black mt-2">{coupons.reduce((acc, c) => acc + c.usedCount, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2rem] p-8 text-white shadow-xl">
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Expired</p>
                    <p className="text-4xl font-black mt-2">{coupons.filter(c => c.status === "expired").length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className="bg-white rounded-[2rem] border-2 border-slate-200 p-8 shadow-xl hover:shadow-2xl transition-all">
                        <div className="flex items-start justify-between mb-6">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-5 py-2 rounded-xl font-black text-xs">
                                {coupon.code}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${coupon.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                {coupon.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-900">{coupon.discount}</span>
                                <span className="text-lg text-slate-500 font-bold">{coupon.type === "percentage" ? "%" : "₹"} OFF</span>
                            </div>
                            <div className="text-sm text-slate-600 font-bold space-y-1">
                                <p>Min Amount: ₹{coupon.minAmount}</p>
                                <p>Uses: {coupon.usedCount}/{coupon.maxUses}</p>
                                <p>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                                {coupon.applicableVenueIds && coupon.applicableVenueIds.length > 0 && (
                                    <p className="text-xs text-indigo-600 mt-1">
                                        Valid for: {coupon.applicableVenueIds.map(id => venues.find(v => v.id === id)?.name).filter(Boolean).join(", ")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => handleDelete(coupon.id)} className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-sm hover:bg-rose-100">
                            🗑️ Delete
                        </button>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl">
                        <h2 className="text-4xl font-black mb-8">Add Coupon</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Code</label>
                                    <input required type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold uppercase" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Type</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Discount</label>
                                    <input required type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Min Amount (₹)</label>
                                    <input required type="number" value={formData.minAmount} onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Max Uses</label>
                                    <input required type="number" value={formData.maxUses} onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold" />
                                </div>
                                <div>
                                    <input required type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Applicable Venues (Optional - Leave empty for ALL)</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                                        {venues.map(v => (
                                            <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.applicableVenueIds?.includes(v.id) || false}
                                                    onChange={(e) => {
                                                        const currentIds = formData.applicableVenueIds || [];
                                                        let newIds;
                                                        if (e.target.checked) {
                                                            newIds = [...currentIds, v.id];
                                                        } else {
                                                            newIds = currentIds.filter(id => id !== v.id);
                                                        }
                                                        setFormData({ ...formData, applicableVenueIds: newIds });
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 border-4 border-slate-100 rounded-2xl font-black text-slate-400">Cancel</button>
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black shadow-2xl">Create Coupon</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
