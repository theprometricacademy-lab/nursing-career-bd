import type { Config } from 'tailwindcss';

// Palette: light blue (main), mint green (success / start), pink (premium / review)
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff', 100: '#dbeefe', 200: '#bfe2fd', 300: '#93cffb', 400: '#5fb4f6',
          500: '#3a98ee', 600: '#1f7ad6', 700: '#1a63b0', 800: '#1b528f', 900: '#0f2a4a',
        },
        mint: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
          500: '#10b981', 600: '#059669', 700: '#047857',
        },
        blush: {
          50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6',
          500: '#ec4899', 600: '#db2777', 700: '#be185d',
        },
        ink: { DEFAULT: '#0f2a4a', soft: '#4a6380' },
        // premium members' accent
        gold: {
          50: '#fdf8ec', 100: '#f9edcc', 200: '#f1d999', 300: '#e7c166', 400: '#d9a73f',
          500: '#c58b25', 600: '#a46e1b', 700: '#7f5418', 800: '#5c3d14', 900: '#3d2810',
        },
      },
      fontFamily: { sans: ['var(--font-bn)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,42,74,.06), 0 4px 16px rgba(15,42,74,.06)' },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: { rise: 'rise .35s ease-out both', marquee: 'marquee 30s linear infinite' },
    },
  },
  plugins: [],
};
export default config;
