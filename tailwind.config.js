/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Branding Clínica
        brand: {
          DEFAULT: '#0D2D6B', // azul principal
          dark: '#0A2356',
          light: '#16468E',   // azul de contraste
          50: '#EAF0FA',
          100: '#D4E0F2',
        },
      },
    },
  },
  plugins: [],
}
