"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [loading, setLoading] = useState(false);
    console.log("Login page loaded"); // Debug log

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signIn("google", {
                callbackUrl,
                redirect: true,
            });
        } catch (error) {
            console.error("Sign in error:", error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-20 left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Login Card */}
            <div className="relative bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full">
                {/* Logo/Icon */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                        <span className="text-4xl">🎉</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Welcome!</h1>
                    <p className="text-slate-600 font-medium">Sign in to start booking amazing venues</p>
                </div>

                {/* Google Sign-In Button */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span>Continue with Google</span>
                        </>
                    )}
                </button>

                {/* Divider */}
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-slate-400 font-bold">QUICK & SECURE</span>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">✓</span>
                        </div>
                        <span className="font-medium">Instant booking confirmation</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">📅</span>
                        </div>
                        <span className="font-medium">View your booking history</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🎁</span>
                        </div>
                        <span className="font-medium">Exclusive deals & offers</span>
                    </div>
                </div>

                {/* Privacy Note */}
                <p className="text-xs text-slate-400 text-center mt-8">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>

                {/* Back to Home */}
                <div className="mt-6 text-center">
                    <a href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        ← Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
