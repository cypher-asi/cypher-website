'use client';

/**
 * Standalone WalletConnect probe for an embedded browser / webview.
 *
 * Some embedded browsers have no injected wallet extension, so an external
 * wallet can only connect via WalletConnect, which opens a websocket to a relay
 * and renders a QR the user scans with a phone wallet. Ordinary OAuth redirects
 * do not exercise that websocket path, so this page isolates it: open it in the
 * target browser, tap Connect, scan the QR, and confirm an address comes back.
 * It pins the WalletConnect connector only, so the modal goes straight to the QR
 * with no injected option such a browser would lack.
 *
 * Throwaway verification artifact, not part of any real flow. Remove once the
 * target browser is confirmed to support WalletConnect.
 */
import { useState } from 'react';
import { useConnectModal } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { MarketWeb3Provider } from '../market/MarketWeb3Provider';
import { thirdwebClient } from '../market/lib/thirdwebClient';

function WalletConnectProbe() {
  const { connect } = useConnectModal();
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    if (!thirdwebClient) return;
    setError(null);
    setConnecting(true);
    try {
      const wallet = await connect({
        client: thirdwebClient,
        setActive: false,
        // Pin WalletConnect only — the embedded browser has no injected wallet,
        // so this is the sole viable connector and the exact path we're probing.
        wallets: [createWallet('walletConnect')],
      });
      const account = wallet.getAccount();
      setAddress(account?.address ?? null);
      if (!account) setError('Connected, but no account was returned.');
    } catch (err) {
      // A thrown error here usually means the user dismissed the modal, but in
      // an embedded browser it can also mean the relay websocket never opened,
      // so show it verbatim to keep the probe result legible to whoever runs it.
      setError(err instanceof Error ? err.message : 'Connection failed or was dismissed.');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>WalletConnect probe</h1>
      <p style={{ maxWidth: 380, opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
        Tap Connect, scan the QR with a phone wallet, and confirm an address appears below. This
        verifies WalletConnect works inside this browser.
      </p>

      {thirdwebClient ? (
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 8,
            border: '1px solid currentColor',
            background: 'transparent',
            cursor: connecting ? 'default' : 'pointer',
          }}
        >
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      ) : (
        <p style={{ color: '#c0392b', fontSize: 14 }}>
          NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set — cannot start WalletConnect.
        </p>
      )}

      {address && (
        <p style={{ fontSize: 14, wordBreak: 'break-all', maxWidth: 380 }}>
          <strong>Connected:</strong> {address}
        </p>
      )}
      {error && (
        <p style={{ color: '#c0392b', fontSize: 13, wordBreak: 'break-all', maxWidth: 380 }}>
          {error}
        </p>
      )}
    </main>
  );
}

export default function LinkWalletTestPage() {
  return (
    <MarketWeb3Provider>
      <WalletConnectProbe />
    </MarketWeb3Provider>
  );
}
