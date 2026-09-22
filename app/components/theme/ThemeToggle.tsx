"use client";

import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ vi = false }: { vi?: boolean }) {
  const label = vi ? 'Chuyển giao diện sáng / tối' : 'Toggle light / dark appearance';
  return <button type="button" className="ui-theme-toggle" aria-label={label} title={label} onClick={() => {
    const next = document.documentElement.dataset.uiTheme === 'light' ? 'dark' : 'light';
    window.dispatchEvent(new CustomEvent('banmao-ui-theme', { detail: next }));
  }}>
    <Sun className="ui-theme-sun" size={20} aria-hidden="true" />
    <Moon className="ui-theme-moon" size={20} aria-hidden="true" />
  </button>;
}
