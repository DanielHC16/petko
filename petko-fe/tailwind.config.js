/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petko: {
          blue:       '#1A3A8F', // deep navy — primary brand
          'blue-mid': '#2248B3', // mid-tone for hover states
          'blue-dark':'#122A6E', // darkest panel bg
          gold:       '#F5A623', // warm gold/orange accent
          'gold-lt':  '#FBBF40', // lighter gold for hover
          cream:      '#F5EDDB', // warm off-white page background
          red:        '#E63329', // PetKo logo red 'o'
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Nunito"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 8px 40px 0 rgba(26,58,143,0.10)',
        'card-lg': '0 20px 60px 0 rgba(26,58,143,0.15)',
      },
    },
  },
  plugins: [],
}
