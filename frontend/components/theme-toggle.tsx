'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme-context';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-black/[.08] bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#23262c]/90 ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      <button
        type="button"
        aria-label="Switch to light mode"
        onClick={() => setTheme('light')}
        className={`rounded-full p-2 transition-colors ${
          theme === 'light'
            ? 'bg-[#f0f1f3] text-[#202329] dark:bg-white/10'
            : 'text-[#9297a2] hover:text-[#202329] dark:hover:text-white'
        }`}
      >
        <Sun size={15} />
      </button>
      <button
        type="button"
        aria-label="Switch to dark mode"
        onClick={() => setTheme('dark')}
        className={`rounded-full p-2 transition-colors ${
          theme === 'dark'
            ? 'bg-[#343942] text-white'
            : 'text-[#9297a2] hover:text-[#202329] dark:hover:text-white'
        }`}
      >
        <Moon size={15} />
      </button>
    </div>
  );
}
