"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import HeroSectionManager from "@/components/admin/HeroSectionManager";
import LocationManager from "@/components/admin/LocationManager";

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        businessName: "PartyPlanner Events",
        email: "admin@partyplanner.com",
        phone: "+91 98765 43210",
        address: "123 Event Street, City, State",
        taxRate: 18,
        currency: "INR",
        timezone: "Asia/Kolkata",
        bookingAdvance: 7,
        cancellationHours: 24,
        numberOfRooms: 1 // Default to 1 room
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings({ ...settings, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await setDoc(doc(db, "settings", "general"), settings, { merge: true });
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-lg text-white">
                    <span className="text-xl">⚙️</span>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500 text-xs font-medium">Manage your business configuration</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-bold mb-6 text-slate-800">Venue Capacity & Configuration</h2>
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                        <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Number of Venue Rooms (Capacity)</label>
                        <p className="text-xs text-indigo-800 mb-3 font-medium opacity-80">
                            Set this to the number of concurrent events you can host.
                        </p>
                        <input
                            type="number"
                            min="1"
                            value={settings.numberOfRooms}
                            onChange={(e) => setSettings({ ...settings, numberOfRooms: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none focus:border-indigo-500 font-bold text-lg text-indigo-900 transition-colors"
                        />
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-6 text-slate-800">Business Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Business Name</label>
                        <input
                            type="text"
                            value={settings.businessName}
                            onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email</label>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Phone</label>
                        <input
                            type="tel"
                            value={settings.phone}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tax Rate (%)</label>
                        <input
                            type="number"
                            value={settings.taxRate}
                            onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Address</label>
                        <input
                            type="text"
                            value={settings.address}
                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Booking Advance (days)</label>
                        <input
                            type="number"
                            value={settings.bookingAdvance}
                            onChange={(e) => setSettings({ ...settings, bookingAdvance: Number(e.target.value) })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Cancellation Notice (hours)</label>
                        <input
                            type="number"
                            value={settings.cancellationHours}
                            onChange={(e) => setSettings({ ...settings, cancellationHours: Number(e.target.value) })}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold text-sm transition-colors"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all hover:shadow-xl"
                >
                    💾 Save Business Settings
                </button>
            </div>

            {/* Footer & Link Management */}
            <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-xl">
                <h2 className="text-3xl font-black mb-6">Footer Customization</h2>
                <p className="text-slate-500 mb-8">Manage your website's footer links and navigation.</p>
                <FooterManager />
            </div>

            {/* Hero Section Management */}
            <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-xl">
                <h2 className="text-3xl font-black mb-6">Landing Page Hero</h2>
                <p className="text-slate-500 mb-8">Customize the main hero section title, subtitle, and background images.</p>
                <HeroSectionManager />

            </div>

            {/* Location Section Management */}
            <div className="bg-white rounded-[3rem] border border-slate-200 p-12 shadow-xl">
                <h2 className="text-3xl font-black mb-6">Map & Location</h2>
                <p className="text-slate-500 mb-8">Add a map or location image to your landing page.</p>
                <LocationManager />
            </div>
        </div>
    );
}

function FooterManager() {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        customLinks: [
            { name: "Home", url: "/", enabled: true },
            { name: "Features", url: "/#features", enabled: true },
            { name: "Venues", url: "/#venues", enabled: true },
        ]
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const docRef = doc(db, "settings", "footer");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "settings", "footer"), settings);
            alert("Footer settings updated successfully!");
        } catch (error) {
            console.error("Error saving footer settings:", error);
            alert("Failed to update settings.");
        } finally {
            setLoading(false);
        }
    };

    const addLink = () => {
        setSettings({
            ...settings,
            customLinks: [...settings.customLinks, { name: "", url: "", enabled: true }]
        });
    };

    const updateLink = (index: number, field: "name" | "url", value: string) => {
        const newLinks = [...settings.customLinks];
        // @ts-ignore
        newLinks[index][field] = value;
        setSettings({ ...settings, customLinks: newLinks });
    };

    const toggleLink = (index: number) => {
        const newLinks = [...settings.customLinks];
        newLinks[index].enabled = !newLinks[index].enabled;
        setSettings({ ...settings, customLinks: newLinks });
    };

    const removeLink = (index: number) => {
        if (confirm("Are you sure you want to remove this link?")) {
            const newLinks = settings.customLinks.filter((_, i) => i !== index);
            setSettings({ ...settings, customLinks: newLinks });
        }
    };

    return (
        <div className="space-y-4">
            <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Footer Links</label>
                    <button
                        onClick={addLink}
                        className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors uppercase tracking-wider"
                    >
                        + Add Link
                    </button>
                </div>

                <div className="space-y-2">
                    {settings.customLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={link.name}
                                    placeholder="Name"
                                    onChange={(e) => updateLink(index, "name", e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex-[2]">
                                <input
                                    type="text"
                                    value={link.url}
                                    placeholder="URL"
                                    onChange={(e) => updateLink(index, "url", e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-xs outline-none focus:border-indigo-500 font-mono"
                                />
                            </div>
                            <div className="flex items-center">
                                <label className="relative inline-flex items-center cursor-pointer scale-75">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={link.enabled}
                                        onChange={() => toggleLink(index)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={() => removeLink(index)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="Remove Link"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}

                    {settings.customLinks.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs italic">
                            No links added yet. Click "Add Link" to get started.
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
            >
                {loading ? "Saving..." : "Save Footer Settings"}
            </button>
        </div>
    );
}
