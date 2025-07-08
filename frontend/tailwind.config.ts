import type { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/aspect-ratio'),
  ],
};

export default config; 