import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEpicLinkStatus } from './useEpicLinkStatus';

const epic = { providerName: 'epic-games', providerId: 'p1', handle: 'player1' };
const other = { providerName: 'x-twitter', providerId: 'p2', handle: 'someone' };

const respondWith = (accounts: unknown[], ok = true) =>
  vi.fn(
    async () =>
      new Response(ok ? JSON.stringify({ accounts }) : '{}', { status: ok ? 200 : 502 }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('useEpicLinkStatus', () => {
  it('starts out unknown so nothing renders before the answer arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const { result } = renderHook(() => useEpicLinkStatus());

    expect(result.current.status.kind).toBe('checking');
  });

  it('reports the connected Epic account and its handle', async () => {
    vi.stubGlobal('fetch', respondWith([epic]));

    const { result } = renderHook(() => useEpicLinkStatus());

    await waitFor(() => expect(result.current.status.kind).toBe('linked'));
    expect(result.current.status).toEqual({ kind: 'linked', handle: 'player1' });
  });

  it('ignores providers other than Epic', async () => {
    vi.stubGlobal('fetch', respondWith([other]));

    const { result } = renderHook(() => useEpicLinkStatus());

    await waitFor(() => expect(result.current.status.kind).toBe('unlinked'));
  });

  it('reports unavailable rather than unlinked when the check fails', async () => {
    // The difference matters: callers stay silent on unavailable, because
    // guessing "not connected" talks to people about a problem they do not have.
    vi.stubGlobal('fetch', respondWith([], false));

    const { result } = renderHook(() => useEpicLinkStatus());

    await waitFor(() => expect(result.current.status.kind).toBe('unavailable'));
  });

  it('picks up a link made since the first check', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [epic] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEpicLinkStatus());
    await waitFor(() => expect(result.current.status.kind).toBe('unlinked'));

    await result.current.refresh();

    await waitFor(() => expect(result.current.status.kind).toBe('linked'));
  });
});
