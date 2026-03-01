import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

const ThemeToggle = ({ className = '', size = 'md' }: ThemeToggleProps) => {
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    // Default to dark mode for Sinuzoid
    const saved = localStorage.getItem('darkMode');
    const isDark = saved !== null ? saved === 'true' : true;
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const sz = size === 'sm' ? 15 : 17;

  return (
    <button
      onClick={toggle}
      className={`sz-btn sz-btn-icon ${className}`}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ width: size === 'sm' ? 32 : 36, height: size === 'sm' ? 32 : 36 }}
    >
      {darkMode
        ? <FiSun size={sz} style={{ color: '#ff9f0a' }} />
        : <FiMoon size={sz} style={{ color: 'var(--accent)' }} />
      }
    </button>
  );
};

export default ThemeToggle;
