'use client';

import { ThemeProvider } from './ThemeContext';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" defaultAccent="cyan">
      {children}
    </ThemeProvider>
  );
}
