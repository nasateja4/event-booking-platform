"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

interface LocationSettings {
    imageUrl: string;
    targetUrl: string;
    enabled: boolean;
    manualAddress?: string; // Optional for backward compatibility
}

export default function LocationManager() {
    const [settings, setSettings] = useState<LocationSettings>({
        imageUrl: "",
        targetUrl: "",
        enabled: false,
        manualAddress: ""
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [useUrl, setUseUrl] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "location");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings({ ...settings, ...docSnap.data() } as LocationSettings);
                }
            } catch (error) {
                console.error("Error fetching location settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "settings", "location"), settings, { merge: true });
            alert("Location settings updated successfully!");
        } catch (error) {
            console.error("Error saving location settings:", error);
            alert("Failed to update settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            console.log("Starting upload for:", file.name);
            const storageRef = ref(storage, `location-images/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            console.log("Upload complete, getting URL...");
            const url = await getDownloadURL(storageRef);
            console.log("Got URL:", url);

            setSettings(prev => ({
                ...prev,
                imageUrl: url
            }));
            console.log("State updated with URL");
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Check console for details.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (loading) return <div className="text-center py-8">Loading settings...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Enable Location Section</h3>
                    <p className="text-xs text-slate-500 font-medium opacity-80">Show a landscape image map on the landing page</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.enabled}
                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {settings.enabled && (
                <div className="space-y-4 animate-fadeIn">
                    {/* Image Upload / URL Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Map / Location Image (Landscape)</label>
                            <button
                                onClick={() => setUseUrl(!useUrl)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                            >
                                {useUrl ? "Switch to Upload" : "+ Add via URL"}
                            </button>
                        </div>

                        {useUrl ? (
                            <div className="flex gap-3 animate-fadeIn">
                                <span className="text-xl bg-slate-100 rounded-lg w-10 h-10 flex items-center justify-center">🖼️</span>
                                <input
                                    type="url"
                                    value={settings.imageUrl}
                                    onChange={(e) => setSettings({ ...settings, imageUrl: e.target.value })}
                                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold text-xs text-slate-700"
                                    placeholder="https://example.com/map-image.jpg"
                                />
                            </div>
                        ) : (
                            <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50 group hover:border-indigo-300 transition-all">
                                {settings.imageUrl ? (
                                    <div className="relative aspect-[21/9] rounded-lg overflow-hidden shadow-sm">
                                        <img src={settings.imageUrl} alt="Location" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-white text-slate-900 px-4 py-1.5 rounded-full font-bold text-xs hover:scale-105 transition-transform"
                                            >
                                                Change Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <span className="text-2xl">🗺️</span>
                                        <span className="font-bold text-xs">Click to upload image</span>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        console.log("File input changed", e.target.files);
                                        handleImageUpload(e);
                                    }}
                                />
                                {uploading && <p className="text-xs text-indigo-600 font-bold mt-2 animate-pulse">Uploading image... please wait.</p>}
                            </div>
                        )}
                    </div>

                    {/* Target Link */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Target Link (e.g. Google Maps)</label>
                        <div className="flex gap-3">
                            <span className="text-xl bg-slate-100 rounded-lg w-10 h-10 flex items-center justify-center">🔗</span>
                            <input
                                type="url"
                                value={settings.targetUrl}
                                onChange={(e) => setSettings({ ...settings, targetUrl: e.target.value })}
                                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold text-xs text-slate-700"
                                placeholder="https://maps.google.com/..."
                            />
                        </div>
                    </div>

                    {/* Manual Address */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Manual Address Display</label>
                        <div className="flex gap-3">
                            <span className="text-xl bg-slate-100 rounded-lg w-10 h-10 flex items-center justify-center">📍</span>
                            <textarea
                                value={settings.manualAddress}
                                onChange={(e) => setSettings({ ...settings, manualAddress: e.target.value })}
                                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold text-xs text-slate-700 h-20 resize-none"
                                placeholder="123 Event St, Party City..."
                            />
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
            >
                {loading ? "Saving..." : "Save Location Settings"}
            </button>
        </div>
    );
}
