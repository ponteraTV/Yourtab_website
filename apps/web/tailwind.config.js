/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    // Resolve globs from this config file, not from the shell's working directory.
    relative: true,
    files: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
