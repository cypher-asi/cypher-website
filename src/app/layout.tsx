import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@cypher-asi/zui/styles';
import './styles/globals.css';
import { Nav } from './_components/Nav';
import { ThemeWrapper } from './_components/ThemeWrapper';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cypher Web',
  description: 'Cypher ecosystem site — powered by ZUI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeWrapper>
          <Nav />
          <main>{children}</main>
        </ThemeWrapper>
      </body>
    </html>
  );
}
