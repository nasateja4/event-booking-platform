"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import type { InventoryItem, SimpleInventoryItem, MainProduct, SubProduct } from "@/types";
import { useSession } from "next-auth/react";

interface DisplayItem {
    id: string;
    type: "simple" | "main";
    name: string;
    description: string;
    imageUrl?: string;
    price: number;
    category: string; // e.g., "Simple Product", "Main Product"
    variantCount: number;
    showInStore: boolean;
    originalItem: InventoryItem; // Reference to the original item for full data if needed
}

export default function StoreManagePage() {
    const { data: session } = useSession();
    const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Raw data state
    const [simpleItems, setSimpleItems] = useState<SimpleInventoryItem[]>([]);
    const [mainItems, setMainItems] = useState<MainProduct[]>([]);
    const [subItems, setSubItems] = useState<SubProduct[]>([]);

    useEffect(() => {
        const q = query(collection(db, "inventory"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[];

            const simple = allData.filter(i => i.type === "simple") as SimpleInventoryItem[];
            const main = allData.filter(i => i.type === "main") as MainProduct[];
            const sub = allData.filter(i => i.type === "sub") as SubProduct[];

            setSimpleItems(simple);
            setMainItems(main);
            setSubItems(sub);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Combine data for display whenever raw data changes
    useEffect(() => {
        const processed: DisplayItem[] = [];

        // Helper to calculate cost
        const getFinalPrice = (cost: number, discount: number) => {
            return cost - (cost * (discount || 0) / 100);
        };

        // Process Simple Items
        simpleItems.forEach(item => {
            processed.push({
                id: item.id,
                type: "simple",
                name: item.name || "Unnamed Item",
                description: item.description || "",
                imageUrl: item.imageUrl,
                price: item.finalCost || getFinalPrice(item.cost, item.discount),
                category: "Simple Product",
                variantCount: 0,
                showInStore: item.showInStore || false,
                originalItem: item
            });
        });

        // Process Main/Sub Items
        mainItems.forEach(main => {
            const subs = subItems.filter(s => s.mainProductId === main.id);
            const firstSub = subs[0];

            // Calculate min price from subs
            const minPrice = subs.length > 0
                ? Math.min(...subs.map(s => getFinalPrice(s.cost, s.discount)))
                : 0;

            const displayImage = firstSub?.imageUrl;

            // Use type assertion carefully for showInStore
            const isVisible = (main as any).showInStore || false;

            processed.push({
                id: main.id,
                type: "main",
                name: main.mainName || "Unnamed Group",
                description: firstSub?.description || "Select a variant",
                imageUrl: displayImage,
                price: minPrice,
                category: "Main Product",
                variantCount: subs.length,
                showInStore: isVisible,
                originalItem: main
            });
        });

        processed.sort((a, b) => a.name.localeCompare(b.name));
        setDisplayItems(processed);
    }, [simpleItems, mainItems, subItems]);

    const toggleStoreVisibility = async (id: string, currentStatus: boolean) => {
        try {
            const itemRef = doc(db, "inventory", id);
            await updateDoc(itemRef, {
                showInStore: !currentStatus
            });
        } catch (error) {
            console.error("Error updating store visibility:", error);
            alert("Failed to update visibility");
        }
    };

    const filteredItems = displayItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center text-slate-500 font-bold">Loading inventory...</div>;

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Store Management</h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">🛍️ Select items to display in public store</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none font-bold text-slate-700 w-full md:w-80"
                    />
                    <span className="absolute left-3 top-3.5 text-slate-400">🔍</span>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Product</th>
                                <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Price</th>
                                <th className="px-8 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Store Visibility</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{item.name}</div>
                                                {item.variantCount > 0 && (
                                                    <div className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-lg inline-block">
                                                        {item.variantCount} Variants
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${item.type === 'simple' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                                            }`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-700">
                                            {item.type === 'main' && <span className="text-xs text-slate-400 mr-1">from</span>}
                                            ₹{item.price.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.showInStore}
                                                onChange={() => toggleStoreVisibility(item.id, item.showInStore)}
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></div>
                                            <span className="ml-3 text-sm font-bold text-slate-600">
                                                {item.showInStore ? "Visible" : "Hidden"}
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            <p className="text-xl font-bold mb-2">No items found</p>
                            <p>Try adjusting your search or add new inventory items first.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
