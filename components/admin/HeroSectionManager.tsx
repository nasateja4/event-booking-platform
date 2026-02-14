"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

interface HeroSettings {
    title: string;
    subtitle: string;
    images: string[];
}

export default function HeroSectionManager() {
    const [settings, setSettings] = useState<HeroSettings>({
        title: "Plan Your Dream Celebration",
        subtitle: "From intimate proposals to grand celebrations, we make every moment magical with our premium venues and personalized packages",
        images: []
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "landingPage");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings({ ...settings, ...docSnap.data() } as HeroSettings);
                }
            } catch (error) {
                console.error("Error fetching hero settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "settings", "landingPage"), settings, { merge: true });
            alert("Hero settings updated successfully!");
        } catch (error) {
            console.error("Error saving hero settings:", error);
            alert("Failed to update settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const newImages: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const storageRef = ref(storage, `hero-images/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newImages.push(url);
            }

            setSettings(prev => ({
                ...prev,
                images: [...prev.images, ...newImages]
            }));
        } catch (error) {
            console.error("Error uploading images:", error);
            alert("Failed to upload images.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleAddImageUrl = () => {
        const url = prompt("Enter image URL:");
        if (url) {
            setSettings(prev => ({
                ...prev,
                images: [...prev.images, url]
            }));
        }
    };

    const removeImage = (index: number) => {
        if (confirm("Remove this image?")) {
            setSettings(prev => ({
                ...prev,
                images: prev.images.filter((_, i) => i !== index)
            }));
        }
    };

    if (loading) return <div className="text-center py-8">Loading settings...</div>;

    return (
        <div className="space-y-8">
            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Hero Title</label>
                <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-black text-2xl text-slate-900"
                    placeholder="Main Heading"
                />
            </div>

            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Hero Subtitle</label>
                <textarea
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium text-lg text-slate-600 min-h-[100px]"
                    placeholder="Subtitle text..."
                />
            </div>

            <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Background Images (Auto-Scroll)</label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {settings.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
                            <img src={img} alt={`Hero ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute top-2 right-2 bg-white/90 text-rose-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all font-bold"
                            >
                                ✕
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded font-bold">
                                #{idx + 1}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="aspect-video bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center text-indigo-500 hover:bg-indigo-100 hover:border-indigo-300 transition-all gap-2"
                    >
                        <span className="text-2xl">{uploading ? "⏳" : "📤"}</span>
                        <span className="font-bold text-sm">{uploading ? "Uploading..." : "Upload Image"}</span>
                    </button>
                </div>

                <div className="flex gap-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                    />
                    <button
                        onClick={handleAddImageUrl}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                    >
                        + Add Image via URL
                    </button>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
                {loading ? "Saving..." : "Save Hero Settings"}
            </button>
        </div>
    );
}
