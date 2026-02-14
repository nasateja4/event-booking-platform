import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import PermissionGuard from "@/components/admin/PermissionGuard";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and has admin role
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        redirect("/auth/signin");
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 p-8">
                <PermissionGuard>
                    {children}
                </PermissionGuard>
            </main>
        </div>
    );
}
