"use client";

import { useState, useEffect } from "react";
import type { InventoryItem, SubProduct } from "@/types";

export type StoreDisplayItem = {
    id: string;
    type: "simple" | "main";
    name: string;
    description: string;
    imageUrl?: string;
    price: number;
    originalItem: InventoryItem;
    variantCount: number;
    variants?: SubProduct[]; // Added variants array
};

export default function ProductCard({ item }: { item: StoreDisplayItem }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const hasVariants = item.type === "main" && item.variants && item.variants.length > 0;

    // Auto-swipe for variants
    useEffect(() => {
        if (!hasVariants) return;

        // Random delay start to prevent all cards flipping at once
        const startDelay = Math.random() * 2000;

        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                // Trigger fade out
                setIsFading(true);

                // Wait for fade out, then change index
                setTimeout(() => {
                    setCurrentIndex((prev) => (prev + 1) % (item.variants?.length || 1));
                    setIsFading(false); // Fade back in
                }, 300); // Matches CSS transition duration
            }, 5000); // 5 seconds per slide

            return () => clearInterval(interval);
        }, startDelay);

        return () => clearTimeout(timeout);
    }, [hasVariants, item.variants?.length]);

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hasVariants || isFading) return;

        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % (item.variants?.length || 1));
            setIsFading(false);
        }, 300);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hasVariants || isFading) return;

        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + (item.variants?.length || 1)) % (item.variants?.length || 1));
            setIsFading(false);
        }, 300);
    };

    // Determine current display data
    const currentImage = hasVariants
        ? item.variants![currentIndex].imageUrl
        : item.imageUrl;

    const currentName = hasVariants
        ? item.variants![currentIndex].subName
        : item.name;

    const currentPrice = hasVariants
        ? (item.variants![currentIndex].cost - (item.variants![currentIndex].cost * (item.variants![currentIndex].discount || 0) / 100))
        : item.price;

    return (
        <div className="group bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative">

            {/* Image Container */}
            <div className="aspect-square rounded-[2rem] bg-slate-100 mb-6 overflow-hidden relative">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt={currentName}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-300 ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-50 text-slate-300">
                        🏷️
                    </div>
                )}

                {/* Price Tag */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-black text-sm shadow-lg border border-slate-100 z-10">
                    {/* {item.type === 'main' && <span className="text-slate-400 font-bold text-xs mr-1">from</span>} */}
                    ₹{currentPrice?.toLocaleString()}
                </div>

                {/* Navigation Arrows (Only for Variants) */}
                {hasVariants && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm z-20 transition-all opacity-0 group-hover:opacity-100"
                        >
                            ←
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm z-20 transition-all opacity-0 group-hover:opacity-100"
                        >
                            →
                        </button>

                        {/* Dots Indicator */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                            {item.variants!.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-indigo-600 w-3' : 'bg-slate-300'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="space-y-3 px-2">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    {item.type === 'main' ? item.name : currentName}
                </h3>
                {hasVariants && (
                    <p className="text-indigo-600 font-bold text-sm">
                        Variant: {currentName}
                    </p>
                )}
                <p className="text-slate-500 font-medium line-clamp-2 text-sm">{item.description}</p>

                {/* Variant Badge */}
                {/* {item.type === 'main' && (
                    <div className="inline-block bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {item.variantCount} Variants Available
                    </div>
                )} */}
            </div>
        </div>
    );
}
