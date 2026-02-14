"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/types";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login?callbackUrl=/profile");
        }
    }, [status, router]);

    // Fetch user's bookings
    useEffect(() => {
        const fetchBookings = async () => {
            if (!session?.user?.id) return;

            try {
                const q = query(
                    collection(db, "bookings"),
                    where("userId", "==", session.user.id),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);

                const bookingsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Booking[];
                setBookings(bookingsData);
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (session?.user?.id) {
            fetchBookings();
        }
    }, [session]);

    const handleLogout = () => {
        signOut({ callbackUrl: "/" });
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* User Info Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {/* User Avatar */}
                            <div className="relative">
                                {session.user.image ? (
                                    <img
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        className="w-24 h-24 rounded-2xl ring-4 ring-purple-100"
                                    />
                                ) : (
                                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                                        {session.user.name?.charAt(0) || "U"}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white"></div>
                            </div>

                            {/* User Details */}
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 mb-1">{session.user.name}</h1>
                                <p className="text-slate-600 font-medium mb-2">{session.user.email}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                        {session.user.role?.toUpperCase() || "CUSTOMER"}
                                    </span>
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                        {bookings.length} Bookings
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>

                {/* Bookings Section */}
                <div className="bg-white rounded-3xl shadow-xl p-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">📅 My Bookings</h2>

                    {bookings.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl">
                                📭
                            </div>
                            <p className="text-xl font-bold text-slate-900 mb-2">No bookings yet</p>
                            <p className="text-slate-500 mb-6">Start exploring venues and make your first booking!</p>
                            <button
                                onClick={() => router.push("/")}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                            >
                                Browse Venues
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="border-2 border-slate-100 rounded-2xl p-6 hover:border-purple-200 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <h3 className="text-xl font-black text-slate-900">{booking.venueName}</h3>
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${booking.status === "confirmed"
                                                    ? "bg-green-100 text-green-700"
                                                    : booking.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : booking.status === "cancelled"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}>
                                                    {booking.status.toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-slate-500 font-medium">Booking Number</p>
                                                    <p className="text-slate-900 font-bold">{booking.bookingNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-medium">Date</p>
                                                    <p className="text-slate-900 font-bold">
                                                        {new Date(booking.bookingDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-medium">Time</p>
                                                    <p className="text-slate-900 font-bold">
                                                        {booking.startHour}:00 - {booking.endHour}:00
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-medium">Total Amount</p>
                                                    <p className="text-emerald-600 font-black text-lg">
                                                        ₹{booking.finalTotal.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
