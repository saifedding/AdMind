import type { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [require('tailwindcss-animate')],
};

export default config; 