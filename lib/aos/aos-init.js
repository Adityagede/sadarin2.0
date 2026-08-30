document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS === 'undefined') return;

  AOS.init({
    duration: 650,
    easing: 'ease-out-cubic',
    once: true,
    disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  });
});
