"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, query, where, getDocs, runTransaction, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import type { Venue, PackageItem, AdditionalItem, InventoryItem } from "@/types";
import DealCountdown from "@/components/venue/DealCountdown";
import { rebuildAvailability } from "@/lib/bookingUtils";

export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const venueId = params.venueId as string;

    // Venue and booking state
    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
    const [inventory, setInventory] = useState<any[]>([]); // Use any[] to handle main/sub types from actual DB

    // Package customization (for customizable items like cakes)
    const [selectedPackageVariants, setSelectedPackageVariants] = useState<{
        [key: string]: { variantId: string; variantName: string };
    }>({});

    // Carousel index for package items (for Main/Sub products)
    const [packageCarouselIndices, setPackageCarouselIndices] = useState<{ [key: string]: number }>({});

    // Additional items selection
    const [selectedAdditionalItems, setSelectedAdditionalItems] = useState<{
        [key: string]: { quantity: number; price: number };
    }>({});

    // Custom input values for additional items (e.g., candle number, custom text)
    const [additionalItemsCustomInput, setAdditionalItemsCustomInput] = useState<{
        [key: string]: string;
    }>({});

    // Modal state for viewing package items
    const [viewingPackageItem, setViewingPackageItem] = useState<PackageItem | null>(null);

    // Modal state for viewing additional items
    const [viewingAdditionalItem, setViewingAdditionalItem] = useState<AdditionalItem | null>(null);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
    const [customerInfo, setCustomerInfo] = useState({
        name: session?.user?.name || "",
        phone: "",
        email: session?.user?.email || "",
    });

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            const callbackUrl = `/booking/${venueId}`;
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }
    }, [status, router, venueId]);

    // Fetch Venue Data
    useEffect(() => {
        const fetchVenue = async () => {
            if (!venueId) return;
            try {
                const docRef = doc(db, "venues", venueId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setVenue({ id: docSnap.id, ...docSnap.data() } as Venue);
                } else {
                    console.log("No such venue!");
                }
            } catch (error) {
                console.error("Error fetching venue:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchInventory = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "inventory"));
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInventory(items);
            } catch (error) {
                console.error("Error fetching inventory:", error);
            }
        };

        fetchVenue();
        fetchInventory();
    }, [venueId]);

    // Room capacity and availability
    const [numberOfRooms, setNumberOfRooms] = useState(1);
    const [bookedSlots, setBookedSlots] = useState<number[]>([]);

    // Fetch room capacity setting
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settingsSnap = await getDoc(doc(db, "settings", "general"));
                if (settingsSnap.exists()) {
                    setNumberOfRooms(settingsSnap.data().numberOfRooms || 1);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // Fetch availability when date changes
    useEffect(() => {
        if (!selectedDate || !venueId) return;

        const fetchAvailability = async () => {
            try {
                // Create start and end of selected date
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                // Query bookings for this date range (Global Availability - All Venues)
                const q = query(
                    collection(db, "bookings"),
                    // where("venueId", "==", venueId), // REMOVED: Global Capacity means we count ALL bookings
                    where("bookingDate", ">=", startOfDay),
                    where("bookingDate", "<=", endOfDay)
                );

                const snapshot = await getDocs(q);
                const bookings = snapshot.docs.map(doc => doc.data());

                // Calculate slot usage
                const slotUsage: { [key: number]: number } = {};

                bookings.forEach((booking: any) => {
                    if (booking.status === "cancelled") return;

                    // Parse values safely
                    const startRaw = booking.startHour;
                    const endRaw = booking.endHour;
                    const durationRaw = booking.durationHours;

                    const start = parseInt(String(startRaw));
                    const end = parseInt(String(endRaw));
                    const duration = durationRaw ? parseInt(String(durationRaw)) : (end - start);

                    if (isNaN(start) || isNaN(duration)) return;

                    for (let i = 0; i < duration; i++) {
                        const hour = start + i;
                        slotUsage[hour] = (slotUsage[hour] || 0) + 1;
                    }
                });

                // Identify fully booked slots
                const capacity = parseInt(String(numberOfRooms)) || 1;
                const fullyBooked = Object.entries(slotUsage)
                    .filter(([_, count]) => count >= capacity)
                    .map(([hour, _]) => parseInt(hour));

                setBookedSlots(fullyBooked);
            } catch (error: any) {
                console.error("Error fetching availability:", error);
            }
        };

        fetchAvailability();
    }, [selectedDate, venueId, numberOfRooms]);

    // Time slots (24 hours)
    const timeSlots = Array.from({ length: 24 }, (_, i) => i);

    const getTimeLabel = (hour: number) => {
        if (hour === 0) return "12 AM";
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return "12 PM";
        return `${hour - 12} PM`;
    };

    // Handle slot selection (range)
    const toggleSlot = (hour: number) => {
        if (bookedSlots.includes(hour)) return; // Prevent selecting booked slots

        if (selectedSlots.includes(hour)) {
            setSelectedSlots(selectedSlots.filter(s => s !== hour));
        } else {
            // Check if adding this slot creates a gap or is disjoint (optional validation)
            // For now, allow selection logic but maybe validate contiguous range later if needed
            // User can select multiple disjoint slots? Usually improved logic required.
            // But main request is capacity check.
            setSelectedSlots([...selectedSlots, hour].sort((a, b) => a - b));
        }
    };

    // Coupon State
    const [couponCode, setCouponCode] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);

    const applyCoupon = async () => {
        if (!couponCode) return;
        setLoading(true);
        try {
            const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()), where("status", "==", "active"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("Invalid or expired coupon code.");
                setCouponDiscount(0);
                setAppliedCouponId(null);
                setLoading(false);
                return;
            }

            const couponData = snapshot.docs[0].data();
            const couponId = snapshot.docs[0].id;
            const now = new Date();
            const expiry = new Date(couponData.expiryDate);

            if (now > expiry) {
                alert("This coupon has expired.");
                setCouponDiscount(0);
                setAppliedCouponId(null);
                setLoading(false);
                return;
            }

            if (couponData.maxUses > 0 && couponData.usedCount >= couponData.maxUses) {
                alert("This coupon usage limit has been reached.");
                setCouponDiscount(0);
                setAppliedCouponId(null);
                setLoading(false);
                return;
            }

            // check venue validity
            if (couponData.applicableVenueIds && couponData.applicableVenueIds.length > 0) {
                if (!couponData.applicableVenueIds.includes(venueId)) {
                    alert("This coupon is not valid for this venue.");
                    setCouponDiscount(0);
                    setAppliedCouponId(null);
                    setLoading(false);
                    return;
                }
            }

            // Calculate Discount
            const pricing = calculatePrice(); // Get current subtotal
            const minAmount = couponData.minAmount || 0;

            if (pricing.subtotal < minAmount) {
                alert(`Minimum order amount of ₹${minAmount} required for this coupon.`);
                setCouponDiscount(0);
                setAppliedCouponId(null);
                setLoading(false);
                return;
            }

            let discount = 0;
            if (couponData.type === "percentage") {
                discount = (pricing.subtotal * couponData.discount) / 100;
            } else {
                discount = couponData.discount;
            }

            // Ensure discount doesn't exceed subtotal
            discount = Math.min(discount, pricing.subtotal);

            setCouponDiscount(discount);
            setAppliedCouponId(couponId);
            alert(`Coupon applied! You saved ₹${discount.toFixed(2)}`);

        } catch (error) {
            console.error("Error applying coupon:", error);
            alert("Failed to apply coupon.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate pricing
    const calculatePrice = () => {
        if (!venue) return { subtotal: 0, discount: 0, additionalItemsTotal: 0, additionalHoursCost: 0, total: 0 };

        const isDealActive = venue.dealEnabled && venue.dealEndTime && new Date(venue.dealEndTime) > new Date();
        const basePrice = venue.basePrice;
        const discountPercent = isDealActive ? venue.discount : 0;
        const discountAmount = basePrice * (discountPercent / 100);
        const basePriceAfterDiscount = basePrice - discountAmount;

        // Additional hours
        const durationHours = selectedSlots.length;
        const additionalHours = Math.max(0, durationHours - 4); // Assuming 4 hours standard
        const additionalHoursCost = additionalHours * venue.additionalHourCost;

        // Additional items (NOT discounted)
        const additionalItemsTotal = Object.values(selectedAdditionalItems).reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        const subtotal = basePriceAfterDiscount + additionalHoursCost + additionalItemsTotal;
        const finalTotal = Math.max(0, subtotal - couponDiscount);

        return {
            subtotal,
            discount: discountAmount,
            additionalItemsTotal,
            additionalHoursCost,
            total: finalTotal, // Updated to include coupon
        };
    };

    const handleBooking = async () => {
        if (!venue || !selectedDate || selectedSlots.length === 0 || !customerInfo.phone) {
            alert("Please fill all required fields and select time slots");
            return;
        }

        try {
            const pricing = calculatePrice();
            const startHour = Math.min(...selectedSlots);
            const endHour = Math.max(...selectedSlots) + 1;
            const dateStr = selectedDate; // YYYY-MM-DD from input
            let newBookingId = "";

            // Transactional Booking
            await runTransaction(db, async (transaction) => {
                // 1. Reference GLOBAL Availability Doc
                // 1. Reference GLOBAL Availability Doc & Coupon
                const availabilityRef = doc(db, "booking_availability", `GLOBAL_${dateStr}`);
                const availabilityDoc = await transaction.get(availabilityRef);

                let couponRef, couponDoc;
                if (appliedCouponId) {
                    couponRef = doc(db, "coupons", appliedCouponId);
                    couponDoc = await transaction.get(couponRef);
                }

                // 2. Self-Healing check
                if (!availabilityDoc.exists()) {
                    throw new Error("NEEDS_REBUILD");
                }

                const availabilityData = availabilityDoc.data();
                const currentSlots = availabilityData.slots || {};
                const roomCapacity = parseInt(String(numberOfRooms)) || 1;

                // 3. Verify Capacity for ALL requested slots
                for (const slot of selectedSlots) {
                    const currentCount = currentSlots[slot] || 0;
                    if (currentCount >= roomCapacity) {
                        throw new Error(`Slot ${getTimeLabel(slot)} is no longer available.`);
                    }
                }

                // 4. Update Availability (Increment counts)
                const newSlots = { ...currentSlots };
                for (const slot of selectedSlots) {
                    newSlots[slot] = (newSlots[slot] || 0) + 1;
                }

                transaction.update(availabilityRef, {
                    slots: newSlots,
                    lastUpdated: serverTimestamp()
                });

                // Update Coupon Usage if applied
                if (appliedCouponId && couponRef && couponDoc) {
                    const currentUses = couponDoc.data()?.usedCount || 0;
                    transaction.update(couponRef, {
                        usedCount: currentUses + 1
                    });
                }

                // 5. Create Booking Document
                const bookingRef = doc(collection(db, "bookings"));
                newBookingId = bookingRef.id;

                const bookingData = {
                    bookingNumber: `BK${Date.now()}`,
                    userId: session?.user?.id,
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerEmail: customerInfo.email,
                    venueId: venue.id,
                    venueName: venue.name,
                    bookingDate: new Date(selectedDate),
                    startHour,
                    endHour,
                    durationHours: selectedSlots.length,
                    additionalHours: Math.max(0, selectedSlots.length - 4),
                    selectedPackageVariants: Object.entries(selectedPackageVariants).map(([inventoryId, variant]) => ({
                        inventoryId,
                        variantId: variant.variantId,
                        variantName: variant.variantName,
                    })),
                    selectedAdditionalItems: Object.entries(selectedAdditionalItems).map(([inventoryId, item]) => ({
                        inventoryId,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    basePrice: venue.basePrice,
                    packageDiscount: venue.dealEnabled ? venue.discount : 0,
                    discountAmount: pricing.discount,
                    additionalItemsTotal: pricing.additionalItemsTotal,
                    additionalHoursCost: pricing.additionalHoursCost,
                    subtotal: pricing.subtotal,
                    couponCode: appliedCouponId ? couponCode : null,
                    couponDiscount: couponDiscount,
                    finalTotal: pricing.total,
                    paymentMethod,
                    paymentStatus: "pending",
                    bookedBy: "customer",
                    status: "confirmed",
                    createdAt: serverTimestamp(), // Use server timestamp
                };

                transaction.set(bookingRef, bookingData);
            });

            console.log("Booking created successfully with ID:", newBookingId);
            alert(`Booking confirmed! ID: ${newBookingId}. Redirecting...`);
            router.push("/customer/bookings");

        } catch (error: any) {
            // Handle Self-Healing (Do not log as error to avoid Next.js overlay)
            if (error.message === "NEEDS_REBUILD") {
                console.warn("Availability doc missing. Rebuilding and retrying...");
                try {
                    await rebuildAvailability(venue.id, selectedDate);
                    // Auto-retry once
                    handleBooking();
                    return;
                } catch (rebuildError) {
                    console.error("Rebuild failed:", rebuildError);
                    alert("System error. Please contact support.");
                }
                return;
            }

            console.error("Booking failed:", error);

            if (error.message.includes("no longer available")) {
                alert(error.message);
                // Refresh availability
                // fetchAvailability(); // Ideally we trigger a re-fetch here
            } else {
                alert(`Failed to create booking. Error: ${error.message}`);
            }
        }
    };

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-xl font-bold text-slate-600">Loading venue...</p>
                </div>
            </div>
        );
    }

    if (!venue) {
        return null;
    }

    const isDealActive = venue.dealEnabled && venue.dealEndTime && new Date(venue.dealEndTime) > new Date();
    const pricing = calculatePrice();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-12">
            <div className="max-w-7xl mx-auto px-6">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-indigo-600 font-bold mb-4 hover:text-indigo-800 flex items-center gap-2"
                    >
                        ← Back to Venues
                    </button>
                    <h1 className="text-5xl font-black text-slate-900">{venue.name}</h1>
                    <p className="text-slate-600 font-medium mt-2">{venue.description}</p>
                </div>

                {/* Deal Countdown */}
                {isDealActive && venue.dealEndTime && (
                    <div className="mb-8">
                        <DealCountdown dealEndTime={venue.dealEndTime} discount={venue.discount} />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Booking Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Info */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl">
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Your Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone *</label>
                                    <input
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={customerInfo.email}
                                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl">
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Select Date</h2>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-lg focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        {/* Time Slot Selection */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl">
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Select Time Slots</h2>
                            <p className="text-sm text-slate-500 mb-4">Click to select hours (minimum 2 hours)</p>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {timeSlots.map((hour) => {
                                    const isBooked = bookedSlots.includes(hour);
                                    const isSelected = selectedSlots.includes(hour);

                                    return (
                                        <button
                                            key={hour}
                                            onClick={() => toggleSlot(hour)}
                                            disabled={isBooked}
                                            className={`py-3 px-2 rounded-lg font-bold text-sm transition-all relative overflow-hidden ${isBooked
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                                                : isSelected
                                                    ? "bg-indigo-600 text-white scale-105 shadow-lg"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                }`}
                                        >
                                            {getTimeLabel(hour)}
                                            {isBooked && (
                                                <span className="absolute inset-0 flex items-center justify-center bg-slate-200/80 text-[10px] sm:text-xs font-black text-rose-500 uppercase rotate-[-15deg] border-2 border-rose-500/20">
                                                    BOOKED
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedSlots.length > 0 && (
                                <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                                    <p className="font-bold text-indigo-900">
                                        Selected: {getTimeLabel(Math.min(...selectedSlots))} - {getTimeLabel(Math.max(...selectedSlots) + 1)}
                                        <span className="text-indigo-600 ml-2">({selectedSlots.length} hours)</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Package Items with Customization */}
                        {venue.packageItems && venue.packageItems.length > 0 && (
                            <div className="bg-white rounded-3xl p-8 shadow-xl">
                                <h2 className="text-2xl font-black text-slate-900 mb-6">📦 Package Included</h2>

                                <div className="space-y-3">
                                    {venue.packageItems.map((item) => {
                                        const inventoryItem = inventory.find(inv => inv.id === item.inventoryId);
                                        const description = inventoryItem?.type === "simple" && 'description' in inventoryItem
                                            ? inventoryItem.description
                                            : inventoryItem?.type === "nested" && 'mainProductName' in inventoryItem
                                                ? `Main Product: ${inventoryItem.mainProductName}`
                                                : "No description available";

                                        return (
                                            <div
                                                key={item.inventoryId}
                                                className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">{item.inventoryName}</p>
                                                    <p className="text-sm text-slate-600 line-clamp-1">{description}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingPackageItem(item)}
                                                    className="text-sm font-bold text-indigo-600 px-4 py-2 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Package Item Modal */}
                        {viewingPackageItem && (() => {
                            const inventoryItem = inventory.find(inv => inv.id === viewingPackageItem.inventoryId);
                            const isSimple = inventoryItem?.type === "simple";
                            const isNested = inventoryItem?.type === "nested";

                            // Find current index and enable navigation
                            const currentIndex = venue.packageItems.findIndex(item => item.inventoryId === viewingPackageItem.inventoryId);
                            const hasPrevious = currentIndex > 0;
                            const hasNext = currentIndex < venue.packageItems.length - 1;

                            const goToPrevious = () => {
                                if (hasPrevious) {
                                    setViewingPackageItem(venue.packageItems[currentIndex - 1]);
                                }
                            };

                            const goToNext = () => {
                                if (hasNext) {
                                    setViewingPackageItem(venue.packageItems[currentIndex + 1]);
                                }
                            };

                            return (
                                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    {/* Navigation Arrows */}
                                    {hasPrevious && (
                                        <button
                                            type="button"
                                            onClick={goToPrevious}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-3xl z-50 border-2 border-slate-200"
                                        >
                                            ←
                                        </button>
                                    )}

                                    {hasNext && (
                                        <button
                                            type="button"
                                            onClick={goToNext}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-3xl z-50 border-2 border-slate-200"
                                        >
                                            →
                                        </button>
                                    )}

                                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-2xl font-black text-slate-900">Package Item Details</h3>
                                            <button
                                                onClick={() => setViewingPackageItem(null)}
                                                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {isSimple && 'imageUrl' in inventoryItem ? (
                                            // Simple Product View
                                            <div className="space-y-4">
                                                <div className="flex gap-6">
                                                    {/* Image */}
                                                    <div className="w-48 h-48 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                                                        {inventoryItem.imageUrl ? (
                                                            <img
                                                                src={inventoryItem.imageUrl}
                                                                alt={inventoryItem.productName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                                                No Image
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-slate-900 text-xl mb-3">{viewingPackageItem.inventoryName}</h4>
                                                        <p className="text-slate-600 leading-relaxed">
                                                            {inventoryItem.description || "No description available"}
                                                        </p>
                                                        <p className="text-sm text-purple-600 font-bold mt-4">Quantity: {viewingPackageItem.quantity}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : inventoryItem?.type === "main" ? (
                                            // Main Product with Sub Products (stored as separate documents)
                                            (() => {
                                                // Find all sub products for this main product
                                                const subProducts = inventory.filter(
                                                    inv => inv.type === "sub" && 'mainProductId' in inv && inv.mainProductId === viewingPackageItem.inventoryId
                                                );

                                                if (subProducts.length === 0) {
                                                    return (
                                                        <div className="text-center py-8">
                                                            <p className="font-bold text-xl text-slate-900 mb-2">{viewingPackageItem.inventoryName}</p>
                                                            <p className="text-slate-600 mb-4">Quantity: {viewingPackageItem.quantity}</p>
                                                            <p className="text-sm text-slate-500">No variants available</p>
                                                        </div>
                                                    );
                                                }

                                                const currentSubIndex = packageCarouselIndices[viewingPackageItem.inventoryId] || 0;
                                                const currentSub = subProducts[currentSubIndex];

                                                return (
                                                    <div className="space-y-6">
                                                        {/* Carousel */}
                                                        <div className="relative">
                                                            {/* Navigation Arrows */}
                                                            {subProducts.length > 1 && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPackageCarouselIndices(prev => ({
                                                                            ...prev,
                                                                            [viewingPackageItem.inventoryId]: (currentSubIndex - 1 + subProducts.length) % subProducts.length
                                                                        }))}
                                                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white border-2 border-slate-300 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-2xl"
                                                                    >
                                                                        ‹
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPackageCarouselIndices(prev => ({
                                                                            ...prev,
                                                                            [viewingPackageItem.inventoryId]: (currentSubIndex + 1) % subProducts.length
                                                                        }))}
                                                                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white border-2 border-slate-300 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-2xl"
                                                                    >
                                                                        ›
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* Image */}
                                                            <div className="w-full aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl overflow-hidden">
                                                                {'imageUrl' in currentSub && currentSub.imageUrl ? (
                                                                    <img
                                                                        src={currentSub.imageUrl}
                                                                        alt={'subName' in currentSub ? currentSub.subName : 'Sub product'}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                                                        No Image
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <div>
                                                            <h4 className="font-black text-slate-900 text-xl mb-2">
                                                                {'subName' in currentSub ? currentSub.subName : viewingPackageItem.inventoryName}
                                                            </h4>
                                                            <p className="text-slate-600 leading-relaxed mb-4">
                                                                {'description' in currentSub ? currentSub.description || "No description available" : "No description available"}
                                                            </p>

                                                            {/* Select Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (currentSub && 'id' in currentSub && 'subName' in currentSub) {
                                                                        setSelectedPackageVariants({
                                                                            ...selectedPackageVariants,
                                                                            [viewingPackageItem.inventoryId]: {
                                                                                variantId: currentSub.id,
                                                                                variantName: currentSub.subName,
                                                                            },
                                                                        });
                                                                    }
                                                                }}
                                                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedPackageVariants[viewingPackageItem.inventoryId]?.variantId === currentSub?.id
                                                                    ? "bg-purple-600 text-white shadow-lg"
                                                                    : "bg-white border-2 border-slate-300 text-slate-700 hover:border-purple-400"
                                                                    }`}
                                                            >
                                                                {selectedPackageVariants[viewingPackageItem.inventoryId]?.variantId === currentSub?.id
                                                                    ? "✓ Selected"
                                                                    : "Select"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            // Non-customizable item
                                            <div className="text-center py-8">
                                                <p className="font-bold text-xl text-slate-900 mb-2">{viewingPackageItem.inventoryName}</p>
                                                <p className="text-slate-600 mb-4">Quantity: {viewingPackageItem.quantity}</p>
                                                <p className="text-sm text-slate-500">This item is included in your package</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Additional Item Modal */}
                        {viewingAdditionalItem && venue.additionalItems && (() => {
                            const inventoryItem = inventory.find(inv => inv.id === viewingAdditionalItem.inventoryId);
                            const isSimple = inventoryItem?.type === "simple";

                            // Find current index and enable navigation
                            const availableItems = venue.additionalItems.filter(item => item.available);
                            const currentIndex = availableItems.findIndex(item => item.inventoryId === viewingAdditionalItem.inventoryId);
                            const hasPrevious = currentIndex > 0;
                            const hasNext = currentIndex < availableItems.length - 1;

                            const goToPrevious = () => {
                                if (hasPrevious) {
                                    setViewingAdditionalItem(availableItems[currentIndex - 1]);
                                }
                            };

                            const goToNext = () => {
                                if (hasNext) {
                                    setViewingAdditionalItem(availableItems[currentIndex + 1]);
                                }
                            };

                            return (
                                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    {/* Navigation Arrows */}
                                    {hasPrevious && (
                                        <button
                                            type="button"
                                            onClick={goToPrevious}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-3xl z-50 border-2 border-slate-200"
                                        >
                                            ←
                                        </button>
                                    )}

                                    {hasNext && (
                                        <button
                                            type="button"
                                            onClick={goToNext}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-slate-700 hover:bg-slate-50 font-black text-3xl z-50 border-2 border-slate-200"
                                        >
                                            →
                                        </button>
                                    )}

                                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-2xl font-black text-slate-900">Additional Item Details</h3>
                                            <button
                                                type="button"
                                                onClick={() => setViewingAdditionalItem(null)}
                                                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex gap-6">
                                                {/* Image */}
                                                <div className="w-48 h-48 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                                                    {isSimple && 'imageUrl' in inventoryItem && inventoryItem.imageUrl ? (
                                                        <img
                                                            src={inventoryItem.imageUrl}
                                                            alt={viewingAdditionalItem.inventoryName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                                            No Image
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-900 text-xl mb-3">{viewingAdditionalItem.inventoryName}</h4>
                                                    <p className="text-slate-600 leading-relaxed mb-4">
                                                        {isSimple && 'description' in inventoryItem ? inventoryItem.description || "No description available" : "Available for booking"}
                                                    </p>
                                                    <p className="text-2xl font-black text-emerald-600 mb-4">₹{viewingAdditionalItem.price.toLocaleString()}</p>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-4">
                                                        <p className="font-bold text-slate-700">Quantity:</p>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = selectedAdditionalItems[viewingAdditionalItem.inventoryId];
                                                                    if (current && current.quantity > 0) {
                                                                        const newQty = current.quantity - 1;
                                                                        if (newQty === 0) {
                                                                            const newItems = { ...selectedAdditionalItems };
                                                                            delete newItems[viewingAdditionalItem.inventoryId];
                                                                            setSelectedAdditionalItems(newItems);
                                                                        } else {
                                                                            setSelectedAdditionalItems({
                                                                                ...selectedAdditionalItems,
                                                                                [viewingAdditionalItem.inventoryId]: { ...current, quantity: newQty },
                                                                            });
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-10 h-10 bg-slate-200 rounded-lg font-black text-slate-700 hover:bg-slate-300 text-xl"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="w-12 text-center font-black text-xl">
                                                                {selectedAdditionalItems[viewingAdditionalItem.inventoryId]?.quantity || 0}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = selectedAdditionalItems[viewingAdditionalItem.inventoryId];
                                                                    setSelectedAdditionalItems({
                                                                        ...selectedAdditionalItems,
                                                                        [viewingAdditionalItem.inventoryId]: {
                                                                            quantity: (current?.quantity || 0) + 1,
                                                                            price: viewingAdditionalItem.price,
                                                                        },
                                                                    });
                                                                }}
                                                                className="w-10 h-10 bg-emerald-500 text-white rounded-lg font-black hover:bg-emerald-600 text-xl"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Custom Input Field (if enabled for this item) */}
                                                    {inventoryItem && 'showInStore' in inventoryItem && inventoryItem.showInStore && (
                                                        <div className="mt-6 pt-6 border-t-2 border-emerald-100">
                                                            <label className="block mb-2">
                                                                <span className="font-bold text-slate-700 text-sm">✏️ Custom Details:</span>
                                                                <span className="text-xs text-slate-500 ml-2">(e.g., candle number, special text)</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={additionalItemsCustomInput[viewingAdditionalItem.inventoryId] || ""}
                                                                onChange={(e) => setAdditionalItemsCustomInput({
                                                                    ...additionalItemsCustomInput,
                                                                    [viewingAdditionalItem.inventoryId]: e.target.value
                                                                })}
                                                                className="w-full p-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-medium"
                                                                placeholder="Enter your custom details here..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Additional Items */}
                        {venue.additionalItems && venue.additionalItems.filter((i) => i.available).length > 0 && (
                            <div className="bg-white rounded-3xl p-8 shadow-xl">
                                <h2 className="text-2xl font-black text-slate-900 mb-6">➕ Add Extra Items</h2>
                                <div className="space-y-3">
                                    {venue.additionalItems
                                        .filter((item) => item.available)
                                        .map((item) => {
                                            const inventoryItem = inventory.find(inv => inv.id === item.inventoryId);
                                            const isSelected = !!selectedAdditionalItems[item.inventoryId];
                                            const quantity = selectedAdditionalItems[item.inventoryId]?.quantity || 0;
                                            const description = inventoryItem?.type === "simple" && 'description' in inventoryItem
                                                ? inventoryItem.description
                                                : "Available for booking";

                                            return (
                                                <div
                                                    key={item.inventoryId}
                                                    className={`flex items-center justify-between p-4 rounded-xl transition-all border-2 ${isSelected
                                                        ? "bg-emerald-50 border-emerald-200"
                                                        : "bg-white border-slate-100 hover:border-slate-200"
                                                        }`}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold text-slate-900">{item.inventoryName}</p>
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                                                ₹{item.price}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">{description}</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingAdditionalItem(item)}
                                                            className="text-sm font-bold text-slate-500 px-3 py-2 hover:bg-slate-100 rounded-lg"
                                                            title="View Details"
                                                        >
                                                            👁️
                                                        </button>

                                                        {isSelected ? (
                                                            <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-emerald-200 shadow-sm">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newQty = quantity - 1;
                                                                        if (newQty === 0) {
                                                                            const newItems = { ...selectedAdditionalItems };
                                                                            delete newItems[item.inventoryId];
                                                                            setSelectedAdditionalItems(newItems);
                                                                        } else {
                                                                            setSelectedAdditionalItems({
                                                                                ...selectedAdditionalItems,
                                                                                [item.inventoryId]: { ...selectedAdditionalItems[item.inventoryId], quantity: newQty },
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-bold text-emerald-700 w-4 text-center">{quantity}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedAdditionalItems({
                                                                            ...selectedAdditionalItems,
                                                                            [item.inventoryId]: { ...selectedAdditionalItems[item.inventoryId], quantity: quantity + 1 },
                                                                        });
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 rounded text-white font-bold"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedAdditionalItems({
                                                                        ...selectedAdditionalItems,
                                                                        [item.inventoryId]: {
                                                                            quantity: 1,
                                                                            price: item.price,
                                                                        },
                                                                    });
                                                                }}
                                                                className="text-sm font-bold text-emerald-600 px-4 py-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200"
                                                            >
                                                                Add
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-xl sticky top-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Booking Summary</h2>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Date</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedDate ? new Date(selectedDate).toLocaleDateString() : "Select a date"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Time</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedSlots.length > 0
                                            ? `${getTimeLabel(Math.min(...selectedSlots))} - ${getTimeLabel(Math.max(...selectedSlots) + 1)}`
                                            : "Select slots"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Duration</span>
                                    <span className="font-bold text-slate-900">{selectedSlots.length} hours</span>
                                </div>
                            </div>

                            <div className="border-t-2 border-slate-100 pt-6 space-y-3">
                                {pricing.additionalHoursCost > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Extra Hours Cost</span>
                                        <span className="font-bold text-slate-900">₹{pricing.additionalHoursCost.toLocaleString()}</span>
                                    </div>
                                )}
                                {pricing.additionalItemsTotal > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Additional Items</span>
                                        <span className="font-bold text-slate-900">₹{pricing.additionalItemsTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-bold text-slate-700">Subtotal</span>
                                    <span className="font-black text-slate-900">₹{pricing.subtotal.toLocaleString()}</span>
                                </div>
                                {pricing.discount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600">
                                        <span className="font-bold">Deal Discount</span>
                                        <span className="font-bold">-₹{pricing.discount.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Coupon Input */}
                                <div className="py-4 border-t border-slate-100 border-dashed">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter Coupon Code"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value)}
                                            disabled={appliedCouponId !== null}
                                            className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm uppercase font-bold focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        {appliedCouponId ? (
                                            <button
                                                onClick={() => {
                                                    setAppliedCouponId(null);
                                                    setCouponDiscount(0);
                                                    setCouponCode("");
                                                }}
                                                className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-rose-200"
                                            >
                                                ✕
                                            </button>
                                        ) : (
                                            <button
                                                onClick={applyCoupon}
                                                disabled={!couponCode || loading}
                                                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                Apply
                                            </button>
                                        )}
                                    </div>
                                    {appliedCouponId && (
                                        <p className="text-emerald-600 text-xs font-bold mt-2">
                                            ✅ Coupon Applied! You saved ₹{couponDiscount.toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                {couponDiscount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600">
                                        <span className="font-bold">Coupon Discount</span>
                                        <span className="font-bold">-₹{couponDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t-2 border-slate-100 pt-6 mt-6">
                                <div className="flex justify-between items-center mb-8">
                                    <span className="text-xl font-bold text-slate-900">Total</span>
                                    <span className="text-3xl font-black text-indigo-600">₹{pricing.total.toLocaleString()}</span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <label className="flex items-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-all">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="cod"
                                            checked={paymentMethod === "cod"}
                                            onChange={() => setPaymentMethod("cod")}
                                            className="w-5 h-5 text-indigo-600"
                                        />
                                        <span className="ml-3 font-bold text-slate-700">Pay at Venue (Cash/UPI)</span>
                                    </label>
                                    <label className="flex items-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-all opacity-50">
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="upi"
                                            disabled
                                            className="w-5 h-5 text-indigo-600"
                                        />
                                        <span className="ml-3 font-bold text-slate-700">Pay Online (Coming Soon)</span>
                                    </label>
                                </div>

                                <button
                                    onClick={handleBooking}
                                    disabled={!selectedDate || selectedSlots.length < 2 || !customerInfo.phone}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-lg shadow-xl hover:bg-indigo-700 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Booking
                                </button>
                                <p className="text-center text-xs text-slate-400 mt-4 font-bold uppercase tracking-widest">
                                    No upfront payment required
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
