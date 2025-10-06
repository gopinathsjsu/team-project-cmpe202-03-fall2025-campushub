/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                "sjsu-blue": "#0055A2",
                "sjsu-gold": "#E5A823",
                "sjsu-dark-blue": "#003366",
                "sjsu-light-blue": "#336699",
                "sjsu-dark-gold": "#CC9900",
                "sjsu-light-gold": "#F4D03F",
                primary: {
                    50: "#e6f3ff",
                    100: "#b3d9ff",
                    200: "#80bfff",
                    300: "#4da6ff",
                    400: "#1a8cff",
                    500: "#0055A2",
                    600: "#004080",
                    700: "#003366",
                    800: "#002654",
                    900: "#001a42",
                },
                accent: {
                    50: "#fefbf0",
                    100: "#fdf4d1",
                    200: "#fbedb3",
                    300: "#f9e594",
                    400: "#f7de76",
                    500: "#E5A823",
                    600: "#CC9900",
                    700: "#b8850f",
                    800: "#a3710c",
                    900: "#8f5d0a",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};
