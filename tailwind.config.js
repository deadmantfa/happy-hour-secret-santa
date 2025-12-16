/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'christmas': ['"Mountains of Christmas"', 'cursive'],
        'body': ['"Quicksand"', 'sans-serif'],
      },
      colors: {
        'holly-green': '#165B33',
        'berry-red': '#BB2528',
        'snow-white': '#F8B229',
        'gold': '#F8B229'
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
