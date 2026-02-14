"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserData {
    id: string;
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
    role: string;
    createdAt?: any;
    totalBookings?: number;
    phoneNumber?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserData[];
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid?.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900">User Management</h1>
                    <p className="text-slate-500 mt-2 font-medium">View and manage registered users</p>
                </div>
                <div className="bg-indigo-100 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <span className="text-2xl">👥</span>
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-indigo-500">Total Users</p>
                        <p className="text-2xl font-black text-indigo-900">{users.length}</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all shadow-sm font-bold text-slate-700"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Contact Info</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">User ID</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">Bookings</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {user.photoURL ? (
                                                <img
                                                    src={user.photoURL}
                                                    alt={user.name}
                                                    className="w-12 h-12 rounded-xl object-cover shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                                    {user.name?.charAt(0) || "U"}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-900">{user.name || "Unknown User"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                📧 {user.email}
                                            </p>
                                            {user.phoneNumber && (
                                                <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                    📱 {user.phoneNumber}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-600 select-all">
                                            {user.uid}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' || user.role === 'super_admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {user.role || 'CUSTOMER'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-black text-sm">
                                            {user.totalBookings || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-sm font-bold text-slate-500">
                                            {user.createdAt?.seconds
                                                ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                                                : "N/A"
                                            }
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No users found</h3>
                        <p className="text-slate-500">Try adjusting your search terms</p>
                    </div>
                )}
            </div>
        </div>
    );
}
