import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './styles/globals.css';
import { Nav } from './_components/Nav';
import { Footer } from './_components/Footer';
import { ThemeWrapper } from './_components/ThemeWrapper';
import { MusicProvider } from './_components/MusicContext';
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
  title: 'Cypher',
  description: 'Cypher ecosystem site',
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
          <MusicProvider>
            <Nav />
            <main id="page-main">
              {children}
              <Footer />
            </main>
          </MusicProvider>
        </ThemeWrapper>
      </body>
    </html>
  );
}
