"use client";

import { useState, useEffect } from "react";

interface DealCountdownProps {
    dealEndTime: Date;
    discount: number;
}

export default function DealCountdown({ dealEndTime, discount }: DealCountdownProps) {
    const [countdown, setCountdown] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(dealEndTime).getTime();
            const distance = end - now;

            if (distance < 0) {
                setCountdown("Deal Expired");
                setIsExpired(true);
                clearInterval(timer);
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (days > 0) {
                    setCountdown(`${days}d ${hours}h ${minutes}m`);
                } else if (hours > 0) {
                    setCountdown(`${hours}h ${minutes}m ${seconds}s`);
                } else {
                    setCountdown(`${minutes}m ${seconds}s`);
                }
                setIsExpired(false);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [dealEndTime]);

    if (isExpired) return null;

    return (
        <div className="bg-rose-500 text-white px-6 py-3 rounded-full shadow-lg">
            <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">⏰</span>
                <div>
                    <div className="text-xs font-bold uppercase">Limited Deal -{discount}% OFF</div>
                    <div className="text-lg font-black">{countdown}</div>
                </div>
            </div>
        </div>
    );
}
