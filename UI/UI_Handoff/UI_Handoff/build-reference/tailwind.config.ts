import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { forest: '#051C12', lime: '#B4F105' } } },
  plugins: [],
};
export default config;
