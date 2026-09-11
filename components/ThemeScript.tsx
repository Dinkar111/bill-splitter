// Applies a saved theme choice before first paint, so there's no light/dark
// flash. Runs as a plain inline script (no hooks — this renders in <head>
// before hydration).
const SNIPPET = `(function(){try{var t=localStorage.getItem('splittab-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SNIPPET }} />;
}
