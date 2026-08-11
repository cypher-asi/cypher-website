import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import VehiclesLayout from './layout';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('vehicles launch gate', () => {
  it('renders the coming-soon teaser when VEHICLES_LIVE is unset', () => {
    render(
      <VehiclesLayout>
        <div>funnel</div>
      </VehiclesLayout>,
    );
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
    expect(screen.queryByText('funnel')).not.toBeInTheDocument();
  });

  it('gates the funnel unless the flag is exactly "true"', () => {
    vi.stubEnv('VEHICLES_LIVE', 'TRUE'); // only the exact string "true" opens it
    render(
      <VehiclesLayout>
        <div>funnel</div>
      </VehiclesLayout>,
    );
    expect(screen.queryByText('funnel')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  });

  it('renders the funnel when VEHICLES_LIVE=true', () => {
    vi.stubEnv('VEHICLES_LIVE', 'true');
    render(
      <VehiclesLayout>
        <div>funnel</div>
      </VehiclesLayout>,
    );
    expect(screen.getByText('funnel')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /coming soon/i })).not.toBeInTheDocument();
  });
});
