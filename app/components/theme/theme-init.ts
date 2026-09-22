// Runs in the document head before paint; independent of NFT/game themes.
export const themeInitScript = `(()=>{
  let preference = null;
  try { const value = localStorage.getItem('banmao-ui-theme'); if(value === 'light' || value === 'dark') preference = value; } catch {}
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => { document.documentElement.dataset.uiTheme = preference || (media.matches ? 'dark' : 'light'); };
  window.addEventListener('banmao-ui-theme', event => {
    const value = event.detail;
    preference = value === 'light' || value === 'dark' ? value : null;
    try { if(preference) localStorage.setItem('banmao-ui-theme', preference); else localStorage.removeItem('banmao-ui-theme'); } catch {}
    apply();
  });
  window.addEventListener('storage', event => {
    if(event.key !== 'banmao-ui-theme' && event.key !== null) return;
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
    apply();
  });
  media.addEventListener('change', apply);
  apply();
})();`;
