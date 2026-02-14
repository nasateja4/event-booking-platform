"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, getDoc, doc, runTransaction, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { rebuildAvailability } from "@/lib/bookingUtils";

interface Venue {
    id: string;
    name: string;
}

export default function ManualBookingPage() {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    });
    const [bookedSlots, setBookedSlots] = useState<number[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [numberOfRooms, setNumberOfRooms] = useState(1);

    // Fetch Venues on Load
    useEffect(() => {
        const fetchVenues = async () => {
            const querySnapshot = await getDocs(collection(db, "venues"));
            const venuesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || "Unnamed Venue"
            }));
            setVenues(venuesData);
            if (venuesData.length > 0) setSelectedVenue(venuesData[0].id);
        };
        fetchVenues();
    }, []);

    // Fetch Capacity Settings
    useEffect(() => {
        const fetchSettings = async () => {
            const settingsSnap = await getDoc(doc(db, "settings", "general"));
            if (settingsSnap.exists()) {
                setNumberOfRooms(settingsSnap.data().numberOfRooms || 1);
            }
        };
        fetchSettings();
    }, []);

    // Fetch Availability Logic (Reused from Booking Page)
    useEffect(() => {
        if (!selectedVenue || !selectedDate) return;

        const fetchAvailability = async () => {
            setLoading(true);
            try {
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                // Query bookings for this date range (Global Availability)
                const q = query(
                    collection(db, "bookings"),
                    // where("venueId", "==", venueId), // REMOVED: Global Capacity
                    where("bookingDate", ">=", startOfDay),
                    where("bookingDate", "<=", endOfDay)
                );

                const snapshot = await getDocs(q);
                const bookings = snapshot.docs.map(doc => doc.data());

                const slotUsage: { [key: number]: number } = {};

                bookings.forEach((booking: any) => {
                    if (booking.status === "cancelled") return;

                    const start = parseInt(String(booking.startHour));
                    const end = parseInt(String(booking.endHour));
                    const duration = booking.durationHours ? parseInt(String(booking.durationHours)) : (end - start);

                    if (isNaN(start) || isNaN(duration)) return;

                    for (let i = 0; i < duration; i++) {
                        const hour = start + i;
                        slotUsage[hour] = (slotUsage[hour] || 0) + 1;
                    }
                });

                const fullyBooked = Object.entries(slotUsage)
                    .filter(([_, count]) => count >= numberOfRooms)
                    .map(([hour, _]) => parseInt(hour));

                setBookedSlots(fullyBooked);
                setSelectedSlots([]); // Reset selection on date change
            } catch (error) {
                console.error("Error fetching availability:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [selectedVenue, selectedDate, numberOfRooms]);

    const toggleSlot = (hour: number) => {
        if (bookedSlots.includes(hour)) return;
        if (selectedSlots.includes(hour)) {
            setSelectedSlots(selectedSlots.filter(s => s !== hour));
        } else {
            setSelectedSlots([...selectedSlots, hour].sort((a, b) => a - b));
        }
    };

    const handleManualBooking = async () => {
        if (selectedSlots.length === 0) return alert("Please select at least one time slot.");
        if (!selectedDate || !selectedVenue) return alert("Please select date and venue.");

        setProcessing(true);
        try {
            const minHour = Math.min(...selectedSlots);
            const maxHour = Math.max(...selectedSlots);
            const duration = selectedSlots.length;
            const dateStr = selectedDate;

            let newBookingId = "";

            await runTransaction(db, async (transaction) => {
                // 1. Reference GLOBAL Availability Doc
                const availabilityRef = doc(db, "booking_availability", `GLOBAL_${dateStr}`);
                const availabilityDoc = await transaction.get(availabilityRef);

                // 2. Self-Healing (Create if missing)
                let currentSlots: { [key: number]: number } = {};

                if (!availabilityDoc.exists()) {
                    throw new Error("NEEDS_REBUILD");
                } else {
                    currentSlots = availabilityDoc.data().slots || {};
                }

                // 3. Update Counts
                const newSlots = { ...currentSlots };
                for (const slot of selectedSlots) {
                    if ((newSlots[slot] || 0) >= numberOfRooms) {
                        throw new Error(`Slot ${slot} (${slot < 12 ? slot + " AM" : (slot === 12 ? "12 PM" : slot - 12 + " PM")}) is already fully booked.`);
                    }
                    newSlots[slot] = (newSlots[slot] || 0) + 1;
                }

                transaction.update(availabilityRef, {
                    slots: newSlots,
                    lastUpdated: serverTimestamp()
                });

                // 4. Create Booking Document
                const bookingRef = doc(collection(db, "bookings"));
                newBookingId = bookingRef.id;

                const bookingData = {
                    venueId: selectedVenue,
                    bookingDate: new Date(selectedDate),
                    startHour: minHour,
                    endHour: maxHour + 1,
                    durationHours: duration,
                    userId: "ADMIN_WALK_IN",
                    userName: "Walk-in Customer",
                    userEmail: "admin@manual.booking",
                    status: "confirmed",
                    totalPrice: 0,
                    createdAt: serverTimestamp(),
                    items: [],
                    bookingNumber: `MAN${Date.now()}` // Add booking number for consistency
                };

                transaction.set(bookingRef, bookingData);
            });

            alert(`✅ Slots booked successfully! ID: ${newBookingId}`);
            setSelectedSlots([]);
            // Re-fetch availability to update UI
            window.location.reload();

        } catch (error: any) {

            if (error.message === "NEEDS_REBUILD") {
                console.warn("Availability doc missing. Rebuilding...");
                try {
                    await rebuildAvailability(null, selectedDate); // Pass null for GLOBAL rebuild
                    handleManualBooking(); // Retry recursively once
                } catch (rebuildError) {
                    console.error("System error rebuilding availability:", rebuildError);
                    alert("System error rebuilding availability.");
                }
                return;
            }

            console.error("Error creating booking:", error);
            alert("Failed to book slots: " + error.message);

            if (error.message.includes("fully booked")) {
                window.location.reload();
            }
        } finally {
            setProcessing(false);
        }
    };

    const getTimeLabel = (hour: number) => {
        if (hour === 0) return "12 AM";
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return "12 PM";
        return `${hour - 12} PM`;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-5xl font-black text-slate-900">Manual Booking</h1>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">📅 Book slots for walk-in customers</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-xl h-fit space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Select Venue</label>
                        <select
                            value={selectedVenue}
                            onChange={(e) => setSelectedVenue(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                        >
                            {venues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-500">Selected Slots</span>
                            <span className="text-indigo-600 font-black text-xl">{selectedSlots.length}</span>
                        </div>
                        <button
                            onClick={handleManualBooking}
                            disabled={processing || selectedSlots.length === 0}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {processing ? "Booking..." : "Confirm Booking"}
                        </button>
                    </div>
                </div>

                {/* Time Slots Grid */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 p-8 shadow-xl">
                    <h3 className="text-2xl font-black mb-6">Available Time Slots</h3>

                    {!selectedDate ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <span className="text-4xl mb-4">📅</span>
                            <p className="font-bold">Please select a date to view slots</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-bold">Checking availability...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                                const isBooked = bookedSlots.includes(hour);
                                const isSelected = selectedSlots.includes(hour);

                                return (
                                    <button
                                        key={hour}
                                        onClick={() => toggleSlot(hour)}
                                        disabled={isBooked}
                                        className={`
                                            aspect-square rounded-2xl flex flex-col items-center justify-center transition-all
                                            ${isBooked
                                                ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-50 ring-2 ring-transparent"
                                                : isSelected
                                                    ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-200 scale-105"
                                                    : "bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md hover:ring-2 hover:ring-indigo-100"
                                            }
                                        `}
                                    >
                                        <span className={`text-sm font-black mb-1 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                                            {hour < 12 ? "AM" : "PM"}
                                        </span>
                                        <span className="text-lg font-black leading-none">
                                            {hour === 0 || hour === 12 ? 12 : hour % 12}
                                        </span>
                                        {isBooked && (
                                            <span className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wider">Booked</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
