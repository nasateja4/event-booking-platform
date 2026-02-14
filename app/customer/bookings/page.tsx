"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

interface Booking {
    id: string;
    bookingNumber: string;
    venueName: string;
    bookingDate: Date;
    startHour: number;
    endHour: number;
    finalTotal: number;
    status: string;
    paymentStatus: string;
    createdAt: Date;
}

export default function CustomerBookingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/api/auth/signin?callbackUrl=/customer/bookings");
        }
    }, [status, router]);

    useEffect(() => {
        if (!session?.user?.email) return;

        const q = query(
            collection(db, "bookings"),
            where("userId", "==", session.user.email),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookingsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                bookingDate: doc.data().bookingDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
            })) as Booking[];
            setBookings(bookingsData);
        });

        return () => unsubscribe();
    }, [session]);

    const getTimeLabel = (hour: number) => {
        if (hour === 0) return "12 AM";
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return "12 PM";
        return `${hour - 12} PM`;
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-xl font-bold text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-12">
            <div className="max-w-6xl mx-auto px-6">
                <div className="mb-8">
                    <h1 className="text-5xl font-black text-slate-900">My Bookings</h1>
                    <p className="text-slate-600 font-medium mt-2">View and manage your venue bookings</p>
                </div>

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-xl">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">No Bookings Yet</h3>
                        <p className="text-slate-600 mb-6">Start exploring our amazing venues!</p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all"
                        >
                            Browse Venues
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-3xl p-8 shadow-xl">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">{booking.venueName}</h3>
                                        <p className="text-sm text-slate-500 font-bold mt-1">
                                            Booking #{booking.bookingNumber}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`inline-block px-4 py-2 rounded-full text-sm font-black ${booking.status === "confirmed"
                                                ? "bg-green-100 text-green-700"
                                                : booking.status === "cancelled"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {booking.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-indigo-50 rounded-xl p-4">
                                        <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Date</p>
                                        <p className="text-lg font-black text-indigo-900">
                                            {booking.bookingDate.toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <p className="text-xs text-purple-600 font-bold uppercase mb-1">Time</p>
                                        <p className="text-lg font-black text-purple-900">
                                            {getTimeLabel(booking.startHour)} - {getTimeLabel(booking.endHour)}
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-4">
                                        <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Total</p>
                                        <p className="text-lg font-black text-emerald-900">
                                            ₹{booking.finalTotal.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <div className={`flex-1 text-center py-2 rounded-lg text-sm font-bold ${booking.paymentStatus === "paid"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-amber-100 text-amber-700"
                                        }`}>
                                        Payment: {booking.paymentStatus.toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-center py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700">
                                        Booked on: {booking.createdAt.toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
