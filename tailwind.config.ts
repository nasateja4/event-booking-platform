import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
            animation: {
                'infinite-scroll': 'infinite-scroll 25s linear infinite',
                'infinite-scroll-reverse': 'infinite-scroll-reverse 25s linear infinite',
            },
            keyframes: {
                'infinite-scroll': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-100%)' },
                },
                'infinite-scroll-reverse': {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(0)' },
                }
            }
        },
    },
    plugins: [],
};
export default config;
