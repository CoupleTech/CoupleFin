/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: 'color-mix(in srgb, var(--color-primary) 8%, white)',
          100: 'color-mix(in srgb, var(--color-primary) 15%, white)',
          200: 'color-mix(in srgb, var(--color-primary) 30%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 50%, white)',
          500: 'var(--color-primary)',
          600: 'color-mix(in srgb, var(--color-primary) 90%, black)',
          700: 'color-mix(in srgb, var(--color-primary) 80%, black)',
          800: 'color-mix(in srgb, var(--color-primary) 65%, black)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          400: '#94a3b8',
          600: '#475569',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        surface: 'var(--color-surface)',
        danger: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        info: {
          DEFAULT: '#3b82f6',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-xl)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
      },
    },
  },
  plugins: [],
}
