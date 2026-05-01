import { useState, useEffect } from 'react';

function isDarkHour() {
  const h = new Date().getHours();
  return h < 6 || h >= 18; // dark 6pm–6am, light 6am–6pm
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    // Check localStorage override first, else use time
    const saved = localStorage.getItem('ats-theme');
    if (saved === 'dark')  return true;
    if (saved === 'light') return false;
    return isDarkHour();
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

  // Check time every minute and auto-switch (unless manually overridden)
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('ats-theme');
      if (!saved) setDark(isDarkHour()); // only auto-switch if not manually set
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('ats-theme', next ? 'dark' : 'light');
  };

  const resetAuto = () => {
    localStorage.removeItem('ats-theme');
    setDark(isDarkHour());
  };

  return { dark, toggle, resetAuto };
}
