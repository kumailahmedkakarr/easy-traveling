// Tailwind (CDN) theme. Must load right after the Tailwind script.
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: { sans: ['Inter', 'sans-serif'] },
        colors: {
          brand: { 50: '#EAF4FF', 100: '#D3E8FF', 500: '#0A84F0', 600: '#0868C8', 700: '#064F9C' },
          ink: { DEFAULT: '#0A2540', soft: '#475569' },
        },
        boxShadow: { card: '0 6px 20px -6px rgba(10,37,64,.15)' },
      },
    },
  };
}
