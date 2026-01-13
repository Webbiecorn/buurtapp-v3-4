/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1e40af',
        'brand-secondary': '#1d4ed8',
        'dark-bg': '#111827',
        'dark-surface': '#1f2937',
        'dark-border': '#374151',
        'dark-text-primary': '#f9fafb',
        'dark-text-secondary': '#d1d5db',
      },
    },
  },
  plugins: [],
}
