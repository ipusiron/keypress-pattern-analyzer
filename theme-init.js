'use strict';
// Runs before CSS to avoid a flash of the opposite theme. Storage is optional.
(function () {
  let theme;
  try { theme = localStorage.getItem('theme'); } catch { /* Use the OS preference. */ }
  const light = theme === 'light' || (theme !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.classList.toggle('light-mode', light);
})();
