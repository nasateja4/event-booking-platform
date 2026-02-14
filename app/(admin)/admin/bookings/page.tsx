"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, updateDoc, doc, onSnapshot } from "firebase/firestore";

interface Booking {
    id: string;
    bookingNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    venueName: string;
    bookingDate: Date;
    startHour: number;
    endHour: number;
    durationHours: number;
    finalTotal: number;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    paymentStatus: "pending" | "paid";
    paymentMethod: "cod" | "upi";
    createdAt: Date;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<string>("");

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const bookingsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                bookingDate: doc.data().bookingDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
            })) as Booking[];
            setBookings(bookingsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        });
        return () => unsubscribe();
    }, []);

    const updateStatus = async (id: string, status: Booking["status"]) => {
        await updateDoc(doc(db, "bookings", id), { status });
    };

    const getTimeLabel = (hour: number) => {
        if (hour === 0) return "12 AM";
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return "12 PM";
        return `${hour - 12} PM`;
    };

    const filteredBookings = bookings.filter(b => {
        const matchesStatus = filter === "all" || b.status === filter;
        const matchesDate = !selectedDate || (b.bookingDate && b.bookingDate.toISOString().split('T')[0] === selectedDate);
        return matchesStatus && matchesDate;
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Bookings</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">📋 Manage reservations</p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Date Filter */}
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 font-bold text-slate-600 focus:border-indigo-500 focus:outline-none shadow-sm text-xs"
                        />
                    </div>

                    <div className="flex gap-2">
                        {["all", "pending", "confirmed", "completed", "cancelled"].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2.5 rounded-lg font-black text-[10px] uppercase transition-all ${filter === status
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{bookings.length}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{bookings.filter(b => b.status === "pending").length}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{bookings.filter(b => b.status === "confirmed").length}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Revenue</p>
                    <p className="text-2xl font-black text-indigo-600 mt-1">₹{bookings.filter(b => b.status !== "cancelled").reduce((acc, b) => acc + (b.finalTotal || 0), 0).toLocaleString()}</p>
                </div>
            </div>

            {filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="text-4xl mb-3">📅</div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">No Bookings Found</h3>
                    <p className="text-slate-500 text-sm">
                        {filter === "all" ? "No bookings yet." : `No ${filter} bookings.`}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left">Booking #</th>
                                <th className="px-6 py-4 text-left">Customer</th>
                                <th className="px-6 py-4 text-left">Venue</th>
                                <th className="px-6 py-4 text-left">Date & Time</th>
                                <th className="px-6 py-4 text-left">Amount</th>
                                <th className="px-6 py-4 text-left">Payment</th>
                                <th className="px-6 py-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-indigo-600 text-xs">#{booking.bookingNumber.slice(-6).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{booking.createdAt.toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-xs">{booking.customerName}</div>
                                        <div className="text-[10px] text-slate-500">{booking.customerPhone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-xs">{booking.venueName}</div>
                                        <div className="text-[10px] text-slate-500">{booking.durationHours} hrs</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 text-xs">{booking.bookingDate.toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-500">{getTimeLabel(booking.startHour)} - {getTimeLabel(booking.endHour)}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-600 text-sm">₹{booking.finalTotal?.toLocaleString() || 0}</td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${booking.paymentStatus === "paid"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                            }`}>
                                            {booking.paymentStatus}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={booking.status}
                                            onChange={(e) => updateStatus(booking.id, e.target.value as any)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border-0 outline-none ring-1 ring-inset ${booking.status === "confirmed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                                booking.status === "pending" ? "bg-amber-50 text-amber-700 ring-amber-200" :
                                                    booking.status === "completed" ? "bg-blue-50 text-blue-700 ring-blue-200" :
                                                        "bg-rose-50 text-rose-700 ring-rose-200"
                                                }`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
