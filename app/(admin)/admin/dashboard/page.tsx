"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from "firebase/firestore";
import type { Booking } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        todayProfit: 0,
        todayBookings: 0,
        pendingBookings: 0,
        totalVenues: 0,
        activeDeals: 0
    });
    const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Function to load cached data
        const loadCache = () => {
            try {
                const cachedStats = sessionStorage.getItem('dashboardStats');
                const cachedBookings = sessionStorage.getItem('dashboardRecentBookings');

                if (cachedStats && cachedBookings) {
                    setStats(JSON.parse(cachedStats));
                    // specific handling for dates in cached bookings
                    const parsedBookings = JSON.parse(cachedBookings).map((b: any) => ({
                        ...b,
                        createdAt: b.createdAt.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt),
                        bookingDate: b.bookingDate.seconds ? new Date(b.bookingDate.seconds * 1000) : new Date(b.bookingDate)
                    }));
                    setRecentBookings(parsedBookings);
                    setLoading(false); // Show cached content immediately
                }
            } catch (e) {
                console.error("Error loading cache:", e);
            }
        };

        loadCache();

        const fetchData = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 1. Fetch Today's Bookings for Stats
                const todayQuery = query(
                    collection(db, "bookings"),
                    where("createdAt", ">=", today)
                );
                const todaySnap = await getDocs(todayQuery);
                const todayDocs = todaySnap.docs.map(doc => doc.data() as Booking);

                const todayProfit = todayDocs
                    .filter(b => b.status === "confirmed" || b.status === "completed")
                    .reduce((sum, b) => sum + (b.finalTotal || (b as any).totalPrice || 0), 0); // Handle legacy 'totalPrice'

                const pendingQuery = query(
                    collection(db, "bookings"),
                    where("status", "==", "pending")
                );
                const pendingSnap = await getCountFromServer(pendingQuery);

                // 2. Fetch Venues count
                const venuesSnap = await getCountFromServer(collection(db, "venues"));

                // Active Deals count (requires fetching all venues or specific query)
                const dealsQuery = query(collection(db, "venues"), where("dealEnabled", "==", true));
                const dealsSnap = await getCountFromServer(dealsQuery);

                const newStats = {
                    todayProfit,
                    todayBookings: todaySnap.size,
                    pendingBookings: pendingSnap.data().count,
                    totalVenues: venuesSnap.data().count,
                    activeDeals: dealsSnap.data().count
                };

                setStats(newStats);
                sessionStorage.setItem('dashboardStats', JSON.stringify(newStats));

                // 3. Fetch Recent Bookings
                const recentQuery = query(
                    collection(db, "bookings"),
                    orderBy("createdAt", "desc"),
                    limit(5)
                );
                const recentSnap = await getDocs(recentQuery);
                const newRecentBookings = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

                setRecentBookings(newRecentBookings);
                sessionStorage.setItem('dashboardRecentBookings', JSON.stringify(newRecentBookings));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="p-10 text-center text-slate-500 font-bold">Loading dashboard...</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-2">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                    Business Intelligence Dashboard
                </span>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    Welcome back, Admin 👋
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                    Monitor your business metrics and manage your operations
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Profit */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-8xl group-hover:scale-110 transition-transform duration-500 text-slate-900">
                        💰
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-sm">
                                💰
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Today's Profit</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tabular-nums mb-1">{formatCurrency(stats.todayProfit)}</p>
                        <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <span>+12.5%</span>
                            <span className="text-slate-400 font-normal">from yesterday</span>
                        </p>
                    </div>
                </div>

                {/* Today's Bookings */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-8xl group-hover:scale-110 transition-transform duration-500 text-slate-900">
                        📋
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xl shadow-sm">
                                📋
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Today's Bookings</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tabular-nums mb-1">{stats.todayBookings}</p>
                        <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
                            <span>{stats.pendingBookings} Pending</span>
                            <span className="text-slate-400 font-normal">to review</span>
                        </p>
                    </div>
                </div>

                {/* Venues Stats */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-8xl group-hover:scale-110 transition-transform duration-500 text-slate-900">
                        🏢
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xl shadow-sm">
                                🏢
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Venues</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tabular-nums mb-1">{stats.totalVenues}</p>
                        <p className="text-xs font-medium text-purple-600 flex items-center gap-1">
                            <span>{stats.activeDeals} Active Deals</span>
                        </p>
                    </div>
                </div>

                {/* Pending Actions */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-5 text-8xl group-hover:scale-110 transition-transform duration-500 text-slate-900">
                        🔔
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xl shadow-sm">
                                🔔
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions Needed</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tabular-nums mb-1">{stats.pendingBookings}</p>
                        <p className="text-xs font-medium text-orange-600 flex items-center gap-1">
                            {stats.pendingBookings > 0 ? "Requires attention" : "Everything clear"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Latest Transactions</p>
                    </div>
                    <Link href="/admin/bookings" className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                        View All →
                    </Link>
                </div>
                {/* Mobile View / Responsive Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-left whitespace-nowrap">Customer</th>
                                <th className="px-6 py-3 text-left whitespace-nowrap">Event/Venue</th>
                                <th className="px-6 py-3 text-left whitespace-nowrap">Date</th>
                                <th className="px-6 py-3 text-left whitespace-nowrap">Amount</th>
                                <th className="px-6 py-3 text-left whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {recentBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm font-medium">No recent bookings found.</td>
                                </tr>
                            ) : recentBookings.map((booking) => {
                                const createdAt = booking.createdAt as any;
                                const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
                                return (
                                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                                                    {(booking.customerName || (booking as any).userName || "?")[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-xs">{booking.customerName || (booking as any).userName || "Walk-in"}</span>
                                                    <span className="text-[10px] text-slate-400">{booking.customerEmail || (booking as any).userEmail}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">{booking.venueName || "Manual Event"}</td>
                                        <td className="px-6 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">
                                            {booking.bookingDate instanceof Date ? booking.bookingDate.toLocaleDateString() : new Date((booking.bookingDate as any).seconds * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3 font-bold text-indigo-600 text-sm tabular-nums whitespace-nowrap">
                                            {formatCurrency(booking.finalTotal || (booking as any).totalPrice || 0)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${booking.status === "confirmed" || booking.status === "completed"
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : booking.status === "pending"
                                                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                                                    : "bg-rose-50 text-rose-600 border border-rose-100"
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
