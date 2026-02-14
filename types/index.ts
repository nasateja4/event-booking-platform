// Firebase Admin SDK types
export interface FirebaseUser {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    role?: "admin" | "super_admin" | "customer";
    permissions?: string[]; // List of allowed sidebar items e.g., ['dashboard', 'bookings']
    phoneNumber?: string;
    createdAt: Date;
}

// Team Member (Separate from User)
export interface TeamMember {
    id: string; // Document ID (auto-generated or same as uid)
    uid: string; // Reference to FirebaseUser.uid
    email: string;
    name: string;
    role: "admin" | "super_admin";
    permissions: string[];
    createdAt: Date;
    photoURL?: string;
    addedBy?: string; // Email of super admin who added them
}

// Settings
export interface AppSettings {
    numberOfRooms: number;
    bufferTimeMinutes: number;
    businessHours: {
        startTime: string;
        endTime: string;
    };
    contact: {
        phone: string;
        email: string;
        address: string;
        mapUrl: string;
    };
    aboutSection: string;
    customCardEnabled: boolean;
    customCardContent: string;
}

// Inventory
export type InventoryType = "simple" | "main" | "sub";

export interface SimpleInventoryItem {
    id: string;
    type: "simple";
    name: string; // Changed from productName to match InventoryPage
    cost: number;
    discount: number;
    finalCost?: number; // Calculated field, might not be in DB
    extraUnitsEnabled: boolean;
    extraUnitCost?: number;
    description: string;
    imageType: "upload" | "url";
    imageUrl?: string;
    showInStore: boolean;
    createdAt: any; // Firestore Timestamp or Date
    updatedAt?: any;
}

export interface MainProduct {
    id: string;
    type: "main";
    mainName: string;
    createdAt: any;
}

export interface SubProduct {
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
    showInStore?: boolean; // Add this for store visibility
    createdAt: any;
}

export type InventoryItem = SimpleInventoryItem | MainProduct | SubProduct;

// Venue
export interface PackageItem {
    inventoryId: string;
    inventoryName: string;
    inventoryType: "simple" | "main"; // simple or hierarchical main
    quantity: number;
    isCustomizable: boolean; // For cake/decorations - user can select variants
}

export interface AdditionalItem {
    inventoryId: string;
    inventoryName: string;
    inventoryType: "simple" | "sub"; // For pricing
    price: number;
    available: boolean;
    // For hierarchical items - store sub-product info
    mainProductId?: string;
    mainProductName?: string;
}

export interface Venue {
    id: string;
    name: string;
    description: string;

    // Publishing
    isPublished: boolean;

    // Deal Management
    dealEnabled: boolean;
    dealEndTime?: Date;
    discount: number; // Percentage discount on base price + package

    // Media
    imageType: "upload" | "url";
    imageUrl: string;

    // Pricing
    basePrice: number;
    additionalHourCost: number; // Cost per additional hour beyond standard booking

    // Availability


    // Package Items (Fixed by Admin - Display Only)
    packageItems: PackageItem[];

    // Additional Items (User Can Add Extra) - NOT included in discount
    additionalItems: AdditionalItem[];

    // Amenities (existing field for display)
    amenities?: string[];
    capacity?: number;

    // Status (for backwards compatibility)
    status?: "active" | "inactive";

    createdAt: Date;
    updatedAt?: Date;
}

// Booking
export interface SelectedPackageVariant {
    inventoryId: string;
    inventoryName: string;
    variantId: string; // For hierarchical items - the sub-product ID
    variantName: string;
}

export interface SelectedAdditionalItem {
    inventoryId: string;
    itemName: string;
    itemType: "simple" | "sub";
    quantity: number;
    unitCost: number;
    totalCost: number;
}

export type PaymentMethod = "COD" | "UPI" | "CARD";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
    id: string;
    bookingNumber: string;

    // User Info
    userId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;

    // Venue Info
    venueId: string;
    venueName: string;

    // Date & Time
    bookingDate: Date; // The selected date
    startHour: number; // Starting hour (0-23)
    endHour: number; // Ending hour (1-24)
    durationHours: number; // Total hours
    additionalHours: number; // Extra hours beyond standard

    // Selected Items
    selectedPackageVariants: SelectedPackageVariant[]; // For customizable items like cake
    selectedAdditionalItems: SelectedAdditionalItem[];

    // Pricing Breakdown
    basePrice: number; // Venue base price
    packageDiscount: number; // Discount % applied to base + package
    discountAmount: number; // Actual discount amount in currency
    additionalItemsTotal: number; // Total of additional items (NO discount)
    additionalHoursCost: number; // Cost for extra hours
    subtotal: number; // Before coupon
    couponCode?: string;
    couponDiscount: number; // Coupon discount amount
    finalTotal: number; // Final amount to pay

    // Payment
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;

    // Status & Metadata
    bookedBy: "customer" | "admin";
    status: BookingStatus;
    notes?: string;
    createdAt: Date;
    updatedAt?: Date;
}

// Time Slot Availability Tracking
export interface TimeSlotAvailability {
    id: string;
    venueId: string;
    date: string; // YYYY-MM-DD format
    slots: {
        hour: number; // 0-23
        bookedCount: number; // Current number of bookings
        maxCapacity: number; // = venue.numberOfRooms
        isAvailable: boolean; // Helper field
    }[];
    lastUpdated: Date;
}

// Coupon
export interface Coupon {
    id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    published: boolean;
    dealEnabled: boolean;
    expiryDate?: Date;
    usageLimit?: number;
    usedCount: number;
    applicableVenueIds?: string[]; // Array of venue IDs this coupon applies to
    createdAt: Date;
}

// Review
export interface Review {
    id: string;
    userId?: string; // Optional for admin-created reviews
    customerName: string;
    customerImage?: string; // For avatar
    rating: number;
    reviewText: string;
    venueId?: string; // Optional if global review, but usually specific
    venueName: string;
    status: "pending" | "approved" | "rejected";
    approved: boolean; // Keep for backward compatibility or map to status
    displayOrder?: number;
    createdAt: Date;
    // Legacy fields for backward compatibility
    comment?: string;
    date?: string;
}
