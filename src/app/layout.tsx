import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import './styles/globals.css';
import '@/sites/zode/zode.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { MusicProvider } from '@/components/MusicContext';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { getCurrentCompany } from '@/lib/companies/current';
import { brandNavParams, parentColophonParams } from '@/lib/companies/resolve';
import { fontVariables } from '@/lib/fonts';
import { ZodeShell } from '@/sites/zode/ZodeShell';
import { ZodeGate } from '@/sites/zode/ZodeGate';
import { themeInitScript } from '@/sites/zode/lib/theme/theme-script';
import { Providers } from './providers';
import WilderShoppingNav from '@/sites/wilderworld/marketplace/WilderShoppingNav';
import StorePageTransition from '@/sites/wilderworld/marketplace/StorePageTransition';

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCurrentCompany();
  return {
    title: company.metadata.title,
    description: company.metadata.description,
    icons: { icon: `/brand-favicon?company=${company.key}` },
    ...(company.metadata.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCurrentCompany();
  const h = await headers();
  // Hosted flows meant for an embedded browser (e.g. the wallet-link page a
  // native client loads) render standalone, without the site nav/footer. Scoped
  // to the flow itself — the `/link-wallet-test` probe keeps the normal chrome.
  const path = h.get('x-pathname') ?? '';
  const isChromeless = path === '/link-wallet' || path.startsWith('/link-wallet/');
  const { homeHref, brandParam } = brandNavParams(company.key, h.get('host'));
  const parentColophon = company.footer.parentCompany
    ? parentColophonParams(company.footer.parentCompany.href, h.get('host'))
    : null;

  // Remap the semantic font tokens to the active brand's typeface. Omitted
  // fields keep the Inter defaults from globals.css.
  const fontStyle: CSSProperties = {};
  if (company.fonts?.sans) {
    (fontStyle as Record<string, string>)['--font-sans'] = company.fonts.sans;
  }
  if (company.fonts?.display) {
    (fontStyle as Record<string, string>)['--font-display'] = company.fonts.display;
  }
  if (company.key === 'wilderworld') {
    // The brand nav is not rendered for wilderworld (the marketplace supplies its
    // own header), so collapse the space normally reserved for the fixed nav.
    (fontStyle as Record<string, string>)['--nav-height'] = '0px';
    (fontStyle as Record<string, string>)['--site-nav-offset'] = '0px';
  }

  /* Chromeless routes render standalone (no nav/footer/scrollbar) — the page
     owns its full-screen layout. Font variables stay attached so the page can
     use the brand typeface; the page supplies its own background. */
  if (isChromeless) {
    return (
      <html lang="en" suppressHydrationWarning className={fontVariables} style={fontStyle}>
        <body data-company={company.key} style={{ background: '#000' }}>
          <Providers company={company.key}>{children}</Providers>
        </body>
      </html>
    );
  }

  /* Brands with custom chrome (currently only zode) skip the shared
     Nav/Footer/scrollbar and theme system entirely: the brand's own shell
     supplies its chrome, theming, and scroll containers. */
  if (company.customChrome) {
    return (
      <html lang="en" suppressHydrationWarning className={fontVariables}>
        <head>
          {/* Applies the persisted zode theme before first paint. */}
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body data-company={company.key}>
          <Providers company={company.key}>
            <ZodeGate>
              <ZodeShell>{children}</ZodeShell>
            </ZodeGate>
          </Providers>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontVariables}
      style={fontStyle}
    >
      <body data-company={company.key}>
        {/* Capture the outgoing product before the router restores a history entry.
            Installed as early as the body parses so the popstate listener is live
            before the first Back. Static string, no interpolation. Wilderworld only. */}
        {company.key === 'wilderworld' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `if(!window.__wwHistoryBridgeInstalled){window.__wwHistoryBridgeInstalled=true;window.addEventListener('popstate',function(event){window.__wwHandlePopstate?.(event);},true);}`,
            }}
          />
        )}
        <Providers company={company.key}>
          <ThemeWrapper
            defaultTheme={company.defaultTheme}
            defaultAccent={company.accent}
            storageKey={`zui-theme-${company.key}`}
          >
            <MusicProvider>
              {/* Wilderworld renders the marketplace shopping header in place of the
                  shared brand nav. WilderShoppingNav self-guards via
                  hasPageShoppingNavigation: it renders nothing on pages that already
                  show their own header (so no double) and renders the header on pages
                  that don't (e.g. /discover, /city). A store page transition replaces
                  the custom scrollbar. Other brands keep the standard chrome. */}
              {company.key === 'wilderworld' ? <StorePageTransition /> : <CustomScrollbar />}
              {company.key === 'wilderworld' ? (
                <WilderShoppingNav />
              ) : (
                <Nav
                  wordmark={company.wordmark}
                  wordmarkLogo={company.wordmarkLogo}
                  cta={company.cta}
                  sections={company.nav}
                  navStyle={company.navStyle}
                  pageSections={company.pageSections}
                  homeHref={homeHref}
                  brandParam={brandParam}
                />
              )}
              <main id="page-main">
                {children}
                <Footer
                  footer={company.footer}
                  brandParam={brandParam}
                  parentColophon={parentColophon}
                />
              </main>
            </MusicProvider>
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
