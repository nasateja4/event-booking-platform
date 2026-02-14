"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { TeamMember, FirebaseUser } from "@/types";

const PERMISSION_OPTIONS = [
    { key: "dashboard", label: "Dashboard", emoji: "📊" },
    { key: "inventory", label: "Inventory", emoji: "📦" },
    { key: "venues", label: "Venues", emoji: "🏛️" },
    { key: "store", label: "Store", emoji: "🛍️" },
    { key: "timeslots", label: "Time Slots", emoji: "⏰" },
    { key: "coupons", label: "Coupons", emoji: "🎫" },
    { key: "bookings", label: "Bookings", emoji: "📋" },
    { key: "reviews", label: "Reviews", emoji: "⭐" },
    { key: "settings", label: "Settings", emoji: "⚙️" },
    { key: "users", label: "Users", emoji: "👥" },
    { key: "team", label: "Team Management", emoji: "🛡️" },
];

export default function TeamManagementPage() {
    const { data: session } = useSession();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [migrating, setMigrating] = useState(false);

    // Fetch Team Members
    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const handleMigrate = async () => {
        if (!confirm("This will scan for existing 'admin' or 'super_admin' users in the Users collection and add them to this new Team list if they are missing. Continue?")) return;

        setMigrating(true);
        try {
            // 1. Fetch all admins from Users collection
            // Firestore 'in' query supports up to 10 values
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("role", "in", ["admin", "super_admin"]));
            const userSnaps = await getDocs(q);

            if (userSnaps.empty) {
                alert("No legacy admins found in Users collection.");
                return;
            }

            let addedCount = 0;
            const teamRef = collection(db, "team_members");

            // 2. Iterate and check/add
            for (const userDoc of userSnaps.docs) {
                const userData = userDoc.data() as FirebaseUser;

                // Check if already exists in team_members by UID
                const teamQ = query(teamRef, where("uid", "==", userData.uid));
                const teamSnap = await getDocs(teamQ);

                if (teamSnap.empty) {
                    // Add to team_members
                    const newMember: Omit<TeamMember, "id"> = {
                        uid: userData.uid,
                        email: userData.email,
                        name: userData.name,
                        role: userData.role as "admin" | "super_admin",
                        permissions: userData.permissions || [],
                        photoURL: userData.photoURL,
                        createdAt: new Date(),
                        addedBy: "system_migration"
                    };

                    await addDoc(teamRef, {
                        ...newMember,
                        createdAt: serverTimestamp()
                    });
                    addedCount++;
                }
            }

            alert(`Migration complete! Added ${addedCount} new team members from legacy user data.`);
            fetchTeamMembers();

        } catch (error) {
            console.error("Migration failed:", error);
            alert("Migration failed. Check console.");
        } finally {
            setMigrating(false);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            // Fetch from new 'team_members' collection
            const q = query(collection(db, "team_members"));
            const snapshot = await getDocs(q);
            const members = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TeamMember[];
            setTeamMembers(members);
        } catch (error) {
            console.error("Error fetching team:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle Invite / Update
    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingMember) {
                // Update existing team member permissions
                await updateDoc(doc(db, "team_members", editingMember.id), {
                    permissions: selectedPermissions,
                });
                alert("Permissions updated!");
            } else {
                // Invite logic: Add to team_members collection
                // 1. Verify user exists in 'users' collection first (optional but good practice)
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", inviteEmail));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    alert("User not found! Please ask them to log in once first so their account is created.");
                    setIsSubmitting(false);
                    return;
                }

                const userDoc = snapshot.docs[0];
                const userData = userDoc.data() as FirebaseUser;

                // 2. Check if already in team
                const teamRef = collection(db, "team_members");
                const teamQ = query(teamRef, where("uid", "==", userData.uid));
                const teamSnap = await getDocs(teamQ);

                if (!teamSnap.empty) {
                    alert("User is already a team member!");
                    setIsSubmitting(false);
                    return;
                }

                // 3. Create Team Member Document
                const newMember: Omit<TeamMember, "id"> = {
                    uid: userData.uid,
                    email: userData.email,
                    name: userData.name,
                    role: "admin", // Default role
                    permissions: selectedPermissions,
                    photoURL: userData.photoURL,
                    createdAt: new Date(), // Client side date for now, ideally serverTimestamp
                    addedBy: session?.user?.email || "unknown"
                };

                await addDoc(collection(db, "team_members"), {
                    ...newMember,
                    createdAt: serverTimestamp()
                });

                alert("Team member added successfully!");
            }

            setInviteEmail("");
            setSelectedPermissions([]);
            setEditingMember(null);
            fetchTeamMembers();

        } catch (error) {
            console.error("Error saving member:", error);
            alert("Failed to save. check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAccess = async (memberId: string) => {
        if (!confirm("Are you sure? This user will lose admin access.")) return;
        try {
            await deleteDoc(doc(db, "team_members", memberId));
            fetchTeamMembers();
        } catch (error) {
            console.error(error);
            alert("Failed to remove member.");
        }
    };

    // Toggle Permission
    const togglePermission = (key: string) => {
        if (selectedPermissions.includes(key)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== key));
        } else {
            setSelectedPermissions([...selectedPermissions, key]);
        }
    };

    // Pre-fill for editing
    const startEdit = (member: TeamMember) => {
        setEditingMember(member);
        setInviteEmail(member.email); // Just for display if needed
        setSelectedPermissions(member.permissions || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Only Super Admin can access this page (Handled by PermissionGuard now)
    // Removed stale session check to allow fresh super admins access


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Team Management</h1>
                <p className="text-slate-500 mt-2">Manage admin access and permissions.</p>
                <button
                    onClick={handleMigrate}
                    disabled={migrating}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50"
                >
                    {migrating ? "Migrating..." : "⚙️ Migrate Legacy Admins"}
                </button>
            </div>

            {/* Invite/Edit Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 mb-6">
                    {editingMember ? `Edit Permissions: ${editingMember.name}` : "Add New Team Member"}
                </h2>

                <form onSubmit={handleSaveMember} className="space-y-6">
                    {!editingMember && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">User Email</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Enter email address of existing user"
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-indigo-500 focus:outline-none"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Note: The user must have logged in at least once via Google to be found.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-4">Assign Permissions</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {PERMISSION_OPTIONS.map((perm) => (
                                <button
                                    key={perm.key}
                                    type="button"
                                    onClick={() => togglePermission(perm.key)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedPermissions.includes(perm.key)
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                        : "border-slate-200 hover:border-indigo-200 text-slate-600"
                                        }`}
                                >
                                    <span className="text-2xl">{perm.emoji}</span>
                                    <span className="font-bold text-sm">{perm.label}</span>
                                    {selectedPermissions.includes(perm.key) && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedPermissions(PERMISSION_OPTIONS.map(p => p.key))}
                                className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                                Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                type="button"
                                onClick={() => setSelectedPermissions([])}
                                className="text-xs font-bold text-slate-500 hover:underline"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : (editingMember ? "Update Permissions" : "Add Member")}
                        </button>
                        {editingMember && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingMember(null);
                                    setInviteEmail("");
                                    setSelectedPermissions([]);
                                }}
                                className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Team List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teamMembers.map((member) => (
                    <div key={member.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            {member.photoURL ? (
                                <img src={member.photoURL} alt={member.name} className="w-12 h-12 rounded-full ring-2 ring-indigo-50" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                                    {member.name?.[0] || "U"}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-slate-900">{member.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${member.role === 'super_admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                    }`}>
                                    {member.role}
                                </span>
                            </div>
                        </div>

                        {member.role !== 'super_admin' && (
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Access</p>
                                <div className="flex flex-wrap gap-2">
                                    {member.permissions?.slice(0, 5).map(p => (
                                        <span key={p} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                                            {PERMISSION_OPTIONS.find(opt => opt.key === p)?.label || p}
                                        </span>
                                    ))}
                                    {(member.permissions?.length || 0) > 5 && (
                                        <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                                            +{(member.permissions?.length || 0) - 5} more
                                        </span>
                                    )}
                                    {(!member.permissions || member.permissions.length === 0) && (
                                        <span className="text-xs text-slate-400 italic">No specific permissions</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {member.role !== 'super_admin' && (
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <button
                                    onClick={() => startEdit(member)}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    Edit Access
                                </button>
                                <button
                                    onClick={() => handleRemoveAccess(member.id)}
                                    className="text-sm font-bold text-rose-500 hover:text-rose-700"
                                >
                                    Remove Admin
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
