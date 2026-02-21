'use client';

import { ThemeProvider } from '@cypher-asi/zui';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" defaultAccent="cyan">
      {children}
    </ThemeProvider>
  );
}
