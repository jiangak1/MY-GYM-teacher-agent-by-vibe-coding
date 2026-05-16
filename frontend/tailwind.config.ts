/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(220 15% 6%)',
        foreground: 'hsl(220 15% 94%)',
        card: 'hsl(220 15% 9% / 0.6)',
        'card-border': 'hsl(220 15% 18% / 0.5)',
        muted: 'hsl(220 15% 40%)',
        'muted-foreground': 'hsl(220 15% 60%)',
        accent: 'hsl(160 60% 50%)',
        'accent-foreground': 'hsl(160 60% 10%)',
        danger: 'hsl(0 70% 55%)',
        warning: 'hsl(40 80% 55%)',
        success: 'hsl(140 50% 50%)',
        info: 'hsl(200 60% 55%)',
        glass: 'hsla(220, 15%, 12%, 0.4)',
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2)',
        glow: '0 0 20px rgba(72, 220, 180, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
