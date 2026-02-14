"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { InventoryItem, SimpleInventoryItem, MainProduct, SubProduct } from "@/types";

// Helper type for display
import ProductCard, { type StoreDisplayItem } from "@/components/store/ProductCard";

// Helper type for display (Removed local definition in favor of imported one)

export default function StorePage() {
    const [displayItems, setDisplayItems] = useState<StoreDisplayItem[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Combine and Filter
    useEffect(() => {
        const processed: StoreDisplayItem[] = [];

        // Helper to calculate cost
        const getFinalPrice = (cost: number, discount: number) => {
            return cost - (cost * (discount || 0) / 100);
        };

        // Process Simple Items
        simpleItems.forEach(item => {
            if (item.showInStore) {
                processed.push({
                    id: item.id,
                    type: "simple",
                    name: item.name || "Unnamed Item",
                    description: item.description || "",
                    imageUrl: item.imageUrl,
                    price: item.finalCost || getFinalPrice(item.cost, item.discount),
                    originalItem: item,
                    variantCount: 0,
                    variants: []
                });
            }
        });

        // Process Main/Sub Items
        mainItems.forEach(main => {
            const isVisible = (main as any).showInStore || false;

            if (isVisible) {
                const subs = subItems.filter(s => s.mainProductId === main.id);
                if (subs.length > 0) {
                    const firstSub = subs[0];
                    const minPrice = Math.min(...subs.map(s => getFinalPrice(s.cost, s.discount)));

                    processed.push({
                        id: main.id,
                        type: "main",
                        name: main.mainName || "Unnamed Group",
                        description: firstSub?.description || "Select a variant",
                        imageUrl: firstSub?.imageUrl,
                        price: minPrice,
                        originalItem: main,
                        variantCount: subs.length,
                        variants: subs // Pass all variants
                    });
                }
            }
        });

        // Sort by name
        processed.sort((a, b) => a.name.localeCompare(b.name));
        setDisplayItems(processed);
    }, [simpleItems, mainItems, subItems]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-12 md:py-20">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6">
                        Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Store</span>
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                        Discover our curated collection of party essentials and decorations.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100">
                        <span className="text-6xl mb-6 block">🛍️</span>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Store Empty</h2>
                        <p className="text-slate-500 font-medium">Check back later for new items!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayItems.map((item) => (
                            <ProductCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
