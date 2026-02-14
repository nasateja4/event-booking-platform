import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/shared/AuthProvider";

export const metadata: Metadata = {
    title: "Event Booking Platform",
    description: "Book your special events like birthdays, anniversaries, proposals, and more!",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
