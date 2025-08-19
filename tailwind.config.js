/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      maxWidth: {
        mobile: "390px",
      },
      width: {
        mobile: "390px",
      },
    },
  },
  plugins: [],
};
