import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // FICSIT-inspired industrial palette w/ orange accent
        ficsit: {
          bg: '#0d1117',
          panel: '#161b22',
          panel2: '#1c232c',
          border: '#262d36',
          text: '#e6edf3',
          subtle: '#8b949e',
          accent: '#f97316', // orange-500
          accent2: '#fb923c',
          good: '#22c55e',
          warn: '#eab308',
          bad: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
