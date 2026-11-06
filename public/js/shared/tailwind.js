// Tailwind (CDN) theme: the original Ease Traveling colours. Must load right after the Tailwind script.
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: { sans: ['Inter', 'sans-serif'] },
        colors: {
          navy: { DEFAULT: '#06264A', dark: '#071D36', light: '#0A3362' },
          brand: { 50: '#EAF5FF', 100: '#D6ECFF', 500: '#0099F7', 600: '#0086DB', 700: '#0A5FA5', bright: '#25B5FF', cyan: '#6AD0FF' },
          ink: { DEFAULT: '#06264A', soft: '#475569' },
        },
        boxShadow: {
          card: '0 10px 25px -5px rgba(6,38,74,.08), 0 8px 10px -6px rgba(6,38,74,.04)',
          floating: '0 20px 35px -10px rgba(6,38,74,.18)',
        },
      },
    },
  };
}
