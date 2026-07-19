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
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        border: {
          DEFAULT: '#E5E7EB',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        }
      },
      borderRadius: {
        'dds': '16px',
        'dds-inner': '12px'
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'premium': '0 10px 40px rgba(0, 0, 0, 0.06)',
        'input-focus': '0 0 0 4px rgba(37, 99, 235, 0.12)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
