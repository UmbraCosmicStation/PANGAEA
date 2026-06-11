/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ocean: {
                    900: '#0F2027',
                    800: '#203A43',
                    700: '#2C5364',
                },
                aurora: '#00F260',
                magma: '#FF416C',
                coral: '#0575E6',
            }
        },
    },
    plugins: [],
}
