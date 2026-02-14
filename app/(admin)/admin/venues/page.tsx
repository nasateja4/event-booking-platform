"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Venue, PackageItem, AdditionalItem } from "@/types";

// Simplified inventory item for selection
interface InventoryItem {
    id: string;
    name: string;
    type: "simple" | "main" | "sub";
    cost?: number;
    mainProductId?: string;
    mainProductName?: string;
}

export default function VenuesPage() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Inventory items for selection
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        isPublished: false,
        dealEnabled: false,
        dealEndTime: "",
        discount: 0,
        imageType: "url" as "upload" | "url",
        imageUrl: "",
        basePrice: 0,
        additionalHourCost: 0,
        capacity: 0,
        amenities: [] as string[],
    });

    const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
    const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
    const [countdown, setCountdown] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Fetch venues
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "venues"), (snapshot) => {
            const venuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dealEndTime: doc.data().dealEndTime?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
            })) as Venue[];
            setVenues(venuesData);
        });
        return () => unsubscribe();
    }, []);

    // Fetch inventory items for selection
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
            const items: InventoryItem[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.type === "simple") {
                    items.push({
                        id: doc.id,
                        name: data.name,
                        type: "simple",
                        cost: data.cost
                    });
                } else if (data.type === "main") {
                    items.push({
                        id: doc.id,
                        name: data.mainName,
                        type: "main"
                    });
                } else if (data.type === "sub") {
                    items.push({
                        id: doc.id,
                        name: data.subName,
                        type: "sub",
                        cost: data.cost,
                        mainProductId: data.mainProductId,
                        mainProductName: data.mainProductName
                    });
                }
            });
            setInventoryItems(items);
        });
        return () => unsubscribe();
    }, []);

    // Countdown timer for deal preview
    useEffect(() => {
        if (formData.dealEnabled && formData.dealEndTime) {
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const end = new Date(formData.dealEndTime).getTime();
                const distance = end - now;

                if (distance < 0) {
                    setCountdown("Deal Expired");
                    clearInterval(timer);
                } else {
                    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [formData.dealEnabled, formData.dealEndTime]);

    // Image upload
    const handleImageUpload = async (file: File): Promise<string> => {
        const storageRef = ref(storage, `venue-images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = formData.imageUrl;
            if (formData.imageType === "upload" && currentImageFile) {
                imageUrl = await handleImageUpload(currentImageFile);
            }

            // Build venue data object (Firestore doesn't accept undefined values)
            const venueData: any = {
                name: formData.name,
                description: formData.description,
                isPublished: formData.isPublished,
                dealEnabled: formData.dealEnabled,
                discount: formData.discount,
                imageType: formData.imageType,
                imageUrl,
                basePrice: formData.basePrice,
                additionalHourCost: formData.additionalHourCost,
                packageItems,
                additionalItems,
                amenities: formData.amenities,
                capacity: formData.capacity,
                updatedAt: new Date(),
            };

            // Only add dealEndTime if it exists (Firestore doesn't accept undefined)
            if (formData.dealEndTime) {
                venueData.dealEndTime = new Date(formData.dealEndTime);
            }

            if (editMode && editingId) {
                await updateDoc(doc(db, "venues", editingId), venueData);
            } else {
                await addDoc(collection(db, "venues"), {
                    ...venueData,
                    createdAt: new Date(),
                });
            }

            resetForm();
        } catch (error) {
            console.error("Error saving venue:", error);
            alert(`Failed to save venue: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this venue?")) {
            await deleteDoc(doc(db, "venues", id));
        }
    };

    const handleEdit = (venue: Venue) => {
        setEditMode(true);
        setEditingId(venue.id);
        setFormData({
            name: venue.name,
            description: venue.description,
            isPublished: venue.isPublished,
            dealEnabled: venue.dealEnabled,
            dealEndTime: venue.dealEndTime ? new Date(venue.dealEndTime).toISOString().slice(0, 16) : "",
            discount: venue.discount,
            imageType: venue.imageType,
            imageUrl: venue.imageUrl,
            basePrice: venue.basePrice,
            additionalHourCost: venue.additionalHourCost,
            capacity: venue.capacity || 0,
            amenities: venue.amenities || [],
        });
        setPackageItems(venue.packageItems || []);
        setAdditionalItems(venue.additionalItems || []);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            isPublished: false,
            dealEnabled: false,
            dealEndTime: "",
            discount: 0,
            imageType: "url",
            imageUrl: "",
            basePrice: 0,
            additionalHourCost: 0,
            capacity: 0,
            amenities: [],
        });
        setPackageItems([]);
        setAdditionalItems([]);
        setCurrentImageFile(null);
        setEditMode(false);
        setEditingId(null);
        setShowModal(false);
    };

    // Package item management
    const addPackageItem = (item: InventoryItem) => {
        if (!packageItems.find(p => p.inventoryId === item.id)) {
            setPackageItems([...packageItems, {
                inventoryId: item.id,
                inventoryName: item.name,
                inventoryType: item.type === "main" ? "main" : "simple",
                quantity: 1,
                isCustomizable: false,
            }]);
        }
    };

    const removePackageItem = (inventoryId: string) => {
        setPackageItems(packageItems.filter(p => p.inventoryId !== inventoryId));
    };

    const toggleCustomizable = (inventoryId: string) => {
        setPackageItems(packageItems.map(p =>
            p.inventoryId === inventoryId ? { ...p, isCustomizable: !p.isCustomizable } : p
        ));
    };

    // Additional item management
    const addAdditionalItem = (item: InventoryItem) => {
        if (!additionalItems.find(a => a.inventoryId === item.id)) {
            const newItem: AdditionalItem = {
                inventoryId: item.id,
                inventoryName: item.name,
                inventoryType: item.type === "sub" ? "sub" : "simple",
                price: item.cost || 0,
                available: true,
            };

            // Only add optional fields if they exist (Firestore doesn't accept undefined)
            if (item.mainProductId) {
                newItem.mainProductId = item.mainProductId;
            }
            if (item.mainProductName) {
                newItem.mainProductName = item.mainProductName;
            }

            setAdditionalItems([...additionalItems, newItem]);
        }
    };

    const removeAdditionalItem = (inventoryId: string) => {
        setAdditionalItems(additionalItems.filter(a => a.inventoryId !== inventoryId));
    };

    const toggleAdditionalItemAvailability = (inventoryId: string) => {
        setAdditionalItems(additionalItems.map(a =>
            a.inventoryId === inventoryId ? { ...a, available: !a.available } : a
        ));
    };

    const amenityOptions = ["AC", "Projector", "Sound System", "Stage", "Kitchen", "Parking", "Wi-Fi", "Catering"];

    const calculateFinalPrice = (venue: Venue) => {
        const basePrice = venue.basePrice || 0;
        if (!venue.dealEnabled || (venue.dealEndTime && new Date(venue.dealEndTime) < new Date())) {
            return basePrice;
        }
        return basePrice - (basePrice * venue.discount / 100);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Venue Management</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        🏛️ Advanced Booking System
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg hover:scale-105 transition-all text-sm"
                >
                    <span className="text-lg">➕</span>
                    Create Venue
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-5 text-white shadow-md">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Venues</p>
                    <p className="text-2xl font-black mt-1">{venues.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-md">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Published</p>
                    <p className="text-2xl font-black mt-1">{venues.filter(v => v.isPublished).length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-md">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Active Deals</p>
                    <p className="text-2xl font-black mt-1">{venues.filter(v => v.dealEnabled).length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-md">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Capacity</p>
                    <p className="text-2xl font-black mt-1">{venues.reduce((sum, v) => sum + (v.capacity || 0), 0)}</p>
                </div>
            </div>

            {/* Venues Grid - TO BE COMPLETED IN NEXT FILE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue) => {
                    const finalPrice = calculateFinalPrice(venue);
                    const isDealActive = venue.dealEnabled && venue.dealEndTime && new Date(venue.dealEndTime) > new Date();

                    return (
                        <div key={venue.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            {/* Venue Image */}
                            <div className="h-40 bg-slate-100 relative overflow-hidden">
                                {venue.imageUrl ? (
                                    <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">🏛️</div>
                                )}

                                {/* Publish Status Badge */}
                                <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${venue.isPublished ? "bg-emerald-500/90 text-white backdrop-blur-sm" : "bg-slate-500/90 text-white backdrop-blur-sm"
                                    }`}>
                                    {venue.isPublished ? "Published" : "Draft"}
                                </div>

                                {/* Deal Badge */}
                                {isDealActive && (
                                    <div className="absolute top-3 right-3 bg-rose-500/90 text-white px-2 py-1 rounded text-[10px] font-black backdrop-blur-sm">
                                        -{venue.discount}% DEAL
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 leading-tight">{venue.name}</h3>
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-2 min-h-[2.5em]">{venue.description}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-purple-50 px-2 py-1.5 rounded-lg text-center">
                                        <div className="text-[10px] text-purple-600 font-bold uppercase">Items</div>
                                        <div className="text-sm font-black text-purple-900">{venue.packageItems?.length || 0}</div>
                                    </div>
                                    <div className="bg-emerald-50 px-2 py-1.5 rounded-lg text-center">
                                        <div className="text-[10px] text-emerald-600 font-bold uppercase">Add-ons</div>
                                        <div className="text-sm font-black text-emerald-900">{venue.additionalItems?.length || 0}</div>
                                    </div>
                                    <div className="bg-amber-50 px-2 py-1.5 rounded-lg text-center">
                                        <div className="text-[10px] text-amber-600 font-bold uppercase">Price</div>
                                        <div className="text-sm font-black text-amber-900">₹{finalPrice.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleEdit(venue)}
                                        className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(venue.id)}
                                        className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg font-bold text-xs hover:bg-rose-100 transition-colors"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-black mb-6 text-slate-900">{editMode ? "Edit Venue" : "Create New Venue"}</h2>


                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Card Name with Publish & Deal Time */}
                            <div className="grid grid-cols-[1fr,auto] gap-4 items-start">
                                {/* Venue Name */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Card Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-sm"
                                        placeholder="e.g., Grand Ballroom"
                                    />
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-medium mt-2 h-16 text-xs"
                                        placeholder="Brief description..."
                                    />
                                </div>

                                {/* Publish & Deal Time Checkboxes */}
                                <div className="flex flex-col gap-2 pt-5">
                                    <label className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 cursor-pointer hover:bg-emerald-100 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublished}
                                            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <div>
                                            <div className="text-xs font-black text-emerald-900">Publish</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2 cursor-pointer hover:bg-rose-100 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={formData.dealEnabled}
                                            onChange={(e) => setFormData({ ...formData, dealEnabled: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <div>
                                            <div className="text-xs font-black text-rose-900">Deal time</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Deal Configuration (Expandable) */}
                            {formData.dealEnabled && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                                    <div className="text-xs font-black text-rose-900">⏰ Deal Configuration</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-rose-700 block mb-1">Deal End Time</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.dealEndTime}
                                                onChange={(e) => setFormData({ ...formData, dealEndTime: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg outline-none focus:border-rose-500 font-bold text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-rose-700 block mb-1">Discount %</label>
                                            <input
                                                type="number"
                                                value={formData.discount}
                                                onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                                                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg outline-none focus:border-rose-500 font-bold text-xs"
                                                min="0"
                                                max="100"
                                            />
                                        </div>
                                    </div>
                                    {countdown && (
                                        <div className="bg-rose-200 text-rose-900 p-2 rounded-lg text-center">
                                            <div className="text-[10px] font-bold uppercase mb-0.5">Live Preview</div>
                                            <div className="text-sm font-black">{countdown}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Card Image */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Card Image</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageType: "upload" })}
                                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${formData.imageType === "upload" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-400 hover:border-purple-300"}`}
                                        >
                                            📤 Upload image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageType: "url" })}
                                            className={`flex-1 py-2 rounded-lg font-black text-xs transition-all ${formData.imageType === "url" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-400 hover:border-purple-300"}`}
                                        >
                                            🔗 Image Url
                                        </button>
                                    </div>

                                    {formData.imageType === "upload" ? (
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setCurrentImageFile(e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-xs"
                                        />
                                    ) : (
                                        <input
                                            type="url"
                                            value={formData.imageUrl}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-xs"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Pricing & Capacity */}
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">💰 Pricing & Capacity</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Base Price (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.basePrice}
                                            onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Extra Hour (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.additionalHourCost}
                                            onChange={(e) => setFormData({ ...formData, additionalHourCost: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Capacity</label>
                                        <input
                                            type="number"
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Amenities (Package Items) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">✨ Amenities (Included)</label>
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black">{packageItems.length} items</span>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                    {/* Inventory Item Selector */}
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg font-bold text-xs outline-none focus:border-purple-500"
                                            value=""
                                            onChange={(e) => {
                                                const item = inventoryItems.find(i => i.id === e.target.value);
                                                if (item) addPackageItem(item);
                                            }}
                                        >
                                            <option value="">Select item...</option>
                                            {inventoryItems.filter(item => item.type !== "sub" && !packageItems.some(p => p.inventoryId === item.id)).map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.type === "main" ? "🗂️" : "📦"} {item.name}
                                                </option>
                                            ))}
                                        </select>
                                        <label className="flex items-center gap-2 bg-white border border-purple-200 rounded-lg px-3 cursor-pointer hover:bg-purple-50 transition-all">
                                            <input type="checkbox" className="w-3 h-3 rounded" disabled />
                                            <span className="text-[10px] font-bold text-slate-600">Customizable</span>
                                        </label>
                                    </div>

                                    {/* Scrollable List */}
                                    <div className="bg-white border border-purple-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                                        {packageItems.length === 0 ? (
                                            <div className="text-center text-slate-400 text-xs py-4 font-medium">No items added yet</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {packageItems.map(item => (
                                                    <div key={item.inventoryId} className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-md p-2 hover:bg-purple-100 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{item.inventoryType === "main" ? "🗂️" : "📦"}</span>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-xs">{item.inventoryName}</div>
                                                                <div className="text-[10px] text-slate-500">Qty: {item.quantity} {item.isCustomizable && "• Customizable"}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCustomizable(item.inventoryId)}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.isCustomizable ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-500"}`}
                                                            >
                                                                {item.isCustomizable ? "✓" : "○"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePackageItem(item.inventoryId)}
                                                                className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-rose-600"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Available Additional Amenities */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">➕ Additional Amenities</label>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">{additionalItems.length} items</span>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                    {/* Inventory Item Selector */}
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg font-bold text-xs outline-none focus:border-emerald-500"
                                            value=""
                                            onChange={(e) => {
                                                const item = inventoryItems.find(i => i.id === e.target.value);
                                                if (item) addAdditionalItem(item);
                                            }}
                                        >
                                            <option value="">Select item...</option>
                                            {inventoryItems.filter(item => !additionalItems.some(a => a.inventoryId === item.id)).map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.type === "main" ? "🗂️" : item.type === "sub" ? "📑" : "📦"} {item.name} - ₹{item.cost}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Scrollable List */}
                                    <div className="bg-white border border-emerald-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                                        {additionalItems.length === 0 ? (
                                            <div className="text-center text-slate-400 text-xs py-4 font-medium">No additional items yet</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {additionalItems.map(item => (
                                                    <div key={item.inventoryId} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-md p-2 hover:bg-emerald-100 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{item.inventoryType === "sub" ? "📑" : "📦"}</span>
                                                            <div>
                                                                <div className="font-black text-slate-900 text-xs">{item.inventoryName}</div>
                                                                <div className="text-[10px] text-emerald-600 font-bold">₹{item.price.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAdditionalItem(item.inventoryId)}
                                                            className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-rose-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? "Saving..." : editMode ? "Update Venue" : "Create Venue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
