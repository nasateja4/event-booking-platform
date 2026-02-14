"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Type definitions
interface SimpleProduct {
    id: string;
    type: "simple";
    name: string;
    cost: number;
    discount: number;
    extraUnitsEnabled: boolean;
    extraUnitCost?: number;
    description: string;
    imageType: "upload" | "url";
    imageUrl?: string;
    createdAt: any;
}

interface MainProduct {
    id: string;
    type: "main";
    mainName: string;
    createdAt: any;
}

interface SubProduct {
    id: string;
    type: "sub";
    mainProductId: string;
    mainProductName: string;
    subName: string;
    cost: number;
    discount: number;
    extraUnitsEnabled: boolean;
    extraUnitCost?: number;
    extraUnitDiscount?: number;
    applyMainDiscount: boolean;
    description: string;
    imageType: "upload" | "url";
    imageUrl?: string;
    createdAt: any;
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<"simple" | "hierarchical">("simple");
    const [showModal, setShowModal] = useState(false);
    const [itemType, setItemType] = useState<"simple" | "main">("simple");
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Carousel state for main products (key: mainProductId, value: currentSubIndex)
    const [carouselIndices, setCarouselIndices] = useState<{ [key: string]: number }>({});

    // Simple Products
    const [simpleProducts, setSimpleProducts] = useState<SimpleProduct[]>([]);
    const [simpleForm, setSimpleForm] = useState({
        name: "",
        cost: 0,
        discount: 0,
        extraUnitsEnabled: false,
        extraUnitCost: 0,
        description: "",
        imageType: "url" as "upload" | "url",
        imageUrl: "",
        showInStore: false // Controls if item appears in "Add Extra Items"
    });

    // Main/Sub Products
    const [mainProducts, setMainProducts] = useState<MainProduct[]>([]);
    const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
    const [mainForm, setMainForm] = useState({
        mainName: "",
        subProducts: [{
            subName: "",
            cost: 0,
            discount: 0,
            extraUnitsEnabled: false,
            extraUnitCost: 0,
            extraUnitDiscount: 0,
            applyMainDiscount: true,
            description: "",
            imageType: "url" as "upload" | "url",
            imageUrl: ""
        }]
    });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);

    // Fetch data
    useEffect(() => {
        const unsubSimple = onSnapshot(
            query(collection(db, "inventory"), where("type", "==", "simple")),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SimpleProduct[];
                setSimpleProducts(data);
            }
        );

        const unsubMain = onSnapshot(
            query(collection(db, "inventory"), where("type", "==", "main")),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MainProduct[];
                setMainProducts(data);
            }
        );

        const unsubSub = onSnapshot(
            query(collection(db, "inventory"), where("type", "==", "sub")),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubProduct[];
                setSubProducts(data);
            }
        );

        return () => {
            unsubSimple();
            unsubMain();
            unsubSub();
        };
    }, []);

    // Image upload
    const handleImageUpload = async (file: File): Promise<string> => {
        const storageRef = ref(storage, `inventory-images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    // Submit Simple Product
    const handleSimpleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = simpleForm.imageUrl;
            if (simpleForm.imageType === "upload" && currentImageFile) {
                imageUrl = await handleImageUpload(currentImageFile);
            }

            if (editMode && editingId) {
                // Update existing product
                await updateDoc(doc(db, "inventory", editingId), {
                    ...simpleForm,
                    imageUrl
                });
            } else {
                // Create new product
                await addDoc(collection(db, "inventory"), {
                    type: "simple",
                    ...simpleForm,
                    imageUrl,
                    createdAt: new Date()
                });
            }

            resetSimpleForm();
            setShowModal(false);
            setEditMode(false);
            setEditingId(null);
        } catch (error) {
            console.error("Error saving simple product:", error);
            alert("Failed to save product");
        } finally {
            setUploading(false);
        }
    };

    // Submit Main/Sub Products
    const handleMainSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            // Create main product
            const mainDoc = await addDoc(collection(db, "inventory"), {
                type: "main",
                mainName: mainForm.mainName,
                createdAt: new Date()
            });

            // Create sub-products
            for (const sub of mainForm.subProducts) {
                let imageUrl = sub.imageUrl;
                if (sub.imageType === "upload" && currentImageFile) {
                    imageUrl = await handleImageUpload(currentImageFile);
                }

                await addDoc(collection(db, "inventory"), {
                    type: "sub",
                    mainProductId: mainDoc.id,
                    mainProductName: mainForm.mainName,
                    subName: sub.subName,
                    cost: sub.cost,
                    discount: sub.discount,
                    extraUnitsEnabled: sub.extraUnitsEnabled,
                    extraUnitCost: sub.extraUnitCost,
                    extraUnitDiscount: sub.extraUnitDiscount,
                    applyMainDiscount: sub.applyMainDiscount,
                    description: sub.description,
                    imageType: sub.imageType,
                    imageUrl,
                    createdAt: new Date()
                });
            }

            resetMainForm();
            setShowModal(false);
        } catch (error) {
            console.error("Error creating main product:", error);
            alert("Failed to create product");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this item?")) {
            await deleteDoc(doc(db, "inventory", id));
        }
    };

    // Edit Simple Product
    const handleEditSimple = (product: SimpleProduct) => {
        setEditMode(true);
        setEditingId(product.id);
        setItemType("simple");
        setSimpleForm({
            name: product.name,
            cost: product.cost,
            discount: product.discount,
            extraUnitsEnabled: product.extraUnitsEnabled,
            extraUnitCost: product.extraUnitCost || 0,
            description: product.description,
            imageType: product.imageType,
            imageUrl: product.imageUrl || "",
            showInStore: false // Not applicable for simple products in this context
        });
        setShowModal(true);
    };

    // Edit Sub Product
    const handleEditSub = (sub: SubProduct) => {
        setEditMode(true);
        setEditingId(sub.id);
        setItemType("simple"); // Use simple form for sub-product edit
        setSimpleForm({
            name: sub.subName,
            cost: sub.cost,
            discount: sub.discount,
            extraUnitsEnabled: sub.extraUnitsEnabled,
            extraUnitCost: sub.extraUnitCost || 0,
            description: sub.description,
            imageType: sub.imageType,
            imageUrl: sub.imageUrl || "",
            showInStore: false // Not applicable for sub products
        });
        setShowModal(true);
    };

    // Handle updating a sub-product
    const handleUpdateSubProduct = async () => {
        if (!editingId) return;
        setUploading(true);

        try {
            let imageUrl = simpleForm.imageUrl;
            if (simpleForm.imageType === "upload" && currentImageFile) {
                imageUrl = await handleImageUpload(currentImageFile);
            }

            await updateDoc(doc(db, "inventory", editingId), {
                subName: simpleForm.name,
                cost: simpleForm.cost,
                discount: simpleForm.discount,
                extraUnitsEnabled: simpleForm.extraUnitsEnabled,
                extraUnitCost: simpleForm.extraUnitCost,
                description: simpleForm.description,
                imageType: simpleForm.imageType,
                imageUrl
            });

            resetSimpleForm();
            setShowModal(false);
            setEditMode(false);
            setEditingId(null);
        } catch (error) {
            console.error("Error updating sub-product:", error);
            alert("Failed to update sub-product");
        } finally {
            setUploading(false);
        }
    };

    const resetSimpleForm = () => {
        setSimpleForm({
            name: "",
            cost: 0,
            discount: 0,
            extraUnitsEnabled: false,
            extraUnitCost: 0,
            description: "",
            imageType: "url",
            imageUrl: "",
            showInStore: false
        });
        setCurrentImageFile(null);
        setEditMode(false);
        setEditingId(null);
    };

    const resetMainForm = () => {
        setMainForm({
            mainName: "",
            subProducts: [{
                subName: "",
                cost: 0,
                discount: 0,
                extraUnitsEnabled: false,
                extraUnitCost: 0,
                extraUnitDiscount: 0,
                applyMainDiscount: true,
                description: "",
                imageType: "url",
                imageUrl: ""
            }]
        });
        setCurrentImageFile(null);
    };

    const addSubProduct = () => {
        setMainForm({
            ...mainForm,
            subProducts: [...mainForm.subProducts, {
                subName: "",
                cost: 0,
                discount: 0,
                extraUnitsEnabled: false,
                extraUnitCost: 0,
                extraUnitDiscount: 0,
                applyMainDiscount: true,
                description: "",
                imageType: "url",
                imageUrl: ""
            }]
        });
    };

    const removeSubProduct = (index: number) => {
        setMainForm({
            ...mainForm,
            subProducts: mainForm.subProducts.filter((_, i) => i !== index)
        });
    };

    const calculateFinalPrice = (cost: number, discount: number) => {
        return cost - (cost * discount / 100);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Manage Inventory</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        📦 Products & Services
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:scale-105 transition-all text-sm"
                >
                    <span className="text-lg">➕</span>
                    Create Inventory Item
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Simple Products</p>
                    <p className="text-2xl font-black mt-1">{simpleProducts.length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Main Products</p>
                    <p className="text-2xl font-black mt-1">{mainProducts.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Sub Products</p>
                    <p className="text-2xl font-black mt-1">{subProducts.length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Items</p>
                    <p className="text-2xl font-black mt-1">{simpleProducts.length + subProducts.length}</p>
                </div>
            </div>

            {/* Unified Products Display - All in One Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Simple Products */}
                {simpleProducts.map((product) => {
                    const finalPrice = calculateFinalPrice(product.cost, product.discount);
                    return (
                        <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
                            {product.imageUrl && (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover rounded-xl mb-4" />
                            )}
                            <div className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase mb-2">
                                Simple Product
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">{product.name}</h3>
                            <p className="text-slate-600 text-xs font-medium mb-3 line-clamp-2">{product.description}</p>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-indigo-600">₹{finalPrice.toLocaleString()}</span>
                                    {product.discount > 0 && (
                                        <>
                                            <span className="text-xs text-slate-400 line-through">₹{product.cost.toLocaleString()}</span>
                                            <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black">{product.discount}% OFF</span>
                                        </>
                                    )}
                                </div>

                                {product.extraUnitsEnabled && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                                        <div className="text-[10px] text-emerald-600 font-black uppercase">Extra Unit Cost</div>
                                        <div className="text-sm font-black text-emerald-900">₹{product.extraUnitCost}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditSimple(product)}
                                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-black text-xs hover:bg-blue-100"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg font-black text-xs hover:bg-rose-100"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Main/Sub Products with Carousel */}
                {mainProducts.map((main) => {
                    const subs = subProducts.filter(sub => sub.mainProductId === main.id);
                    const currentSubIndex = carouselIndices[main.id] || 0;

                    const nextSub = () => {
                        setCarouselIndices(prev => ({
                            ...prev,
                            [main.id]: (currentSubIndex + 1) % subs.length
                        }));
                    };

                    const prevSub = () => {
                        setCarouselIndices(prev => ({
                            ...prev,
                            [main.id]: (currentSubIndex - 1 + subs.length) % subs.length
                        }));
                    };

                    const currentSub = subs[currentSubIndex];
                    const finalPrice = currentSub ? calculateFinalPrice(currentSub.cost, currentSub.discount) : 0;

                    return (
                        <div key={main.id} className="bg-white rounded-xl border-2 border-purple-100 p-4 shadow-sm hover:shadow-md transition-all">
                            {/* Main Product Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 -m-4 mb-4 p-4 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-white/70 font-black uppercase tracking-wider mb-0.5">Main Product</div>
                                        <h3 className="text-lg font-black text-white">{main.mainName}</h3>
                                        <div className="text-xs text-white/80 font-bold">{subs.length} variant{subs.length !== 1 ? 's' : ''}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(main.id)}
                                        className="bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-lg font-black text-xs transition-all"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* Sub-Product Carousel */}
                            {currentSub && (
                                <div className="relative">
                                    {/* Navigation Arrows */}
                                    {subs.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevSub}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-black text-lg transition-all"
                                            >
                                                ‹
                                            </button>
                                            <button
                                                onClick={nextSub}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-black text-lg transition-all"
                                            >
                                                ›
                                            </button>
                                        </>
                                    )}

                                    {/* Current Sub-Product */}
                                    <div className="bg-pink-50 rounded-xl border border-pink-100 p-4">
                                        {currentSub.imageUrl && (
                                            <img src={currentSub.imageUrl} alt={currentSub.subName} className="w-full h-32 object-cover rounded-lg mb-3" />
                                        )}
                                        <div className="inline-block bg-pink-200 text-pink-700 px-2 py-0.5 rounded text-[10px] font-black uppercase mb-2">
                                            Variant {currentSubIndex + 1}/{subs.length}
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 mb-1">{currentSub.subName}</h4>
                                        <p className="text-slate-600 text-xs font-medium mb-3 line-clamp-2">{currentSub.description}</p>

                                        <div className="space-y-2 mb-3">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-black text-purple-600">₹{finalPrice.toLocaleString()}</span>
                                                {currentSub.discount > 0 && (
                                                    <>
                                                        <span className="text-xs text-slate-400 line-through">₹{currentSub.cost.toLocaleString()}</span>
                                                        <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black">{currentSub.discount}%</span>
                                                    </>
                                                )}
                                            </div>

                                            {currentSub.extraUnitsEnabled && (
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                                    <div className="text-[10px] text-emerald-600 font-bold">Extra Unit: ₹{currentSub.extraUnitCost}</div>
                                                    {currentSub.applyMainDiscount && (
                                                        <div className="text-[10px] text-emerald-500">Discount applied</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditSub(currentSub)}
                                                className="flex-1 bg-blue-50 text-blue-600 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(currentSub.id)}
                                                className="flex-1 bg-rose-50 text-rose-600 py-1.5 rounded-lg font-bold text-xs hover:bg-rose-100"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl p-8 shadow-2xl my-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black mb-6">{editMode ? "Edit Item" : "Create Inventory Item"}</h2>

                        {/* Item Type Selector */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setItemType("simple")}
                                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm ${itemType === "simple"
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                                    : "bg-slate-100 text-slate-400"
                                    }`}
                            >
                                📦 Simple Product
                            </button>
                            <button
                                onClick={() => setItemType("main")}
                                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm ${itemType === "main"
                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                                    : "bg-slate-100 text-slate-400"
                                    }`}
                            >
                                🗂️ Main/Sub Product
                            </button>
                        </div>

                        {/* Simple Product Form */}
                        {itemType === "simple" && (
                            <form onSubmit={handleSimpleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Product Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={simpleForm.name}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
                                        placeholder="e.g., Professional Sound"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cost (₹)</label>
                                        <input
                                            required
                                            type="number"
                                            value={simpleForm.cost}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, cost: Number(e.target.value) })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Discount (%)</label>
                                        <input
                                            type="number"
                                            value={simpleForm.discount}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, discount: Number(e.target.value) })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Price Display */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                    <div className="text-[10px] text-indigo-600 font-black uppercase mb-1">Final Price</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-indigo-900">₹{calculateFinalPrice(simpleForm.cost, simpleForm.discount).toLocaleString()}</span>
                                        {simpleForm.discount > 0 && (
                                            <span className="text-sm text-indigo-400 line-through">₹{simpleForm.cost.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Extra Units Toggle */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={simpleForm.extraUnitsEnabled}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, extraUnitsEnabled: e.target.checked })}
                                            className="w-5 h-5 rounded-md"
                                        />
                                        <span className="text-xs font-black text-slate-700">Enable Extra Units</span>
                                    </label>

                                    {simpleForm.extraUnitsEnabled && (
                                        <div className="mt-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Extra Unit Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={simpleForm.extraUnitCost}
                                                onChange={(e) => setSimpleForm({ ...simpleForm, extraUnitCost: Number(e.target.value) })}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                                    <textarea
                                        value={simpleForm.description}
                                        onChange={(e) => setSimpleForm({ ...simpleForm, description: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm h-20"
                                    />
                                </div>

                                {/* Allow Custom Input Toggle */}
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={simpleForm.showInStore}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, showInStore: e.target.checked })}
                                            className="w-5 h-5 rounded-md"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-emerald-700 block">✏️ Allow Custom Input</span>
                                            <span className="text-[10px] text-emerald-600">Show input field for customers (e.g., custom text)</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Image Type Toggle */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex gap-4 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setSimpleForm({ ...simpleForm, imageType: "upload" })}
                                            className={`flex-1 py-2 rounded-lg font-black text-xs ${simpleForm.imageType === "upload"
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white text-slate-400"
                                                }`}
                                        >
                                            📤 Upload Image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSimpleForm({ ...simpleForm, imageType: "url" })}
                                            className={`flex-1 py-2 rounded-lg font-black text-xs ${simpleForm.imageType === "url"
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white text-slate-400"
                                                }`}
                                        >
                                            🔗 Image URL
                                        </button>
                                    </div>

                                    {simpleForm.imageType === "upload" ? (
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setCurrentImageFile(e.target.files?.[0] || null)}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium text-sm"
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type="url"
                                            value={simpleForm.imageUrl}
                                            onChange={(e) => setSimpleForm({ ...simpleForm, imageUrl: e.target.value })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
                                            placeholder="https://..."
                                        />
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetSimpleForm(); }}
                                        className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-black text-slate-400 text-sm"
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black shadow-lg disabled:opacity-50 text-sm"
                                        disabled={uploading}
                                    >
                                        {uploading ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Update Product" : "Create Product")}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Main/Sub Product Form */}
                        {itemType === "main" && (
                            <form onSubmit={handleMainSubmit} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Main Product Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={mainForm.mainName}
                                        onChange={(e) => setMainForm({ ...mainForm, mainName: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-bold text-sm"
                                        placeholder="e.g., Cake, Decoration"
                                    />
                                </div>

                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-black text-purple-900">Sub-Products</h3>
                                        <button
                                            type="button"
                                            onClick={addSubProduct}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-black hover:bg-purple-700 text-xs"
                                        >
                                            + Add Sub-Product
                                        </button>
                                    </div>

                                    {mainForm.subProducts.map((sub, index) => (
                                        <div key={index} className="bg-white rounded-xl p-4 mb-3 border border-purple-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-black text-slate-900">Sub-Product #{index + 1}</h4>
                                                {mainForm.subProducts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSubProduct(index)}
                                                        className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-rose-100"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <input
                                                    required
                                                    type="text"
                                                    value={sub.subName}
                                                    onChange={(e) => {
                                                        const updated = [...mainForm.subProducts];
                                                        updated[index].subName = e.target.value;
                                                        setMainForm({ ...mainForm, subProducts: updated });
                                                    }}
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-sm"
                                                    placeholder="Sub-product name (e.g., Chocolate 500g)"
                                                />

                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        required
                                                        type="number"
                                                        value={sub.cost}
                                                        onChange={(e) => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].cost = Number(e.target.value);
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-sm"
                                                        placeholder="Cost (₹)"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={sub.discount}
                                                        onChange={(e) => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].discount = Number(e.target.value);
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-sm"
                                                        placeholder="Discount (%)"
                                                    />
                                                </div>

                                                {/* Price Display */}
                                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                    <div className="text-[10px] text-purple-600 font-bold mb-0.5">Final Price</div>
                                                    <div className="text-xl font-black text-purple-900">
                                                        ₹{calculateFinalPrice(sub.cost, sub.discount).toLocaleString()}
                                                    </div>
                                                </div>

                                                {/* Extra Units */}
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={sub.extraUnitsEnabled}
                                                        onChange={(e) => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].extraUnitsEnabled = e.target.checked;
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-xs font-bold">Enable Extra Units</span>
                                                </label>

                                                {sub.extraUnitsEnabled && (
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                                        <input
                                                            type="number"
                                                            value={sub.extraUnitCost}
                                                            onChange={(e) => {
                                                                const updated = [...mainForm.subProducts];
                                                                updated[index].extraUnitCost = Number(e.target.value);
                                                                setMainForm({ ...mainForm, subProducts: updated });
                                                            }}
                                                            className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg outline-none focus:border-emerald-500 font-bold mb-2 text-sm"
                                                            placeholder="Extra unit cost (₹)"
                                                        />
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={sub.applyMainDiscount}
                                                                onChange={(e) => {
                                                                    const updated = [...mainForm.subProducts];
                                                                    updated[index].applyMainDiscount = e.target.checked;
                                                                    setMainForm({ ...mainForm, subProducts: updated });
                                                                }}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-xs font-bold text-emerald-700">Apply same discount to extra units</span>
                                                        </label>
                                                    </div>
                                                )}

                                                <textarea
                                                    value={sub.description}
                                                    onChange={(e) => {
                                                        const updated = [...mainForm.subProducts];
                                                        updated[index].description = e.target.value;
                                                        setMainForm({ ...mainForm, subProducts: updated });
                                                    }}
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-medium text-sm"
                                                    placeholder="Description"
                                                    rows={2}
                                                />

                                                {/* Image Type */}
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].imageType = "upload";
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${sub.imageType === "upload"
                                                            ? "bg-purple-600 text-white"
                                                            : "bg-slate-100 text-slate-400"
                                                            }`}
                                                    >
                                                        Upload
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].imageType = "url";
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs ${sub.imageType === "url"
                                                            ? "bg-purple-600 text-white"
                                                            : "bg-slate-100 text-slate-400"
                                                            }`}
                                                    >
                                                        URL
                                                    </button>
                                                </div>

                                                {sub.imageType === "upload" ? (
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setCurrentImageFile(e.target.files?.[0] || null)}
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                    />
                                                ) : (
                                                    <input
                                                        type="url"
                                                        value={sub.imageUrl}
                                                        onChange={(e) => {
                                                            const updated = [...mainForm.subProducts];
                                                            updated[index].imageUrl = e.target.value;
                                                            setMainForm({ ...mainForm, subProducts: updated });
                                                        }}
                                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-sm"
                                                        placeholder="https://..."
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetMainForm(); }}
                                        className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-black text-slate-400 text-sm"
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-black shadow-lg disabled:opacity-50 text-sm"
                                        disabled={uploading}
                                    >
                                        {uploading ? "Creating..." : "Create Main Product"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
