import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('server-only', () => ({}));

/** The preview cookie this request carries, or none. */
let previewCookie: string | undefined;

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (previewCookie === undefined ? undefined : { value: previewCookie }),
  }),
}));

import VehiclesLayout from './layout';

/** The layout is an async server component, so await it and render the result. */
async function renderGate() {
  render(await VehiclesLayout({ children: <div>funnel</div> }));
}

const expectGated = () => {
  expect(screen.queryByText('funnel')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
};

const expectOpen = () => {
  expect(screen.getByText('funnel')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /coming soon/i })).not.toBeInTheDocument();
};

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  previewCookie = undefined;
});

describe('vehicles launch gate', () => {
  it('renders the coming-soon teaser when VEHICLES_LIVE is unset', async () => {
    await renderGate();
    expectGated();
  });

  it('gates the funnel unless the flag is exactly "true"', async () => {
    vi.stubEnv('VEHICLES_LIVE', 'TRUE'); // only the exact string "true" opens it
    await renderGate();
    expectGated();
  });

  it('renders the funnel when VEHICLES_LIVE=true', async () => {
    vi.stubEnv('VEHICLES_LIVE', 'true');
    await renderGate();
    expectOpen();
  });
});

describe('vehicles preview access', () => {
  it('opens the funnel for a browser carrying the preview token', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    previewCookie = 's3cret-token';
    await renderGate();
    expectOpen();
  });

  it('stays gated when the cookie holds the wrong token', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    previewCookie = 'wrong-token';
    await renderGate();
    expectGated();
  });

  it('stays gated when no preview token is configured, cookie or not', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', '');
    previewCookie = 'anything';
    await renderGate();
    expectGated();
  });
});
