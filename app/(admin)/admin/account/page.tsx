"use client";

import { useSession } from "next-auth/react";

export default function AccountPage() {
    const { data: session } = useSession();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-5xl font-black text-slate-900">Account</h1>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">👤 Profile settings</p>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-xl">
                <div className="flex items-center gap-8 mb-12">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 w-32 h-32 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="Profile" className="w-full h-full rounded-[2rem] object-cover" />
                        ) : (
                            <span className="text-6xl font-black">{session?.user?.name?.[0] || "A"}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900">{session?.user?.name || "Admin User"}</h2>
                        <p className="text-lg text-slate-500 font-bold mt-2">{session?.user?.email || "admin@partyplanner.com"}</p>
                        <div className="mt-4 bg-emerald-100 text-emerald-700 px-5 py-2 rounded-full text-xs font-black uppercase inline-block">
                            ✓ Administrator
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Full Name</label>
                        <input
                            type="text"
                            defaultValue={session?.user?.name || ""}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Email</label>
                        <input
                            type="email"
                            defaultValue={session?.user?.email || ""}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                            disabled
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Phone</label>
                        <input
                            type="tel"
                            placeholder="+91 98765 43210"
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Bio</label>
                        <textarea
                            placeholder="Tell us about yourself..."
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium h-32"
                        />
                    </div>
                </div>

                <button className="mt-8 w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:scale-105 transition-all">
                    💾 Update Profile
                </button>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-xl">
                <h3 className="text-2xl font-black mb-6">Account Activity</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-slate-100">
                        <div>
                            <p className="font-black text-slate-900">Last Login</p>
                            <p className="text-sm text-slate-500 font-medium">{new Date().toLocaleString()}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-slate-100">
                        <div>
                            <p className="font-black text-slate-900">Account Type</p>
                            <p className="text-sm text-slate-500 font-medium">Administrator</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black">PREMIUM</span>
                    </div>
                    <div className="flex items-center justify-between py-4">
                        <div>
                            <p className="font-black text-slate-900">Member Since</p>
                            <p className="text-sm text-slate-500 font-medium">January 2024</p>
                        </div>
                        <span className="text-slate-400 text-xs font-black">1 MONTH</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
