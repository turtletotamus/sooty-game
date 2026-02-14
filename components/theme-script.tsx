import React from "react";

// Sets initial theme class before hydration to avoid flash.
export function ThemeScript() {
  const code = `
(function () {
  try {
    var stored = localStorage.getItem('theme'); // 'light' | 'dark' | null
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var useDark = stored ? stored === 'dark' : prefersDark;
    var root = document.documentElement;
    if (useDark) root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = useDark ? 'dark' : 'light';
  } catch (e) {}
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

