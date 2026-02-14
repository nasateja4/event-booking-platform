import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

/**
 * Rebuilds the booking_availability document for GLOBAL capacity
 * based on ALL bookings in the 'bookings' collection for a specific date.
 * This aggregates usage across ALL venues.
 */
export const rebuildAvailability = async (venueId: string | null, dateStr: string) => {
    // Note: venueId param is kept for compatibility but ignored for the query
    console.log(`[rebuildAvailability] Rebuilding GLOBAL availability for ${dateStr}...`);

    // Parse Date Range (Local Date String to Start/End of Day)
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // Query ALL confirmed bookings for this date (Global)
    const q = query(
        collection(db, "bookings"),
        where("bookingDate", ">=", startOfDay),
        where("bookingDate", "<=", endOfDay)
    );

    const snapshot = await getDocs(q);
    const slots: { [key: number]: number } = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        // The status check is now in the query, so this line is effectively redundant
        // if (data.status === "cancelled") return;

        const start = parseInt(String(data.startHour));
        const end = parseInt(String(data.endHour));
        const duration = data.durationHours ? parseInt(String(data.durationHours)) : (end - start);

        if (isNaN(start) || isNaN(duration)) return;

        for (let i = 0; i < duration; i++) {
            const hour = start + i;
            slots[hour] = (slots[hour] || 0) + 1;
        }
    });

    // Write to GLOBAL availability collection
    // Key: GLOBAL_YYYY-MM-DD
    await setDoc(doc(db, "booking_availability", `GLOBAL_${dateStr}`), {
        venueId: "GLOBAL",
        date: dateStr,
        slots,
        totalBookings: Object.values(slots).reduce((a, b) => a + b, 0),
        lastUpdated: serverTimestamp()
    });

    console.log(`[rebuildAvailability] Global Rebuild complete. Slots:`, slots);
    return slots;
};
